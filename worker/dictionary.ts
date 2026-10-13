/**
 * Nepali dictionary on the Worker (/tool/nepalidictionary).
 *
 *  • Word pages /tool/nepalidictionary/<शब्द>, A–Z /akshar/<अ>[/n], rhymes /anupras/<शब्द> and English /en/<word>
 *    are rendered here from the static shards in /data/dict/v1 (one file per 256 words), so
 *    tens of thousands of indexable URLs cost zero stored HTML files. Spelling variants and
 *    inflected forms 301 to the headword (शहर → सहर, गरेको → गर्नु).
 *  • Fixed pages (home, ukhan, English hub, lists, quiz, spell-check) are prerendered at build time and
 *    served by connected-entry like every other prerendered route.
 *  • /api/v1/dictionary/* stores a signed-in learner's saved words + quiz history in D1.
 *
 * Browser lookups read /data/dict/v1 directly (static assets, never billed as Worker requests).
 */
import {
  DICT_BASE_PATH, cleanLemma, computeKeys, devKey, englishBucket, englishFromSlug, englishHead, englishSlug, fillShell,
  browsePath, findRhymes, generateForms, hasDevanagari, lemmaCandidates, NE_MORPH, renderBrowsePage, renderEnglishWord, renderRhymePage, renderWord, rhymeHead, rhymeShardKey,
  rhymeShardPath, romanKey, searchRows, stubFromRow, unpackRhyme, wordHead, wordPath, wordShardPath, type PackedRhyme, type EnHitLite, type HeadData, type IndexRow, type WordPayload,
} from "../src/lib/dictionary-core/index.ts";
import { devBucket, latinBucket } from "../src/features/dictionary/client/buckets.ts";
import siteConfig from "../data/dictionary/config.json";
import { currentSession, parseBody } from "./auth";

type AssetBinding = { fetch(request: Request): Promise<Response> };
type Env = Record<string, unknown> & { ASSETS?: AssetBinding; DB?: any; PUBLIC_SITE_URL?: string };

const DATA = "/data/dict/v1";
const API = "/api/v1/dictionary";
/** First path segments that belong to prerendered/SPA pages, not to words. */
const RESERVED = new Set(["ukhan", "akshar", "anupras", "en", "sikau", "abhyas", "pariksha", "shuddha"]);

const site = (env: Env) => ({
  origin: String(env.PUBLIC_SITE_URL || siteConfig.origin).replace(/\/+$/, ""),
  siteName: siteConfig.siteName,
  dictName: siteConfig.dictName,
  ogImage: siteConfig.ogImage,
});

// ───────────────────────── static data (per-isolate cache) ─────────────────────────

const MAX_CACHED = 32;
const memo = new Map<string, Promise<any>>();
async function asset<T>(request: Request, env: Env, path: string, as: "json" | "text" = "json"): Promise<T | null> {
  if (!env.ASSETS) return null;
  const hit = memo.get(path);
  if (hit) {
    memo.delete(path); // LRU: move to the end
    memo.set(path, hit);
    return hit;
  }
  const p = (async () => {
    const url = new URL(request.url);
    url.pathname = path;
    url.search = "";
    let res = await env.ASSETS!.fetch(new Request(url.toString(), { method: "GET" }));
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      res = await env.ASSETS!.fetch(new Request(new URL(res.headers.get("location")!, url).toString(), { method: "GET" }));
    }
    if (!res.ok) return null;
    return as === "json" ? res.json() : res.text();
  })().catch(() => null);
  memo.set(path, p);
  while (memo.size > MAX_CACHED) memo.delete(memo.keys().next().value as string);
  const v = await p;
  if (v === null) memo.delete(path); // don't pin failures
  return v as T | null;
}

const shell = (r: Request, e: Env) => asset<string>(r, e, `${DATA}/shell.html`, "text");
const manifest = (r: Request, e: Env) => asset<{ builtAt?: string }>(r, e, `${DATA}/manifest.json`);

async function indexRows(request: Request, env: Env, term: string): Promise<IndexRow[]> {
  const files = new Set<string>();
  if (hasDevanagari(term)) {
    for (const c of lemmaCandidates(term)) {
      const b = devBucket(devKey(c));
      if (b) files.add(`${DATA}/idx/d-${b}.json`);
    }
  } else {
    const b = latinBucket(romanKey(term));
    if (b.length === 2) files.add(`${DATA}/idx/l-${b}.json`);
  }
  const lists = await Promise.all([...files].map((f) => asset<IndexRow[]>(request, env, f)));
  const seen = new Set<string>();
  const out: IndexRow[] = [];
  for (const list of lists) for (const r of list ?? []) if (!seen.has(r[0])) (seen.add(r[0]), out.push(r));
  return out;
}

