import { useEffect, useMemo, useState } from "react";
import { autoFix, checkSpelling, createDictionary, type Dictionary } from "@/patro-tools/language/spellcheck";
import { ToolPage, ToolResult } from "./ToolPrimitives";

const seed = ["आज","भोलि","नेपाल","नेपाली","मेरो","पात्रो","मिति","तिथि","जन्मदिन","श्राद्ध","धन्यवाद","विद्यालय","परीक्षा","स्वास्थ्य","महत्त्व"];

export function SpellCheckTool() {
  const [text, setText] = useState("आज बिद्यालयमा परिक्षा छ। स्वास्थ्य र शिक्षाको महत्व ठूलो छ।");
  const [dict, setDict] = useState<Dictionary>(() => createDictionary(seed));
  const [dictStatus, setDictStatus] = useState("आधारभूत शब्दकोश");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/typing/lexicon?format=words", { signal: controller.signal, headers: { Accept: "text/plain" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("dictionary");
        const words = (await response.text()).split(/\r?\n/).map((word) => word.trim()).filter(Boolean);
        const weighted = new Map(words.map((word, index) => [word, words.length - index]));
        setDict(createDictionary(weighted));
        setDictStatus(words.length.toLocaleString("en-US") + " शब्द · स्थानीय जाँच");
      })
      .catch((error) => {
        if ((error as Error)?.name !== "AbortError") setDictStatus("आधारभूत offline जाँच");
      });
    return () => controller.abort();
  }, []);

  const result = useMemo(() => checkSpelling(text, dict), [text, dict]);
  const corrected = useMemo(() => autoFix(text, dict), [text, dict]);

  function applySuggestion(index: number, word: string, replacement: string) {
    setText((value) => value.slice(0, index) + replacement + value.slice(index + word.length));
  }

  return (
    <ToolPage title="नेपाली हिज्जे जाँच" description="टाइप गरिएको पाठ ब्राउजरमै जाँचिन्छ। पाठ server मा पठाइँदैन; शब्दकोश मात्र download हुन्छ।">
      <section className="patro-tool-card">
        <label className="tool-block-label">नेपाली पाठ<textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <div className="tool-action-row"><span className="tool-badge">{dictStatus}</span><button className="tool-primary-button" type="button" onClick={() => setText(corrected)}>सुरक्षित स्वतः-सुधार लागू गर्नुहोस्</button></div>
      </section>
      <ToolResult title="जाँच नतिजा" speechText={corrected}>
        <p className="tool-preview">{corrected}</p>
        {result.issues.length === 0 ? <p className="tool-success">यो शब्दकोशको दायरामा स्पष्ट समस्या भेटिएन।</p> : (
          <div className="tool-issue-list">{result.issues.slice(0, 50).map((issue, i) => (
            <div className="tool-issue" key={issue.index + "-" + i}><strong>{issue.word}</strong><span>{issue.kind === "common_mistake" ? "सम्भावित हिज्जे त्रुटि" : "शब्दकोशमा भेटिएन"}</span><div>{issue.suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => applySuggestion(issue.index, issue.word, suggestion)}>{suggestion}</button>)}</div></div>
          ))}</div>
        )}
        <p className="tool-muted">नाम, स्थानीय शब्द र नयाँ प्राविधिक शब्द शब्दकोशमा नहुन सक्छन्; “भेटिएन” लाई स्वतः गलत नमान्नुहोस्।</p>
      </ToolResult>
    </ToolPage>
  );
}
