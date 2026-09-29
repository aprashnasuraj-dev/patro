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

export function authAccessToken(): string | null {
  try {
    const legacy = JSON.parse(localStorage.getItem("nepalmiti.session.v1") || "null");
    if (typeof legacy?.access_token === "string" && legacy.access_token.length > 30) return legacy.access_token;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      const token = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
      if (typeof token === "string" && token.length > 30) return token;
    }
  } catch {
    return null;
  }
  return null;
}

export function storeCommunityPreferences(ids: CommunityId[]) {
  const next = [...new Set(ids)].filter((id): id is CommunityId => allowed.has(id));
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("patro:communities", { detail: next }));
  return next;
}

export async function loadCommunityPreferences(): Promise<CommunityId[]> {
  const local = readCommunityPreferences();
  const token = authAccessToken();
  if (!token) return local;
  try {
    const response = await fetch("/api/v1/community-preferences", {
      headers: { Accept: "application/json", Authorization: "Bearer " + token },
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
  const token = authAccessToken();
  if (!token) return { saved: "local" as const, communities: next };
  try {
    const response = await fetch("/api/v1/community-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ communities: next }),
      cache: "no-store",
    });
    return { saved: response.ok ? "account" as const : "local" as const, communities: next };
  } catch {
    return { saved: "local" as const, communities: next };
  }
}

export function authAppRole(): string | null {
  const token = authAccessToken();
  if (!token) return null;
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(raw.padEnd(Math.ceil(raw.length / 4) * 4, "=")));
    return payload?.app_metadata?.role || null;
  } catch { return null; }
}

export function communityFeedUrl(ids: CommunityId[], from?: string) {
  const q = new URLSearchParams();
  q.set("communities", ids.join(","));
  if (from) q.set("from", from);
  return "/api/v1/communities/feed.ics?" + q.toString();
}
