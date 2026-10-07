import { PaymentQrInput } from "./PaymentQrInput";
import { useEffect, useRef, useState } from "react";
import { ReferenceUtilityTools, isReferenceUtilityId } from "./ReferenceUtilities";

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
  | "convert"
  | "tax"
  | "land"
  | "qr"
  | "fuel"
  | "calc"
  | "age"
  | "clock"
  | "forex"
  | "gold"
  | "emi"
  | "vat"
  | "units"
  | "words"
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
  | "my-data"
  | "samudaya"
  | "tithi-reminder"
  | "sait"
  | "baby-names"
  | "janmadin-akhbar"
  | "future-letter"
  | "spell-check"
  | "voice-typing"
  | "ocr"
  | "name-check"
  | "read-aloud"
  | "patro-bot";

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
  subtitle: "Roman Nepali लेखेर 34,571 देवनागरी सुझावबाट सहजै नेपाली टाइप गर्नुहोस्।",
  badge: "Typing Tools",
  group: "typing",
};
const SAMUDAYA_TOOL: ToolDirectoryItem = { id: "samudaya", icon: "समु", title: "समुदाय · Community Suite", subtitle: "नेपाल संवत्, ल्होसार, थारु, मिथिला, किरात र हिजरी अनुभव एउटै ठाउँमा।", badge: "Calendar", group: "tools" };

