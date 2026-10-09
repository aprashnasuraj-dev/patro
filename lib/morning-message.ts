const MONTHS = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];
const WEEKDAYS = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];
const digits = (value: unknown) => String(value ?? "").replace(/[0-9]/g, n => "०१२३४५६७८९"[Number(n)]);

export function morningMessage(date: string, day: any, events: string[] = [], name = "") {
  const bs = day?.bs || day?.calendars?.bikram_sambat_detail;
  const p = day?.panchang || day?.archive_panchang || {};
  const t = day?.tithi || p.tithi;
  const tithi = typeof t === "string" ? t : t?.ne || t?.name_ne || t?.name || p.tithi_name_ne;
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  const label = bs ? `${digits(bs.year)} साल ${bs.month_ne || MONTHS[Number(bs.month) - 1]} ${digits(bs.day)} गते` : digits(date);
  const important = [...new Set(events.map(x => x.trim().slice(0, 120)).filter(Boolean))].slice(0, 3);
  return {
    title: `शुभ प्रभात${name.trim() ? ` ${name.trim().slice(0, 80)}` : ""}!`,
    body: `आज मिति ${label}, ${weekday}${tithi ? `। तिथि: ${tithi}` : ""}।${important.length ? ` आज: ${important.join(", ")}।` : ""} शुभ दिन।`,
    tag: `aafnai-morning-${date}`, category: "morning", date, url: `/date/${date}`,
  };
}

export function nextNepalMorning(now = Date.now()) {
  const localDate = new Date(now + 345 * 60_000).toISOString().slice(0, 10);
  const due = Date.parse(`${localDate}T00:15:00Z`); // 06:00 Asia/Kathmandu
  return new Date(due > now ? due : due + 86_400_000).toISOString();
}
