import { useEffect, useState } from "react";
import type { UiLanguage } from "./i18n";

function readLanguage(): UiLanguage {
  if (typeof document !== "undefined" && document.documentElement.lang.toLowerCase().startsWith("en")) return "en";
  try { return localStorage.getItem("patro.ui.language") === "en" ? "en" : "ne"; } catch { return "ne"; }
}

export function useUiLanguage(): UiLanguage {
  const [language, setLanguage] = useState<UiLanguage>(readLanguage);
  useEffect(() => {
    const sync = () => setLanguage(readLanguage());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    window.addEventListener("storage", sync);
    window.addEventListener("patro:language", sync as EventListener);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", sync);
      window.removeEventListener("patro:language", sync as EventListener);
    };
  }, []);
  return language;
}

export function l(language: UiLanguage, ne: string, en: string) {
  return language === "en" ? en : ne;
}