// ───────────────────────── HTML ─────────────────────────

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-patro-backend": "dictionary-static-shards",
};

function htmlResponse(request: Request, html: string, status: number, robots: string, maxAge = 3600) {
  const headers = new Headers(HTML_HEADERS);
  headers.set("cache-control", status === 200 ? `public, max-age=${maxAge}, s-maxage=86400, stale-while-revalidate=604800` : "public, max-age=300");
  headers.set("x-robots-tag", robots);
  return new Response(request.method === "HEAD" ? null : html, { status, headers });
}

function redirect(request: Request, to: string) {
  const url = new URL(request.url);
  url.pathname = to;
  url.search = "";
  return new Response(null, { status: 301, headers: { location: url.toString(), "cache-control": "public, max-age=86400" } });
}

async function wordPage(request: Request, env: Env, raw: string): Promise<Response | null> {
  const tpl = await shell(request, env);
  if (!tpl) return null; // data not deployed — let the SPA handle it
  const slug = cleanLemma(raw);
  const S = site(env);
  const shard = await asset<Record<string, WordPayload>>(request, env, `${DATA}/${wordShardPath(slug)}`);
  const p = shard?.[slug];
  if (p) {
    const head = wordHead(p.entry, p.keys.slug, p.keys.roman, S);
    if (raw !== p.keys.slug) return redirect(request, wordPath(p.keys.slug));
    return htmlResponse(request, fillShell(tpl, head, S.siteName, renderWord(p), { kind: "word", payload: p }), 200, head.robots ?? "index, follow");
  }
  // Not a defined headword: known stub, spelling variant / inflected form, or unknown.
  const rows = await indexRows(request, env, slug);
  const exact = rows.find((r) => r[0] === slug);
  if (exact) {
    const entry = stubFromRow(exact);
    const keys = computeKeys(entry);
    const forms = entry.inflection ? generateForms(entry.inflection.stem, entry.inflection.flags, NE_MORPH, 60).filter((f) => f !== entry.lemma) : [];
    const payload: WordPayload = { entry, keys, links: { synonyms: [], antonyms: [], related: [], variants: [] }, proverbs: [], rhymes: [], ...(forms.length ? { forms } : {}) };
    const head = { ...wordHead(entry, keys.slug, keys.roman, S), robots: "noindex, follow" };
    return htmlResponse(request, fillShell(tpl, head, S.siteName, renderWord(payload)), 200, "noindex, follow");
  }
  const hit = searchRows(rows, slug, 1)[0];
  if (hit && hit.slug !== slug && (hit.via === "exact" || hit.via === "variant" || hit.via === "roman")) {
    return redirect(request, wordPath(hit.slug));
  }
  return notFound(request, env, tpl, `"${slug}" शब्दकोशमा भेटिएन`);
}

async function rhymePage(request: Request, env: Env, raw: string): Promise<Response | null> {
  const tpl = await shell(request, env);
  if (!tpl) return null;
  const slug = cleanLemma(raw);
  const p = (await asset<Record<string, WordPayload>>(request, env, `${DATA}/${wordShardPath(slug)}`))?.[slug];
  if (!p?.rhymePage) return null; // thin rhyme lists stay app-only (noindex) — the SPA renders them
  const { single, slant } = p.keys.rhyme;
  const [a, b] = await Promise.all([
    single ? asset<Record<string, PackedRhyme[]>>(request, env, `${DATA}/${rhymeShardPath('s', single)}`) : null,
    slant ? asset<Record<string, PackedRhyme[]>>(request, env, `${DATA}/${rhymeShardPath('l', slant)}`) : null,
  ]);
  const rows = [...(a?.[rhymeShardKey('s', single)] ?? []), ...(b?.[rhymeShardKey('l', slant)] ?? [])].map(unpackRhyme);
  const me = { slug: p.keys.slug, lemma: p.entry.lemma, roman: p.keys.roman, syllables: p.keys.syllables, rhyme: p.keys.rhyme };
  const hits = findRhymes(me, rows, { limit: (siteConfig as any).rhymePages?.maxWords ?? 200 });
  const S = site(env);
  const head = rhymeHead(p.entry.lemma, p.keys.slug, p.keys.roman, hits.length, S, true);
  return htmlResponse(request, fillShell(tpl, head, S.siteName, renderRhymePage(p.entry.lemma, p.keys.slug, p.keys.roman, hits), { kind: "rhyme", slug: p.keys.slug }), 200, "index, follow");
}

