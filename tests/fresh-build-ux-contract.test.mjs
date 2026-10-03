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
  assert.ok(sw.includes("cacheFirst(event.request)"),"lexicon/assets must be cache-first offline");
  assert.ok(toolSw.includes("core/roman.mjs")&&toolSw.includes("core/converter.mjs"));
  assert.ok(worker.includes("/api/v1/typing/lexicon?format=words"));
  assert.ok(worker.includes("words.length!==34571"),"full lexicon validation must remain locked");
  assert.ok(app.includes("processing stays on this device"));
  assert.ok(app.includes("preeti-to-unicode")&&app.includes("unicode-to-preeti"));
  assert.ok(app.includes("e.key==='Tab'&&items.length&&commit(active,'')"),"Tab must accept the active Nepali word suggestion");
  assert.ok(app.includes("ArrowDown")&&app.includes("ArrowUp"),"keyboard suggestion navigation must remain available");
});

test("PWA install metadata and homepage install experience are present",()=>{
  const manifest=JSON.parse(read("public/manifest.webmanifest"));
  const home=read("src/components/HomeExperience.tsx");
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.scope,"/");
  assert.equal(manifest.icons.length,3);
  assert.deepEqual(manifest.shortcuts.map(x=>x.url),["/","/tools/astro","/time-machine","/samudaya","/tools"]);
  assert.ok(home.includes("beforeinstallprompt"));
  assert.ok(home.includes("appinstalled"));
  assert.ok(home.includes("WARM_OFFLINE"));
  assert.ok(home.includes("Install app"));
});

test("mobile flagship navigation and six Community Patro entries stay visible",()=>{
  const nav=read("src/components/MobilePrimaryNav.tsx");
  const home=read("src/components/HomeExperience.tsx");
  const hub=read("src/community/CommunityHub.tsx");
  const main=read("src/main.tsx");
  const router=read("src/PatroRouter.tsx");
  for(const route of ["/","/tools/astro","/time-machine","/samudaya","/tools"]){
    assert.ok(nav.includes(`href=\"${route}\"`)||nav.includes(`href="${route}"`),`mobile/nav route missing ${route}`);
  }
  for(const label of ["पात्रो","खगोलीय","समययन्त्र","समुदाय","टुल्स"])assert.ok(nav.includes(label),label);
  const communities=["/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri"];
  for(const route of communities){
    assert.ok(home.includes(route),`homepage community card missing ${route}`);
  }
  assert.ok(nav.includes("COMMUNITY_OPTIONS"),"mobile community sheet must use canonical six-calendar registry");
  assert.ok(hub.includes("COMMUNITY_OPTIONS"),"community hub must use canonical registry");
  assert.ok(main.includes("<MobilePrimaryNav />"),"mobile nav must be mounted globally");
  assert.ok(router.includes('if(path==="/samudaya")return <CommunityHub/>'),"/samudaya must resolve to a real page");
});

test("homepage includes date search and rotating On This Day without replacing calendar",()=>{
  const home=read("src/components/HomeExperience.tsx");
  const pages=read("src/AafnaiPages.tsx");
  assert.ok(home.includes('/api/v1/convert?bs='));
  assert.ok(home.includes('/api/v1/on-this-day?date='));
  assert.ok(home.includes("setInterval")&&home.includes("6000"));
  assert.ok(pages.includes("<MonthGrid"),"existing calendar grid must remain present");
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
  assert.ok(css.includes('.ap-tools-page .ap-tool-card[href="/tools/bstoad"]'));
  assert.ok(css.includes('.ap-tools-page .ap-tool-card[href="/tools/adtobs"]'));
  assert.ok(css.includes('.ap-launcher-item[href="/tools/bstoad"]'));
  assert.ok(css.includes('.ap-launcher-item[href="/tools/adtobs"]'));
  assert.ok(router.includes('path.match(/^\\/tools\\/([^/]+)$/)')||router.includes('const tool=path.match(/^\\/tools\\/([^/]+)$/)'),"legacy tool deep links must remain routable");
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

test("developer API is not advertised in the frontend launcher",()=>{
  const launcher=read("src/components/FeatureLauncher.tsx");
  assert.ok(!launcher.includes('href:"/developers"'));
  assert.ok(!launcher.includes("Developers · API"));
});