const TOOL_DIRECTORY: ToolDirectoryItem[] = [
  NEPALI_TYPING_TOOL,
  { id: "convert", icon: "वि", title: "मिति रूपान्तरण · Date converter", subtitle: "Bikram Sambat र Gregorian मिति दुवैतर्फ छिटो रूपान्तरण गर्नुहोस्।", badge: "Calendar", group: "utility" },
  { id: "calc", icon: "±", title: "दिन गणना · Date calculator", subtitle: "दुई मितिबीचका दिन गन्नुहोस् वा छानिएको मितिमा दिन थपघट गर्नुहोस्।", badge: "Calendar", group: "utility" },
  { id: "age", icon: "उ", title: "उमेर गणक · Age calculator", subtitle: "वर्ष, महिना, दिन, कुल दिन र अर्को जन्मदिनसहित उमेर गणना गर्नुहोस्।", badge: "Calendar", group: "utility" },
  { id: "clock", icon: "घ", title: "विश्व घडी · World clock", subtitle: "विश्वका प्रमुख शहरहरूको समय र नेपालमा फोन गर्ने उपयुक्त समय हेर्नुहोस्।", badge: "Time", group: "utility" },
  { id: "forex", icon: "$", title: "विदेशी मुद्रा · Forex rates", subtitle: "नेपाल राष्ट्र बैंकका खरिद र बिक्री विनिमय दर हेर्नुहोस्।", badge: "NRB", group: "utility" },
  { id: "gold", icon: "सु", title: "सुनचाँदी हिसाब · Gold calculator", subtitle: "तोला वा ग्रामको तौल र तपाईंले राखेको दरबाट गहना मूल्य अनुमान गर्नुहोस्।", badge: "Gold", group: "utility" },
  { id: "emi", icon: "%", title: "कर्जा EMI · Loan EMI", subtitle: "मासिक किस्ता, कुल ब्याज र वर्षगत भुक्तानी तालिका गणना गर्नुहोस्।", badge: "Finance", group: "utility" },
  { id: "vat", icon: "भ", title: "भ्याट र प्रतिशत · VAT & percent", subtitle: "VAT थपघट, प्रतिशत र मूल्य परिवर्तन सजिलै गणना गर्नुहोस्।", badge: "Finance", group: "utility" },
  { id: "units", icon: "ना", title: "नाप–तौल · Traditional units", subtitle: "तोला–लाल, माना–पाथी–मुरी, हात र अन्य एकाइ रूपान्तरण गर्नुहोस्।", badge: "Measure", group: "utility" },
  { id: "words", icon: "अ", title: "अंकलाई शब्दमा · Amount in words", subtitle: "रकमलाई लाख–करोड प्रणालीमा नेपाली वा अङ्ग्रेजी शब्दमा लेख्नुहोस्।", badge: "Language", group: "utility" },
  { id: "tax", icon: "रु", title: "आयकर · Income tax", subtitle: "आ.व. २०८३/८४ को व्यक्तिगत आयकर अनुमान गर्नुहोस्।", badge: "Finance", group: "utility" },
  { id: "land", icon: "रो", title: "जग्गा नाप · Land units", subtitle: "रोपनी–आना–पैसा–दाम र बिघा–कट्ठा–धुर रूपान्तरण गर्नुहोस्।", badge: "Land", group: "utility" },
  { id: "qr", icon: "QR", title: "QR कोड · QR code", subtitle: "नेपाली वा अङ्ग्रेजी पाठबाट निजी QR कोड बनाउनुहोस्।", badge: "QR", group: "utility" },
  { id: "fuel", icon: "इ", title: "इन्धन मूल्य · Fuel prices", subtitle: "नेपाल आयल निगमका पेट्रोल, डिजेल, मट्टितेल, LPG र हवाई इन्धन मूल्य हेर्नुहोस्।", badge: "NOC", group: "utility" },
  { id: "preeti-converter", icon: "प्री", title: "Preeti Converter · प्रीति रूपान्तरण", subtitle: "Preeti → Unicode र Unicode → Preeti दुवैतर्फ पाठ रूपान्तरण गर्नुहोस्।", badge: "Typing Tools", group: "typing" },
  { id: "bstoad", icon: "वि", title: "BS → AD Date Converter", subtitle: "Bikram Sambat मितिलाई Gregorian/AD मितिमा रूपान्तरण गर्नुहोस्।", badge: "Calendar", group: "utility" },
  { id: "adtobs", icon: "AD", title: "AD → BS Date Converter", subtitle: "Gregorian/AD मितिलाई Bikram Sambat मितिमा रूपान्तरण गर्नुहोस्।", badge: "Calendar", group: "utility" },
  { id: "landconverter", icon: "▦", title: "Nepali Land Converter", subtitle: "रोपनी–आना–पैसा–दाम, बिघा–कट्ठा–धुर र square feet रूपान्तरण गर्नुहोस्।", badge: "Land", group: "utility" },
  { id: "incometax", icon: "रु", title: "Income Tax Calculator", subtitle: "आ.व. २०८३/८४ को तलब आयकर र लागू कटौती अनुमान गर्नुहोस्।", badge: "Finance", group: "utility" },
  { id: "nepaliqr", icon: "QR", title: "नेपाली / बैंक / eSewa / Khalti QR", subtitle: "नेपाली वा अङ्ग्रेजी पाठबाट आफ्नो उपकरणमै QR कोड बनाउनुहोस्।", badge: "QR", group: "utility" },
  SAMUDAYA_TOOL,
  { id: "fuelprice", icon: "NOC", title: "NOC Fuel Price Tracker", subtitle: "नेपाल आयल निगमका पेट्रोलियम मूल्य क्षेत्रअनुसार हेर्नुहोस्।", badge: "Fuel", group: "utility" },
  { id: "tithi-reminder", icon: "त", title: "तिथि रिमाइन्डर", subtitle: "श्राद्ध, तिथि जन्मदिन, रिमाइन्डर र Google Calendar feed व्यवस्थापन गर्नुहोस्।", badge: "नयाँ", group: "tools" },
  { id: "sait", icon: "शु", title: "साइत · शुभ समय", subtitle: "परम्परागत नियम र उपलब्ध आधिकारिक मितिसहित शुभ समय खोज्नुहोस्।", badge: "नयाँ", group: "tools" },
  { id: "baby-names", icon: "ना", title: "नक्षत्र अनुसार बच्चाको नाम", subtitle: "नक्षत्र अक्षर, न्वारन, पास्नी र खोप समयरेखा हेर्नुहोस्।", badge: "नयाँ", group: "tools" },
  { id: "janmadin-akhbar", icon: "📰", title: "जन्मदिन अखबार", subtitle: "जन्म दिनको पात्रो र इतिहासबाट PNG शेयर कार्ड बनाउनुहोस्।", badge: "नयाँ", group: "tools" },
  { id: "future-letter", icon: "✉", title: "भविष्यको चिठी", subtitle: "वि.सं. मिति वा तिथि जन्मदिनमा खुल्ने निजी चिठी लेख्नुहोस्।", badge: "नयाँ", group: "tools" },
  { id: "spell-check", icon: "✓", title: "नेपाली हिज्जे जाँच", subtitle: "नेपाली पाठको हिज्जे जाँच्नुहोस् र सुधार सुझाव हेर्नुहोस्।", badge: "भाषा", group: "tools" },
  { id: "voice-typing", icon: "🎙", title: "आवाजबाट नेपाली टाइपिङ", subtitle: "बोलेर नेपाली पाठ लेख्नुहोस्। उपलब्ध ब्राउजरमा आवाज सीधै पहिचान हुन्छ।", badge: "भाषा", group: "tools" },
  { id: "ocr", icon: "OCR", title: "नेपाली OCR", subtitle: "तस्बिरबाट नेपाली अक्षर निकालेर सम्पादनयोग्य पाठ बनाउनुहोस्।", badge: "भाषा", group: "tools" },
  { id: "name-check", icon: "नाम", title: "नाम जाँच", subtitle: "नामको सुरु अक्षर र नक्षत्र/पद मिलान हेर्नुहोस्।", badge: "ज्योतिष", group: "tools" },
  { id: "read-aloud", icon: "🔊", title: "पढेर सुनाउनुहोस्", subtitle: "नेपाली पाठ आवाजमा सुन्नुहोस्।", badge: "Accessibility", group: "tools" },
  { id: "patro-bot", icon: "Bot", title: "Patro Bot", subtitle: "मिति, तिथि, पात्रो र रिमाइन्डरका छोटा प्रश्न सोध्नुहोस्।", badge: "नयाँ", group: "tools" },
  { id: "tithi", icon: "त", title: "तिथि · Tithi", subtitle: "तिथिमा आधारित रिमाइन्डर र आगामी धार्मिक वा जन्मदिन मिति गणना गर्नुहोस्।", badge: "Tools", group: "tools" },
  { id: "diaspora", icon: "देश", title: "Diaspora", subtitle: "विदेशमा बस्दा नेपाल समय, मिति र पात्रो सन्दर्भ सजिलै हेर्नुहोस्।", badge: "Tools", group: "tools" },
  { id: "card", icon: "▣", title: "कार्ड · Share Cards", subtitle: "मिति र चाडपर्वका शेयर गर्न मिल्ने कार्ड बनाउनुहोस्।", badge: "Tools", group: "tools" },
  { id: "family", icon: "परि", title: "परिवार · Family", subtitle: "परिवारका मिति, साझा घटना र सम्झना एउटै ठाउँमा राख्नुहोस्।", badge: "Tools", group: "tools" },
  { id: "api", icon: "</>", title: "API · Integration", subtitle: "आफ्नै पात्रो सेवासँग एकीकरणका लागि उपलब्ध API विवरण हेर्नुहोस्।", badge: "API", group: "tools" },
  { id: "my-data", icon: "डेटा", title: "मेरो डेटा · My Data", subtitle: "आफ्नो खाताको निजी डेटा हेर्नुहोस्, डाउनलोड गर्नुहोस् वा मेटाउनुहोस्।", badge: "Privacy", group: "tools" },
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
          "incometax","nepaliqr","fuelprice","convert","tax","land","qr","fuel","calc","age","clock","forex","gold","emi","vat","units","words","tithi","diaspora","card","family","api","my-data",
          "tithi-reminder","sait","baby-names","janmadin-akhbar","future-letter","spell-check","voice-typing","ocr","name-check","read-aloud","patro-bot","samudaya"
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
        const remoteById = new Map(next.map((item) => [item.id, item]));
        const merged = TOOL_DIRECTORY.map((local) => {
          const remote = remoteById.get(local.id);
          return remote ? { ...local, ...remote } : local;
        });
        for (const remote of next) {
          if (!merged.some((item) => item.id === remote.id)) merged.push(remote);
        }
        setCatalog(merged);
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
    if (tool === "samudaya") { window.location.assign("/samudaya"); return; }
    const nextPath = tool ? "/tools/" + tool : "/tools";
    window.history.pushState(null, "", nextPath);
    setSelectedTool(tool);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadFuelPrices() {
    if (!navigator.onLine) {
      setFuelError(fuel ? "इन्टरनेट छैन—अघिल्लो सुरक्षित मूल्य देखाइएको छ।" : "इन्टरनेट छैन र यस उपकरणमा पहिलेको मूल्य सुरक्षित छैन।");
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
        throw new Error("fuel_unavailable");
      }
      const next = body as FuelPayload;
      setFuel(next);
      setFuelZoneIndex((current) => Math.min(current, Math.max(0, next.zones.length - 1)));
      setFuelError(next.stale ? "पछिल्लो उपलब्ध NOC मूल्य देखाइएको छ।" : "");
      try { localStorage.setItem("patro.noc.fuel", JSON.stringify(next)); } catch { /* best-effort offline cache */ }
    } catch {
      setFuelError(fuel ? "ताजा मूल्य अहिले अपडेट हुन सकेन। अघिल्लो सुरक्षित मूल्य देखाइएको छ।" : "NOC मूल्य अहिले लोड हुन सकेन। केही बेरपछि फेरि प्रयास गर्नुहोस्।");
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
  const generalTools = catalog.filter((tool) => tool.group === "tools" && tool.id !== "api");
  const showFont = selectedTool === "preeti-converter";
  const showDate = selectedTool === "bstoad" || selectedTool === "adtobs" || selectedTool === "convert";
  const showReferenceTool = isReferenceUtilityId(selectedTool);
  const showCatalog = selectedTool === null;
  const showTypingCatalog = selectedTool === "typingtools";

  return (
    <main className="utility-suite" aria-label="Nepali utility tools">
      <section className="utility-hero">
        <div>
          <p className="eyebrow">{showTypingCatalog ? "Typing Tools · टाइपिङ टुल्स" : "Tools · उपकरण"}</p>
          <h1>{showTypingCatalog ? "Nepali Typing Tools" : selectedMeta?.title || "All tools in one place"}</h1>
          <p>{showTypingCatalog ? "Preeti रूपान्तरण र Roman → Unicode नेपाली टाइपिङ एउटै ठाउँबाट खोल्नुहोस्।" : selectedMeta?.subtitle || "मिति, भाषा, वित्त, ज्योतिष र दैनिक कामका उपयोगी उपकरण एउटै ठाउँमा।"}</p>
        </div>
        <span className={"utility-status " + (online ? "is-online" : "is-offline")}>{online ? "Online · offline ready" : "Offline mode"}</span>
      </section>

      {(showCatalog || showTypingCatalog) ? (
        <section className="utility-directory" aria-labelledby="utility-directory-title">
          <div className="utility-directory-head">
            <div>
              <p className="eyebrow">{showTypingCatalog ? "Typing Tools · टाइपिङ टुल्स" : "Tools directory · उपकरण"}</p>
              <h2 id="utility-directory-title">{showTypingCatalog ? "Choose a typing tool" : "Choose what you want to do"}</h2>
              <p>{showTypingCatalog ? "Preeti conversion र Roman → Unicode नेपाली टाइपिङमध्ये चाहिएको सुविधा छान्नुहोस्।" : "हरेक उपकरणको उद्देश्य छोटकरीमा दिइएको छ—चाहिएको काम छानेर सीधै सुरु गर्नुहोस्।"}</p>
            </div>
            <a className="utility-home-link" href={showTypingCatalog ? "/tools" : "/"}>{showTypingCatalog ? "← All tools" : "← आफ्नै पात्रो home"}</a>
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
              <div><p className="eyebrow">Tools</p><h3>पात्रो, साझेदारी र व्यक्तिगत सुविधा</h3></div>
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
              <div><p className="eyebrow">Converters & utilities</p><h3>मिति, जग्गा, वित्त र दैनिक हिसाब</h3></div>
            </div>
            <div className="utility-directory-grid">
              {utilityTools.map((tool) => (
                <a className="utility-directory-card" key={tool.id} href={"/tools/" + tool.id}>
                  <span className="utility-directory-icon" aria-hidden="true">{tool.icon}</span>
                  <span className="utility-directory-copy"><small>{tool.badge}</small><strong>{tool.title}</strong><span>{tool.subtitle}</span></span>
                  <span className="utility-directory-arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </div>

            <div className="utility-directory-section-head">
              <div><p className="eyebrow">आधिकारिक साइटहरू</p><h3>बजार र सार्वजनिक जानकारी</h3></div>
            </div>
            <div className="utility-directory-grid">
              <a className="utility-directory-card" href="https://www.nepalstock.com" target="_blank" rel="noreferrer">
                <span className="utility-directory-icon" aria-hidden="true">शे</span>
                <span className="utility-directory-copy"><small>NEPSE</small><strong>सेयर बजार · Share market</strong><span>Nepal Stock Exchange को वेबसाइट खोल्नुहोस्।</span></span>
                <span className="utility-directory-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="utility-directory-card" href="https://kalimatimarket.gov.np" target="_blank" rel="noreferrer">
                <span className="utility-directory-icon" aria-hidden="true">त</span>
                <span className="utility-directory-copy"><small>Kalimati Market</small><strong>तरकारी भाउ · Vegetable prices</strong><span>कालिमाटी फलफूल तथा तरकारी बजारको मूल्य जानकारी खोल्नुहोस्।</span></span>
                <span className="utility-directory-arrow" aria-hidden="true">↗</span>
              </a>
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
            <a href="/rashifal">राशिफल · Rashifal</a>
            <a href="/">मुख्य पात्रो · Home</a>
          </div>
        </section>
      ) : (
        <nav className="utility-tool-nav" aria-label="Utility navigation">
          <button type="button" onClick={() => chooseTool(null)}>← All tools</button>
          <strong>{selectedMeta?.title}</strong>
          <a href="/">आफ्नै पात्रो home</a>
        </nav>
      )}

      {showReferenceTool && <ReferenceUtilityTools tool={selectedTool} />}

      <section className="utility-card" aria-labelledby="date-converter-title" hidden={!showDate}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">मिति रूपान्तरण</p>
            <h2 id="date-converter-title">BS ⇄ AD Date Converter</h2>
          </div>
          <span className="utility-badge">वि.सं. ⇄ ई.सं.</span>
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
                {bsDateResult.metadata.confidence === "provisional-open-table" ? "भविष्यका वर्षमा प्रकाशित पात्रोबीच फरक पर्न सक्छ" : "पात्रो अभिलेखअनुसार"}
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
                {adDateResult.metadata.confidence === "provisional-open-table" ? "भविष्यका वर्षमा प्रकाशित पात्रोबीच फरक पर्न सक्छ" : "पात्रो अभिलेखअनुसार"}
              </small>
            </div>}
          </article>}
        </div>

        <p className="utility-note">टाढाका भविष्यका वि.सं. वर्षमा विभिन्न प्रकाशित पात्रोबीच दिन फरक पर्न सक्छ। महत्त्वपूर्ण कानुनी वा औपचारिक कामका लागि सम्बन्धित आधिकारिक पात्रोसँग पनि मिति जाँच गर्नुहोस्।</p>
        {dateError && <p className="utility-error" role="alert">{dateError}</p>}
      </section>

      <section className="utility-card" aria-labelledby="tax-title" hidden={selectedTool !== "incometax" && selectedTool !== "tax"}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">आ.व. २०८३/८४ · व्यक्तिगत आयकर</p>
            <h2 id="tax-title">Personal Income Tax Calculator</h2>
          </div>
          <span className="utility-badge">Resident taxpayer estimate</span>
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
            <p className="utility-note">जीवन बीमा कटौती सीमा NPR 40,000 र स्वास्थ्य बीमा कटौती सीमा NPR 20,000 सम्म लागू हुन्छ। अवकाश योगदानको सीमा वास्तविक योगदान, तलबको एक-तिहाइ र लागू NPR 300,000 / NPR 500,000 सीमामध्ये कम रकमका आधारमा गणना हुन्छ।</p>
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

        <p className="utility-note">यो गणक आ.व. २०८३/८४ का लागि हो। १% सामाजिक सुरक्षा कर छुट लागू हुने वा नहुने अवस्था तपाईंको वास्तविक SSF कानुनी स्थितिअनुसार छान्नुहोस्। अन्तिम कर विवरणका लागि सम्बन्धित आधिकारिक नियम जाँच गर्नुहोस्।</p>
        {taxError && <p className="utility-error" role="alert">{taxError}</p>}
      </section>

      <section className="utility-card" aria-labelledby="qr-title" hidden={selectedTool !== "nepaliqr" && selectedTool !== "qr"}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">गोपनीय · तपाईंको उपकरणमै</p>
            <h2 id="qr-title">नेपाली / बैंक / eSewa / Khalti QR</h2>
          </div>
          <span className="utility-badge">UTF-8 · offline</span>
        </header>

        <div className="qr-grid">
          <div className="qr-input-panel"><PaymentQrInput onPayload={setQrText}/>
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
            <p className="utility-note">QR कोड तपाईंको उपकरणमै बन्छ; यहाँ लेखिएको पाठ बाहिर पठाइँदैन।</p>
          </div>

          <div className="qr-preview" aria-live="polite">
            {qrResult
              ? <>
                  <img src={qrResult.dataUrl} alt={"QR code for " + qrText.slice(0, 80)} />
                  <div><strong>{qrResult.modules} × {qrResult.modules}</strong><span>{qrResult.bytes} UTF-8 bytes</span></div>
                  <a className="utility-secondary qr-download" href={qrResult.dataUrl} download="nepali-qr.gif">Save QR</a>
                </>
              : <span>QR बनाउन पाठ लेख्नुहोस्।</span>}
          </div>
        </div>
        {qrError && <p className="utility-error" role="alert">{qrError}</p>}
      </section>

      <section className="utility-card" aria-labelledby="fuel-title" hidden={selectedTool !== "fuelprice" && selectedTool !== "fuel"}>
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
              {fuel.stale ? "पछिल्लो उपलब्ध NOC मूल्य" : "NOC को ताजा मूल्य"}
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
            डिपो समूह: {selectedFuelZone.depots.join(", ")}. {fuel.effectiveDate ? "लागू मिति: " + fuel.effectiveDate + ". " : ""}
            अद्यावधिक: {new Date(fuel.fetchedAt).toLocaleString()}.
          </p>
        </> : <p className="utility-note">इन्टरनेट जडान भएपछि नेपाल आयल निगमको उपलब्ध मूल्य लोड हुनेछ।</p>}
        {fuelError && <p className="utility-warning" role="status">{fuelError}</p>}
      </section>

      <section className="utility-card" aria-labelledby="font-converter-title" hidden={!showFont}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">प्रीति रूपान्तरण</p>
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
          <label className="utility-check"><input type="checkbox" checked={capitalIAsShortI} onChange={(event) => setCapitalIAsShortI(event.target.checked)} />पुराना Preeti फाइलका Capital-I अक्षरलाई ह्रस्व इ मान्नुहोस्</label>
          <button type="button" onClick={() => copy(fontOutput)}>Copy output</button>
        </div>
        {fontError && <p className="utility-error" role="alert">{fontError}</p>}
      </section>

      <section className="utility-card" aria-labelledby="land-title" hidden={selectedTool !== "landconverter" && selectedTool !== "land"}>
        <header className="utility-card-head">
          <div>
            <p className="eyebrow">जग्गा नाप रूपान्तरण</p>
            <h2 id="land-title">Ropani · Aana · Paisa · Dam ⇄ Bigha · Kattha · Dhur</h2>
          </div>
          <span className="utility-badge">रोपनी–आना ⇄ बिघा–कट्ठा</span>
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