async function browsePage(request: Request, env: Env, ch: string, pageRaw?: string): Promise<Response | null> {
  const tpl = await shell(request, env);
  if (!tpl) return null;
  const S = site(env);
  const page = pageRaw === undefined ? 1 : Number(pageRaw);
  if ([...ch].length !== 1 || !Number.isInteger(page) || (pageRaw !== undefined && (page < 2 || String(page) !== pageRaw))) return notFound(request, env, tpl, "पृष्ठ भेटिएन");
  const hex = ch.codePointAt(0)!.toString(16);
  const [items, initials] = await Promise.all([
    asset<Array<{ slug: string; lemma: string; roman: string }>>(request, env, `${DATA}/browse/${hex}.json`),
    asset<string[]>(request, env, `${DATA}/browse/index.json`),
  ]);
  const r = items?.length ? renderBrowsePage(ch, page, items, initials ?? []) : null;
  if (!r || !items) return notFound(request, env, tpl, `"${ch}" बाट सुरु हुने शब्द भेटिएन`);
  const head: HeadData = {
    title: `"${ch}" बाट सुरु हुने नेपाली शब्द${page > 1 ? ` (पृष्ठ ${page})` : ''} | ${S.dictName}`,
    description: `"${ch}" अक्षरबाट सुरु हुने ${items.length} नेपाली शब्द र तिनको अर्थ।`,
    canonical: S.origin + browsePath(ch, page).split('/').map((x) => encodeURIComponent(x)).join('/'),
    jsonLd: [],
  };
  return htmlResponse(request, fillShell(tpl, head, S.siteName, r.html, { kind: "browse", initial: ch, page }), 200, "index, follow");
}

async function englishPage(request: Request, env: Env, rawSlug: string): Promise<Response | null> {
  const tpl = await shell(request, env);
  if (!tpl) return null;
  const key = englishFromSlug(rawSlug);
  if (!key || !/^[a-z' -]+$/.test(key)) return notFound(request, env, tpl, "English word not found");
  const canonicalSlug = englishSlug(key);
  if (rawSlug !== canonicalSlug) return redirect(request, `${DICT_BASE_PATH}/en/${encodeURIComponent(canonicalSlug)}`);
  const bucket = await asset<Record<string, EnHitLite[]>>(request, env, `${DATA}/en/${englishBucket(key)}.json`);
  const hits = bucket?.[key] ?? [];
  if (!hits.length) return notFound(request, env, tpl, `"${key}" — Nepali meaning not found yet`);
  const S = site(env);
  const head = englishHead(key, hits, S);
  return htmlResponse(request, fillShell(tpl, head, S.siteName, renderEnglishWord(key, hits), { kind: "en", key, hits }), 200, "index, follow");
}

function notFound(request: Request, env: Env, tpl: string, message: string) {
  const S = site(env);
  const head: HeadData = { title: `${message} | ${S.dictName}`, description: message, canonical: S.origin + DICT_BASE_PATH, robots: "noindex, follow", jsonLd: [] };
  // The SPA boots on this shell and shows suggestions; the status tells crawlers the truth.
  return htmlResponse(request, fillShell(tpl, head, S.siteName, ""), 404, "noindex, follow");
}

// ───────────────────────── API: saved words + quiz history ─────────────────────────

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" } });

type Card = { id: string; front: string; back: string; dir: "ne-en" | "en-ne"; ease: number; interval: number; reps: number; due: number; added: number };
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v: unknown, lo: number, hi: number, d: number) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Math.round(Number(v)))) : d);
function cleanCard(c: any): Card | null {
  const id = str(c?.id, 120).trim();
  const front = str(c?.front, 200).trim();
  if (!id || !front) return null;
  return {
    id, front, back: str(c?.back, 400), dir: c?.dir === "en-ne" ? "en-ne" : "ne-en",
    ease: Math.min(4, Math.max(1.3, Number(c?.ease) || 2.5)), interval: int(c?.interval, 0, 3650, 0), reps: int(c?.reps, 0, 10000, 0),
    due: int(c?.due, 0, 1e6, 0), added: int(c?.added, 0, 1e6, 0),
  };
}

