import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { ApodPayload, SyncPayload, TithiPayload } from "./types";
import { HeroCanvas } from "./components/HeroCanvas";
import { TripleDateHeader } from "./components/TripleDateHeader";
import { LunarPhaseDial } from "./components/LunarPhaseDial";
import { CalendarGrid } from "./components/CalendarGrid";
import { NasaDrawer } from "./components/NasaDrawer";

type Loadable<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

function todayInKathmandu(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

function isoFromDate(date: Date): string {
  return (
    date.getUTCFullYear() +
    "-" +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getUTCDate()).padStart(2, "0")
  );
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export default function App() {
  const today = useMemo(todayInKathmandu, []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = parseIso(today);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  });

  const [sync, setSync] = useState<Loadable<SyncPayload>>({
    data: null,
    error: null,
    loading: true
  });
  const [apod, setApod] = useState<Loadable<ApodPayload>>({
    data: null,
    error: null,
    loading: true
  });
  const [tithi, setTithi] = useState<Loadable<TithiPayload>>({
    data: null,
    error: null,
    loading: true
  });
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    const controller = new AbortController();
    api.health(controller.signal)
      .then(() => setHealth("online"))
      .catch((error) => {
        if (error?.name !== "AbortError") setHealth("offline");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setSync((state) => ({ ...state, loading: true, error: null }));
    setApod((state) => ({ ...state, loading: true, error: null }));
    setTithi((state) => ({ ...state, loading: true, error: null }));

    api.sync(selectedDate, controller.signal)
      .then((data) => setSync({ data, error: null, loading: false }))
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setSync({ data: null, error: error.message, loading: false });
        }
      });

    api.apod(selectedDate, controller.signal)
      .then((data) => setApod({ data, error: null, loading: false }))
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setApod({ data: null, error: error.message, loading: false });
        }
      });

    api.tithi(selectedDate, 27.7172, 85.324, controller.signal)
      .then((data) => setTithi({ data, error: null, loading: false }))
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setTithi({ data: null, error: error.message, loading: false });
        }
      });

    return () => controller.abort();
  }, [selectedDate]);

  function chooseDate(iso: string) {
    setSelectedDate(iso);
    const d = parseIso(iso);
    setMonthCursor(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  }

  function shiftSelected(days: number) {
    const d = parseIso(selectedDate);
    d.setUTCDate(d.getUTCDate() + days);
    chooseDate(isoFromDate(d));
  }

  return (
    <div className="app-shell">
      <HeroCanvas
        imageUrl={apod.data?.hdurl || apod.data?.url || null}
        loading={apod.loading}
      />

      <main className="app-content">
        <TripleDateHeader
          sync={sync.data}
          loading={sync.loading}
          error={sync.error}
          health={health}
          selectedDate={selectedDate}
          onDateChange={chooseDate}
          onPreviousDay={() => shiftSelected(-1)}
          onNextDay={() => shiftSelected(1)}
          onToday={() => chooseDate(today)}
        />

        <section className="dashboard-grid" aria-label="Astronomical calendar dashboard">
          <LunarPhaseDial
            data={tithi.data}
            loading={tithi.loading}
            error={tithi.error}
          />

          <CalendarGrid
            month={monthCursor}
            selectedDate={selectedDate}
            today={today}
            onMonthChange={setMonthCursor}
            onSelectDate={chooseDate}
          />
        </section>

        <footer className="app-footer">
          <span>Patro Astronomical Synchronization</span>
          <span aria-hidden="true">·</span>
          <span>AD · BS · NS · Tithi</span>
        </footer>
      </main>

      <NasaDrawer
        data={apod.data}
        loading={apod.loading}
        error={apod.error}
      />
    </div>
  );
}
