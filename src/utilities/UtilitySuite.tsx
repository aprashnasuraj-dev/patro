import { useEffect, useRef, useState } from "react";

type FontDirection = "preeti-to-unicode" | "unicode-to-preeti";
type Hill = { ropani: string; aana: string; paisa: string; dam: string };
type Terai = { bigha: string; kattha: string; dhur: string };
type DateMetadata = { confidence: "validated-project-archive" | "provisional-open-table"; source: string; note: string };
type DateConversionResult = { ad: string; bs: string; metadata: DateMetadata };
type QrResult = { dataUrl: string; modules: number; bytes: number };
type FuelZone = {
  depots: string[];
  petrol: number;
  diesel: number;
  kerosene: number;
  atfDutyFreeUsdPerKl: number | null;
  atfDomesticNprPerL: number | null;
  lpgNprPerCylinder: number | null;
};
type FuelPayload = {
  ok: true;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  effectiveDate: string | null;
  freshness: "live" | "official-snapshot";
  stale: boolean;
  note?: string;
  zones: FuelZone[];
};
type TaxResult = {
  fiscalYear: string;
  taxableIncome: string;
  annualTax: string;
  monthlyAverageTax: string;
  retirementDeduction: string;
  retirementDeductionCap: string;
  lifeInsuranceDeduction: string;
  healthInsuranceDeduction: string;
  sourceVersion: string;
  bands: { rateBps: number; taxable: string; tax: string }[];
};
type WorkerReply = { id: number; ok: true; result: any } | { id: number; ok: false; error: string };

type ToolId =
  | "typingtools"
  | "nepali-typing"
  | "preeti-converter"
  | "bstoad"
  | "adtobs"
  | "landconverter"
  | "incometax"
  | "nepaliqr"
  | "fuelprice"
  | "tithi"
  | "diaspora"
  | "card"
  | "family"
  | "api"
  | "my-data";

type ToolGroup = "typing" | "utility" | "tools";
type ToolDirectoryItem = {
  id: Exclude<ToolId, "typingtools">;
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  group: ToolGroup;
};

const NEPALI_TYPING_TOOL: ToolDirectoryItem = {
  id: "nepali-typing",
  icon: "ने",
  title: "नेपाली टाइपिङ · Nepali Typing",
  subtitle: "Type Roman Nepali and choose from 34,571 local Devanagari suggestions without uploading your text.",
  badge: "Typing Tools",
  group: "typing",
};
const TOOL_DIRECTORY: ToolDirectoryItem[] = [
  NEPALI_TYPING_TOOL,
  { id: "preeti-converter", icon: "प्री", title: "Preeti Converter · प्रीति रूपान्तरण", subtitle: "Convert both Preeti → Unicode and Unicode → Preeti from one converter.", badge: "Typing Tools", group: "typing" },
  { id: "bstoad", icon: "वि", title: "BS → AD Date Converter", subtitle: "Convert a Bikram Sambat date into its Gregorian/AD equivalent with source confidence.", badge: "Calendar", group: "utility" },
  { id: "adtobs", icon: "AD", title: "AD → BS Date Converter", subtitle: "Convert a Gregorian/AD date into its Bikram Sambat equivalent.", badge: "Calendar", group: "utility" },
  { id: "landconverter", icon: "▦", title: "Nepali Land Converter", subtitle: "Convert Ropani–Aana–Paisa–Dam, Bigha–Kattha–Dhur and square feet exactly.", badge: "Land", group: "utility" },
  { id: "incometax", icon: "रु", title: "Income Tax Calculator", subtitle: "Estimate FY 2083/84 salary tax with retirement and insurance deductions.", badge: "Finance", group: "utility" },
  { id: "nepaliqr", icon: "QR", title: "Devanagari QR Generator", subtitle: "Create a private UTF-8 QR code from Nepali or English text directly in your browser.", badge: "QR", group: "utility" },
  { id: "fuelprice", icon: "⛽", title: "NOC Fuel Price Tracker", subtitle: "Check Nepal Oil Corporation petrol, diesel, kerosene, LPG and aviation fuel references.", badge: "Fuel", group: "utility" },
  { id: "tithi", icon: "त", title: "तिथि · Tithi", subtitle: "Create tithi-based reminders, derive lunar dates and calculate upcoming ritual or birthday occurrences.", badge: "Tools", group: "tools" },
  { id: "diaspora", icon: "🌏", title: "Diaspora", subtitle: "Use Nepal calendar context with timezone-aware dates and daily information while living abroad.", badge: "Tools", group: "tools" },
  { id: "card", icon: "▣", title: "कार्ड · Share Cards", subtitle: "Create shareable Nepali calendar, date and festival cards for messaging and social sharing.", badge: "Tools", group: "tools" },
  { id: "family", icon: "परि", title: "परिवार · Family", subtitle: "Keep private family dates, shared events and household calendar information together.", badge: "Tools", group: "tools" },
  { id: "api", icon: "</>", title: "API · Developers", subtitle: "Explore Nepal Miti API endpoints, integration guidance and developer resources.", badge: "Tools", group: "tools" },
  { id: "my-data", icon: "🔐", title: "मेरो डेटा · My Data", subtitle: "Review, export or remove private data associated with Nepal Miti features.", badge: "Tools", group: "tools" },
];

