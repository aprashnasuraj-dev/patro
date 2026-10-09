import { FormEvent, useEffect, useState } from "react";
import { adToBs, bsToAd, isValidBsDate } from "../packages/core/src";
import { BS_MONTHS, setPageTitle, toNepaliDigits } from "./title";

type Result = {
  ad?: string;
  bs?: { year: number; month: number; day: number; formatted?: string };
  panchang?: any;
  ok?: boolean;
};
const MONTH_SLUGS=["baisakh","jestha","ashadh","shrawan","bhadra","ashwin","kartik","mangsir","poush","magh","falgun","chaitra"];

function formatBs(year: number, month: number, day: number) {
  return `${toNepaliDigits(day)} ${BS_MONTHS[month - 1] || toNepaliDigits(month)} ${toNepaliDigits(year)}`;
}

function parseBsInput(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) throw new Error("invalid_bs_format");
  const parsed = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (!isValidBsDate(parsed)) throw new Error("invalid_bs_date");
  return parsed;
}

async function enrichPanchang(adDate: string) {
  try {
    const response = await fetch(`/api/v1/sync?date=${encodeURIComponent(adDate)}`, {
      headers: { accept: "application/json" },
      credentials: "same-origin",
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body?.archive_panchang || body?.panchang || null;
  } catch {
    return null;
  }
}

export function ConvertPage() {
  const [mode, setMode] = useState<"ad" | "bs">("ad");
  const [ad, setAd] = useState(() => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()));
  const [bs, setBs] = useState("2083-06-15");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  useEffect(() => setPageTitle("मिति रूपान्तरण"), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);

    try {
      let next: Result;
      let resultAd: string;

      if (mode === "ad") {
        const converted = adToBs(ad);
        resultAd = ad;
        next = {
          ad,
          bs: { ...converted, formatted: formatBs(converted.year, converted.month, converted.day) },
          ok: true,
        };
      } else {
        const parsed = parseBsInput(bs);
        resultAd = bsToAd(parsed);
        next = {
          ad: resultAd,
          bs: { ...parsed, formatted: formatBs(parsed.year, parsed.month, parsed.day) },
          ok: true,
        };
      }

      // The conversion itself is complete locally. Online panchang enrichment is optional.
      setResult(next);
      const panchang = await enrichPanchang(resultAd);
      if (panchang) setResult((current) => current ? { ...current, panchang } : current);
    } catch {
      setError("मिति रूपान्तरण हुन सकेन। मिति जाँच गरेर फेरि प्रयास गर्नुहोस्।");
    }
  }

  return (
    <main className="ap-page">
      <header className="ap-page-title">
        <span className="ap-eyebrow">मिति उपकरण</span>
        <h1>मिति रूपान्तरण</h1>
        <p>विक्रम संवत् (BS) र Gregorian (AD) मिति बीच रूपान्तरण गर्नुहोस्। इन्टरनेट नभए पनि मूल रूपान्तरण काम गर्छ।</p>
      </header>
      <section className="ap-tool-section">
        <div className="ap-convert-tabs">
          <button type="button" className={mode === "ad" ? "active" : ""} onClick={() => setMode("ad")}>AD → BS</button>
          <button type="button" className={mode === "bs" ? "active" : ""} onClick={() => setMode("bs")}>BS → AD</button>
        </div>
        <form className="ap-convert-form" onSubmit={submit}>
          {mode === "ad" ? (
            <label>AD मिति<input type="date" value={ad} onChange={(event) => setAd(event.target.value)} required /></label>
          ) : (
            <label>BS मिति <small>(YYYY-MM-DD)</small><input inputMode="numeric" pattern="\d{4}-\d{1,2}-\d{1,2}" value={bs} onChange={(event) => setBs(event.target.value)} required /></label>
          )}
          <button type="submit">रूपान्तरण गर्नुहोस्</button>
        </form>
        {error && <div className="ap-state ap-error">{error}</div>}
        {result && (
          <div className="ap-convert-result">
            <span>नतिजा</span>
            <strong>{mode === "ad" ? result.bs?.formatted : (result.ad || "—")}</strong>
            {result.panchang?.tithi?.ne && <small>{result.panchang.tithi.ne}</small>}
            {result.ad && <a href={`/ad-to-bs/${result.ad}`}>यस रूपान्तरणको स्थायी लिंक</a>}
            {result.bs && <a href={`/bs-to-ad/${result.bs.year}-${MONTH_SLUGS[result.bs.month-1]}-${result.bs.day}`}>BS → AD स्थायी लिंक</a>}
          </div>
        )}
      </section>
    </main>
  );
}