async function apiResponse(request: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD" && request.headers.get("origin") !== url.origin) return json({ ok: false, error: "same_origin_required" }, 403);
  if (!env.DB) return json({ ok: false, error: "storage_unavailable" }, 503);
  const session: any = await currentSession(request, env as any).catch(() => null);
  if (!session) return json({ ok: false, error: "authentication_required" }, 401);
  const uid = session.user_id;

  if (path === `${API}/cards`) {
    if (request.method === "GET") {
      const rows = await env.DB.prepare("select card_id,front,back,dir,ease,interval_d,reps,due_day,added_day from dict_saved_words where user_id=?1 order by added_day desc limit 5000").bind(uid).all();
      const cards: Card[] = (rows?.results ?? []).map((r: any) => ({ id: r.card_id, front: r.front, back: r.back, dir: r.dir, ease: r.ease, interval: r.interval_d, reps: r.reps, due: r.due_day, added: r.added_day }));
      return json({ ok: true, cards });
    }
    if (request.method === "PUT") {
      let body: any;
      try {
        body = await parseBody(request, 256 * 1024);
      } catch {
        return json({ ok: false, error: "invalid_json" }, 400);
      }
      const cards = (Array.isArray(body?.cards) ? body.cards : []).slice(0, 200).map(cleanCard).filter(Boolean) as Card[];
      if (!cards.length) return json({ ok: true, count: 0 });
      const count = await env.DB.prepare("select count(*) as n from dict_saved_words where user_id=?1").bind(uid).first();
      if (Number(count?.n ?? 0) + cards.length > 5000) return json({ ok: false, error: "too_many_cards" }, 413);
      const stmt = env.DB.prepare(
        "insert into dict_saved_words(user_id,card_id,front,back,dir,ease,interval_d,reps,due_day,added_day,updated_at) values(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,datetime('now')) " +
          "on conflict(user_id,card_id) do update set front=excluded.front,back=excluded.back,dir=excluded.dir,ease=excluded.ease,interval_d=excluded.interval_d,reps=excluded.reps,due_day=excluded.due_day,updated_at=datetime('now')",
      );
      await env.DB.batch(cards.map((c) => stmt.bind(uid, c.id, c.front, c.back, c.dir, c.ease, c.interval, c.reps, c.due, c.added)));
      return json({ ok: true, count: cards.length });
    }
    if (request.method === "DELETE") {
      const id = str(url.searchParams.get("id"), 120);
      if (!id) return json({ ok: false, error: "id_required" }, 400);
      await env.DB.prepare("delete from dict_saved_words where user_id=?1 and card_id=?2").bind(uid, id).run();
      return json({ ok: true, deleted: id });
    }
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  if (path === `${API}/quiz` && request.method === "POST") {
    let body: any;
    try {
      body = await parseBody(request, 4 * 1024);
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }
    const mode = str(body?.mode, 32);
    if (!/^[a-z-]{3,32}$/.test(mode)) return json({ ok: false, error: "invalid_mode" }, 400);
    const total = int(body?.total, 1, 100, 10);
    await env.DB.prepare("insert into dict_quiz_results(user_id,mode,level,score,total) values(?1,?2,?3,?4,?5)")
      .bind(uid, mode, str(body?.level, 8) || null, int(body?.score, 0, total, 0), total).run();
    return json({ ok: true });
  }
  return json({ ok: false, error: "api_route_not_found" }, 404);
}

// ───────────────────────── entry ─────────────────────────

export async function dictionaryResponse(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === API || path.startsWith(API + "/")) return apiResponse(request, env, path);
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!path.startsWith(DICT_BASE_PATH + "/")) return null;

  const segs = path.slice(DICT_BASE_PATH.length + 1).replace(/\/+$/, "").split("/");
  let decoded: string[];
  try {
    decoded = segs.map((s) => decodeURIComponent(s));
  } catch {
    return null;
  }
  const isWord = decoded.length === 1 && decoded[0] && !RESERVED.has(decoded[0]);
  const isEnglish = decoded.length === 2 && decoded[0] === "en" && decoded[1];
  const isRhyme = decoded.length === 2 && decoded[0] === "anupras" && decoded[1];
  const isBrowse = (decoded.length === 2 || decoded.length === 3) && decoded[0] === "akshar" && decoded[1];
  if (!isWord && !isEnglish && !isRhyme && !isBrowse) return null; // prerendered/SPA pages → connected-entry
  if (url.search) return null; // only canonical URLs are cached/rendered here

  // Edge cache keyed by data build, so a deploy never serves pages from the previous data.
  const version = (await manifest(request, env))?.builtAt ?? "0";
  const cacheKey = new Request(`${url.origin}${path}?__dict=${encodeURIComponent(version)}`, { method: "GET" });
  const cache = typeof caches !== "undefined" ? (caches as any).default as Cache : null;
  const cached = request.method === "GET" ? await cache?.match(cacheKey).catch(() => undefined) : undefined;
  if (cached) return cached;

  const res = isBrowse ? await browsePage(request, env, decoded[1], decoded[2]) : isWord ? await wordPage(request, env, decoded[0]) : isRhyme ? await rhymePage(request, env, decoded[1]) : await englishPage(request, env, decoded[1]);
  if (res && res.status === 200 && request.method === "GET" && cache) {
    const put = cache.put(cacheKey, res.clone()).catch(() => {});
    if (ctx) ctx.waitUntil(put);
  }
  return res;
}
