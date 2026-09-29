import { useEffect, useMemo, useState } from "react";
import { SunMedium, Circle } from "lucide-react";

interface Props {
  selectedDate: string;
  today: string;
  onDateChange: (iso: string) => void;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function iso(date: Date) {
  return (
    date.getUTCFullYear() +
    "-" +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getUTCDate()).padStart(2, "0")
  );
}

function diffDays(a: string, b: string) {
  return Math.round((parseIso(a).getTime() - parseIso(b).getTime()) / 86_400_000);
}

function fromOffset(today: string, offset: number) {
  const date = parseIso(today);
  date.setUTCDate(date.getUTCDate() + offset);
  return iso(date);
}

export function DateTravelExperience({ selectedDate, today, onDateChange }: Props) {
  const selectedOffset = useMemo(() => diffDays(selectedDate, today), [selectedDate, today]);
  const [draft, setDraft] = useState(Math.max(-3650, Math.min(3650, selectedOffset)));

  useEffect(() => {
    setDraft(Math.max(-3650, Math.min(3650, selectedOffset)));
  }, [selectedOffset]);

  const label =
    draft === 0 ? "Today" :
    draft > 0 ? `${draft.toLocaleString()} days into the future` :
    `${Math.abs(draft).toLocaleString()} days into the past`;

  return (
    <section className="time-travel glass-panel" aria-label="Time travel date control">
      <div className="time-travel__top">
        <div>
          <p className="eyebrow">Orbital timeline</p>
          <h2>Time Travel</h2>
          <p className="subheading">{label}</p>
        </div>
        <div className="time-travel__quick">
          {[-30, -7, 0, 7, 30].map((offset) => (
            <button
              key={offset}
              className={offset === 0 ? "secondary-button time-travel__today" : "secondary-button"}
              onClick={() => onDateChange(fromOffset(today, offset))}
            >
              {offset === 0 ? "Today" : offset > 0 ? `+${offset}d` : `${offset}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="orbit-track">
        <span className="orbit-track__sun" aria-hidden="true"><SunMedium size={18}/></span>
        <input
          type="range"
          min={-3650}
          max={3650}
          step={1}
          value={draft}
          onChange={(event) => setDraft(Number(event.target.value))}
          onPointerUp={() => onDateChange(fromOffset(today, draft))}
          onKeyUp={() => onDateChange(fromOffset(today, draft))}
          aria-label="Travel up to ten years before or after today"
        />
        <span className="orbit-track__planet" aria-hidden="true"><Circle size={13} fill="currentColor"/></span>
      </div>

      <div className="time-travel__date-row">
        <span>−10 years</span>
        <label>
          Exact date
          <input
            type="date"
            value={selectedDate}
            min="1826-04-11"
            max="2037-04-13"
            onChange={(event) => event.target.value && onDateChange(event.target.value)}
          />
        </label>
        <span>+10 years</span>
      </div>
    </section>
  );
}
