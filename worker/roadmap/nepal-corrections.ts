export type CorrectionState = "reported" | "upstream_corrected" | "verified" | "queued_for_build" | "published" | "rejected" | "expired";
export type CorrectionAudit = { at: string; from: CorrectionState | null; to: CorrectionState; note?: string };
export type CorrectionRecord = { id: string; source_id: string; state: CorrectionState; audit: CorrectionAudit[] };

const ALLOWED: Record<CorrectionState, readonly CorrectionState[]> = {
  reported: ["upstream_corrected", "rejected", "expired"],
  upstream_corrected: ["verified", "rejected", "expired"],
  verified: ["queued_for_build", "rejected", "expired"],
  queued_for_build: ["published", "verified", "expired"],
  published: [],
  rejected: [],
  expired: [],
};

export function newCorrection(id: string, sourceId: string, at: string): CorrectionRecord {
  if (!id || !sourceId) throw new Error("correction id and source id are required");
  return { id, source_id: sourceId, state: "reported", audit: [{ at, from: null, to: "reported" }] };
}

export function transitionCorrection(record: CorrectionRecord, to: CorrectionState, at: string, note?: string): CorrectionRecord {
  if (!ALLOWED[record.state].includes(to)) throw new Error(`invalid correction transition ${record.state} -> ${to}`);
  return { ...record, state: to, audit: [...record.audit, { at, from: record.state, to, ...(note ? { note } : {}) }] };
}
