import type { MyTimeSnapshot } from "../../patro-tools/core/my-time-snapshot";

const DB_NAME = "aafnaipatro-mytime";
const STORE_NAME = "snapshots";
const DB_VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20;
type CachedRow = { key: string; savedAt: number; snapshot: MyTimeSnapshot };

/** Return expired and least-recently-saved keys to evict, keeping a bounded 24-hour cache. */
export function myTimeCacheEvictions(rows: Array<{ key: string; savedAt: number }>, now = Date.now(), maxEntries = MAX_ENTRIES): string[] {
  const valid = rows.filter(row => Number.isFinite(row.savedAt) && row.savedAt <= now && now - row.savedAt <= TTL_MS)
    .sort((a, b) => b.savedAt - a.savedAt);
  const keep = new Set(valid.slice(0, Math.max(0, maxEntries)).map(row => row.key));
  return rows.filter(row => !keep.has(row.key)).map(row => row.key);
}

export function myTimeCacheKey(date: string, timezone: string, lat: number, lng: number) {
  return ["v3-20261022", date, timezone, lat.toFixed(6), lng.toFixed(6)].join("|");
}
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("indexeddb_unavailable")); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME,{keyPath:"key"});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexeddb_open_failed"));
  });
}
export async function readMyTimeSnapshot(key: string): Promise<MyTimeSnapshot | null> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const row = await new Promise<CachedRow | undefined>((resolve,reject) => {
      const tx = db!.transaction(STORE_NAME,"readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result as CachedRow | undefined);
      request.onerror = () => reject(request.error || new Error("indexeddb_read_failed"));
    });
    if (!row) return null;
    if (!Number.isFinite(row.savedAt) || Date.now() - row.savedAt > TTL_MS) {
      await new Promise<void>(resolve => { const tx=db!.transaction(STORE_NAME,"readwrite");tx.objectStore(STORE_NAME).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve(); });
      return null;
    }
    return row.snapshot;
  } catch { return null; }
  finally { db?.close(); }
}
export async function writeMyTimeSnapshot(key: string, snapshot: MyTimeSnapshot): Promise<void> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    await new Promise<void>((resolve,reject) => {
      const tx = db!.transaction(STORE_NAME,"readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({key,savedAt:Date.now(),snapshot} satisfies CachedRow);
      const all = store.getAll();
      all.onsuccess = () => {
        const rows = all.result as CachedRow[];
        for (const staleKey of myTimeCacheEvictions(rows)) store.delete(staleKey);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("indexeddb_write_failed"));
      tx.onabort = () => reject(tx.error || new Error("indexeddb_write_aborted"));
    });
  } finally { db?.close(); }
}
