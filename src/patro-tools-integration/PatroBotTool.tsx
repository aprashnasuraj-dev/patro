import { FormEvent, useState } from "react";
import { answerPatroQuestion } from "./patroBotEngine";
import { ToolPage, ToolResult } from "./ToolPrimitives";

type ChatRow = { id: string; role: "user" | "bot"; text: string };

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
    setRows((current) => [...current, { id: crypto.randomUUID(), role: "user", text: value }]);
    setInput("");
    setBusy(true);
    try {
      const result = await answerPatroQuestion(value, location.origin, { helpFallback: true });
      const answer = result?.answer || "उत्तर तयार गर्न सकिएन।";
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
    <ToolPage title="आफ्नै Bot" description="मिति, तिथि, चाडपर्व, मिति रूपान्तरण र पात्रोसम्बन्धी छोटा प्रश्नको छिटो सहायक।">
      <section className="patro-tool-card">
        <div className="bot-chat" aria-live="polite">
          {rows.map((row) => <div className={"bot-bubble " + row.role} key={row.id}><small>{row.role === "bot" ? "आफ्नै Bot" : "तपाईं"}</small><p>{row.text}</p></div>)}
        </div>
        <form className="bot-input" onSubmit={send}>
          <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} placeholder="आज, भोलि, दशैं कहिले…" aria-label="आफ्नै Bot प्रश्न" />
          <button type="submit" className="tool-primary-button" disabled={busy}>{busy ? "उत्तर खोज्दै…" : "पठाउनुहोस्"}</button>
        </form>
        <div className="tool-action-row">
          {["आज","भोलि","दशैं कहिले","2083-06-13 AD","मेष राशिफल"].map((q) => <button type="button" className="tool-link-button" key={q} onClick={() => setInput(q)}>{q}</button>)}
        </div>
      </section>
      <ToolResult title="पछिल्लो उत्तर" speechText={speech}>
        <p className="tool-preview">{speech}</p>
        <p className="tool-muted">आज, भोलि, चाडपर्व वा मिति रूपान्तरणका प्रश्न सोध्नुहोस्।</p>
      </ToolResult>
    </ToolPage>
  );
}
