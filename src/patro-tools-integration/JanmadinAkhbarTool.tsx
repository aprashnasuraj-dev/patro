import { useRef, useState } from "react";
import { MoonSvg } from "@/patro-tools/birth-card/MoonSvg";
import { NAKSHATRAS, RASHIS } from "@/patro-tools/core/names";
import { PADA_SYLLABLES } from "@/patro-tools/baby/nakshatra-names";
import { bsAdapter } from "./bsAdapter";
import { panchangProvider, primePanchang } from "./panchangAdapter";
import { ToolPage, ToolResult } from "./ToolPrimitives";

type HistoryRow = {
  ad_year?: number;
  event_type?: string;
  country_code?: string | null;
  title_ne?: string;
  title_en?: string;
  verification_status?: string;
};

type Story = {
  name: string;
  birthDate: string;
  bs: string;
  tithi: string;
  nakshatra: string;
  pada: number;
  syllable: string;
  rashi: string;
  sunrise: string;
  sunset: string;
  angle: number;
  illum: number;
  history: HistoryRow[];
  daysAlive: number;
  nextTithi?: string;
};

const TITHI_NE = ["","प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","पूर्णिमा","प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","औंसी"];
const MONTH_KEYS = ["chaitra","vaishakha","jyestha","ashadha","shravana","bhadrapada","ashwin","kartika","margashirsha","pausha","magha","falguna"];

function hhmm(date: Date) {
  return date.toLocaleTimeString("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", minute: "2-digit" });
}
function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function JanmadinAkhbarTool() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("2000-01-01");
  const [story, setStory] = useState<Story | null>(null);
  const [status, setStatus] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  async function build() {
    setStatus("जन्मदिनको विशेष अंक तयार हुँदैछ…");
    try {
      await primePanchang(birthDate);
      const p = panchangProvider.day(birthDate);
      const [year, month, day] = birthDate.split("-").map(Number);
      const bs = bsAdapter.toBS({ year, month, day });
      const historyResponse = await fetch("/api/on-this-day?month=" + month + "&day=" + day, { headers: { Accept: "application/json" } });
      const historyPayload = await historyResponse.json() as { events?: HistoryRow[] };
      const query = new URLSearchParams({
        month: MONTH_KEYS[p.monthIndex] || "chaitra",
        paksha: p.paksha,
        tithi: String(p.tithiInPaksha),
        rule: "udaya",
        from: todayNepal(),
        count: "1",
      });
      const nextResponse = await fetch("/api/v1/tithi/next?" + query.toString());
      const nextPayload = nextResponse.ok ? await nextResponse.json() as { occurrences?: Array<{ adDate: string }> } : null;
      setStory({
        name: name.trim() || "तपाईं",
        birthDate,
        bs: bs.year + "-" + String(bs.month).padStart(2, "0") + "-" + String(bs.day).padStart(2, "0"),
        tithi: (p.paksha === "krishna" ? "कृष्ण " : "शुक्ल ") + (TITHI_NE[p.tithi] || String(p.tithi)),
        nakshatra: NAKSHATRAS[p.nakshatra],
        pada: p.nakshatraPada,
        syllable: PADA_SYLLABLES[p.nakshatra][p.nakshatraPada - 1],
        rashi: RASHIS[p.moonRashi],
        sunrise: hhmm(p.sunrise),
        sunset: hhmm(p.sunset),
        angle: p.moonPhaseAngle,
        illum: (1 - Math.cos(p.moonPhaseAngle * Math.PI / 180)) / 2,
        history: (historyPayload.events || []).slice(0, 6),
        daysAlive: Math.max(0, Math.floor((Date.parse(todayNepal()) - Date.parse(birthDate)) / 86400000)),
        nextTithi: nextPayload?.occurrences?.[0]?.adDate,
      });
      setStatus("विशेष अंक तयार भयो।");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "अखबार तयार गर्न सकिएन।");
    }
  }

  async function sharePng() {
    if (!cardRef.current) return;
    setStatus("PNG तयार हुँदैछ…");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#f6f1e4" });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "aafnai-janmadin-akhbar.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: "आफ्नै पात्रो · आफ्नै जन्मदिन अखबार" });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = file.name;
        link.click();
      }
      setStatus("PNG तयार भयो।");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "PNG बनाउन सकिएन।");
    }
  }

  const speech = story ? story.name + " जन्मेको दिन। वि.सं. " + story.bs + "। " + story.tithi + ", " + story.nakshatra + " नक्षत्र।" : "";

  return (
    <ToolPage title="आफ्नै जन्मदिन अखबार" description="तपाईं जन्मेको दिनको BS मिति, तिथि, नक्षत्र र ‘आज इतिहासमा’ डेटा मिलाएर शेयर गर्न मिल्ने नेपाली अखबार बनाउनुहोस्।">
      <section className="patro-tool-card">
        <div className="tool-form-grid">
          <label>नाम<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>जन्म AD मिति<input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></label>
        </div>
        <button className="tool-primary-button" type="button" onClick={build}>आफ्नै अखबार बनाउनुहोस्</button>
        {status ? <p className="tool-status">{status}</p> : null}
      </section>

      {story ? (
        <ToolResult title="आफ्नै विशेष अंक" speechText={speech}>
          <div className="birth-paper" ref={cardRef}>
            <header><small>आफ्नै पात्रो · विशेष अंक</small><h2>{story.name} जन्मेको दिन</h2><div><span>{story.bs} BS</span><span>{story.birthDate} AD</span></div></header>
            <section className="birth-lead">
              <div><span className="paper-kicker">मुख्य समाचार</span><h3>{story.tithi}, {story.nakshatra} नक्षत्रमा नयाँ सदस्यको आगमन</h3><p>चन्द्र राशि {story.rashi}। चरण {story.pada}। नाम राख्ने अक्षर “{story.syllable}”। सूर्योदय {story.sunrise}, सूर्यास्त {story.sunset}।</p></div>
              <figure><MoonSvg angle={story.angle} size={100}/><figcaption>चन्द्र प्रकाश {(story.illum * 100).toFixed(0)}%</figcaption></figure>
            </section>
            <section><h3>त्यही दिन इतिहासमा</h3><ul>{story.history.map((row, index) => <li key={index}>{row.country_code === "NP" ? "🇳🇵 " : "🌐 "}<b>{row.ad_year || ""}</b> {row.title_ne || row.title_en}</li>)}</ul></section>
            <footer><span>{story.daysAlive.toLocaleString("en-IN")} दिन बिते</span><span>{story.nextTithi ? "अर्को तिथि जन्मदिन: " + story.nextTithi : ""}</span></footer>
          </div>
          <button className="tool-primary-button" type="button" onClick={sharePng}>PNG बनाएर सेयर गर्नुहोस्</button>
          <p className="tool-muted">PNG browser मा Devanagari shaping सहित html-to-image बाट बनाइन्छ; Satori प्रयोग गरिएको छैन।</p>
        </ToolResult>
      ) : null}
    </ToolPage>
  );
}
