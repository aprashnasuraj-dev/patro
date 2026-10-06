const CONFIG_KEY = "patro.morning.v1";
const DEVICE_KEY = "patro.morning.device.v1";
const OFFER_KEY = "patro.morning.permission-offer.v1";
type MorningConfig = { enabled: boolean; name: string; mode?: "push" | "local" };
let timer: number | undefined;
export function getLocalMorningGreeting(): MorningConfig {
  try { return { enabled: false, name: "", ...JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}") }; }
  catch { return { enabled: false, name: "" }; }
}
export function morningOfferSeen() { try { return Boolean(localStorage.getItem(OFFER_KEY)); } catch { return true; } }
export function rememberMorningOffer(choice = "offered") { try { localStorage.setItem(OFFER_KEY, choice); } catch {} }
function save(config: MorningConfig) { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); return config; }
function device() {
  const stored = localStorage.getItem(DEVICE_KEY); if (stored) return JSON.parse(stored);
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const value = { device_id: crypto.randomUUID().replace(/-/g, ""), device_secret: Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("") };
  localStorage.setItem(DEVICE_KEY, JSON.stringify(value)); return value;
}
async function registration() {
  if (!("serviceWorker" in navigator)) throw new Error("unsupported");
  return Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("worker_not_ready")), 10000))]);
}
async function post(type: string, config?: MorningConfig) { const reg = await registration(); reg.active?.postMessage({ type, ...(config ? { config } : {}) }); }
function armForeground() {
  if (timer) clearTimeout(timer);
  const config = getLocalMorningGreeting(); if (!config.enabled || config.mode === "push") return;
  const now = Date.now(), today = new Date(now + 345 * 60_000).toISOString().slice(0, 10), due = Date.parse(`${today}T00:15:00Z`);
  timer = window.setTimeout(() => { void post("CHECK_MORNING").catch(() => undefined); armForeground(); }, (due > now ? due : due + 86400000) - now);
}
// Only explicit enable clicks request permission. Page loads never invoke this function.
export async function enableLocalMorningGreeting(name = "") {
  rememberMorningOffer("requested");
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return { ok: false, reason: "unsupported" as const };
  if (Notification.permission === "denied") return { ok: false, reason: "permission" as const };
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") { rememberMorningOffer("declined"); return { ok: false, reason: "permission" as const }; }
  try {
    const reg = await registration(); let mode: "push" | "local" = "local";
    if ("PushManager" in window) {
      const response = await fetch("/api/push/vapid"); if (!response.ok) return { ok: false, reason: "server" as const };
      const { publicKey } = await response.json();
      const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/"));
      const key = Uint8Array.from(raw, c => c.charCodeAt(0));
      const subscription = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const result = await fetch("/api/push/morning", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...device(), subscription: subscription.toJSON(), consent: true, name }) });
      if (!result.ok) return { ok: false, reason: "server" as const }; mode = "push";
    }
    const config = save({ enabled: true, name: name.trim().slice(0, 80), mode });
    await post("MORNING_CONFIG", config); reg.active?.postMessage({ type: "WARM_CALENDAR" });
    if (mode === "local") { await post("CHECK_MORNING"); armForeground(); }
    rememberMorningOffer("enabled"); return { ok: true, reason: "enabled" as const, mode };
  } catch { return { ok: false, reason: "server" as const }; }
}
export async function disableLocalMorningGreeting() {
  const config = getLocalMorningGreeting();
  if (config.mode === "push") {
    const response = await fetch("/api/push/morning", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(device()) });
    if (!response.ok) throw new Error("disable_failed");
  }
  save({ enabled: false, name: "" }); rememberMorningOffer("disabled");
  await post("MORNING_CONFIG", { enabled: false, name: "" }); if (timer) clearTimeout(timer);
}
export function startLocalMorningScheduler() {
  const sync = () => { const config = getLocalMorningGreeting(); if (config.enabled) { void post("MORNING_CONFIG", config).then(() => config.mode !== "push" ? post("CHECK_MORNING") : undefined).catch(() => undefined); armForeground(); } };
  sync(); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(); });
}
