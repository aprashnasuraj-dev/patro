import { useEffect, useRef, useState } from "react";
import { Bell, CalendarClock, Check, Compass, Globe2, Languages, Plus, Sparkles, X } from "lucide-react";
import type { UiLanguage } from "../../i18n";
import { l } from "../../useUiLanguage";
import { deviceZone } from "../../place/place";
import { isWithinQuietHours, readMyTimePersonalSettings, saveMyTimePersonalSettings, type MyTimeInterest, type MyTimeLens, type MyTimePersonalSettings } from "./my-time-personal-settings";
import "./my-time.css";

type PlaceOption = { id: string; label: string; timezone: string; lat: number; lng: number };
const PLACES: PlaceOption[] = [
  { id: "kathmandu", label: "Kathmandu, Nepal", timezone: "Asia/Kathmandu", lat: 27.7172, lng: 85.3240 },
  { id: "pokhara", label: "Pokhara, Nepal", timezone: "Asia/Kathmandu", lat: 28.2096, lng: 83.9856 },
  { id: "biratnagar", label: "Biratnagar, Nepal", timezone: "Asia/Kathmandu", lat: 26.4525, lng: 87.2718 },
  { id: "tokyo", label: "Tokyo, Japan", timezone: "Asia/Tokyo", lat: 35.6762, lng: 139.6503 },
  { id: "london", label: "London, United Kingdom", timezone: "Europe/London", lat: 51.5072, lng: -0.1276 },
  { id: "new-york", label: "New York, USA", timezone: "America/New_York", lat: 40.7128, lng: -74.0060 }
];
const LENSES: { id: MyTimeLens; ne: string; en: string; detail: string }[] = [
  { id: "universal", ne: "सार्वभौमिक दृश्य", en: "Universal view", detail: "A balanced overview; no birth details needed." },
  { id: "scientific", ne: "वैज्ञानिक समय", en: "Scientific time", detail: "Clock, solar events and astronomical context." },
  { id: "panchang", ne: "पञ्चाङ्ग", en: "Panchang", detail: "Tithi, Nakshatra and traditional daily timing." },
  { id: "jyotish", ne: "ज्योतिष", en: "Jyotish", detail: "Traditional interpretation; birth details remain optional." },
  { id: "tantra", ne: "तन्त्रविद्या", en: "Tantra Vidya", detail: "The optional traditional chronometry layer." },
  { id: "combined", ne: "संयुक्त दृश्य", en: "Combined view", detail: "A little of each selected time system." }
];
const INTERESTS: { id: MyTimeInterest; ne: string; en: string }[] = [
  { id: "general", ne: "सामान्य दैनिक जानकारी", en: "General daily overview" },
  { id: "work", ne: "काम / व्यवसाय", en: "Work / business" },
  { id: "study", ne: "अध्ययन", en: "Study" },
  { id: "travel", ne: "यात्रा", en: "Travel" },
  { id: "prayer", ne: "पूजा / पर्व", en: "Prayer / observances" },
  { id: "meditation", ne: "ध्यान / आत्मचिन्तन", en: "Meditation / reflection" },
  { id: "family", ne: "परिवार / व्यक्तिगत कार्यक्रम", en: "Family / personal events" }
];
type Props = {
  language: UiLanguage;
  date: string;
  now: Date;
  timezone: string;
  locationLabel: string;
  lat: number;
  lng: number;
  tithiIndex: number | null;
  nakshatraIndex: number | null;
  tithiName: string;
  nakshatraName: string;
  currentWindow?: { key: string; name: string; start_utc: string; end_utc: string; favorable?: boolean } | null;
  nextWindow?: { key: string; name: string; start_utc: string; end_utc: string; score?: number } | null;
  onLocationChange: (place: { timezone: string; lat: number; lng: number; label: string }) => void;
  onLensChange: (lens: MyTimeLens) => void;
};
function countdown(value: string, now: Date, language: UiLanguage) {
  const seconds = Math.max(0, Math.floor((Date.parse(value) - now.getTime()) / 1000));
  const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60), remainder = seconds % 60;
  return language === "ne" ? `${hours ? hours + " घण्टा " : ""}${minutes} मिनेट ${remainder} सेकेन्ड` : `${hours ? hours + "h " : ""}${minutes}m ${remainder}s`;
}
function clock(value: string, timezone: string, language: UiLanguage) {
  try { return new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)); }
  catch { return "—"; }
}
function readLastAlertDays() {
  try {
    const raw = JSON.parse(localStorage.getItem("aafnaipatro.mytime.alert-days.v1") || "{}");
    const map = new Map<string, string>();
    if (raw && typeof raw === "object") for (const [key, value] of Object.entries(raw)) if (typeof value === "string") map.set(key, value);
    return map;
  } catch { return new Map<string, string>(); }
}
function updateLanguage(language: UiLanguage) {
  try { localStorage.setItem("patro.ui.language", language); } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent("patro:set-language", { detail: language }));
  window.dispatchEvent(new CustomEvent("patro:language"));
}
export default function MyTimePersonalization(props: Props) {
  const { language, date, now, timezone, locationLabel, lat, lng, tithiIndex, nakshatraIndex, tithiName, nakshatraName, currentWindow, nextWindow, onLocationChange, onLensChange } = props;
  const [settings, setSettings] = useState<MyTimePersonalSettings>(readMyTimePersonalSettings);
  const [placeId, setPlaceId] = useState(() => PLACES.find(p => p.timezone === timezone && Math.abs(p.lat-lat)<0.02 && Math.abs(p.lng-lng)<0.02)?.id || "custom");
  useEffect(() => { setPlaceId(PLACES.find(p => p.timezone === timezone && Math.abs(p.lat-lat)<0.02 && Math.abs(p.lng-lng)<0.02)?.id || "custom"); }, [timezone, lat, lng]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [notice, setNotice] = useState("");
  const previousRef = useRef<{ tithi: number | null; nakshatra: number | null }>({ tithi: null, nakshatra: null });
  const notifiedWindows = useRef(new Set<string>());
  const notifiedEvents = useRef(new Set<string>());
  const lastNotificationDay = useRef(readLastAlertDays());
  const interestLine = settings.interests.map(id => INTERESTS.find(item => item.id === id)).filter(Boolean).map(item => language === "ne" ? item!.ne : item!.en).join(", ");
  const update = (mutate: (old: MyTimePersonalSettings) => MyTimePersonalSettings) => setSettings(old => mutate(old));
  useEffect(() => { saveMyTimePersonalSettings(settings); }, [settings]);
  useEffect(() => {
    const previous = previousRef.current;
    if (previous.tithi !== null && tithiIndex !== null && previous.tithi !== tithiIndex && settings.notifications.tithiTransitions) notify(l(language, "तिथि परिवर्तन", "Tithi changed"), l(language, "हालको तिथि: ", "Current Tithi: ") + tithiName, "tithi");
    if (previous.nakshatra !== null && nakshatraIndex !== null && previous.nakshatra !== nakshatraIndex && settings.notifications.nakshatraTransitions) notify(l(language, "नक्षत्र परिवर्तन", "Nakshatra changed"), l(language, "हालको नक्षत्र: ", "Current Nakshatra: ") + nakshatraName, "nakshatra");
    previousRef.current = { tithi: tithiIndex, nakshatra: nakshatraIndex };
  }, [tithiIndex, nakshatraIndex, tithiName, nakshatraName, settings.notifications.tithiTransitions, settings.notifications.nakshatraTransitions, settings.notifications.quietStart, settings.notifications.quietEnd, timezone]);
  useEffect(() => {
    const windowId = nextWindow ? nextWindow.key + "|" + nextWindow.start_utc : "";
    if (!settings.notifications.timingWindows || !nextWindow || notifiedWindows.current.has(windowId)) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const ms = Date.parse(nextWindow.start_utc) - now.getTime();
    if (ms >= 0 && ms <= 45_000) {
      notifiedWindows.current.add(windowId);
      notify(l(language, "समयको झ्याल सुरु हुँदैछ", "Timing window is starting"), nextWindow.name + " · " + clock(nextWindow.start_utc, timezone, language), "window");
    }
  }, [now, nextWindow?.key, nextWindow?.start_utc, settings.notifications.timingWindows, settings.notifications.quietStart, settings.notifications.quietEnd, timezone, language]);
  useEffect(() => {
    if (!settings.notifications.savedEvents || !("Notification" in window) || Notification.permission !== "granted") return;
    if (isWithinQuietHours(now, timezone, settings.notifications.quietStart, settings.notifications.quietEnd)) return;
    const due = settings.savedEvents.find(event => !event.notifiedAt && !notifiedEvents.current.has(event.id) && Date.parse(event.at) <= now.getTime() && now.getTime() - Date.parse(event.at) < 15 * 60_000);
    if (!due) return;
    notifiedEvents.current.add(due.id);
    notify(l(language, "तपाईंको सुरक्षित कार्यक्रम", "Your saved event"), due.title, "event");
    update(old => ({ ...old, savedEvents: old.savedEvents.map(event => event.id === due.id ? { ...event, notifiedAt: now.toISOString() } : event) }));
  }, [now, settings.notifications.savedEvents, settings.notifications.quietStart, settings.notifications.quietEnd, settings.savedEvents, timezone, language]);
  function notify(title: string, body: string, category = "event") {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (isWithinQuietHours(now, timezone, settings.notifications.quietStart, settings.notifications.quietEnd)) return;
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const day = `${values.year}-${values.month}-${values.day}`;
    if (settings.notifications.frequency === "important" && lastNotificationDay.current.get(category) === day) return;
    lastNotificationDay.current.set(category, day);
    try { localStorage.setItem("aafnaipatro.mytime.alert-days.v1", JSON.stringify(Object.fromEntries(lastNotificationDay.current))); } catch {}
    try { new Notification(title, { body, tag: "my-time-" + category + (settings.notifications.frequency === "all" ? "-" + now.getTime() : ""), icon: "/aafnai-logo.png" }); } catch {}
  }
  async function enableAlerts() {
    if (!("Notification" in window)) { setNotice(l(language, "यो ब्राउजरले सूचना समर्थन गर्दैन।", "This browser does not support notifications.")); return; }
    if (Notification.permission === "denied") { setNotice(l(language, "ब्राउजर सेटिङमा सूचना अनुमति बन्द छ। त्यहाँबाट अनुमति दिनुहोस्।", "Notifications are blocked by browser settings. Allow them there to continue.")); return; }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") { setNotice(l(language, "सूचना अनुमति दिइएन; तपाईंले चाहेको बेला सेटिङबाट फेरि प्रयास गर्न सक्नुहुन्छ।", "Permission was not granted. You can try again in settings whenever you want.")); return; }
    setNotice(l(language, "सूचना अनुमति सक्रिय छ। चयन गरिएका अलर्टहरू My Time खुला हुँदा चल्छन्।", "Notifications are enabled. Selected alerts run while My Time is open."));
  }
  function chooseLens(lens: MyTimeLens) { update(old => ({ ...old, lens })); onLensChange(lens); }
  function toggleInterest(id: MyTimeInterest) {
    update(old => {
      const next = old.interests.includes(id) ? old.interests.filter(item => item !== id) : [...old.interests.filter(item => item !== "general"), id];
      return { ...old, interests: next.length ? next : ["general"] };
    });
  }
  function choosePlace(id: string) {
    setPlaceId(id);
    const place = PLACES.find(item => item.id === id);
    if (place) onLocationChange({ timezone: place.timezone, lat: place.lat, lng: place.lng, label: place.label });
  }
  function useDeviceLocation() {
    if (!navigator.geolocation) { setNotice(l(language, "यो उपकरणले स्थान अनुमति समर्थन गर्दैन।", "This device does not support geolocation.")); return; }
    setNotice(l(language, "स्थान अनुमति मागिँदैछ…", "Requesting location permission…"));
    navigator.geolocation.getCurrentPosition(position => {
      const zone = deviceZone();
      setPlaceId("custom");
      onLocationChange({ timezone: zone, lat: position.coords.latitude, lng: position.coords.longitude, label: l(language, "हालको स्थान", "Current location") });
      setNotice(l(language, "स्थान यस उपकरणमा मात्र प्रयोग हुनेछ; खाता वा जन्म विवरण आवश्यक छैन।", "Location is used on this device; no account or birth details are required."));
    }, () => setNotice(l(language, "स्थान उपलब्ध भएन। तलका स्थानमध्ये छान्नुहोस् वा समय क्षेत्र र निर्देशाङ्क म्यानुअल रूपमा राख्नुहोस्।", "Location unavailable. Choose a city below or enter the timezone and coordinates manually.")), { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  }
  function addEvent() {
    const title = eventTitle.trim(), at = new Date(eventAt);
    if (!title || title.length > 100 || !eventAt || !Number.isFinite(at.getTime()) || at.getTime() <= now.getTime()) { setNotice(l(language, "भविष्यको मिति/समयसहित कार्यक्रमको नाम राख्नुहोस्।", "Enter an event title and a future date/time.")); return; }
    update(old => ({ ...old, savedEvents: [...old.savedEvents, { id: crypto.randomUUID(), title, at: at.toISOString() }].slice(-50) }));
    setEventTitle(""); setEventAt(""); setNotice(l(language, "कार्यक्रम यस उपकरणमा सुरक्षित भयो। अलर्टका लागि सूचना अनुमति र My Time खुला हुनुपर्छ।", "Event saved on this device. Alerts require notification permission and My Time to remain open."));
  }
  const activeLens = LENSES.find(item => item.id === settings.lens) || LENSES[0];
  const interestPrompt: Record<MyTimeInterest, [string, string]> = {
    general: ["आजको तिथि र अर्को समय परिवर्तन हेर्नुहोस्।", "Review today’s Tithi and the next timing transition."],
    work: ["समय सङ्केतलाई सहायक योजना मानेर कामको प्राथमिकता र समयसीमा पहिले राख्नुहोस्।", "Use timing cues as optional planning context; keep work priorities and deadlines primary."],
    study: ["आफ्नो पात्रोमा केन्द्रित अध्ययन समय सुरक्षित गर्नुहोस्।", "Protect a focused study block in your schedule."],
    travel: ["यात्राअघि गन्तव्यको समय क्षेत्र र स्थानीय सूर्योदय/सूर्यास्त जाँच्नुहोस्।", "Before travelling, check the destination time zone and local sunrise/sunset."],
    prayer: ["स्थानीय तिथि र सुरक्षित observance मिति हेर्नुहोस्।", "Review the local Tithi and any saved observance dates."],
    meditation: ["चाहनुहुन्छ भने स्थानीय प्रभात वा सन्ध्यालाई आत्मचिन्तनको सम्झना बनाउनुहोस्।", "If useful, use local dawn or twilight as a reflection reminder."],
    family: ["परिवारका सुरक्षित कार्यक्रम र आगामी सम्झनाहरू जाँच्नुहोस्।", "Review saved family events and upcoming reminders."]
  };
  const focus = settings.interests.find(item => item !== "general") || "general";
  return <section className="mt-personal-root" aria-label={l(language, "व्यक्तिगत समय अनुभव", "Personal time experience")}>
    <section className="mt-briefing mt-personal-card" aria-labelledby="mt-briefing-title">
      <div className="mt-personal-card-head"><div><span className="mt-section-kicker"><Sparkles size={14}/>{l(language, "तपाईंको दैनिक सारांश", "YOUR DAILY BRIEFING")}</span><h2 id="mt-briefing-title">{l(language, "आजको समय, तपाईंको दृष्टिमा", "Your day, through your lens")}</h2><p>{date} · {locationLabel || timezone} · {timezone}</p></div><span className="mt-personal-lens">{language === "ne" ? activeLens.ne : activeLens.en}</span></div>
      <div className="mt-briefing-grid">
        <article><small>{l(language, "हालको तिथि", "CURRENT TITHI")}</small><strong>{tithiName || "—"}</strong><span>{l(language, "तिथि परिवर्तन हुँदा हालको मान अपडेट हुन्छ।", "Updates as the current Tithi changes.")}</span></article>
        <article><small>{l(language, "हालको नक्षत्र", "CURRENT NAKSHATRA")}</small><strong>{nakshatraName || "—"}</strong><span>{l(language, "खगोलीय गणनामा आधारित", "Based on the current astronomical calculation.")}</span></article>
        <article><small>{l(language, "हालको समय झ्याल", "CURRENT TIMING WINDOW")}</small><strong>{currentWindow?.name || l(language, "समय गणना भइरहेको छ", "Calculating current window")}</strong><span>{currentWindow ? clock(currentWindow.start_utc, timezone, language) + "–" + clock(currentWindow.end_utc, timezone, language) + " · " + (language === "ne" ? "समाप्ति " : "ends in ") + countdown(currentWindow.end_utc, now, language) : l(language, "सूर्योदय/सूर्यास्त उपलब्धतामा निर्भर", "Depends on available solar events.")}</span></article>
        <article><small>{l(language, "अर्को चयनित झ्याल", "NEXT TIMING WINDOW")}</small><strong>{nextWindow?.name || l(language, "अहिले उपलब्ध छैन", "Not available yet")}</strong><span>{nextWindow ? clock(nextWindow.start_utc, timezone, language) + "–" + clock(nextWindow.end_utc, timezone, language) + " · " + (language === "ne" ? "सुरु हुन " : "starts in ") + countdown(nextWindow.start_utc, now, language) : l(language, "गणना उपलब्ध भएपछि देखाइन्छ।", "Shown when a valid window is available.")}</span></article>
      </div>
      <p className="mt-briefing-note"><b>{l(language, "आजको ध्यान", "TODAY’S FOCUS")}:</b> {language === "ne" ? interestPrompt[focus][0] : interestPrompt[focus][1]}<br/>{l(language, "तपाईंको रुचि", "Your interests")}: {interestLine}. {l(language, "यो सारांश जानकारी र परम्परागत समय बुझ्नका लागि हो; कुनै परिणामको ग्यारेन्टी होइन।", "This briefing is informational and culturally contextual; it does not guarantee outcomes.")}</p>
    </section>

    {!settings.setupComplete && <section className="mt-setup-card mt-personal-card" aria-labelledby="mt-setup-title">
      <div className="mt-personal-card-head"><div><span className="mt-section-kicker"><Compass size={14}/>{l(language, "वैकल्पिक व्यक्तिगत सेटअप", "OPTIONAL PERSONAL SETUP")}</span><h2 id="mt-setup-title">{l(language, "समयलाई आफ्नै तरिकाले हेर्नुहोस्", "Choose how you experience time")}</h2><p>{l(language, "यी विकल्पहरू ऐच्छिक हुन्। केही नछानी सार्वभौमिक दृश्यमै जान सक्नुहुन्छ।", "Everything here is optional. Continue with the universal view without choosing anything.")}</p></div></div>
      <div className="mt-setup-grid">
        <label><span><Globe2 size={15}/>{l(language, "तपाईंको स्थान", "Your location")}</span><select value={placeId} onChange={event=>choosePlace(event.target.value)}><option value="custom">{l(language, "हालको / म्यानुअल स्थान", "Current / manual location")}</option>{PLACES.map(place=><option key={place.id} value={place.id}>{place.label}</option>)}</select><button type="button" className="mt-secondary" onClick={useDeviceLocation}>{l(language, "उपकरणको स्थान प्रयोग गर्नुहोस्", "Use device location")}</button><small>{l(language, "स्थान अनुमति नदिए पनि सुविधा चल्छ।", "Location permission is optional.")}</small></label>
        <label><span><Languages size={15}/>{l(language, "भाषा", "Language")}</span><select value={language} onChange={event=>updateLanguage(event.target.value as UiLanguage)}><option value="ne">नेपाली</option><option value="en">English</option></select><small>{l(language, "यसले AafnaiPatro को भाषा परिवर्तन गर्छ।", "This changes the AafnaiPatro interface language.")}</small></label>
      </div>
      <div className="mt-setup-options"><strong>{l(language, "तपाईंको समय लेन्स", "Your time lens")}</strong><div>{LENSES.map(item=><button type="button" key={item.id} className={settings.lens===item.id?"is-selected":""} onClick={()=>chooseLens(item.id)}><b>{language==="ne"?item.ne:item.en}</b><small>{item.detail}</small></button>)}</div></div>
      <div className="mt-setup-options"><strong>{l(language, "दैनिक रुचि (एक वा धेरै)", "Daily interests (choose any)")}</strong><div className="mt-interest-options">{INTERESTS.map(item=><label key={item.id}><input type="checkbox" checked={settings.interests.includes(item.id)} onChange={()=>toggleInterest(item.id)}/>{language==="ne"?item.ne:item.en}</label>)}</div></div>
      <p className="mt-privacy-note">{l(language, "गोपनीयता: स्थान, रुचि र दृश्य प्राथमिकता यस उपकरणको ब्राउजरमा सुरक्षित हुन्छन्। जन्म मिति, जन्म समय र जन्मस्थान आवश्यक छैनन्; व्यक्तिगत जन्मकुण्डली चाहिएको बेला मात्र सम्बन्धित सुविधा प्रयोग गर्नुहोस्।", "Privacy: location, interests and view preferences are stored in this browser on this device. Birth date, birth time and birthplace are not required; use a separate birth-chart feature only if you want that functionality.")}</p>
      <div className="mt-personal-actions"><button type="button" className="mt-primary" onClick={()=>update(old=>({...old,setupComplete:true}))}><Check size={16}/>{l(language, "मेरो दृश्य सुरक्षित गर्नुहोस्", "Save my view")}</button><button type="button" className="mt-secondary" onClick={()=>update(old=>({...old,setupComplete:true,lens:"universal",interests:["general"]}))}>{l(language, "सार्वभौमिक दृश्यमा जानुहोस्", "Continue with universal view")}</button></div>
    </section>}

    <details className="mt-personal-card mt-preferences-details">
      <summary><span><Compass size={16}/>{l(language, "व्यक्तिगत प्राथमिकता र सूचना", "Personal preferences & alerts")}</span><small>{l(language, "कुनै पनि बेला परिवर्तन गर्न सकिन्छ", "Change any time")}</small></summary>
      <div className="mt-notification-settings">
        <p>{l(language, "अलर्टहरूका लागि स्पष्ट अनुमति चाहिन्छ। हालका संक्रमण/समय-झ्याल अलर्टहरू My Time खुला हुँदा मात्र जाँचिन्छन्; ब्राउजर बन्द हुँदा वा फोनले एप रोक्दा तिनीहरू पुग्ने ग्यारेन्टी छैन।", "Alerts require explicit permission. Transition and timing-window alerts are checked while My Time is open; delivery is not guaranteed after the browser closes or the device suspends the page.")}</p>
        <div className="mt-setup-options"><strong>{l(language, "समय लेन्स", "Time lens")}</strong><div>{LENSES.map(item=><button type="button" key={item.id} className={settings.lens===item.id?"is-selected":""} onClick={()=>chooseLens(item.id)}><b>{language==="ne"?item.ne:item.en}</b><small>{item.detail}</small></button>)}</div></div>
        <div className="mt-setup-options"><strong>{l(language, "दैनिक रुचि", "Daily interests")}</strong><div className="mt-interest-options">{INTERESTS.map(item=><label key={item.id}><input type="checkbox" checked={settings.interests.includes(item.id)} onChange={()=>toggleInterest(item.id)}/>{language==="ne"?item.ne:item.en}</label>)}</div></div>
        <div className="mt-setup-grid"><label><span><Globe2 size={15}/>{l(language, "स्थान", "Location")}</span><select value={placeId} onChange={event=>choosePlace(event.target.value)}><option value="custom">{l(language, "हालको / म्यानुअल स्थान", "Current / manual location")}</option>{PLACES.map(place=><option key={place.id} value={place.id}>{place.label}</option>)}</select><button type="button" className="mt-secondary" onClick={useDeviceLocation}>{l(language, "उपकरणको स्थान प्रयोग गर्नुहोस्", "Use device location")}</button></label><label><span><Languages size={15}/>{l(language, "भाषा", "Language")}</span><select value={language} onChange={event=>updateLanguage(event.target.value as UiLanguage)}><option value="ne">नेपाली</option><option value="en">English</option></select></label></div>
        <button type="button" className="mt-secondary" onClick={()=>void enableAlerts()}><Bell size={16}/>{l(language, "सूचना अनुमति जाँच्नुहोस्", "Enable/check notification permission")}</button>
        <div className="mt-alert-options">
          {([["tithiTransitions","तिथि परिवर्तन","Tithi changes"],["nakshatraTransitions","नक्षत्र परिवर्तन","Nakshatra changes"],["timingWindows","चयनित समय झ्याल सुरु हुँदा","Selected timing windows"],["savedEvents","सुरक्षित कार्यक्रम","Saved events"]] as const).map(([key,neLabel,enLabel])=><label key={key}><input type="checkbox" checked={settings.notifications[key]} onChange={event=>update(old=>({...old,notifications:{...old.notifications,[key]:event.target.checked}}))}/>{l(language,neLabel,enLabel)}</label>)}
        </div>
        <div className="mt-quiet-hours"><label>{l(language, "शान्त समय सुरु", "Quiet hours start")}<input type="time" value={settings.notifications.quietStart} onChange={event=>update(old=>({...old,notifications:{...old.notifications,quietStart:event.target.value}}))}/></label><label>{l(language, "शान्त समय अन्त्य", "Quiet hours end")}<input type="time" value={settings.notifications.quietEnd} onChange={event=>update(old=>({...old,notifications:{...old.notifications,quietEnd:event.target.value}}))}/></label><label>{l(language, "अलर्ट आवृत्ति", "Alert frequency")}<select value={settings.notifications.frequency} onChange={event=>update(old=>({...old,notifications:{...old.notifications,frequency:event.target.value as "important"|"all"}}))}><option value="important">{l(language, "महत्त्वपूर्ण मात्र", "Important only")}</option><option value="all">{l(language, "सबै चयनित संक्रमण", "All selected transitions")}</option></select></label></div>
        <div className="mt-saved-events"><strong><CalendarClock size={16}/>{l(language, "यस उपकरणमा सुरक्षित कार्यक्रम", "Events saved on this device")}</strong><small>{l(language, "मिति/समय यस उपकरणको स्थानीय समयअनुसार राखिन्छ।", "Event date/time uses this device’s local time.")}</small><div className="mt-event-form"><input aria-label={l(language,"कार्यक्रमको नाम","Event title")} placeholder={l(language,"जस्तै: बैठक","e.g. Meeting")} maxLength={100} value={eventTitle} onChange={event=>setEventTitle(event.target.value)}/><input aria-label={l(language,"कार्यक्रमको मिति र समय","Event date and time")} type="datetime-local" value={eventAt} onChange={event=>setEventAt(event.target.value)}/><button type="button" className="mt-primary" onClick={addEvent}><Plus size={15}/>{l(language,"सुरक्षित गर्नुहोस्","Save")}</button></div>
          {settings.savedEvents.length===0?<small>{l(language,"अहिलेसम्म कार्यक्रम सुरक्षित गरिएको छैन।", "No events saved yet.")}</small>:<ul>{settings.savedEvents.map(event=><li key={event.id}><span><b>{event.title}</b><small>{new Intl.DateTimeFormat(language==="ne"?"ne-NP":"en",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.at))}</small></span><button type="button" aria-label={l(language,"कार्यक्रम हटाउनुहोस्","Delete event")} onClick={()=>update(old=>({...old,savedEvents:old.savedEvents.filter(item=>item.id!==event.id)}))}><X size={15}/></button></li>)}</ul>}
          <small>{l(language, "कार्यक्रमहरू खातामा अपलोड हुँदैनन्। समय बितिसकेको कार्यक्रमका लागि अलर्ट आउँदैन।", "Events are not uploaded to an account. Past events do not trigger alerts.")}</small>
        </div>
        {notice && <p className="mt-personal-notice" role="status">{notice}</p>}
      </div>
    </details>
  </section>;
}
