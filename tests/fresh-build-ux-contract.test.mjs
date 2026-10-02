import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Nepali typing and Preeti converter use the packaged offline bundle",()=>{
  const adapter=read("src/features/nepali-tools/NepaliTools.tsx");
  const sw=read("public/sw.js");
  const toolSw=read("public/nepali-tools/sw.js");
  const app=read("public/nepali-tools/app.mjs");
  assert.ok(adapter.includes('const BASE = "/nepali-tools"'));
  assert.ok(adapter.includes('WARM_LANGUAGE_TOOLS'));
  for(const asset of ["/nepali-tools/index.html","/nepali-tools/app.mjs","/nepali-tools/worker.mjs","/nepali-tools/core/roman.mjs","/nepali-tools/core/converter.mjs"]){
    assert.ok(sw.includes(asset),`root PWA cache missing ${asset}`);
  }
  assert.ok(sw.includes('/api/v1/typing/lexicon?format=words'));
  assert.ok(sw.includes('const VERSION = "aafnai-pwa-v7"'));
  assert.ok(toolSw.includes("core/roman.mjs")&&toolSw.includes("core/converter.mjs"));
  assert.ok(app.includes("processing stays on this device"));
  assert.ok(app.includes("preeti-to-unicode")&&app.includes("unicode-to-preeti"));
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

test("mobile flagship navigation and six Community Patro cards stay visible",()=>{
  const chrome=read("src/components/AppChrome.tsx");
  const home=read("src/components/HomeExperience.tsx");
  for(const route of ["/","/tools/astro","/time-machine","/samudaya","/tools"]){
    assert.ok(chrome.includes(`href=\"${route}\"`)||chrome.includes(`href="${route}"`),`mobile/nav route missing ${route}`);
  }
  for(const label of ["पात्रो","खगोलीय","समययन्त्र","समुदाय","आफ्नै टुल्स"])assert.ok(chrome.includes(label),label);
  const communities=["/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri"];
  for(const route of communities)assert.ok(home.includes(route),`homepage community card missing ${route}`);
  assert.ok(home.includes("COMMUNITY PATRO"));
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
  const storage=read("src/patro-tools-integration/storage.ts");
  assert.ok(storage.includes('inputMode: "english" | "nepali" | "voice"'));
  assert.ok(diary.includes('new Worker("/nepali-tools/worker.mjs"'));
  assert.ok(diary.includes('type:"suggest"')||diary.includes('type: "suggest"'));
  assert.ok(diary.includes("SpeechRecognition")&&diary.includes("webkitSpeechRecognition"));
  assert.ok(diary.includes("English typing")&&diary.includes("नेपाली typing")&&diary.includes("Voice typing"));
  assert.ok(diary.includes("life.notes"));
});

test("developer API is not advertised in the frontend launcher",()=>{
  const launcher=read("src/components/FeatureLauncher.tsx");
  assert.ok(!launcher.includes('href:"/developers"'));
  assert.ok(!launcher.includes("Developers · API"));
});
