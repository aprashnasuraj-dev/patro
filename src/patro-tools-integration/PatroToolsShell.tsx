import "./patro-tools.css";
import { TithiReminderTool } from "./TithiReminderTool";
import { SpellCheckTool } from "./SpellCheckTool";
import { NameCheckTool } from "./NameCheckTool";
import { ReadAloudTool } from "./ReadAloudTool";
import { ToolPage } from "./ToolPrimitives";
import { SaitTool } from "./SaitTool";
import { BabyNamesTool } from "./BabyNamesTool";
import { JanmadinAkhbarTool } from "./JanmadinAkhbarTool";
import { FutureLetterTool } from "./FutureLetterTool";
import { VoiceTypingTool } from "./VoiceTypingTool";
import { OcrTool } from "./OcrTool";
import { PatroBotTool } from "./PatroBotTool";

const LABELS: Record<string, { title: string; description: string }> = {
  "tithi-reminder": { title: "तिथि रिमाइन्डर", description: "श्राद्ध, तिथि जन्मदिन र पात्रो रिमाइन्डर" },
  sait: { title: "साइत", description: "आधिकारिक मिति पहिलो, गणना गरिएको मिति सम्भावित" },
  "baby-names": { title: "नक्षत्र अनुसार नाम", description: "नाम, न्वारन, पास्नी र खोप समयरेखा" },
  "janmadin-akhbar": { title: "जन्मदिन अखबार", description: "जन्म दिनको इतिहास र पात्रोबाट शेयर कार्ड" },
  "future-letter": { title: "भविष्यको चिठी", description: "वि.सं. मिति वा तिथि जन्मदिनमा खुल्ने निजी चिठी" },
  "spell-check": { title: "नेपाली हिज्जे जाँच", description: "नेपाली पाठको हिज्जे र सुझाव" },
  "voice-typing": { title: "आवाजबाट नेपाली टाइपिङ", description: "ब्राउजर वा वैकल्पिक सुरक्षित speech API" },
  ocr: { title: "नेपाली OCR", description: "तस्बिरबाट नेपाली अक्षर निकाल्नुहोस्" },
  "name-check": { title: "नाम जाँच", description: "कागजातमा नामको हिज्जे र उच्चारण मिलान" },
  "read-aloud": { title: "पढेर सुनाउनुहोस्", description: "नेपाली सामग्री आवाजमा सुन्नुहोस्" },
  "patro-bot": { title: "Patro Bot", description: "पात्रो, तिथि र रिमाइन्डर सहायक" },
};

export function PatroToolsShell({ slug }: { slug: string }) {
  if (slug === "tithi-reminder") return <TithiReminderTool />;
  if (slug === "spell-check") return <SpellCheckTool />;
  if (slug === "name-check") return <NameCheckTool />;
  if (slug === "read-aloud") return <ReadAloudTool />;
  if (slug === "sait") return <SaitTool />;
  if (slug === "baby-names") return <BabyNamesTool />;
  if (slug === "janmadin-akhbar") return <JanmadinAkhbarTool />;
  if (slug === "future-letter") return <FutureLetterTool />;
  if (slug === "voice-typing") return <VoiceTypingTool />;
  if (slug === "ocr") return <OcrTool />;
  if (slug === "patro-bot") return <PatroBotTool />;

  const meta = LABELS[slug] ?? { title: "उपकरण", description: "Mero Patro tool" };
  return (
    <ToolPage title={meta.title} description={meta.description}>
      <section className="patro-tool-card">
        <h2>यो उपकरण अर्को integration phase मा जोडिँदैछ।</h2>
        <p className="tool-muted">BS र पञ्चाङ्गका लागि Mero Patro को विद्यमान production engine नै प्राथमिक स्रोत रहनेछ।</p>
      </section>
    </ToolPage>
  );
}
export { PATRO_TOOL_SLUGS } from "./toolSlugs";
