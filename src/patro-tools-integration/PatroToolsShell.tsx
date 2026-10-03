import { lazy, Suspense } from "react";
import "./patro-tools.css";
import { ToolPage } from "./ToolPrimitives";

const TithiReminderTool=lazy(()=>import("./TithiReminderTool").then(m=>({default:m.TithiReminderTool})));
const SpellCheckTool=lazy(()=>import("./SpellCheckTool").then(m=>({default:m.SpellCheckTool})));
const NameCheckTool=lazy(()=>import("./NameCheckTool").then(m=>({default:m.NameCheckTool})));
const ReadAloudTool=lazy(()=>import("./ReadAloudTool").then(m=>({default:m.ReadAloudTool})));
const SaitTool=lazy(()=>import("./SaitTool").then(m=>({default:m.SaitTool})));
const BabyNamesTool=lazy(()=>import("./BabyNamesTool").then(m=>({default:m.BabyNamesTool})));
const JanmadinAkhbarTool=lazy(()=>import("./JanmadinAkhbarTool").then(m=>({default:m.JanmadinAkhbarTool})));
const FutureLetterTool=lazy(()=>import("./FutureLetterTool").then(m=>({default:m.FutureLetterTool})));
const VoiceTypingTool=lazy(()=>import("./VoiceTypingTool").then(m=>({default:m.VoiceTypingTool})));
const OcrTool=lazy(()=>import("./OcrTool").then(m=>({default:m.OcrTool})));
const PatroBotTool=lazy(()=>import("./PatroBotTool").then(m=>({default:m.PatroBotTool})));

const LABELS:Record<string,{title:string;description:string}>={
 "tithi-reminder":{title:"तिथि रिमाइन्डर",description:"श्राद्ध, तिथि जन्मदिन र पात्रो रिमाइन्डर"},
 sait:{title:"साइत",description:"आधिकारिक मिति पहिलो, गणना गरिएको मिति सम्भावित"},
 "baby-names":{title:"बेबी नेम",description:"नक्षत्र अनुसार नाम, न्वारन, पास्नी र खोप समयरेखा"},
 "janmadin-akhbar":{title:"जन्मदिन अखबार",description:"जन्म दिनको इतिहास र पात्रोबाट शेयर कार्ड"},
 "future-letter":{title:"भविष्यको चिठी",description:"वि.सं. मिति वा तिथि जन्मदिनमा खुल्ने निजी चिठी"},
 "spell-check":{title:"नेपाली हिज्जे जाँच",description:"नेपाली पाठको हिज्जे र सुझाव"},
 "voice-typing":{title:"आवाजबाट टाइपिङ · Voice to Text",description:"नेपाली वा English बोलीलाई editable text मा बदल्नुहोस्"},
 ocr:{title:"नेपाली OCR",description:"तस्बिरबाट नेपाली अक्षर निकाल्नुहोस्"},
 "name-check":{title:"नाम जाँच",description:"नामको हिज्जे र उच्चारण मिलान"},
 "read-aloud":{title:"पढेर सुनाउने",description:"नेपाली सामग्री आवाजमा सुन्नुहोस्"},
 "patro-bot":{title:"पात्रो बोट",description:"पात्रो, तिथि र रिमाइन्डर सहायक"}
};

function ToolLoading({slug}:{slug:string}){
 const meta=LABELS[slug]??{title:"उपकरण",description:"पात्रो उपकरण"};
 return <ToolPage title={meta.title} description={meta.description}><section className="patro-tool-card tool-loading-card" role="status" aria-live="polite"><span className="tool-loading-mark" aria-hidden="true"/><p className="tool-muted">उपकरण तयार हुँदैछ…</p></section></ToolPage>
}

function ToolUnavailable({slug}:{slug:string}){
 return <ToolPage title="उपकरण भेटिएन" description="यो ठेगानामा सार्वजनिक उपकरण उपलब्ध छैन।"><section className="patro-tool-card"><h2>उपकरण ठेगाना मिलेन।</h2><p className="tool-muted">{slug ? `“${slug}”` : "यो"} उपकरण सार्वजनिक सूचीमा छैन। उपलब्ध उपकरणको पूर्ण सूचीबाट अर्को उपकरण खोल्नुहोस्।</p><div className="tool-action-row"><a className="tool-primary-button" href="/tools">सबै उपकरण हेर्नुहोस्</a><a className="tool-link-button" href="/">मुख्य पात्रो</a></div></section></ToolPage>
}

function ToolRoute({slug}:{slug:string}){
 if(slug==="tithi-reminder")return <TithiReminderTool/>;
 if(slug==="spell-check")return <SpellCheckTool/>;
 if(slug==="name-check")return <NameCheckTool/>;
 if(slug==="read-aloud")return <ReadAloudTool/>;
 if(slug==="sait")return <SaitTool/>;
 if(slug==="baby-names")return <BabyNamesTool/>;
 if(slug==="janmadin-akhbar")return <JanmadinAkhbarTool/>;
 if(slug==="future-letter")return <FutureLetterTool/>;
 if(slug==="voice-typing")return <VoiceTypingTool/>;
 if(slug==="ocr")return <OcrTool/>;
 if(slug==="patro-bot")return <PatroBotTool/>;
 return <ToolUnavailable slug={slug}/>;
}

export function PatroToolsShell({slug}:{slug:string}){return <Suspense fallback={<ToolLoading slug={slug}/>}><ToolRoute slug={slug}/></Suspense>}
export { PATRO_TOOL_SLUGS } from "./toolSlugs";
