import type { PersonalTithiEvent } from "@/patro-tools/tithi-events/events";
import type { Sealed } from "@/patro-tools/letters/crypto";

const LIFE_KEY = "nepalmiti.life.v1";

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
    const parsed = JSON.parse(localStorage.getItem(LIFE_KEY) || "{}") as Record<string, unknown>;
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

export function writeLife(next: LifeState) {
  const value = { ...next, version: 1, updatedAt: Date.now() };
  localStorage.setItem(LIFE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("patro:life-updated", { detail: { updatedAt: value.updatedAt } }));
  return value;
}

export function updateLife(updater: (current: LifeState) => LifeState) {
  return writeLife(updater(readLife()));
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
}

export async function syncLifeTools(): Promise<{ life: LifeState; synced: boolean }> {
  const local = readLife();
  try {
    const response = await fetch("/api/v1/me/state", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
    });
    if (response.status === 401) return { life: local, synced: false };
    if (!response.ok) return { life: local, synced: false };

    const body = await response.json() as {
      state?: {
        notes?: unknown;
        events?: unknown;
        calendars?: unknown;
        preferences?: Record<string, unknown>;
        feedback?: unknown;
      };
    };
    const state = body.state || {};
    const preferences = state.preferences && typeof state.preferences === "object" ? state.preferences : {};
    const life = mergeLife(local, preferences.life_tools);
    writeLife(life);

    const saved = await fetch("/api/v1/me/state", {
      method: "PUT",
      headers: { "content-type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({
        state: {
          notes: state.notes && typeof state.notes === "object" ? state.notes : {},
          events: Array.isArray(state.events) ? state.events : [],
          calendars: Array.isArray(state.calendars) ? state.calendars : [],
          preferences: { ...preferences, life_tools: life },
          feedback: Array.isArray(state.feedback) ? state.feedback : [],
        },
      }),
    });
    return { life, synced: saved.ok };
  } catch {
    return { life: local, synced: false };
  }
}
