import { useEffect, useState } from "react";

/** Additive on-device favorites: no login, tracking, private notes or API calls. */
const KEY = "aafnai:favorite-public-tools:v1";
const VALID = /^\/(?:tools\/[a-z0-9-]+|convert|today|moon|rashifal|time-machine|fm|tv)$/;
function readSaved(): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(data)) return [];
    return [...new Set(data.filter((value): value is string => typeof value === "string" && VALID.test(value)))].slice(0, 12);
  } catch { return []; }
}
export function SeoFavoriteTools({ path }: { path: string }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { setSaved(readSaved()); }, [path]);
  if (!VALID.test(path)) return null;
  const favorite = saved.includes(path);
  function toggle() {
    const next = favorite ? saved.filter(item => item !== path) : [...saved.filter(item => item !== path), path].slice(-12);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaved(next);
      setError("");
    } catch {
      setError("यो ब्राउजरमा सुरक्षित गर्न सकिएन।");
    }
  }
  return <section className="ap-favorite-tools" aria-label="Saved tool shortcuts">
    <button type="button" onClick={toggle} aria-pressed={favorite}>
      {favorite ? "★ सुरक्षित छ · Saved" : "☆ मनपर्नेमा राख्नुहोस् · Save this tool"}
    </button>
    {saved.length > 0 ? <nav aria-label="Your saved public tools">
      {saved.map((route) => <a href={route} key={route}>{route.split("/").filter(Boolean).pop()?.replaceAll("-", " ")}</a>)}
    </nav> : null}
    <span role="status" aria-live="polite">{error}</span>
  </section>;
}
