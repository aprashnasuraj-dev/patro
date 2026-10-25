import type { UiLanguage } from "./i18n";
export function initialUiLanguage(): UiLanguage {
  if (typeof location !== "undefined") {
    const requested = new URLSearchParams(location.search).get("lang");
    if (requested === "ne" || requested === "en") return requested;
  }
  try { const saved = localStorage.getItem("patro.ui.language"); if (saved === "ne" || saved === "en") return saved; } catch {}
  return "ne";
}
