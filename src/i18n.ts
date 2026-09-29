import ne from "./locales/ne.json";
import en from "./locales/en.json";

export type UiLanguage = "ne" | "en";
type Dictionary = typeof ne;
export type TranslationKey = keyof Dictionary;

const dictionaries: Record<UiLanguage, Dictionary> = { ne, en };

export function t(language: UiLanguage, key: TranslationKey) {
  return dictionaries[language][key] ?? key;
}
