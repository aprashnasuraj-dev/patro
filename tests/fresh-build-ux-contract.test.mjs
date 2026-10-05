import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Nepali typing and Preeti converter use the packaged offline bundle",()=>{
  const adapter=read("src/features/nepali-tools/NepaliTools.tsx");
  const sw=read("public/sw.js");
  const toolSw=read("public/nepali-tools/sw.js");
  const app=read("public/nepali-tools/app.mjs");
  const worker=read("public/nepali-tools/worker.mjs");
  assert.ok(adapter.includes('const BASE = "/nepali-tools"'));
  assert.ok(adapter.includes('WARM_LANGUAGE_TOOLS'));
  for(const asset of ["/nepali-tools/index.html","/nepali-tools/app.mjs","/nepali-tools/worker.mjs","/nepali-tools/core/roman.mjs","/nepali-tools/core/converter.mjs","/nepali-tools/core/suggestions.mjs"]){
    assert.ok(sw.includes(asset),`root PWA cache missing ${asset}`);
  }
  assert.ok(sw.includes('/api/v1/typing/lexicon?format=words'));
  assert.match(sw,/const VERSION = "aafnai-pwa-v\d+"/);
  assert.ok(sw.includes("cacheFirstShell(event.request)"),"packaged language assets must remain cache-first offline");
  assert.ok(sw.includes("isLanguageLexicon(url)")&&sw.includes("PUBLIC_DATA_CACHE"),"language lexicon must remain in the explicit bounded public-data cache allowlist");
  assert.ok(toolSw.includes("core/roman.mjs")&&toolSw.includes("core/converter.mjs"));
  assert.ok(worker.includes("/api/v1/typing/lexicon?format=words"));
  assert.ok(worker.includes("words.length!==34571"),"full lexicon validation must remain locked");
  assert.ok(app.includes("तपाईंले लेखेको पाठ यही उपकरणमा रहन्छ")||app.includes("processing stays on this device"),"typing privacy promise must remain visible without requiring old English copy");
  assert.ok(app.includes("preeti-to-unicode")&&app.includes("unicode-to-preeti"));
  assert.ok(app.includes("e.key==='Tab'&&items.length&&commit(active,'')"),"Tab must accept the active Nepali word suggestion");
  assert.ok(app.includes("ArrowDown")&&app.includes("ArrowUp"),"keyboard suggestion navigation must remain available");
});

test("PWA install metadata and bounded offline warming are present",()=>{
  const manifest=JSON.parse(read("public/manifest.webmanifest"));
  const pwa=read("src/pwa.ts");
  const sw=read("public/sw.js");
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.scope,"/");
  assert.equal(manifest.icons.length,3);
  assert.deepEqual(manifest.shortcuts.map(x=>x.url),["/","/tools/astro","/time-machine","/samudaya","/tools"]);
  assert.ok(pwa.includes('navigator.serviceWorker.register(`/sw.js?rev=${encodeURIComponent(SW_REVISION)}`'),"service worker registration must stay revisioned to break stale browser caches");
  assert.ok(pwa.includes('updateViaCache: "none"'),"service worker updates must bypass the browser HTTP cache");
  assert.ok(pwa.includes('registration.update()'),"registered worker must be actively refreshed after load");
  assert.ok(pwa.includes('WARM_OFFLINE'));
  assert.ok(sw.includes("MAX_CALENDAR_RANGE_DAYS = 45"));
  assert.ok(sw.includes("MAX_CALENDAR_ENTRIES = 10"));
});

test("one authoritative mobile navigation and Community Patro entries stay visible",()=>{
  const chrome=read("src/components/AppChrome.tsx");
  const hub=read("src/community/CommunityHub.tsx");
  const main=read("src/main.tsx");
  const router=read("src/PatroRouter.tsx");
  assert.equal((chrome.match(/className="ap-tabbar"/g)||[]).length,1,"AppChrome must expose exactly one mobile tabbar");
  for(const route of ["/","/rashifal","/convert","/me","/tools"]){
    assert.ok(chrome.includes(`href="${route}"`),`authoritative mobile nav route missing ${route}`);
  }
  for(const label of ["पात्रो","राशिफल","रूपान्तरण","आफ्नै ठाउँ","थप"])assert.ok(chrome.includes(label),label);
  const communities=["/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri"];
  for(const route of communities)assert.ok(chrome.includes(route)||hub.includes(route),`community route missing ${route}`);
  assert.ok(hub.includes("COMMUNITY_OPTIONS"),"community hub must use canonical registry");
  assert.ok(!main.includes("<MobilePrimaryNav />"),"legacy mobile nav must not be mounted beside AppChrome tabbar");
  assert.ok(router.includes('if(path==="/samudaya")return <CommunityHub/>'),"/samudaya must resolve to a real page");
});

