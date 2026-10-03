import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const files = [
  "src/AafnaiPages.tsx",
  "src/AafnaiDetailPages.tsx",
  "src/components/TrustPages.tsx",
  "src/components/NativeProtectedPages.tsx",
  "src/components/JyotishAssistant.tsx",
  "src/SeoAuthorityPages.tsx",
  "src/utilities/UtilitySuite.tsx",
  "src/utilities/ReferenceUtilities.tsx",
  "src/media/MediaSuite.tsx",
  "src/patro-tools-integration/PatroToolsShell.tsx",
  "src/patro-tools-integration/TithiReminderTool.tsx",
  "src/features/nepali-tools/NepaliTools.tsx",
  "src/jyotish/JanmaPatroSuite.tsx",
  "src/community/CommunityHub.tsx",
  "src/community/CommunityPreferences.tsx",
  "public/nepali-tools/index.html",
  "public/nepali-tools/app.mjs",
  "seo/search-intents.json",
  "scripts/prerender-seo.mjs"
];

const forbidden = [
  ["under development", /under development/i],
  ["coming soon", /coming soon/i],
  ["placeholder", /placeholder(?: page| content| text)/i],
  ["legacy MeroPatro brand", /\bMeroPatro\b|मेरो पात्रो/],
  ["reference-friendly alias", /reference-friendly alias/i],
  ["verified migrated", /verified migrated/i],
  ["migration snapshot", /migration snapshot/i],
  ["source confidence", /source confidence/i],
  ["provisional future table", /provisional future table/i],
  ["validated archive range", /validated archive range/i],
  ["validated calendar engine", /validated (?:Patro )?calendar engine/i],
  ["engine-generated consumer copy", /engine-generated/i],
  ["official override implementation copy", /officially-overridden/i],
  ["home card implementation copy", /home date card/i],
  ["shortcut implementation copy", /related shortcut/i],
  ["server fallback", /server fallback/i],
  ["Cloudflare D1 in consumer UI", /Cloudflare D1/i],
  ["D1 implementation copy", /D1 (?:seed|publication|table|critical)/i],
  ["native bundle implementation copy", /native\/bundle/i],
  ["critical-path implementation copy", /critical path/i],
  ["Supabase in consumer UI", /Supabase(?: dictionary| delivery| backend| runtime)?/i],
  ["AI provider setup jargon", /Cloudflare मा AI secret|Groq API|NVIDIA API|AI secret/i],
  ["this build", /this build/i],
  ["canonical dataset", /canonical dataset/i],
  ["canonical inventory", /canonical public inventory/i],
  ["browser test implementation copy", /browser (?:checks|route checks)/i],
  ["client-only", /client-only/i],
  ["directory fallback banner", /Live directory fallback active/i],
  ["source-verified snapshot", /source-verified snapshot/i],
  ["crawlable-text implementation copy", /crawlable text/i],
  ["browser-worker implementation copy", /browser Worker/i],
  ["worker failure implementation copy", /Worker failed|conversion worker/i],
  ["diagnostic-report implementation copy", /diagnostic report/i],
  ["Cloud sync implementation copy", /Cloud sync/i],
  ["Google login implementation copy", /Google login/i],
  ["data provenance implementation link", />Data provenance</i]
];

const failures = [];
for (const path of files) {
  const text = await readFile(resolve(root, path), "utf8");
  for (const [label, pattern] of forbidden) {
    const hit = text.match(pattern);
    if (hit) failures.push(`${path}: ${label} (${JSON.stringify(hit[0])})`);
  }
}

if (failures.length) {
  console.error("Public copy quality gate failed:\n" + failures.map((x) => `- ${x}`).join("\n"));
  process.exit(1);
}

console.log(`Public copy quality gate passed across ${files.length} user-facing surfaces.`);
