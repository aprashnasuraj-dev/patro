export type IcsEvent = {
  uid: string;
  date: string;
  summary: string;
  description?: string;
  sequence?: number;
  alarmMinutes?: number;
};

const encoder = new TextEncoder();

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    const candidate = current + ch;
    if (encoder.encode(candidate).length > 75 && current) {
      out.push(current);
      current = " " + ch;
    } else current = candidate;
  }
  if (current) out.push(current);
  return out.join("\r\n");
}

const dateValue = (iso: string) => iso.replace(/-/g, "");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

export function renderIcsCalendar(name: string, events: IcsEvent[], generatedAt: Date): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AafnaiPatro//Bali Calendar//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
  ];
  for (const event of events) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) throw new Error("invalid ICS date: " + event.date);
    if (!event.uid || !event.summary) throw new Error("ICS event requires uid and summary");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(event.uid)}`,
      `DTSTAMP:${stamp(generatedAt)}`,
      `DTSTART;VALUE=DATE:${dateValue(event.date)}`,
      `SEQUENCE:${event.sequence ?? 0}`,
      `SUMMARY:${escapeText(event.summary)}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (typeof event.alarmMinutes === "number") {
      const mins = Math.max(0, Math.round(event.alarmMinutes));
      lines.push("BEGIN:VALARM", `TRIGGER:-PT${mins}M`, "ACTION:DISPLAY", `DESCRIPTION:${escapeText(event.summary)}`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
