import { useState } from "react";

/** Share the existing canonical tool, never any private form inputs or query params. */
export function SeoShareActions({ path, title }: { path: string; title: string }) {
  const [message, setMessage] = useState("");
  const url = `https://aafnaipatro.com${path}`;
  async function share() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        setMessage("");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage("लिङ्क कपी भयो · Link copied");
      } else {
        setMessage("लिङ्क कपी गर्न पृष्ठको ठेगाना प्रयोग गर्नुहोस्।");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("लिङ्क सेयर गर्न सकिएन। पृष्ठको ठेगाना कपी गर्नुहोस्।");
    }
  }
  return <div className="ap-seo-share">
    <button type="button" onClick={share} aria-label="Share this Aafnai Patro tool">
      सेयर गर्नुहोस् · Share this tool
    </button>
    <span aria-live="polite" role="status">{message}</span>
  </div>;
}
