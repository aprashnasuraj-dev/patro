import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { SyncPayload } from "../types";

interface Props {
  month: Date;
  selectedDate: string;
  today: string;
  onMonthChange: (month: Date) => void;
  onSelectDate: (date: string) => void;
}

type CalendarMode = "ad" | "bs";

interface DayCell {
  iso: string;
  date: Date;
  inMonth: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function iso(date: Date) {
  return (
    date.getUTCFullYear() +
    "-" +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getUTCDate()).padStart(2, "0")
  );
}

function monthCells(month: Date): DayCell[] {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      date,
      iso: iso(date),
      inMonth: date.getUTCMonth() === monthIndex
    };
  });
}

function shiftMonth(month: Date, amount: number) {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + amount, 1));
}

function title(month: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric"
  }).format(month);
}

async function loadWithConcurrency(
  dates: DayCell[],
  signal: AbortSignal,
  concurrency = 6
): Promise<Map<string, SyncPayload>> {
  const result = new Map<string, SyncPayload>();
  let cursor = 0;

  async function worker() {
    while (!signal.aborted) {
      const current = cursor++;
      if (current >= dates.length) return;
      const day = dates[current];

      try {
        const data = await api.sync(day.iso, signal);
        result.set(day.iso, data);
      } catch (error) {
        if (signal.aborted || (error as Error)?.name === "AbortError") return;
        // An individual out-of-coverage cell should not blank the entire month.
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, dates.length) }, () => worker())
  );
  return result;
}

export function CalendarGrid({
  month,
  selectedDate,
  today,
  onMonthChange,
  onSelectDate
}: Props) {
  const [mode, setMode] = useState<CalendarMode>("ad");
  const [entries, setEntries] = useState<Map<string, SyncPayload>>(new Map());
  const [loading, setLoading] = useState(true);
  const [monthError, setMonthError] = useState<string | null>(null);
  const cells = useMemo(() => monthCells(month), [month]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMonthError(null);

    loadWithConcurrency(cells, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setEntries(data);
          setLoading(false);
          if (data.size === 0) setMonthError("Calendar data is unavailable for this month.");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setMonthError(error?.message || "Unable to load the month.");
        }
      });

    return () => controller.abort();
  }, [cells]);

  return (
    <section className="glass-panel calendar-card">
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">Synchronized month</p>
          <h2>{title(month)}</h2>
        </div>

        <div className="calendar-actions">
          <div className="segmented-control" aria-label="Primary calendar label">
            <button
              className={mode === "ad" ? "active" : ""}
              onClick={() => setMode("ad")}
              aria-pressed={mode === "ad"}
            >
              AD
            </button>
            <button
              className={mode === "bs" ? "active" : ""}
              onClick={() => setMode("bs")}
              aria-pressed={mode === "bs"}
            >
              BS
            </button>
          </div>

          <button
            className="icon-button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            className="icon-button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="weekday-row" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="month-grid" role="grid" aria-label={title(month)}>
        {cells.map((cell) => {
          const data = entries.get(cell.iso);
          const tithiNumber = data?.tithi.number;
          const special =
            tithiNumber === 15 ? "purnima" : tithiNumber === 30 ? "amavasya" : "";
          const primary =
            mode === "bs"
              ? data?.calendars.bikram_sambat_detail.day ?? "—"
              : cell.date.getUTCDate();
          const secondary =
            mode === "bs"
              ? String(cell.date.getUTCDate()) + " AD"
              : data
                ? data.calendars.bikram_sambat_detail.day + " BS"
                : "";

          const classes = [
            "calendar-day",
            !cell.inMonth ? "calendar-day--muted" : "",
            cell.iso === today ? "calendar-day--today" : "",
            cell.iso === selectedDate ? "calendar-day--selected" : "",
            special ? "calendar-day--special " + special : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={cell.iso}
              className={classes}
              onClick={() => onSelectDate(cell.iso)}
              role="gridcell"
              aria-selected={cell.iso === selectedDate}
              aria-label={
                cell.iso +
                (data ? ", " + data.tithi.en + ", " + data.tithi.paksha : "")
              }
            >
              <span className="day-number">{primary}</span>
              <span className="day-secondary">{secondary}</span>

              {loading && !data ? (
                <span className="cell-skeleton skeleton" />
              ) : data ? (
                <>
                  <span className="tithi-badge">{data.tithi.ne}</span>
                  <span className="paksha-dot" title={data.tithi.paksha}>
                    {data.tithi.paksha.startsWith("Shukla") ? "शु" : "कृ"}
                  </span>
                </>
              ) : (
                <span className="tithi-badge tithi-badge--unavailable">—</span>
              )}

              {cell.iso === today && <span className="today-marker">Today</span>}
              {special && (
                <span className="special-marker">
                  {special === "purnima" ? "पूर्णिमा" : "औंसी"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span><i className="legend-dot legend-dot--today" />Today</span>
        <span><i className="legend-dot legend-dot--selected" />Selected</span>
        <span><i className="legend-dot legend-dot--special" />Purnima / Amavasya</span>
        {loading && <span className="calendar-status">Synchronizing 42 days…</span>}
      </div>

      {monthError && (
        <div className="inline-error calendar-error" role="alert">
          {monthError}
        </div>
      )}
    </section>
  );
}
