export type CommunityId = "nepal-sambat" | "lhosar" | "tharu" | "mithila" | "kirat" | "hijri";

export const COMMUNITY_OPTIONS: { id: CommunityId; dev: string; en: string; href: string }[] = [
  { id: "nepal-sambat", dev: "नेपाल संवत्", en: "Nepal Sambat", href: "/nepal-sambat/mandala" },
  { id: "lhosar", dev: "ल्होसार", en: "Lhosar", href: "/samudaya/lhosar" },
  { id: "tharu", dev: "थारु", en: "Tharu", href: "/samudaya/tharu" },
  { id: "mithila", dev: "मिथिला", en: "Mithila", href: "/samudaya/mithila" },
  { id: "kirat", dev: "किरात", en: "Kirat", href: "/samudaya/kirat" },
  { id: "hijri", dev: "हिजरी", en: "Hijri", href: "/samudaya/hijri" },
];

const KEY = "patro.communities.v1";
const allowed = new Set(COMMUNITY_OPTIONS.map((item) => item.id));

export function readCommunityPreferences(): CommunityId[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is CommunityId => allowed.has(id)) : [];
  } catch {
    return [];
  }
}

export function storeCommunityPreferences(ids: CommunityId[]) {
  const next = [...new Set(ids)].filter((id): id is CommunityId => allowed.has(id));
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("patro:communities", { detail: next }));
  return next;
}

export async function loadCommunityPreferences(): Promise<CommunityId[]> {
  const local = readCommunityPreferences();
  try {
    const response = await fetch("/api/v1/community-preferences", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) return local;
    const body = await response.json();
    if (!Array.isArray(body?.communities)) return local;
    return storeCommunityPreferences(body.communities);
  } catch {
    return local;
  }
}

export async function saveCommunityPreferences(ids: CommunityId[]) {
  const next = storeCommunityPreferences(ids);
  try {
    const response = await fetch("/api/v1/community-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ communities: next }),
      cache: "no-store",
    });
    return { saved: response.ok ? "account" as const : "local" as const, communities: next };
  } catch {
    return { saved: "local" as const, communities: next };
  }
}

export function communityFeedUrl(ids: CommunityId[], from?: string) {
  const q = new URLSearchParams();
  q.set("communities", ids.join(","));
  if (from) q.set("from", from);
  return "/api/v1/communities/feed.ics?" + q.toString();
}
