import type { MyTimeSnapshot } from "../../patro-tools/core/my-time-snapshot";

const DB_NAME = "aafnaipatro-mytime";
const STORE_NAME = "snapshots";
const DB_VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000;
type CachedRow = { key: string; savedAt: number; snapshot: MyTimeSnapshot };

export function myTimeCacheKey(date: string, timezone: string, lat: number, lng: number) {
  return ["v1", date, timezone, lat.toFixed(4), lng.toFixed(4)].join("|");
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
      void new Promise<void>(resolve => { const tx=db!.transaction(STORE_NAME,"readwrite");tx.objectStore(STORE_NAME).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve(); });
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
      tx.objectStore(STORE_NAME).put({key,savedAt:Date.now(),snapshot} satisfies CachedRow);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("indexeddb_write_failed"));
      tx.onabort = () => reject(tx.error || new Error("indexeddb_write_aborted"));
    });
  } finally { db?.close(); }
}