test("reference homepage keeps local calendar selected-day and festival hierarchy",()=>{
  const home=read("src/HomePageCurrent.tsx");
  // The homepage lives in HomePageCurrent.tsx. FAQ and SEO prose were removed on purpose
  // (commit bc009cf "remove rejected homepage faq and seo prose"), so they must stay out.
  assert.ok(home.includes("localMonthDays"));
  assert.ok(home.includes("rh-calendar"));
  assert.ok(home.includes("rh-selected"));
  assert.ok(home.includes("eventMap"),"month grid must carry festivals/holidays per day");
  assert.ok(!home.includes("rh-faq"),"homepage FAQ was removed by product decision");
  assert.ok(!home.includes("rh-seo-copy"),"homepage SEO prose was removed by product decision");
  assert.ok(home.indexOf("rh-calendar")<home.indexOf("rh-selected"),"month calendar must come before the selected-day panel");
});

test("root homepage cannot regress into the astronomical calendar",()=>{
  const router=read("src/PatroRouter.tsx");
  const main=read("src/main.tsx");
  const home=read("src/HomePageCurrent.tsx");
  assert.ok(router.includes('if(path==="/"||path==="/today")return <ReferenceHomePage/>'),"root and /today must render the reference-driven Patro homepage");
  assert.ok(router.includes('if(path==="/tools/astro")return <AstroPage/>'),"astronomical calendar must stay isolated to /tools/astro");
  assert.ok(router.includes('const AstroPage=lazy(()=>import("./App"))'),"astronomy should remain lazy-loaded as a feature, not the shell root");
  assert.ok(main.includes("<PatroRouter />"),"the application shell must mount PatroRouter");
  assert.ok(home.includes('href="/tools/astro"'),"homepage may link to Astronomy but must not render the astronomy app at root");
});

test("Notes expose English Nepali suggestion and voice input using the same local worker",()=>{
  const diary=read("src/components/MyDiary.tsx");
  const enhancer=read("src/components/NoteTypingEnhancer.tsx");
  const main=read("src/main.tsx");
  const storage=read("src/patro-tools-integration/storage.ts");
  assert.ok(storage.includes('inputMode: "english" | "nepali" | "voice"'));
  assert.ok(diary.includes('new Worker("/nepali-tools/worker.mjs"'));
  assert.ok(diary.includes('type:"suggest"')||diary.includes('type: "suggest"'));
  assert.ok(diary.includes("SpeechRecognition")&&diary.includes("webkitSpeechRecognition"));
  for(const mode of ['mode==="english"','mode==="nepali"','mode==="voice"'])assert.ok(diary.includes(mode),`Notes input mode missing ${mode}`);
  assert.ok(diary.includes("life.notes"));
  assert.ok(enhancer.includes('event.key === "Tab"')&&enhancer.includes("ArrowDown")&&enhancer.includes("ArrowUp"),"Notes must support one-key suggestion completion and navigation");
  assert.ok(main.includes("<NoteTypingEnhancer />"),"Notes keyboard enhancer must be mounted");
  for(const jargon of ["Local-first","local dictionary","Suggestion worker","Cloud sync","Local mode"])assert.ok(!diary.includes(jargon),`Notes leaked implementation copy: ${jargon}`);
});

test("visible tool surfaces consolidate directional date conversion without killing legacy routes",()=>{
  const pages=read("src/AafnaiPages.tsx");
  const launcher=read("src/components/FeatureLauncher.tsx");
  const css=read("src/jyotish-assistant.css");
  const router=read("src/PatroRouter.tsx");
  assert.ok(pages.includes('href:"/convert"'));
  assert.ok(launcher.includes('href:"/convert"'));
  assert.ok(launcher.includes("bs to ad")&&launcher.includes("ad to bs"),"combined launcher converter must still match both directional searches");
  assert.ok(css.includes('.ap-tools-page .ap-tool-card[href="/tools/bstoad"]'));
  assert.ok(css.includes('.ap-tools-page .ap-tool-card[href="/tools/adtobs"]'));
  assert.ok(router.includes('path.match(/^\\/tools\\/([^/]+)$/)')||router.includes('const tool=path.match(/^\\/tools\\/([^/]+)$/)'),"legacy tool deep links must remain routable");
});

