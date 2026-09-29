import type { PersonalTithiEvent } from "@/patro-tools/tithi-events/events";
import type { Sealed } from "@/patro-tools/letters/crypto";

const LIFE_KEY = "nepalmiti.life.v1";
const SESSION_KEY = "nepalmiti.session.v1";
const SUPABASE_URL = "https://pxlsmxbpgdfzjzuqtict.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uONsehXk_IXPMu7PPGF1nw_4_gbD_Hm";

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

export type LifeState = {
  version: number;
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
    const parsed = JSON.parse(localStorage.getItem(LIFE_KEY) || "{}") as Record<string, unknown>;
    return {
      ...EMPTY,
      ...parsed,
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

export function writeLife(next: LifeState) {
  const value = { ...next, version: 1, updatedAt: Date.now() };
  localStorage.setItem(LIFE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("patro:life-updated", { detail: { updatedAt: value.updatedAt } }));
  return value;
}

export function updateLife(updater: (current: LifeState) => LifeState) {
  return writeLife(updater(readLife()));
}

type SessionShape = { access_token?: string; user?: { id?: string } };

export function currentSession(): SessionShape | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as SessionShape : null;
  } catch {
    return null;
  }
}

export function accessToken() {
  return currentSession()?.access_token || "";
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
  return {
    ...EMPTY,
    ...remote,
    ...local,
    due: mergeById(objectRows(remote.due) as Array<Record<string, unknown> & {id?:string;updatedAt?:number}>, local.due),
    family: mergeById(objectRows(remote.family) as Array<Record<string, unknown> & {id?:string;updatedAt?:number}>, local.family),
    docs: mergeById(objectRows(remote.docs) as Array<Record<string, unknown> & {id?:string;updatedAt?:number}>, local.docs),
    festivalPlans: mergeById(objectRows(remote.festivalPlans) as Array<Record<string, unknown> & {id?:string;updatedAt?:number}>, local.festivalPlans),
    tithiEvents: mergeById(Array.isArray(remote.tithiEvents) ? remote.tithiEvents as StoredTithiEvent[] : [], local.tithiEvents),
    nameChecks: mergeById(Array.isArray(remote.nameChecks) ? remote.nameChecks as StoredNameCheck[] : [], local.nameChecks),
    futureLetters: mergeById(Array.isArray(remote.futureLetters) ? remote.futureLetters as StoredFutureLetter[] : [], local.futureLetters),
    updatedAt: Math.max(Number(remote.updatedAt || 0), Number(local.updatedAt || 0)),
  };
}

export async function syncLifeTools(): Promise<{ life: LifeState; synced: boolean }> {
  const local = readLife();
  const session = currentSession();
  const token = session?.access_token;
  const userId = session?.user?.id;
  if (!token || !userId) return { life: local, synced: false };

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    authorization: "Bearer " + token,
    "content-type": "application/json",
  };

  try {
    const response = await fetch(
      SUPABASE_URL + "/rest/v1/user_calendar_state?user_id=eq." + encodeURIComponent(userId) + "&select=notes,preferences&limit=1",
      { headers }
    );
    if (!response.ok) return { life: local, synced: false };
    const rows = await response.json() as Array<{ notes?: unknown[]; preferences?: Record<string, unknown> }>;
    const remote = rows[0] || {};
    const preferences = remote.preferences && typeof remote.preferences === "object" ? remote.preferences : {};
    const life = mergeLife(local, preferences.life_tools);
    writeLife(life);

    const saved = await fetch(SUPABASE_URL + "/rest/v1/user_calendar_state?on_conflict=user_id", {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        notes: Array.isArray(remote.notes) ? remote.notes : [],
        preferences: { ...preferences, life_tools: life },
      }),
    });
    return { life, synced: saved.ok };
  } catch {
    return { life: local, synced: false };
  }
}
