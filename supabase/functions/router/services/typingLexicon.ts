import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SOURCE_URL = "https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/ne/index.dic";
const SOURCE_SHA256 = "dfc130b2ccbaeee54a859bdc512c27107eb6efa6ae5167615a65df83377ba427";
const SOURCE_BLOB = "c6f72034f0c96f2cdfc54c3d61eb07ccc97c18ac";
const EDITORIAL_ADDITIONS = ["अक्षरहरू","कस्ती","क्षमता","गर्नुहोस्","छ","टाइपिङ","ठीकै","तपाईं","दशैं","नागरिकता","फाल्गुन","म","मंसिर","र","राशिफल","रिश्ता","शिक्षिका","सन्चै","साथीहरू","स्वीकृति","हजुर","हस्","हुन्छ","हुन्छु"];
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,apikey,x-client-info",
};
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const ETAG = '"typing-lexicon-1.0.0-dfc130b2"';

type Lexicon = { words: string[]; sourceWordCount: number; canonicalSourceCount: number };
let cached: Promise<Lexicon> | null = null;

function hex(bytes: Uint8Array) {
  return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function loadLexicon(): Promise<Lexicon> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(SOURCE_URL, {
      headers: { accept: "text/plain", "user-agent": "NepalMitiTyping/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("dictionary_source_" + response.status);
    const raw = await response.text();
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)));
    if (hex(digest) !== SOURCE_SHA256) throw new Error("dictionary_source_checksum_changed");

    const sourceWords = [...new Set(
      raw.split(/\r?\n/)
        .map((line) => line.split("/")[0].trim().normalize("NFC"))
        .filter((word) => /^[अ-हक़-य़][\u0900-\u0963]*$/u.test(word) && word.length >= 2 && !word.endsWith("्"))
    )];
    const canonicalSource = [...new Set(sourceWords.map((word) => word.replaceAll("अा", "आ")))];
    const words = [...new Set([...canonicalSource, ...EDITORIAL_ADDITIONS])].sort();
    if (sourceWords.length !== 34548 || canonicalSource.length !== 34547 || words.length !== 34571) {
      throw new Error("dictionary_count_mismatch");
    }
    return { words, sourceWordCount: sourceWords.length, canonicalSourceCount: canonicalSource.length };
  } finally {
    clearTimeout(timer);
  }
}

async function lexicon() {
  if (!cached) cached = loadLexicon().catch((error) => { cached = null; throw error; });
  return cached;
}

function baseHeaders(contentType: string) {
  return {
    ...CORS,
    "content-type": contentType,
    "cache-control": CACHE,
    "etag": ETAG,
    "x-content-type-options": "nosniff",
    "x-lexicon-version": "1.0.0",
  };
}

export async function handleTypingLexicon(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "method_not_allowed" }), {
    status: 405, headers: baseHeaders("application/json; charset=utf-8")
  });
  if (request.headers.get("if-none-match") === ETAG) return new Response(null, { status: 304, headers: baseHeaders("text/plain; charset=utf-8") });

  try {
    const data = await lexicon();
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "manifest";

    if (format === "words" || format === "txt") {
      return new Response(data.words.join("\n") + "\n", {
        status: 200,
        headers: {
          ...baseHeaders("text/plain; charset=utf-8"),
          "x-lexicon-count": String(data.words.length),
        },
      });
    }

    if (format !== "manifest") {
      return new Response(JSON.stringify({ error: "unsupported_format", supported: ["manifest","words"] }), {
        status: 400, headers: baseHeaders("application/json; charset=utf-8")
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      version: "1.0.0",
      count: data.words.length,
      unique_count: data.words.length,
      source_word_count: data.sourceWordCount,
      canonical_source_count: data.canonicalSourceCount,
      editorial_additions: EDITORIAL_ADDITIONS.length,
      source_blob: SOURCE_BLOB,
      source_sha256: SOURCE_SHA256,
      source: "https://github.com/wooorm/dictionaries/tree/main/dictionaries/ne",
      source_license: "LGPL-2.1",
      upstream_release: "2008-04-25",
      words_endpoint: "?format=words",
      privacy: "Dictionary delivery only; typed text is never sent to this endpoint.",
    }), {
      status: 200,
      headers: baseHeaders("application/json; charset=utf-8"),
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "lexicon_failed",
    }), {
      status: 503,
      headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
}