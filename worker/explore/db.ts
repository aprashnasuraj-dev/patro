/** Minimal D1 surface used by the explore engine (matches Cloudflare's D1Database). */
export type D1Like = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
    };
  };
};

export type ExploreRow = {
  id: number;
  family: string;
  path: string;
  parent_path: string | null;
  sort_key: number;
  title: string;
  title_ne: string | null;
  description: string;
  body_json: string;
  facts_count: number;
  source_name: string | null;
  source_url: string | null;
  indexable: number;
  lastmod: string;
  content_hash: string;
};

export type LinkRow = { path: string; title: string; title_ne: string | null };
export type ShardRow = { family: string; shard: number; min_id: number; max_id: number; url_count: number; lastmod: string | null };

const PAGE_COLUMNS =
  "id,family,path,parent_path,sort_key,title,title_ne,description,body_json,facts_count,source_name,source_url,indexable,lastmod,content_hash";

/** One indexed lookup on the UNIQUE(path) index. */
export function getPage(db: D1Like, family: string, path: string) {
  return db.prepare(`SELECT ${PAGE_COLUMNS} FROM explore_pages WHERE path = ?1 AND family = ?2`).bind(path, family).first<ExploreRow>();
}

/** Titles for the ancestor chain (breadcrumbs) in one query. */
export async function getTitles(db: D1Like, paths: string[]): Promise<Map<string, LinkRow>> {
  const out = new Map<string, LinkRow>();
  if (!paths.length) return out;
  const marks = paths.map((_, i) => `?${i + 1}`).join(",");
  const { results } = await db.prepare(`SELECT path,title,title_ne FROM explore_pages WHERE path IN (${marks})`).bind(...paths).all<LinkRow>();
  for (const row of results) out.set(row.path, row);
  return out;
}

/** Children of a page (uses the parent_path index). Capped so a huge parent can never blow the CPU budget. */
export async function getChildren(db: D1Like, parentPath: string, limit = 400): Promise<LinkRow[]> {
  const { results } = await db
    .prepare("SELECT path,title,title_ne FROM explore_pages WHERE parent_path = ?1 ORDER BY sort_key, title LIMIT ?2")
    .bind(parentPath, limit)
    .all<LinkRow>();
  return results;
}

export async function getShards(db: D1Like): Promise<ShardRow[]> {
  const { results } = await db.prepare("SELECT family,shard,min_id,max_id,url_count,lastmod FROM explore_shards ORDER BY family, shard").bind().all<ShardRow>();
  return results;
}

export function getShard(db: D1Like, family: string, shard: number) {
  return db.prepare("SELECT family,shard,min_id,max_id,url_count,lastmod FROM explore_shards WHERE family = ?1 AND shard = ?2").bind(family, shard).first<ShardRow>();
}

/** Keyset range read on (family, indexable, id): never OFFSET, so shard 199 costs the same as shard 0. */
export async function getShardUrls(db: D1Like, family: string, minId: number, maxId: number): Promise<{ path: string; lastmod: string }[]> {
  const { results } = await db
    .prepare("SELECT path,lastmod FROM explore_pages WHERE family = ?1 AND indexable = 1 AND id BETWEEN ?2 AND ?3 ORDER BY id")
    .bind(family, minId, maxId)
    .all<{ path: string; lastmod: string }>();
  return results;
}
