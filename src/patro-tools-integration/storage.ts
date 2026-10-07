import type { PersonalTithiEvent } from "@/patro-tools/tithi-events/events";
import type { Sealed } from "@/patro-tools/letters/crypto";

const LIFE_KEY = "nepalmiti.life.v1";
const OWNER_KEY = "patro.account.active";
export function lifeAccount() { return localStorage.getItem(OWNER_KEY) || ""; }
function storageKey() { const owner = lifeAccount(); return owner ? LIFE_KEY + ".account:" + owner : LIFE_KEY; }
export function switchLifeAccount(id: string | null) {
  const previous = lifeAccount();
  if (id) {
    const guest = localStorage.getItem(LIFE_KEY);
    if (!localStorage.getItem(LIFE_KEY + ".account:" + id) && guest && !localStorage.getItem("patro.guest.claimed")) {
      localStorage.setItem(LIFE_KEY + ".account:" + id, guest);
      localStorage.setItem("patro.guest.claimed", id);
    }
    localStorage.setItem(OWNER_KEY,id);
  } else localStorage.removeItem(OWNER_KEY);
  if (previous !== (id || "")) window.dispatchEvent(new CustomEvent("patro:life-updated",{detail:{accountChanged:true}}));
}

export type StoredTithiEvent = PersonalTithiEvent & {
  sourceDate: string;
  updatedAt: number;
};

export type StoredFutureLetter = {
  id: string;
  recipientName: string;
  teaser?: string;
  openAt: string;
  openAtLabel: string;
  sealed: Sealed;
  createdAt: string;
  updatedAt: number;
};

export type StoredNameCheck = {
  id: string;
  documentA: string;
  nameA: string;
  documentB: string;
  nameB: string;
  updatedAt: number;
};

export type StoredNote = {
  id: string;
  text: string;
  inputMode: "english" | "nepali" | "voice";
  createdAt: string;
  updatedAt: number;
};

export type LifeState = {
  version: number;
  notes: StoredNote[];
  due: Array<Record<string, unknown>>;
  family: Array<Record<string, unknown>>;
  docs: Array<Record<string, unknown>>;
  festivalPlans: Array<Record<string, unknown>>;
  tithiEvents: StoredTithiEvent[];
  nameChecks: StoredNameCheck[];
  futureLetters: StoredFutureLetter[];
  updatedAt: number;
  [key: string]: unknown;
};

const EMPTY: LifeState = {
  version: 1,
  notes: [],
  due: [],
  family: [],
  docs: [],
  festivalPlans: [],
  tithiEvents: [],
  nameChecks: [],
  futureLetters: [],
  updatedAt: 0,
};

function objectRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === "object") : [];
}

export function readLife(): LifeState {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey()) || "{}") as Record<string, unknown>;
    return {
      ...EMPTY,
      ...parsed,
      notes: Array.isArray(parsed.notes) ? parsed.notes as StoredNote[] : [],
      due: objectRows(parsed.due),
      family: objectRows(parsed.family),
      docs: objectRows(parsed.docs),
      festivalPlans: objectRows(parsed.festivalPlans),
      tithiEvents: Array.isArray(parsed.tithiEvents) ? parsed.tithiEvents as StoredTithiEvent[] : [],
      nameChecks: Array.isArray(parsed.nameChecks) ? parsed.nameChecks as StoredNameCheck[] : [],
      futureLetters: Array.isArray(parsed.futureLetters) ? parsed.futureLetters as StoredFutureLetter[] : [],
      updatedAt: Number(parsed.updatedAt || 0),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeLife(next: LifeState, synced = false) {
  const value = { ...next, version: 1, updatedAt: Date.now() };
  localStorage.setItem(storageKey(), JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("patro:life-updated", { detail: { updatedAt: value.updatedAt, synced } }));
  return value;
}

export function updateLife(updater: (current: LifeState) => LifeState) {
  const before = readLife(), next = updater(before);
  const deleted = { ...(before.deleted as Record<string, number> || {}) };
  for (const key of ["notes","due","family","docs","festivalPlans","tithiEvents","nameChecks","futureLetters"] as const) {
    const ids = new Set((next[key] as Array<{id?:string}>).map(row => row.id));
    for (const row of before[key] as Array<{id?:string}>) if (row.id && !ids.has(row.id)) deleted[key + ":" + row.id] = Date.now();
  }
  return writeLife({ ...next, deleted });
}

function mergeById<T extends { id?: string; updatedAt?: number }>(a: T[], b: T[]) {
  const rows = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const id = String(item?.id || "");
    if (!id) continue;
    const previous = rows.get(id);
    if (!previous || Number(item.updatedAt || 0) >= Number(previous.updatedAt || 0)) rows.set(id, item);
  }
  return [...rows.values()];
}

