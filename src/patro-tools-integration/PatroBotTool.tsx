import { FormEvent, useState } from "react";
import { parseIntent } from "@/patro-tools/bots/intents";
import { reply } from "@/patro-tools/bots/responder";
import { addDays } from "@/patro-tools/core/astro";
import { bsAdapter } from "./bsAdapter";
import { panchangProvider, primePanchang } from "./panchangAdapter";
import { ToolPage, ToolResult } from "./ToolPrimitives";

type ChatRow = { id: string; role: "user" | "bot"; text: string };

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function PatroBotTool() {
  const [input, setInput] = useState("आज");
  const [rows, setRows] = useState<ChatRow[]>([
    { id: "hello", role: "bot", text: "नमस्ते 🙏 ‘आज’, ‘भोलि’, ‘दशैं कहिले’, ‘2083-06-13 AD’ जस्ता प्रश्न सोध्नुहोस्।" },
  ]);
  const [busy, setBusy] = useState(false);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const value = input.trim();
    if (!value || busy) return;
    const intent = parseIntent(value);
    setRows((current) => [...current, { id: crypto.randomUUID(), role: "user", text: value }]);
    setInput("");
    setBusy(true);
    try {
      const today = todayNepal();
      if (intent.type === "today") await primePanchang(today);
      if (intent.type === "tomorrow") await primePanchang(addDays(today, 1));
      const answer = await reply(intent, {
        bs: bsAdapter,
        provider: panchangProvider,
        appUrl: location.origin,
      });
      setRows((current) => [...current, { id: crypto.randomUUID(), role: "bot", text: answer }]);
    } catch (error) {
      setRows((current) => [...current, {
        id: crypto.randomUUID(),
        role: "bot",
        text: error instanceof Error ? error.message : "उत्तर तयार गर्न सकिएन।",
      }]);
    } finally {
      setBusy(false);
    }
  }

  const speech = rows.filter((row) => row.role === "bot").at(-1)?.text || "";

  return (
    <ToolPage title="Patro Bot" description="सामान्य पात्रो प्रश्नका लागि deterministic सहायक। आज/भोलिको तिथि Mero Patro को production panchang बाट लिइन्छ; unknown प्रश्नमा अनुमान नगरी help देखाउँछ।">
      <section className="patro-tool-card">
        <div className="bot-chat" aria-live="polite">
          {rows.map((row) => <div className={"bot-bubble " + row.role} key={row.id}><small>{row.role === "bot" ? "Patro Bot" : "तपाईं"}</small><p>{row.text}</p></div>)}
        </div>
        <form className="bot-input" onSubmit={send}>
          <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} placeholder="आज, भोलि, दशैं कहिले…" aria-label="Patro Bot प्रश्न" />
          <button type="submit" className="tool-primary-button" disabled={busy}>{busy ? "…" : "पठाउनुहोस्"}</button>
        </form>
        <div className="tool-action-row">
          {["आज","भोलि","दशैं कहिले","2083-06-13 AD","मेष राशिफल"].map((q) => <button type="button" className="tool-link-button" key={q} onClick={() => setInput(q)}>{q}</button>)}
        </div>
      </section>
      <ToolResult title="पछिल्लो Bot उत्तर" speechText={speech}>
        <p className="tool-preview">{speech}</p>
        <p className="tool-muted">Telegram/Viber adapters kit मा सुरक्षित छन्, तर token/server secret configure नभएसम्म बाह्य bot delivery UI देखाइँदैन।</p>
      </ToolResult>
    </ToolPage>
  );
}
