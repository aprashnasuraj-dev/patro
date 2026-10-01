import { lazy, Suspense } from "react";
import "./patro-tools.css";
import { ToolPage } from "./ToolPrimitives";

const TithiReminderTool = lazy(() => import("./TithiReminderTool").then((m) => ({ default: m.TithiReminderTool })));
const SpellCheckTool = lazy(() => import("./SpellCheckTool").then((m) => ({ default: m.SpellCheckTool })));
const NameCheckTool = lazy(() => import("./NameCheckTool").then((m) => ({ default: m.NameCheckTool })));
const ReadAloudTool = lazy(() => import("./ReadAloudTool").then((m) => ({ default: m.ReadAloudTool })));
const SaitTool = lazy(() => import("./SaitTool").then((m) => ({ default: m.SaitTool })));
const BabyNamesTool = lazy(() => import("./BabyNamesTool").then((m) => ({ default: m.BabyNamesTool })));
const JanmadinAkhbarTool = lazy(() => import("./JanmadinAkhbarTool").then((m) => ({ default: m.JanmadinAkhbarTool })));
const FutureLetterTool = lazy(() => import("./FutureLetterTool").then((m) => ({ default: m.FutureLetterTool })));
const VoiceTypingTool = lazy(() => import("./VoiceTypingTool").then((m) => ({ default: m.VoiceTypingTool })));
const OcrTool = lazy(() => import("./OcrTool").then((m) => ({ default: m.OcrTool })));
const PatroBotTool = lazy(() => import("./PatroBotTool").then((m) => ({ default: m.PatroBotTool })));

const LABELS: Record<string, { title: string; description: string }> = {
  "tithi-reminder": { title: "आफ्नै तिथि रिमाइन्डर", description: "श्राद्ध, तिथि जन्मदिन र पात्रो रिमाइन्डर" },
  sait: { title: "आफ्नै साइत", description: "आधिकारिक मिति पहिलो, गणना गरिएको मिति सम्भावित" },
  "baby-names": { title: "आफ्नै बेबी नेम", description: "नक्षत्र अनुसार नाम, न्वारन, पास्नी र खोप समयरेखा" },
  "janmadin-akhbar": { title: "आफ्नै जन्मदिन अखबार", description: "जन्म दिनको इतिहास र पात्रोबाट शेयर कार्ड" },
  "future-letter": { title: "आफ्नै भविष्यको चिठी", description: "वि.सं. मिति वा तिथि जन्मदिनमा खुल्ने निजी चिठी" },
  "spell-check": { title: "आफ्नै नेपाली हिज्जे जाँच", description: "नेपाली पाठको हिज्जे र सुझाव" },
  "voice-typing": { title: "आफ्नै बोली टाइपिङ", description: "बोलेर नेपाली टाइप गर्ने सुविधा" },
  ocr: { title: "आफ्नै नेपाली OCR", description: "तस्बिरबाट नेपाली अक्षर निकाल्नुहोस्" },
  "name-check": { title: "आफ्नै नाम जाँच", description: "नामको हिज्जे र उच्चारण मिलान" },
  "read-aloud": { title: "आफ्नै पढेर सुनाउने", description: "नेपाली सामग्री आवाजमा सुन्नुहोस्" },
  "patro-bot": { title: "आफ्नै पात्रो बोट", description: "पात्रो, तिथि र रिमाइन्डर सहायक" },
};

function ToolLoading({ slug }: { slug: string }) {
  const meta = LABELS[slug] ?? { title: "आफ्नै उपकरण", description: "आफ्नै पात्रो उपकरण" };
  return (
    <ToolPage title={meta.title} description={meta.description}>
      <section className="patro-tool-card" role="status" aria-live="polite">
        <p className="tool-muted">उपकरण लोड हुँदैछ…</p>
      </section>
    </ToolPage>
  );
}

function ToolRoute({ slug }: { slug: string }) {
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

  const meta = LABELS[slug] ?? { title: "आफ्नै उपकरण", description: "आफ्नै पात्रो उपकरण" };
  return (
    <ToolPage title={meta.title} description={meta.description}>
      <section className="patro-tool-card">
        <h2>यो उपकरण अर्को integration phase मा जोडिँदैछ।</h2>
        <p className="tool-muted">BS र पञ्चाङ्गका लागि आफ्नै पात्रोको विद्यमान production engine नै प्राथमिक स्रोत रहनेछ।</p>
      </section>
    </ToolPage>
  );
}

export function PatroToolsShell({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<ToolLoading slug={slug} />}>
      <ToolRoute slug={slug} />
    </Suspense>
  );
}

export { PATRO_TOOL_SLUGS } from "./toolSlugs";
