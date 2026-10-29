export type SourceStatus = "official" | "published" | "calculated" | "provisional";
export type DatasetManifest = {
  dataset_id: string;
  product: "nepalmap" | "bali";
  source: { name: string; url: string; id_namespace: string; license: string; license_url: string; attribution: string };
  snapshot_date: string;
  build_date: string;
  transformation_version: string;
  status: SourceStatus;
  confidence: number;
  correction_route: { url: string; email: string | null };
  boundaries_version?: string;
  notes?: string;
  supersedes?: string;
};
export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  official: "Official", published: "Published", calculated: "Calculated", provisional: "Provisional",
};
export function validateManifest(m: DatasetManifest): string[] {
  const errors: string[] = [];
  if (!m.dataset_id) errors.push("dataset_id");
  if (!["nepalmap","bali"].includes(m.product)) errors.push("product");
  if (!m.source?.name || !m.source?.url || !m.source?.license || !m.source?.license_url || !m.source?.attribution) errors.push("source");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.snapshot_date)) errors.push("snapshot_date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.build_date)) errors.push("build_date");
  if (!["official","published","calculated","provisional"].includes(m.status)) errors.push("status");
  if (!(m.confidence >= 0 && m.confidence <= 1)) errors.push("confidence");
  if (!m.correction_route?.url) errors.push("correction_route.url");
  return errors;
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c] as string);
export function sourceBadge(status: SourceStatus, source: string): string {
  return `<span class="source-badge source-${status}" title="${esc(source)}" data-source-status="${status}">${SOURCE_STATUS_LABEL[status]}</span>`;
}
