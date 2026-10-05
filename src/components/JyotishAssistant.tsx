import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { answerPatroQuestion } from "../patro-tools-integration/patroBotEngine";
import { useDismiss } from "../useDismiss";

type ChatRole = "user" | "assistant";
type ChatMessage = { id: string; role: ChatRole; content: string };
type ChatLanguage = "auto" | "ne" | "en";
type ChinaContext = Record<string, unknown>;

const HISTORY_KEY = "aafnai.bot.chat.history.v1";
const LEGACY_HISTORY_KEY = "aafnai.jyotish.chat.history.v1";
const LANGUAGE_KEY = "aafnai.bot.chat.language.v1";
const LEGACY_LANGUAGE_KEY = "aafnai.jyotish.chat.language.v1";
const CHINA_KEY = "aafnai.jyotish.china.context.v1";
const MAX_STORED = 24;

function readHistory(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY) || localStorage.getItem(LEGACY_HISTORY_KEY) || "[]";
    const rows = JSON.parse(stored);
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
    const value = localStorage.getItem(LANGUAGE_KEY) || localStorage.getItem(LEGACY_LANGUAGE_KEY);
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

  return {
    time_known: true,
    lagna: lagna ? { name: lagna } : null,
    nakshatra: nakshatra ? { name: nakshatra.value, pada: nakshatra.detail } : null,
    dasha: dashas.length ? { periods: dashas } : null,
    planets,
    birth: { name: identity || undefined, summary: birthLine || undefined },
    other_important_points: manglik ? { manglik: `${manglik.value} ${manglik.detail}`.trim() } : undefined,
    data_quality: { source: "aafnai-patro-china", generated_at: new Date().toISOString() },
  };
}

function extractSseContent(payload: string) {
  try {
    const json = JSON.parse(payload);
    return String(json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || "");
  } catch {
    return "";
  }
}

async function streamAssistant(response: Response, onText: (text: string) => void) {
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
  useDismiss(open, () => setOpen(false));
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
      ? ["आजको मिति र तिथि", "दशैं कहिले", "मेरो हालको दशा के देखाउँछ?"]
      : ["आजको मिति र तिथि", "दशैं कहिले", "लग्न भनेको के हो?"],
    [china],
  );

  function clearChat() {
    activeRequest.current?.abort();
    setBusy(false);
    setMessages([]);
    setError("");
    try {
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(LEGACY_HISTORY_KEY);
    } catch { /* optional */ }
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

    let controller: AbortController | null = null;
    try {
      // Calendar/date/tithi/festival/conversion questions stay on the deterministic
      // Patro engine. Unknown/open-ended prompts fall through to managed cloud AI.
      const deterministic = await answerPatroQuestion(value, location.origin, { helpFallback: false });
      if (deterministic) {
        setMessages((current) => current.map((row) => row.id === assistantId ? { ...row, content: deterministic.answer } : row));
        return;
      }

      controller = new AbortController();
      activeRequest.current = controller;
      const response = await fetch("/api/v1/jyotish-chat", {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
        headers: { "content-type": "application/json", accept: "text/event-stream, application/json" },
        body: JSON.stringify({ message: value, history, language, china_data: china }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(String(body?.code || body?.error || `HTTP ${response.status}`));
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
      if (controller?.signal.aborted) return;
      setMessages((current) => current.filter((row) => row.id !== assistantId));
      setError(cause instanceof Error && cause.message === "all_providers_unavailable"
        ? "आफ्नै Bot को AI सेवा अहिले उपलब्ध छैन। पात्रोका मिति/तिथि प्रश्न भने चलिरहन्छन्।"
        : "आफ्नै Bot बाट उत्तर लिन सकिएन। फेरि प्रयास गर्नुहोस्।");
    } finally {
      if (controller && activeRequest.current === controller) activeRequest.current = null;
      setBusy(false);
    }
  }

  return <>
    <button className="jy-ai-fab" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="aafnai-bot-panel" aria-label="आफ्नै Bot खोल्नुहोस्">
      <span aria-hidden="true">आ</span><em>आफ्नै Bot</em><b>AI</b>
    </button>
    {open && <section id="aafnai-bot-panel" className="jy-ai-panel" ref={panel} aria-label="आफ्नै Bot">
      <header className="jy-ai-head">
        <div><span aria-hidden="true">आ</span><div><strong>आफ्नै Bot</strong><small>{china ? "पात्रो + ज्योतिष · तपाईंको चिना जोडिएको" : "पात्रो, मिति, चाडपर्व र ज्योतिष सहायक"}</small></div></div>
        <div><button type="button" onClick={clearChat} title="च्याट खाली गर्नुहोस्" aria-label="च्याट खाली गर्नुहोस्">↺</button><button type="button" onClick={() => setOpen(false)} aria-label="बन्द गर्नुहोस्">×</button></div>
      </header>
      <div className="jy-ai-toolbar">
        <div role="group" aria-label="उत्तरको भाषा">
          {(["auto", "ne", "en"] as const).map((value) => <button type="button" key={value} className={language === value ? "active" : ""} onClick={() => setLanguage(value)}>{value === "auto" ? "Auto" : value === "ne" ? "नेपाली" : "English"}</button>)}
        </div>
        <a href="/jyotish/china" className={china ? "is-connected" : ""}>{china ? "● चिना जोडिएको" : "+ चिना बनाउनुहोस्"}</a>
      </div>
      <div className="jy-ai-messages" aria-live="polite">
        {!messages.length && <div className="jy-ai-welcome"><strong>नमस्ते 🙏 म आफ्नै Bot हुँ।</strong><p>आजको मिति/तिथि, चाडपर्व, BS–AD रूपान्तरण वा ज्योतिषसम्बन्धी प्रश्न सोध्नुहोस्।</p><div>{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => setInput(prompt)}>{prompt}</button>)}</div></div>}
        {messages.map((row) => row.content ? <article className={`jy-ai-message ${row.role}`} key={row.id}><small>{row.role === "assistant" ? "आफ्नै Bot" : "तपाईं"}</small><p>{row.content}</p></article> : <article className="jy-ai-message assistant is-typing" key={row.id}><span/><span/><span/></article>)}
        {error && <p className="jy-ai-error" role="alert">{error}</p>}
      </div>
      <form className="jy-ai-compose" onSubmit={send}>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} rows={2} placeholder="मिति, तिथि, चाडपर्व वा ज्योतिष बारे सोध्नुहोस्…" aria-label="आफ्नै Bot प्रश्न" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}/>
        <button type="submit" disabled={busy || !input.trim()}>{busy ? "…" : "पठाउनुहोस्"}</button>
      </form>
      <footer><span>ज्योतिषीय उत्तर परम्परागत व्याख्या हुन्; निश्चित भविष्यवाणी होइनन्।</span><a href="/tools/patro-bot">पूरा पात्रो बोट खोल्नुहोस्</a></footer>
    </section>}
  </>;
}
