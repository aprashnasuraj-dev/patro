/**
 * Stable, presentation-safe deduplication for user-facing explanations.
 * Normalizes Unicode, letter case, whitespace and trailing punctuation but preserves the first
 * occurrence and its original wording.
 */
export function dedupeDisplayStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.normalize("NFKC").toLocaleLowerCase().trim().replace(/\s+/gu, " ").replace(/[.!?।॥]+$/u, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