test("astronomy UI hides deployment and prototype language from visitors",()=>{
  const hero=read("src/components/CosmicHero.tsx");
  const experience=read("src/components/CosmicExperience.tsx");
  const sky=read("src/components/StandUnderThisSky.tsx");
  const direct=read("src/components/seo/DailyDirectAnswer.tsx");
  const combined=[hero,experience,sky,direct].join("\n");
  for(const jargon of ["Edge online","Edge unavailable","Checking edge","Cosmic Context","Living astronomical instrument","protected Supabase router","patro-blush.vercel.app","Lower-priority layer"]){
    assert.ok(!combined.includes(jargon),`astronomy leaked prototype/deployment copy: ${jargon}`);
  }
  assert.ok(hero.includes("/tools/astro?date="),"astronomy share links must use the canonical public route");
  assert.ok(hero.includes("aafnaipatro.com/tools/astro"),"share card must use the production Aafnai Patro address");
});

test("China-aware Jyotish AI is restored on the React shell and Cloudflare native handler",()=>{
  const assistant=read("src/components/JyotishAssistant.tsx");
  const main=read("src/main.tsx");
  const worker=read("worker/jyotish.ts");
  const entry=read("worker/index.ts");
  assert.ok(main.includes("<JyotishAssistant />"),"Jyotish assistant must be mounted globally");
  assert.ok(assistant.includes('fetch("/api/v1/jyotish-chat"'));
  assert.ok(assistant.includes("china_data: china"),"chat request must include available China context");
  assert.ok(assistant.includes(".patro-report")&&assistant.includes(".chart-summary article"),"assistant must reconnect to rendered China output");
  assert.ok(!assistant.includes("Cloudflare मा AI secret"),"consumer chat must not expose deployment setup instructions");
  assert.ok(entry.includes('path === "/api/v1/jyotish-chat"'));
  assert.ok(worker.includes("Groq_API")&&worker.includes("nvidia_api"),"Cloudflare secret aliases must be retained");
  assert.ok(worker.includes("NVIDIA_NIM_API_KEY")&&worker.includes("GROQ_API_KEY"),"standard provider secret aliases must be retained");
  assert.ok(worker.includes("china_data")&&worker.includes("CHINA_CONTEXT"),"backend must preserve personalized China mode");
  assert.ok(worker.includes("integrate.api.nvidia.com")&&worker.includes("api.groq.com"),"Groq/NVIDIA provider routing must remain present");
});

test("voice typing exposes real Nepali and English recognition modes",()=>{
  const tool=read("src/patro-tools-integration/VoiceTypingTool.tsx");
  const hook=read("src/patro-tools/language/react/useNepaliDictation.ts");
  const css=read("src/patro-tools-integration/voice-typing.css");
  assert.ok(tool.includes('useState<DictationLanguage>("ne-NP")'));
  assert.ok(tool.includes('chooseLanguage("ne-NP")')&&tool.includes('chooseLanguage("en-US")'),"language selector must expose both recognition modes");
  assert.ok(tool.includes("नेपाली बोली → नेपाली पाठ")&&tool.includes("English speech → English text"));
  assert.ok(tool.includes("language,")&&tool.includes("serverFallback: true"),"selected locale must reach resilient browser/server dictation");
  assert.ok(hook.includes("export type DictationLanguage = 'ne-NP' | 'en-US'"));
  assert.ok(hook.includes("recognition.lang = language"),"speech recognizer must use the selected locale dynamically");
  assert.ok(!hook.includes("recognition.lang = 'ne-NP'"),"speech recognizer must not regress to Nepali-only mode");
  assert.ok(hook.includes("postProcessEnglishDictation")&&hook.includes("question mark")&&hook.includes("new paragraph"));
  assert.ok(hook.includes("/api/nepali/stt")&&hook.includes("MediaRecorder"),"unsupported or failed browser recognition must retain the server transcription fallback");
  assert.ok(css.includes(".voice-language-picker")&&css.includes(".voice-live-dot"),"bilingual voice UI styling must remain present");
});

test("developer API is not advertised in the frontend launcher",()=>{
  const launcher=read("src/components/FeatureLauncher.tsx");
  assert.ok(!launcher.includes('href:"/developers"'));
  assert.ok(!launcher.includes("Developers · API"));
});
