import { useState } from "react";
import { ReadAloudButton } from "./ReadAloudButton";
import { ToolPage, ToolResult } from "./ToolPrimitives";

export function ReadAloudTool() {
  const [text, setText] = useState("आजको मिति र पात्रो विवरण पढेर सुनाउनुहोस्।");
  return (
    <ToolPage title="पढेर सुनाउनुहोस्" description="नेपाली Devanagari पाठलाई तपाईंको device मा उपलब्ध आवाजबाट पढेर सुनाउँछ।">
      <section className="patro-tool-card">
        <label className="tool-block-label">पढ्नुपर्ने पाठ<textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <ReadAloudButton text={text} className="tool-primary-button" label="अहिले पढ्नुहोस्" />
      </section>
      <ToolResult title="Accessibility" speechText={text}>
        <p className="tool-preview">{text}</p>
        <p className="tool-muted">ब्राउजरमा ne-NP voice नभए hi-IN वा उपलब्ध Devanagari-compatible voice प्रयोग हुन सक्छ। कुनै paid TTS key आवश्यक छैन।</p>
      </ToolResult>
    </ToolPage>
  );
}
