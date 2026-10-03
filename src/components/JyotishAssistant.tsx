import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatRole = "user" | "assistant";
type ChatMessage = { id: string; role: ChatRole; content: string };
type ChatLanguage = "auto" | "ne" | "en";
type ChinaContext = Record<string, unknown>;

const HISTORY_KEY = "aafnai.jyotish.chat.history.v1";
const LANGUAGE_KEY = "aafnai.jyotish.chat.language.v1";
const CHINA_KEY = "aafnai.jyotish.china.context.v1";
const MAX_STORED = 24;

function readHistory(): ChatMessage[] {
  try {
    const rows = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row) => row && (row.role === "user" || row.role === "assistant") && typeof row.content === "string")
      .slice(-MAX_STORED)
      .map((row) => ({ id: String(row.id || crypto.randomUUID()), role: row.role as ChatRole, content: row.content }));
  } catch {
    return [];
  }
}

function readLanguage(): ChatLanguage {
  try {
    const value = localStorage.getItem(LANGUAGE_KEY);
    return value === "ne" || value === "en" ? value : "auto";
  } catch {
    return "auto";
  }
}

function readChina(): ChinaContext | null {
  try {
    const value = JSON.parse(localStorage.getItem(CHINA_KEY) || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function text(node: Element | null) {
  return (node?.textContent || "").replace(/\s+/g, " ").trim();
}

function contextFromRenderedChina(): ChinaContext | null {
  const report = document.querySelector<HTMLElement>(".patro-report");
  if (!report) return null;

  const tables = [...report.querySelectorAll("table")];
  const planets = tables[0]
    ? [...tables[0].querySelectorAll("tbody tr")].map((row) => {
        const cells = [...row.querySelectorAll("td")].map((cell) => text(cell));
        return cells.length >= 4
          ? { planet_en: cells[0], degree: cells[1], rashi: { name: cells[2] }, house: Number(cells[3]) || cells[3] }
          : null;
      }).filter(Boolean)
    : [];

  const dashas = tables[1]
    ? [...tables[1].querySelectorAll("tbody tr")].slice(0, 10).map((row) => {
        const cells = [...row.querySelectorAll("td")].map((cell) => text(cell));
        return cells.length >= 3 ? { lord: cells[0], start: cells[1], end: cells[2] } : null;
      }).filter(Boolean)
    : [];

  const summary = [...report.querySelectorAll(".chart-summary article")].map((article) => ({
    label: text(article.querySelector("small")),
    value: text(article.querySelector("strong")),
    detail: text(article.querySelector("span")),
  }));
  const nakshatra = summary.find((item) => /nakshatra/i.test(item.label));
  const manglik = summary.find((item) => /manglik/i.test(item.label));
  const lagna = text(report.querySelector(".lagna-badge strong"));
  const identity = text(report.querySelector(".report-head h2"));
  const birthLine = text(report.querySelector(".report-head p:not(.eyebrow)"));

  const context: ChinaContext = {
    time_known: true,
    lagna: lagna ? { name: lagna } : null,
    nakshatra: nakshatra ? { name: nakshatra.value, pada: nakshatra.detail } : null,
    dasha: dashas.length ? { periods: dashas } : null,
    planets,
    birth: { name: identity || undefined, summary: birthLine || undefined },
    other_important_points: manglik ? { manglik: `${manglik.value} ${manglik.detail}`.trim() } : undefined,
    data_quality: { source: "aafnai-patro-china", generated_at: new Date().toISOString() },
  };
  return context;
}

function extractSseContent(payload: string) {
  try {
    const json = JSON.parse(payload);
    return String(json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || "");
  } catch {
    return "";
  }
}

async function streamAssistant(
  response: Response,
  onText: (text: string) => void,
) {
  if (!response.body) throw new Error("empty_response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      const chunk = extractSseContent(payload);
      if (chunk) {
        output += chunk;
        onText(output);
      }
    }
    if (done) break;
  }
  if (!output.trim()) throw new Error("empty_response");
  return output;
}

export function JyotishAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(readHistory);
  const [language, setLanguage] = useState<ChatLanguage>(readLanguage);
  const [china, setChina] = useState<ChinaContext | null>(readChina);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_STORED))); } catch { /* local-only convenience */ }
  }, [messages]);
  useEffect(() => {
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* local-only convenience */ }
  }, [language]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const context = contextFromRenderedChina();
        if (!context) return;
        setChina(context);
        try { localStorage.setItem(CHINA_KEY, JSON.stringify(context)); } catch { /* optional */ }
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("patro:navigation", update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("patro:navigation", update);
    };
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => panel.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus());
  }, [open]);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const prompts = useMemo(
    () => china
      ? ["मेरो हालको दशा के देखाउँछ?", "मेरो विवाह/सम्बन्ध पक्ष बुझाइदिनुहोस्", "मेरो चिना अनुसार विदेश योग कस्तो छ?"]
      : ["लग्न भनेको के हो?", "दशा र गोचरमा के फरक छ?", "चिना कसरी प्रयोग गर्ने?"],
    [china],
  );

  function clearChat() {
    activeRequest.current?.abort();
    setBusy(false);
    setMessages([]);
    setError("");
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* optional */ }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const value = input.trim();
    if (!value || busy) return;
    setInput("");
    setError("");
    const userRow: ChatMessage = { id: crypto.randomUUID(), role: "user", content: value };
    const assistantId = crypto.randomUUID();
    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, userRow, { id: assistantId, role: "assistant", content: "" }]);
    setBusy(true);
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const response = await fetch("/api/v1/jyotish-chat", {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
        headers: { "content-type": "application/json", accept: "text/event-stream, application/json" },
        body: JSON.stringify({ message: value, history, language, china_data: china }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(String(body?.error || body?.code || `HTTP ${response.status}`));
      }
      const type = response.headers.get("content-type") || "";
      if (type.includes("text/event-stream")) {
        await streamAssistant(response, (content) => {
          setMessages((current) => current.map((row) => row.id === assistantId ? { ...row, content } : row));
        });
      } else {
        const body = await response.json();
        const content = String(body?.answer || body?.message || body?.content || "").trim();
        if (!content) throw new Error("empty_response");
        setMessages((current) => current.map((row) => row.id === assistantId ? { ...row, content } : row));
      }
    } catch (cause) {
      if (controller.signal.aborted) return;
      setMessages((current) => current.filter((row) => row.id !== assistantId));
      setError(cause instanceof Error && cause.message === "all_providers_unavailable"
        ? "ज्योतिष AI अहिले उपलब्ध छैन। Cloudflare मा AI secret जोडिएपछि पुनः प्रयास गर्नुहोस्।"
        : "ज्योतिष AI बाट उत्तर लिन सकिएन। फेरि प्रयास गर्नुहोस्।");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      setBusy(false);
    }
  }

  return <>
    <button className="jy-ai-fab" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="aafnai-jyotish-ai" aria-label="ज्योतिष AI खोल्नुहोस्">
      <span aria-hidden="true">ॐ</span><b>AI</b>
    </button>
    {open && <section id="aafnai-jyotish-ai" className="jy-ai-panel" ref={panel} aria-label="आफ्नै ज्योतिष AI">
      <header className="jy-ai-head">
        <div><span aria-hidden="true">ॐ</span><div><strong>आफ्नै ज्योतिष AI</strong><small>{china ? "तपाईंको चिना सन्दर्भ जोडिएको छ" : "सामान्य ज्योतिष सहायक"}</small></div></div>
        <div><button type="button" onClick={clearChat} title="च्याट खाली गर्नुहोस्" aria-label="च्याट खाली गर्नुहोस्">↺</button><button type="button" onClick={() => setOpen(false)} aria-label="बन्द गर्नुहोस्">×</button></div>
      </header>
      <div className="jy-ai-toolbar">
        <div role="group" aria-label="उत्तरको भाषा">
          {(["auto", "ne", "en"] as const).map((value) => <button type="button" key={value} className={language === value ? "active" : ""} onClick={() => setLanguage(value)}>{value === "auto" ? "Auto" : value === "ne" ? "नेपाली" : "English"}</button>)}
        </div>
        <a href="/jyotish/china" className={china ? "is-connected" : ""}>{china ? "● चिना जोडिएको" : "+ चिना बनाउनुहोस्"}</a>
      </div>
      <div className="jy-ai-messages" aria-live="polite">
        {!messages.length && <div className="jy-ai-welcome"><strong>नमस्ते 🙏</strong><p>ज्योतिषसम्बन्धी सामान्य प्रश्न सोध्नुहोस्। चिना बनाएपछि ग्रहस्थिति र दशाको सन्दर्भसहित प्रश्न सोध्न सकिन्छ।</p><div>{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => setInput(prompt)}>{prompt}</button>)}</div></div>}
        {messages.map((row) => row.content ? <article className={`jy-ai-message ${row.role}`} key={row.id}><small>{row.role === "assistant" ? "ज्योतिष AI" : "तपाईं"}</small><p>{row.content}</p></article> : <article className="jy-ai-message assistant is-typing" key={row.id}><span/><span/><span/></article>)}
        {error && <p className="jy-ai-error" role="alert">{error}</p>}
      </div>
      <form className="jy-ai-compose" onSubmit={send}>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} rows={2} placeholder="ज्योतिष वा चिना बारे सोध्नुहोस्…" aria-label="ज्योतिष AI प्रश्न" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}/>
        <button type="submit" disabled={busy || !input.trim()}>{busy ? "…" : "पठाउनुहोस्"}</button>
      </form>
      <footer><span>परम्परागत ज्योतिषीय व्याख्या हो, निश्चित भविष्यवाणी होइन।</span><a href="/tools/patro-bot">पात्रोका तथ्य → पात्रो बोट</a></footer>
    </section>}
  </>;
}
