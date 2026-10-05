import { useState } from "react";
import { ReadAloudButton } from "./ReadAloudButton";
import { ToolPage, ToolResult } from "./ToolPrimitives";

export function ReadAloudTool() {
  const [text, setText] = useState("आजको मिति र पात्रो विवरण पढेर सुनाउनुहोस्।");
  const [rate, setRate] = useState(0.9);

  return (
    <ToolPage
      title="आफ्नै पढेर सुनाउने · Text to Voice"
      description="नेपाली Devanagari वा English पाठलाई device मा उपलब्ध सबैभन्दा उपयुक्त आवाजबाट पढेर सुनाउँछ।"
    >
      <section className="patro-tool-card">
        <label className="tool-block-label">
          पढ्नुपर्ने पाठ
          <textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className="tool-block-label">
          पढ्ने गति · Speech speed: {rate.toFixed(2)}×
          <input
            type="range"
            min="0.65"
            max="1.25"
            step="0.05"
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
          />
        </label>
        <ReadAloudButton text={text} className="tool-primary-button" label="अहिले पढ्नुहोस्" rate={rate} />
        <p className="tool-muted">
          Patro ले पहिले वास्तविक Nepali (ne-NP) voice खोज्छ। त्यो नभए Devanagari पढ्न सक्ने Hindi voice प्रयोग गर्छ। लामो पाठलाई साना वाक्यमा क्रमशः पढाइन्छ।
        </p>
      </section>
      <ToolResult title="आफ्नै सुन्ने सुविधा" speechText={text}>
        <p className="tool-preview">{text}</p>
        <p className="tool-muted">यो feature browser/device को speech engine प्रयोग गर्छ; paid TTS key आवश्यक छैन।</p>
      </ToolResult>
    </ToolPage>
  );
}