const REMOTE_CATALOG_URL = "/api/v1/tools/catalog";

function toolFromLocation(): ToolId | null {
  const slug = window.location.pathname.replace(/\/+$/, "").split("/")[2] || "";
  if (slug === "typingtools") return "typingtools";
  if (slug === "preetitounicode" || slug === "unicodetopreeti") return "preeti-converter";
  if (TOOL_DIRECTORY.some((tool) => tool.id === slug)) return slug as ToolId;

  const legacyQuery = new URLSearchParams(window.location.search).get("tool");
  const legacyMap: Record<string, ToolId> = {
    font: "preeti-converter",
    date: "bstoad",
    land: "landconverter",
    tax: "incometax",
    qr: "nepaliqr",
    fuel: "fuelprice",
  };
  return legacyQuery && legacyMap[legacyQuery] ? legacyMap[legacyQuery] : null;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="utility-field">
      <span>{label}</span>
      <input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder="0" />
    </label>
  );
}

export function UtilitySuite() {
  const workerRef = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const latestFont = useRef(0);
  const latestSqft = useRef(0);
  const latestHill = useRef(0);
  const latestTerai = useRef(0);
  const latestBsDate = useRef(0);
  const latestAdDate = useRef(0);
  const latestTax = useRef(0);
  const latestQr = useRef(0);

  const [online, setOnline] = useState(() => navigator.onLine);
  const [workerReady, setWorkerReady] = useState(false);
  const [catalog, setCatalog] = useState<ToolDirectoryItem[]>(TOOL_DIRECTORY);
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(toolFromLocation);
  const [fontDirection, setFontDirection] = useState<FontDirection>(() =>
    window.location.pathname.includes("unicodetopreeti") ? "unicode-to-preeti" : "preeti-to-unicode"
  );
  const [fontInput, setFontInput] = useState("g]kfn");
  const [fontOutput, setFontOutput] = useState("नेपाल");
  const [capitalIAsShortI, setCapitalIAsShortI] = useState(false);
  const [fontError, setFontError] = useState("");

  const [sqft, setSqft] = useState("5476");
  const [sqftResult, setSqftResult] = useState<{ hill: Hill; terai: Terai } | null>(null);
  const [hill, setHill] = useState({ ropani: "1", aana: "0", paisa: "0", dam: "0" });
  const [hillResult, setHillResult] = useState<{ sqft: string; terai: Terai } | null>(null);
  const [terai, setTerai] = useState({ bigha: "1", kattha: "0", dhur: "0" });
  const [teraiResult, setTeraiResult] = useState<{ sqft: string; hill: Hill } | null>(null);
  const [landError, setLandError] = useState("");
  const [bsDate, setBsDate] = useState({ year: "2083", month: "1", day: "1" });
  const [bsDateResult, setBsDateResult] = useState<DateConversionResult | null>(null);
  const [adDate, setAdDate] = useState("2026-04-14");
  const [adDateResult, setAdDateResult] = useState<DateConversionResult | null>(null);
  const [dateError, setDateError] = useState("");
  const [taxInput, setTaxInput] = useState({
    annualSalary: "1200000",
    ssf: "0",
    epf: "0",
    cit: "0",
    lifeInsurance: "0",
    healthInsurance: "0",
  });
  const [qualifyingSsfContributor, setQualifyingSsfContributor] = useState(false);
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
  const [taxError, setTaxError] = useState("");
  const [qrText, setQrText] = useState("नमस्ते नेपाल");
  const [qrLevel, setQrLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [qrResult, setQrResult] = useState<QrResult | null>(null);
  const [qrError, setQrError] = useState("");
  const [fuel, setFuel] = useState<FuelPayload | null>(() => {
    try {
      const raw = localStorage.getItem("patro.noc.fuel");
      return raw ? JSON.parse(raw) as FuelPayload : null;
    } catch {
      return null;
    }
  });
  const [fuelZoneIndex, setFuelZoneIndex] = useState(0);
  const [fuelError, setFuelError] = useState("");
  const [fuelLoading, setFuelLoading] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    setWorkerReady(true);
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const message = event.data;
      if (!message.ok) {
        if (message.id === latestFont.current) setFontError(message.error);
        else if (message.id === latestBsDate.current || message.id === latestAdDate.current) setDateError(message.error);
        else if (message.id === latestTax.current) setTaxError(message.error);
        else if (message.id === latestQr.current) setQrError(message.error);
        else setLandError(message.error);
        return;
      }
      if (message.id === latestFont.current) {
        setFontOutput(String(message.result));
        setFontError("");
      } else if (message.id === latestSqft.current) {
        setSqftResult(message.result);
        setLandError("");
      } else if (message.id === latestHill.current) {
        setHillResult(message.result);
        setLandError("");
      } else if (message.id === latestTerai.current) {
        setTeraiResult(message.result);
        setLandError("");
      } else if (message.id === latestBsDate.current) {
        setBsDateResult(message.result);
        setDateError("");
      } else if (message.id === latestAdDate.current) {
        setAdDateResult(message.result);
        setDateError("");
      } else if (message.id === latestTax.current) {
        setTaxResult(message.result);
        setTaxError("");
      } else if (message.id === latestQr.current) {
        setQrResult(message.result);
        setQrError("");
      }
    };
    return () => {
      workerRef.current = null;
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(REMOTE_CATALOG_URL, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("catalog_unavailable")))
      .then((body) => {
        if (!Array.isArray(body?.items)) return;
        const supported = new Set<ToolId>([
          "nepali-typing","preeti-converter","bstoad","adtobs","landconverter",
          "incometax","nepaliqr","fuelprice","tithi","diaspora","card","family","api","my-data"
        ]);
        const next = body.items
          .filter((item: any) => item && supported.has(item.slug as ToolId) && item.slug !== "typingtools")
          .map((item: any) => ({
            id: item.slug as Exclude<ToolId, "typingtools">,
            icon: String(item.icon || "•").slice(0, 4),
            title: String(item.title || item.slug),
            subtitle: String(item.subtitle || ""),
            badge: String(item.badge || "Tools"),
            group: item.category === "typing" ? "typing" : item.category === "utility" ? "utility" : "tools",
          })) as ToolDirectoryItem[];
        if (next.length) setCatalog(next);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const onPopState = () => setSelectedTool(toolFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (window.location.pathname.includes("unicodetopreeti")) setFontDirection("unicode-to-preeti");
    if (window.location.pathname.includes("preetitounicode")) setFontDirection("preeti-to-unicode");
  }, [selectedTool]);

  function chooseTool(tool: ToolId | null) {
    const nextPath = tool ? "/tools/" + tool : "/tools";
    window.history.pushState(null, "", nextPath);
    setSelectedTool(tool);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadFuelPrices() {
    if (!navigator.onLine) {
      setFuelError(fuel ? "Offline — showing last saved NOC data." : "Offline — no saved NOC price data is available yet.");
      return;
    }
    setFuelLoading(true);
    try {
      const response = await fetch("/api/v1/noc/fuel-prices", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const body = await response.json() as FuelPayload | { ok?: false; error?: string };
      if (!response.ok || !body || body.ok !== true || !("zones" in body) || !Array.isArray(body.zones) || !body.zones.length) {
        throw new Error("error" in body && body.error ? body.error : "NOC fuel service unavailable");
      }
      const next = body as FuelPayload;
      setFuel(next);
      setFuelZoneIndex((current) => Math.min(current, Math.max(0, next.zones.length - 1)));
      setFuelError(next.stale ? (next.note || "Official snapshot is being shown.") : "");
      try { localStorage.setItem("patro.noc.fuel", JSON.stringify(next)); } catch { /* best-effort offline cache */ }
    } catch (error) {
      setFuelError((fuel ? "Using last saved data. " : "") + (error instanceof Error ? error.message : "NOC fuel service unavailable"));
    } finally {
      setFuelLoading(false);
    }
  }

  useEffect(() => {
    void loadFuelPrices();
    // Initial refresh only; manual refresh is available and online/offline state is shown separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!workerReady) return;
    const id = ++sequence.current;
    latestFont.current = id;
    workerRef.current?.postMessage({ id, type: "font", direction: fontDirection, input: fontInput, capitalIAsShortI });
  }, [fontInput, fontDirection, capitalIAsShortI, workerReady]);

  useEffect(() => {
    if (!workerReady) return;
    const timer = window.setTimeout(() => {
      const id = ++sequence.current;
      latestSqft.current = id;
      workerRef.current?.postMessage({ id, type: "land-sqft", sqft });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [sqft, workerReady]);

  useEffect(() => {
    if (!workerReady) return;
    const timer = window.setTimeout(() => {
      const id = ++sequence.current;
      latestHill.current = id;
      workerRef.current?.postMessage({ id, type: "land-hill", ...hill });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [hill, workerReady]);

  useEffect(() => {
    if (!workerReady) return;
    const timer = window.setTimeout(() => {
      const id = ++sequence.current;
      latestTerai.current = id;
      workerRef.current?.postMessage({ id, type: "land-terai", ...terai });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [terai, workerReady]);

  useEffect(() => {
    if (!workerReady) return;
    const year = Number(bsDate.year);
    const month = Number(bsDate.month);
    const day = Number(bsDate.day);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return;
    const timer = window.setTimeout(() => {
      const id = ++sequence.current;
      latestBsDate.current = id;
      workerRef.current?.postMessage({ id, type: "date-bs", year, month, day });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [bsDate, workerReady]);

  useEffect(() => {
    if (!workerReady || !/^\d{4}-\d{2}-\d{2}$/.test(adDate)) return;
    const timer = window.setTimeout(() => {
      const id = ++sequence.current;
      latestAdDate.current = id;
      workerRef.current?.postMessage({ id, type: "date-ad", ad: adDate });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [adDate, workerReady]);

  useEffect(() => {
    if (!workerReady) return;
    const timer = window.setTimeout(() => {
      const id = ++sequence.current;
      latestTax.current = id;
      workerRef.current?.postMessage({
        id,
        type: "tax-2083",
        ...taxInput,
        qualifyingSsfContributor,
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [taxInput, qualifyingSsfContributor, workerReady]);

  useEffect(() => {
    if (!workerReady || !qrText.trim()) {
      setQrResult(null);
      return;
    }
    const timer = window.setTimeout(() => {
      const id = ++sequence.current;
      latestQr.current = id;
      workerRef.current?.postMessage({ id, type: "qr", text: qrText, errorCorrectionLevel: qrLevel });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [qrText, qrLevel, workerReady]);

  const swapFont = () => {
    const nextDirection = fontDirection === "preeti-to-unicode" ? "unicode-to-preeti" : "preeti-to-unicode";
    setFontDirection(nextDirection);
    setFontInput(fontOutput);
    if (selectedTool !== "preeti-converter") chooseTool("preeti-converter");
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* Clipboard may be blocked by browser policy. */ }
  };

  const selectedFuelZone = fuel?.zones[fuelZoneIndex] ?? null;
  const selectedMeta = selectedTool && selectedTool !== "typingtools"
    ? catalog.find((tool) => tool.id === selectedTool) ?? TOOL_DIRECTORY.find((tool) => tool.id === selectedTool) ?? null
    : null;
  const typingTools = catalog.filter((tool) => tool.group === "typing");
  const utilityTools = catalog.filter((tool) => tool.group === "utility");
  const generalTools = catalog.filter((tool) => tool.group === "tools");
  const showFont = selectedTool === "preeti-converter";
  const showDate = selectedTool === "bstoad" || selectedTool === "adtobs";
  const showCatalog = selectedTool === null;
  const showTypingCatalog = selectedTool === "typingtools";

  return (
    <main className="utility-suite" aria-label="Nepali utility tools">
      <section className="utility-hero">
        <div>
          <p className="eyebrow">{showTypingCatalog ? "Typing Tools · टाइपिङ टुल्स" : "Tools · उपकरण"}</p>
          <h1>{showTypingCatalog ? "Nepali Typing Tools" : selectedMeta?.title || "All tools in one place"}</h1>
          <p>{showTypingCatalog ? "Two tools live here: one Preeti Converter with both directions, and Roman → Unicode Nepali Typing with local suggestions." : selectedMeta?.subtitle || "Choose a tool below. Every tool has its own clean URL and opens by itself instead of stacking multiple tool windows."}</p>
        </div>
        <span className={"utility-status " + (online ? "is-online" : "is-offline")}>{online ? "Online · offline ready" : "Offline mode"}</span>
      </section>

      {(showCatalog || showTypingCatalog) ? (
        <section className="utility-directory" aria-labelledby="utility-directory-title">
          <div className="utility-directory-head">
            <div>
              <p className="eyebrow">{showTypingCatalog ? "Typing Tools · टाइपिङ टुल्स" : "Tools directory · उपकरण"}</p>
              <h2 id="utility-directory-title">{showTypingCatalog ? "Choose a typing tool" : "Choose what you want to do"}</h2>
              <p>{showTypingCatalog ? "Preeti conversion stays in one converter. Nepali Typing is a separate Roman → Unicode writing tool." : "Every tool has a one-line explanation and its own dedicated /tools/... URL."}</p>
            </div>
            <a className="utility-home-link" href={showTypingCatalog ? "/tools" : "/"}>{showTypingCatalog ? "← All tools" : "← Patro home"}</a>
          </div>

          {showCatalog && <>
            <div className="utility-directory-section-head">
              <div>
                <p className="eyebrow">Typing Tools · टाइपिङ टुल्स</p>
                <h3>Nepali typing & font conversion</h3>
              </div>
              <a href="/tools/typingtools">View typing tools →</a>
            </div>
            <div className="utility-directory-grid">
              {typingTools.map((tool) => (
                <a className="utility-directory-card is-typing-tool" key={tool.id} href={"/tools/" + tool.id}>
                  <span className="utility-directory-icon" aria-hidden="true">{tool.icon}</span>
                  <span className="utility-directory-copy"><small>{tool.badge}</small><strong>{tool.title}</strong><span>{tool.subtitle}</span></span>
                  <span className="utility-directory-arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </div>

            <div className="utility-directory-section-head">
              <div><p className="eyebrow">Tools</p><h3>Calendar, sharing, family and developer tools</h3></div>
            </div>
            <div className="utility-directory-grid">
              {generalTools.map((tool) => (
                <a className="utility-directory-card" key={tool.id} href={"/tools/" + tool.id}>
                  <span className="utility-directory-icon" aria-hidden="true">{tool.icon}</span>
                  <span className="utility-directory-copy"><small>{tool.badge}</small><strong>{tool.title}</strong><span>{tool.subtitle}</span></span>
                  <span className="utility-directory-arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </div>


            <div className="utility-directory-section-head">
              <div><p className="eyebrow">Converters & utilities</p><h3>Date, land, finance and everyday tools</h3></div>
            </div>
            <div className="utility-directory-grid">
              {utilityTools.map((tool) => (
                <a className="utility-directory-card" key={tool.id} href={"/tools/" + tool.id}>
                  <span className="utility-directory-icon" aria-hidden="true">{tool.icon}</span>
                  <span className="utility-directory-copy"><small>{tool.badge}</small><strong>{tool.title}</strong><span>{tool.subtitle}</span></span>
                  <span className="utility-directory-arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </div>          </>}

          {showTypingCatalog && <div className="utility-directory-grid">
            {typingTools.map((tool) => (
              <a className="utility-directory-card is-typing-tool" key={tool.id} href={"/tools/" + tool.id}>
                <span className="utility-directory-icon" aria-hidden="true">{tool.icon}</span>
                <span className="utility-directory-copy"><small>{tool.badge}</small><strong>{tool.title}</strong><span>{tool.subtitle}</span></span>
                <span className="utility-directory-arrow" aria-hidden="true">→</span>
              </a>
            ))}
          </div>}

          <div className="utility-directory-related">
            <span>More:</span>
            <a href="/jyotish/rashifal">राशिफल · Rashifal</a>
            <a href="/">मुख्य पात्रो · Home</a>
          </div>
        </section>
      ) : (
        <nav className="utility-tool-nav" aria-label="Utility navigation">
          <button type="button" onClick={() => chooseTool(null)}>← All tools</button>
          <strong>{selectedMeta?.title}</strong>
          <a href="/">Patro home</a>
        </nav>
      )}

      <section className="utility-card" aria-labelledby="date-converter-title" hidden={!showDate}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">Calendar engine</p>
            <h2 id="date-converter-title">BS ⇄ AD Date Converter</h2>
          </div>
          <span className="utility-badge">Anchor: 1970-01-01 BS = 1913-04-13 AD</span>
        </header>

        <div className="date-grid">
          {selectedTool !== "adtobs" && <article className="land-panel">
            <h3>Bikram Sambat → Gregorian</h3>
            <div className="land-fields land-fields--three">
              <Field label="BS year" value={bsDate.year} onChange={(value) => setBsDate((v) => ({ ...v, year: value }))} />
              <Field label="Month" value={bsDate.month} onChange={(value) => setBsDate((v) => ({ ...v, month: value }))} />
              <Field label="Day" value={bsDate.day} onChange={(value) => setBsDate((v) => ({ ...v, day: value }))} />
            </div>
            {bsDateResult && <div className="utility-result">
              <strong>{bsDateResult.ad} AD</strong>
              <span>{bsDateResult.bs} BS</span>
              <small className={"utility-provenance " + (bsDateResult.metadata.confidence === "provisional-open-table" ? "is-provisional" : "")}>
                {bsDateResult.metadata.confidence === "provisional-open-table" ? "Provisional future table" : "Validated archive range"}
              </small>
            </div>}
          </article>}
 
          {selectedTool !== "bstoad" && <article className="land-panel">
            <h3>Gregorian → Bikram Sambat</h3>
            <label className="utility-field">
              <span>AD date</span>
              <input type="date" value={adDate} onChange={(event) => setAdDate(event.target.value)} />
            </label>
            {adDateResult && <div className="utility-result">
              <strong>{adDateResult.bs} BS</strong>
              <span>{adDateResult.ad} AD</span>
              <small className={"utility-provenance " + (adDateResult.metadata.confidence === "provisional-open-table" ? "is-provisional" : "")}>
                {adDateResult.metadata.confidence === "provisional-open-table" ? "Provisional future table" : "Validated archive range"}
              </small>
            </div>}
          </article>}
        </div>

        <p className="utility-note">1970–2093 is backed by the existing Patro synchronized archive; 2094–2099 remains explicitly provisional because independent future BS tables can disagree.</p>
        {dateError && <p className="utility-error" role="alert">{dateError}</p>}
      </section>

      <section className="utility-card" aria-labelledby="tax-title" hidden={selectedTool !== "incometax"}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">FY 2083/84 · Salary tax</p>
            <h2 id="tax-title">Personal Income Tax Calculator</h2>
          </div>
          <span className="utility-badge">Current unified resident schedule</span>
        </header>

        <div className="tax-grid">
          <article className="land-panel">
            <h3>Annual income & retirement contributions</h3>
            <Field label="Annual salary (NPR)" value={taxInput.annualSalary} onChange={(value) => setTaxInput((v) => ({ ...v, annualSalary: value }))} />
            <div className="land-fields land-fields--three">
              <Field label="SSF" value={taxInput.ssf} onChange={(value) => setTaxInput((v) => ({ ...v, ssf: value }))} />
              <Field label="EPF" value={taxInput.epf} onChange={(value) => setTaxInput((v) => ({ ...v, epf: value }))} />
              <Field label="CIT" value={taxInput.cit} onChange={(value) => setTaxInput((v) => ({ ...v, cit: value }))} />
            </div>
            <label className="utility-check">
              <input type="checkbox" checked={qualifyingSsfContributor} onChange={(event) => setQualifyingSsfContributor(event.target.checked)} />
              Qualifying contribution-based SSF contributor
            </label>
          </article>

          <article className="land-panel">
            <h3>Insurance deductions</h3>
            <div className="land-fields">
              <Field label="Life insurance (annual)" value={taxInput.lifeInsurance} onChange={(value) => setTaxInput((v) => ({ ...v, lifeInsurance: value }))} />
              <Field label="Health insurance (annual)" value={taxInput.healthInsurance} onChange={(value) => setTaxInput((v) => ({ ...v, healthInsurance: value }))} />
            </div>
            <p className="utility-note">Caps applied by the engine: life insurance NPR 40,000; health insurance NPR 20,000. Retirement contribution cap is the lower of actual contribution, one-third of salary, and the applicable NPR 300,000 / NPR 500,000 ceiling.</p>
          </article>
        </div>

        {taxResult && <div className="tax-result-grid">
          <article className="utility-result"><span>Taxable income</span><strong>NPR {taxResult.taxableIncome}</strong></article>
          <article className="utility-result"><span>Annual tax</span><strong>NPR {taxResult.annualTax}</strong></article>
          <article className="utility-result"><span>Monthly average</span><strong>NPR {taxResult.monthlyAverageTax}</strong></article>
          <article className="utility-result"><span>Retirement deduction</span><strong>NPR {taxResult.retirementDeduction}</strong><small>cap NPR {taxResult.retirementDeductionCap}</small></article>
        </div>}

        {taxResult && <div className="tax-band-list" aria-label="Tax band breakdown">
          {taxResult.bands.map((band, index) => <div key={index}>
            <span>{(band.rateBps / 100).toFixed(band.rateBps % 100 ? 2 : 0)}%</span>
            <strong>NPR {band.tax}</strong>
            <small>on NPR {band.taxable}</small>
          </div>)}
        </div>}

        <p className="utility-note">This module is versioned for FY 2083/84. The first 1% band is waived only when the qualifying SSF checkbox correctly reflects the taxpayer's legal status.</p>
        {taxError && <p className="utility-error" role="alert">{taxError}</p>}
      </section>

      <section className="utility-card" aria-labelledby="qr-title" hidden={selectedTool !== "nepaliqr"}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">Private · client-only</p>
            <h2 id="qr-title">Devanagari QR Generator</h2>
          </div>
          <span className="utility-badge">UTF-8 · offline</span>
        </header>

        <div className="qr-grid">
          <div className="qr-input-panel">
            <label className="utility-field">
              <span>Text / नेपाली सामग्री</span>
              <textarea rows={8} value={qrText} onChange={(event) => setQrText(event.target.value)} placeholder="नमस्ते नेपाल" />
            </label>
            <label className="utility-field">
              <span>Error correction</span>
              <select value={qrLevel} onChange={(event) => setQrLevel(event.target.value as "L" | "M" | "Q" | "H")}>
                <option value="L">L · ~7%</option>
                <option value="M">M · ~15%</option>
                <option value="Q">Q · ~25%</option>
                <option value="H">H · ~30%</option>
              </select>
            </label>
            <p className="utility-note">Generated entirely in the browser Worker using explicit UTF-8 bytes. The entered text is not transmitted.</p>
          </div>

          <div className="qr-preview" aria-live="polite">
            {qrResult
              ? <>
                  <img src={qrResult.dataUrl} alt={"QR code for " + qrText.slice(0, 80)} />
                  <div><strong>{qrResult.modules} × {qrResult.modules}</strong><span>{qrResult.bytes} UTF-8 bytes</span></div>
                  <a className="utility-secondary qr-download" href={qrResult.dataUrl} download="nepali-qr.gif">Save QR</a>
                </>
              : <span>Enter text to generate a QR code.</span>}
          </div>
        </div>
        {qrError && <p className="utility-error" role="alert">{qrError}</p>}
      </section>


      <section className="utility-card" aria-labelledby="fuel-title" hidden={selectedTool !== "fuelprice"}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">Nepal Oil Corporation</p>
            <h2 id="fuel-title">Fuel Price Tracker</h2>
          </div>
          <button type="button" className="utility-secondary" disabled={fuelLoading || !online} onClick={() => void loadFuelPrices()}>
            {fuelLoading ? "Refreshing…" : "Refresh NOC"}
          </button>
        </header>

        {fuel && selectedFuelZone ? <>
          <div className="fuel-toolbar">
            <label className="utility-field">
              <span>Price zone / depot group</span>
              <select value={fuelZoneIndex} onChange={(event) => setFuelZoneIndex(Number(event.target.value))}>
                {fuel.zones.map((zone, index) => <option value={index} key={zone.depots.join("|")}>{zone.depots.join(", ")}</option>)}
              </select>
            </label>
            <span className={"utility-status " + (fuel.stale ? "is-offline" : "is-online")}>
              {fuel.stale ? "Official snapshot · stale" : "Live NOC source"}
            </span>
          </div>

          <div className="fuel-grid">
            <article className="utility-result"><span>Petrol</span><strong>NPR {selectedFuelZone.petrol}/L</strong></article>
            <article className="utility-result"><span>Diesel</span><strong>NPR {selectedFuelZone.diesel}/L</strong></article>
            <article className="utility-result"><span>Kerosene</span><strong>NPR {selectedFuelZone.kerosene}/L</strong></article>
            <article className="utility-result"><span>LP Gas</span><strong>{selectedFuelZone.lpgNprPerCylinder == null ? "—" : "NPR " + selectedFuelZone.lpgNprPerCylinder + "/cyl"}</strong></article>
            <article className="utility-result"><span>ATF domestic</span><strong>{selectedFuelZone.atfDomesticNprPerL == null ? "—" : "NPR " + selectedFuelZone.atfDomesticNprPerL + "/L"}</strong></article>
            <article className="utility-result"><span>ATF duty free</span><strong>{selectedFuelZone.atfDutyFreeUsdPerKl == null ? "—" : "USD " + selectedFuelZone.atfDutyFreeUsdPerKl + "/KL"}</strong></article>
          </div>
          <p className="utility-note">
            Depots: {selectedFuelZone.depots.join(", ")}. {fuel.effectiveDate ? "Effective reference: " + fuel.effectiveDate + ". " : ""}
            Fetched {new Date(fuel.fetchedAt).toLocaleString()}.
            {fuel.note ? " " + fuel.note : ""}
          </p>
        </> : <p className="utility-note">No NOC price data saved yet. Connect once to fetch the current official source or the latest verified official snapshot.</p>}
        {fuelError && <p className="utility-warning" role="status">{fuelError}</p>}
      </section>


      <section className="utility-card" aria-labelledby="font-converter-title" hidden={!showFont}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">Text engine</p>
            <h2 id="font-converter-title">Preeti ⇄ Unicode</h2>
          </div>
          <button type="button" className="utility-secondary" onClick={swapFont}>Swap direction</button>
        </header>

        <div className="utility-segmented" role="group" aria-label="Font conversion direction">
          <button className={fontDirection === "preeti-to-unicode" ? "active" : ""} onClick={() => setFontDirection("preeti-to-unicode")}>Preeti → Unicode</button>
          <button className={fontDirection === "unicode-to-preeti" ? "active" : ""} onClick={() => setFontDirection("unicode-to-preeti")}>Unicode → Preeti</button>
        </div>

        <div className="utility-text-grid">
          <label>
            <span>{fontDirection === "preeti-to-unicode" ? "Preeti input" : "Unicode input"}</span>
            <textarea value={fontInput} onChange={(event) => setFontInput(event.target.value)} rows={9} spellCheck={false} />
          </label>
          <label>
            <span>{fontDirection === "preeti-to-unicode" ? "Unicode output" : "Preeti output"}</span>
            <textarea value={fontOutput} readOnly rows={9} spellCheck={false} />
          </label>
        </div>
        <div className="utility-inline-actions">
          <label className="utility-check"><input type="checkbox" checked={capitalIAsShortI} onChange={(event) => setCapitalIAsShortI(event.target.checked)} />Legacy capital-I short-i compatibility</label>
          <button type="button" onClick={() => copy(fontOutput)}>Copy output</button>
        </div>
        {fontError && <p className="utility-error" role="alert">{fontError}</p>}
      </section>

      <section className="utility-card" aria-labelledby="land-title" hidden={selectedTool !== "landconverter"}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">Exact land math</p>
            <h2 id="land-title">Ropani · Aana · Paisa · Dam ⇄ Bigha · Kattha · Dhur</h2>
          </div>
          <span className="utility-badge">1,000,000× scaled integers</span>
        </header>

        <div className="land-grid">
          <article className="land-panel">
            <h3>Square feet → both systems</h3>
            <Field label="Square feet" value={sqft} onChange={setSqft} />
            {sqftResult && <div className="utility-result">
              <strong>{sqftResult.hill.ropani} R · {sqftResult.hill.aana} A · {sqftResult.hill.paisa} P · {sqftResult.hill.dam} D</strong>
              <span>{sqftResult.terai.bigha} B · {sqftResult.terai.kattha} K · {sqftResult.terai.dhur} Dhur</span>
            </div>}
          </article>

          <article className="land-panel">
            <h3>Hill system → square feet</h3>
            <div className="land-fields">
              <Field label="Ropani" value={hill.ropani} onChange={(value) => setHill((v) => ({ ...v, ropani: value }))} />
              <Field label="Aana" value={hill.aana} onChange={(value) => setHill((v) => ({ ...v, aana: value }))} />
              <Field label="Paisa" value={hill.paisa} onChange={(value) => setHill((v) => ({ ...v, paisa: value }))} />
              <Field label="Dam" value={hill.dam} onChange={(value) => setHill((v) => ({ ...v, dam: value }))} />
            </div>
            {hillResult && <div className="utility-result"><strong>{hillResult.sqft} ft²</strong><span>{hillResult.terai.bigha} B · {hillResult.terai.kattha} K · {hillResult.terai.dhur} Dhur</span></div>}
          </article>

          <article className="land-panel">
            <h3>Terai system → square feet</h3>
            <div className="land-fields land-fields--three">
              <Field label="Bigha" value={terai.bigha} onChange={(value) => setTerai((v) => ({ ...v, bigha: value }))} />
              <Field label="Kattha" value={terai.kattha} onChange={(value) => setTerai((v) => ({ ...v, kattha: value }))} />
              <Field label="Dhur" value={terai.dhur} onChange={(value) => setTerai((v) => ({ ...v, dhur: value }))} />
            </div>
            {teraiResult && <div className="utility-result"><strong>{teraiResult.sqft} ft²</strong><span>{teraiResult.hill.ropani} R · {teraiResult.hill.aana} A · {teraiResult.hill.paisa} P · {teraiResult.hill.dam} D</span></div>}
          </article>
        </div>
        {landError && <p className="utility-error" role="alert">{landError}</p>}
      </section>
    </main>
  );
}