function mergeLife(local: LifeState, remoteRaw: unknown): LifeState {
  const remote = (remoteRaw && typeof remoteRaw === "object" ? remoteRaw : {}) as Partial<LifeState>;
  const merged: LifeState = {
    ...EMPTY,
    ...remote,
    ...local,
    notes: mergeById(Array.isArray(remote.notes) ? remote.notes as StoredNote[] : [], local.notes),
    due: mergeById(objectRows(remote.due) as Array<Record<string, unknown> & {id?:string;updatedAt?:number}>, local.due),
    family: mergeById(objectRows(remote.family) as Array<Record<string, unknown> & {id?:string;updatedAt?:number}>, local.family),
    docs: mergeById(objectRows(remote.docs) as Array<Record<string, unknown> & {id?:string;updatedAt?:number}>, local.docs),
    festivalPlans: mergeById(objectRows(remote.festivalPlans) as Array<Record<string, unknown> & {id?:string;updatedAt?:number}>, local.festivalPlans),
    tithiEvents: mergeById(Array.isArray(remote.tithiEvents) ? remote.tithiEvents as StoredTithiEvent[] : [], local.tithiEvents),
    nameChecks: mergeById(Array.isArray(remote.nameChecks) ? remote.nameChecks as StoredNameCheck[] : [], local.nameChecks),
    futureLetters: mergeById(Array.isArray(remote.futureLetters) ? remote.futureLetters as StoredFutureLetter[] : [], local.futureLetters),
    updatedAt: Math.max(Number(remote.updatedAt || 0), Number(local.updatedAt || 0)),
  };
  const deleted: Record<string,number> = {};
  for (const source of [remote.deleted, local.deleted]) if (source && typeof source === "object") for (const [key,value] of Object.entries(source)) deleted[key] = Math.max(deleted[key] || 0, Number(value) || 0);
  merged.deleted = deleted;
  for (const key of ["notes","due","family","docs","festivalPlans","tithiEvents","nameChecks","futureLetters"] as const) {
    (merged[key] as Array<{id?:string;updatedAt?:number}>) = (merged[key] as Array<{id?:string;updatedAt?:number}>).filter(row => !deleted[key + ":" + row.id] || Number(row.updatedAt || 0) > deleted[key + ":" + row.id]);
  }
  merged.notes.sort((a,b) => b.updatedAt - a.updatedAt);
  return merged;
}

const pendingSync = new Map<string, Promise<{life:LifeState;synced:boolean}>>();
export function syncLifeTools(): Promise<{ life: LifeState; synced: boolean }> {
  const owner = lifeAccount();
  if (!owner) return Promise.resolve({ life: readLife(), synced: false });
  const pending = pendingSync.get(owner);
  if (pending) return pending;
  const work = syncAccount(owner).finally(() => pendingSync.delete(owner));
  pendingSync.set(owner,work);
  return work;
}
async function syncAccount(owner: string): Promise<{life:LifeState;synced:boolean}> {
  try {
    for (let attempt=0; attempt<3; attempt++) {
      const response=await fetch("/api/v1/me/state",{headers:{Accept:"application/json"},cache:"no-store",credentials:"same-origin"});
      if (!response.ok || lifeAccount() !== owner) break;
      const body=await response.json();
      if (body.user?.id !== owner) break;
      const life=mergeLife(readLife(),body.state?.preferences?.life_tools);
      const saved=await fetch("/api/v1/me/state",{method:"PATCH",headers:{"content-type":"application/json",Accept:"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify({account_id:owner,revision:body.revision,life})});
      if (lifeAccount() !== owner) break;
      if (saved.status===409) continue;
      if (!saved.ok) break;
      // Keep edits made during the request. The coordinator schedules another save.
      const current=readLife();
      return {life:writeLife(mergeLife(current,life),true),synced:true};
    }
  } catch { /* Keep the local copy on network or server failure. */ }
  return {life:readLife(),synced:false};
}
