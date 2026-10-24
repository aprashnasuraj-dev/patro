import { useEffect, useState } from "react";
import type { UiLanguage } from "./i18n";

import { initialUiLanguage as readLanguage } from "./ui-language";

export function useUiLanguage(): UiLanguage {
  const [language, setLanguage] = useState<UiLanguage>(readLanguage);
  useEffect(() => {
    const sync = () => setLanguage(document.documentElement.lang === "en" ? "en" : "ne");
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
