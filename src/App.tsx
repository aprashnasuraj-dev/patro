import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type ApodPayload, type CalendarSync, type HealthPayload, type TithiPayload } from './api';

type CalendarMode = 'AD' | 'BS';
type GridCell = { iso: string; inMonth: boolean };

type BackgroundState = {
  current: string | null;
  previous: string | null;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function isoFromUtc(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function parseIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function todayInNepal() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function monthCells(anchor: Date): GridCell[] {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return { iso: isoFromUtc(date), inMonth: date.getUTCMonth() === month };
  });
}

function formatMonth(anchor: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric'
  }).format(anchor);
}

function addMonths(anchor: Date, delta: number) {
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + delta, 1));
}

function formatMinutes(minutes: number | null) {
  if (minutes == null) return 'Transition time unavailable';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m to next Tithi`;
}

function moonIlluminationPath(angleDeg: number, cx = 100, cy = 100, radius = 78) {
  const angle = ((angleDeg % 360) + 360) % 360;
  const cosine = Math.cos((angle * Math.PI) / 180);
  const steps = 72;
  const outer: string[] = [];
  const terminator: string[] = [];

  if (angle <= 180) {
    for (let i = 0; i <= steps; i += 1) {
      const y = -radius + (2 * radius * i) / steps;
      const limb = Math.sqrt(Math.max(0, radius * radius - y * y));
      outer.push(`${cx + limb},${cy + y}`);
    }
    for (let i = steps; i >= 0; i -= 1) {
      const y = -radius + (2 * radius * i) / steps;
      const limb = Math.sqrt(Math.max(0, radius * radius - y * y));
      terminator.push(`${cx + cosine * limb},${cy + y}`);
    }
  } else {
    for (let i = 0; i <= steps; i += 1) {
      const y = -radius + (2 * radius * i) / steps;
      const limb = Math.sqrt(Math.max(0, radius * radius - y * y));
      outer.push(`${cx - limb},${cy + y}`);
    }
    for (let i = steps; i >= 0; i -= 1) {
      const y = -radius + (2 * radius * i) / steps;
      const limb = Math.sqrt(Math.max(0, radius * radius - y * y));
      terminator.push(`${cx - cosine * limb},${cy + y}`);
    }
  }

  return `M ${outer[0]} L ${outer.slice(1).join(' L ')} L ${terminator.join(' L ')} Z`;
}

function LoadingBar() {
  return <span className="skeleton-line" aria-hidden="true" />;
}

function TripleDateHeader({ sync, loading }: { sync: CalendarSync | null; loading: boolean }) {
  const items = [
    ['Gregorian AD', sync?.calendars.gregorian_ad],
    ['Bikram Sambat', sync?.calendars.bikram_sambat],
    ['Nepal Sambat', sync?.calendars.nepal_sambat]
  ];

  return (
    <header className="topbar glass" aria-label="Synchronized calendar dates">
      <div className="brand-block">
        <div className="brand-mark">✦</div>
        <div>
          <strong>Patro</strong>
          <span>Astronomical Synchronization</span>
        </div>
      </div>
      <div className="date-badges">
        {items.map(([label, value]) => (
          <div className="date-badge" key={label}>
            <span>{label}</span>
            {loading ? <LoadingBar /> : <strong>{value ?? 'Unavailable'}</strong>}
          </div>
        ))}
      </div>
    </header>
  );
}

function LunarDial({ tithi, loading, error }: { tithi: TithiPayload | null; loading: boolean; error: string | null }) {
  const path = useMemo(() => moonIlluminationPath(tithi?.phase_angle_deg ?? 0), [tithi?.phase_angle_deg]);
  const progress = Math.min(100, Math.max(0, tithi?.tithi_progress_percent ?? 0));
  const tooltip = tithi
    ? `Δθ ${tithi.phase_angle_deg.toFixed(4)}° · Moon ${tithi.moon_longitude_deg.toFixed(4)}° · Sun ${tithi.sun_longitude_deg.toFixed(4)}° · ${formatMinutes(tithi.time_to_next_tithi_minutes)}`
    : 'Astronomical phase data is loading';

  return (
    <section className="glass panel lunar-panel" aria-labelledby="lunar-heading">
      <div className="panel-kicker">Lunar state</div>
      <div className="moon-layout">
        <div className="moon-wrap" tabIndex={0} aria-label={tooltip}>
          <svg className="moon-svg" viewBox="0 0 200 200" role="img" aria-label="Current lunar illumination">
            <defs>
              <radialGradient id="moonSurface" cx="36%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="52%" stopColor="#dbeafe" />
                <stop offset="100%" stopColor="#94a3b8" />
              </radialGradient>
              <radialGradient id="moonShadow" cx="38%" cy="32%" r="75%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
              <filter id="moonGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <clipPath id="moonClip">
                <circle cx="100" cy="100" r="78" />
              </clipPath>
            </defs>
            <circle cx="100" cy="100" r="84" fill="rgba(56,189,248,.12)" filter="url(#moonGlow)" />
            <circle cx="100" cy="100" r="78" fill="url(#moonShadow)" />
            <path d={path} fill="url(#moonSurface)" clipPath="url(#moonClip)" />
            <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(226,232,240,.55)" strokeWidth="1" />
          </svg>
          <div className="dial-tooltip" role="tooltip">
            {tithi ? (
              <>
                <span>Δθ <b>{tithi.phase_angle_deg.toFixed(4)}°</b></span>
                <span>Moon λ <b>{tithi.moon_longitude_deg.toFixed(4)}°</b></span>
                <span>Sun λ <b>{tithi.sun_longitude_deg.toFixed(4)}°</b></span>
                <span>{formatMinutes(tithi.time_to_next_tithi_minutes)}</span>
              </>
            ) : 'Loading precise longitudes…'}
          </div>
        </div>
        <div className="lunar-copy">
          <h2 id="lunar-heading">{loading ? 'Calculating…' : tithi?.tithi_name ?? 'Tithi unavailable'}</h2>
          <div className="devanagari">{tithi?.tithi_name_ne ?? '—'}</div>
          <div className="meta-row">
            <span>{tithi?.paksha ?? '—'}</span>
            <span>{tithi ? `${tithi.illumination_percent.toFixed(1)}% illuminated` : '—'}</span>
          </div>
          <div className="progress-label">
            <span>Tithi progress</span>
            <strong>{tithi ? `${tithi.tithi_progress_percent.toFixed(1)}%` : '—'}</strong>
          </div>
          <div className="progress-track" aria-label="Tithi progress">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          {tithi?.calendar_anomaly?.kshaya_tithi && <div className="anomaly">Kshaya Tithi awareness: sunrise sequence skips a Tithi.</div>}
          {tithi?.calendar_anomaly?.adhika_tithi && <div className="anomaly">Adhika Tithi awareness: the same Tithi spans consecutive sunrises.</div>}
          {error && <div className="error-box">{error}</div>}
        </div>
      </div>
      <div className="method-note">
        {tithi?.methodology?.precision_note ?? 'Geocentric Sun–Moon longitude calculation with explicit precision notes.'}
      </div>
    </section>
  );
}

function CalendarGrid({
  anchor,
  selectedDate,
  today,
  mode,
  cells,
  monthData,
  loading,
  onSelect,
  onPrevious,
  onNext,
  onToggleMode
}: {
  anchor: Date;
  selectedDate: string;
  today: string;
  mode: CalendarMode;
  cells: GridCell[];
  monthData: Record<string, CalendarSync | null>;
  loading: boolean;
  onSelect: (iso: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleMode: () => void;
}) {
  return (
    <section className="glass panel calendar-panel" aria-labelledby="calendar-heading">
      <div className="calendar-toolbar">
        <div>
          <div className="panel-kicker">Synchronized month</div>
          <h2 id="calendar-heading">{formatMonth(anchor)}</h2>
        </div>
        <div className="calendar-actions">
          <button className="icon-button" onClick={onPrevious} aria-label="Previous month">″</button>
          <button className="mode-button" onClick={onToggleMode} aria-label="Switch primary calendar label">
            Primary: {mode}
          </button>
          <button className="icon-button" onClick={onNext} aria-label="Next month">‹</button>
        </div>
      </div>
      <div className="weekday-grid" aria-hidden="true">
        {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="calendar-grid" role="grid" aria-busy={loading}>
        {cells.map((cell) => {
          const date = parseIso(cell.iso);
          const sync = monthData[cell.iso];
          const primary = mode === 'AD'
            ? date.getUTCDate()
            : sync?.calendars.bikram_sambat_detail?.day ?? '·';
          const tithi = sync?.tithi;
          const special = tithi?.number === 15 || tithi?.number === 30;
          const classes = [
            'calendar-cell',
            !cell.inMonth ? 'muted' : '',
            cell.iso === selectedDate ? 'selected' : '',
            cell.iso === today ? 'today' : '',
            special ? 'special' : ''
          ].filter(Boolean).join(' ');

          return (
            <button
              key={cell.iso}
              className={classes}
              onClick={() => onSelect(cell.iso)}
              role="gridcell"
              aria-selected={cell.iso === selectedDate}
            >
              <span className="cell-day">{primary}</span>
              <span className="cell-ad">{mode === 'BS' ? cell.iso.slice(8) : sync?.calendars.bikram_sambat_detail?.month_en ?? ''}</span>
              <span className={`tithi-badge ${special ? 'special-badge' : ''}`}>
                {sync ? `${sync.tithi.ne}` : <span className="tiny-skeleton" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span><i className="legend-dot today-dot" />Today</span>
        <span><i className="legend-dot selected-dot" />Selected</span>
        <span><i className="legend-dot special-dot" />Purnima / Amavasya</span>
      </div>
    </section>
  );
}

function NarrativeDrawer({ apod, loading }: { apod: ApodPayload | null; loading: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={`narrative-drawer glass ${open ? 'open' : ''}`} aria-label="NASA astronomy narrative">
      <button className="drawer-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>
          <small>NASA · Astronomy Picture of the Day</small>
          <strong>{loading ? 'Loading celestial context…' : apod?.title ?? 'Celestial context unavailable'}</strong>
        </span>
        <span className="drawer-icon">{open ? '⌄' : '⌃'}</span>
      </button>
      <div className="drawer-content">
        {apod && (
          <>
            <div className="drawer-meta">
              <span>{apod.date}</span>
              <span>{apod.copyright}</span>
              {apod.is_fallback && <span className="fallback-pill">NASA SVS fallback{apod.fallback_reason ? ` · ${apod.fallback_reason}` : ''}</span>}
            </div>
            <p>{apod.explanation}</p>
          </>
        )}
      </div>
    </aside>
  );
}

export default function App() {
  const today = useMemo(() => todayInNepal(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMonth, setViewMonth] = useState(() => {
    const date = parseIso(today);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  });
  const [mode, setMode] = useState<CalendarMode>('AD');
  const [sync, setSync] = useState<CalendarSync | null>(null);
  const [tithi, setTithi] = useState<TithiPayload | null>(null);
  const [apod, setApod] = useState<ApodPayload | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [mainLoading, setMainLoading] = useState(true);
  const [mainError, setMainError] = useState<string | null>(null);
  const [monthData, setMonthData] = useState<Record<string, CalendarSync | null>>({});
  const [monthLoading, setMonthLoading] = useState(true);
  const [background, setBackground] = useState<BackgroundState>({ current: null, previous: null });
  const monthCache = useRef(new Map<string, CalendarSync>());
  const cells = useMemo(() => monthCells(viewMonth), [viewMonth]);

  useEffect(() => {
    const controller = new AbortController();
    api.health(controller.signal).then(setHealth).catch(() => setHealth(null));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setMainLoading(true);
    setMainError(null);

    Promise.all([
      api.sync(selectedDate, controller.signal),
      api.tithi(selectedDate, 27.7172, 85.324, controller.signal),
      api.apod(selectedDate, controller.signal)
    ])
      .then(([nextSync, nextTithi, nextApod]) => {
        setSync(nextSync);
        setTithi(nextTithi);
        setApod(nextApod);
        monthCache.current.set(selectedDate, nextSync);
        setMonthData((previous) => ({ ...previous, [selectedDate]: nextSync }));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMainError(error instanceof Error ? error.message : 'Unable to load synchronized astronomy data.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setMainLoading(false);
      });

    return () => controller.abort();
  }, [selectedDate]);

  useEffect(() => {
    const image = apod?.hdurl || apod?.url;
    if (!image || image === background.current) return;
    setBackground((previous) => ({ current: image, previous: previous.current }));
    const timer = window.setTimeout(() => {
      setBackground((previous) => ({ ...previous, previous: null }));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [apod?.hdurl, apod?.url, background.current]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setMonthLoading(true);

    const load = async () => {
      const pending = cells.filter((cell) => !monthCache.current.has(cell.iso));
      for (let offset = 0; offset < pending.length && active; offset += 7) {
        const batch = pending.slice(offset, offset + 7);
        const results = await Promise.all(batch.map(async (cell) => {
          try {
            const value = await api.sync(cell.iso, controller.signal);
            return [cell.iso, value] as const;
          } catch {
            return [cell.iso, null] as const;
          }
        }));

        if (!active) return;
        setMonthData((previous) => {
          const next = { ...previous };
          for (const [iso, value] of results) {
            next[iso] = value;
            if (value) monthCache.current.set(iso, value);
          }
          return next;
        });
      }
    };

    load()
      .catch(() => undefined)
      .finally(() => {
        if (active) setMonthLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [cells]);

  const selectDate = (iso: string) => {
    setSelectedDate(iso);
    const date = parseIso(iso);
    if (date.getUTCMonth() !== viewMonth.getUTCMonth() || date.getUTCFullYear() !== viewMonth.getUTCFullYear()) {
      setViewMonth(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
    }
  };

  return (
    <div className="app-shell">
      <div className="hero-background" aria-hidden="true">
        {background.previous && <div className="bg-layer previous" style={{ backgroundImage: `url(${JSON.stringify(background.previous).slice(1, -1)})` }} />}
        {background.current && <div key={background.current} className="bg-layer current" style={{ backgroundImage: `url(${JSON.stringify(background.current).slice(1, -1)})` }} />}
        <div className="bg-overlay" />
        <div className="noise-overlay" />
      </div>

      <main className="content-shell">
        <TripleDateHeader sync={sync} loading={mainLoading} />

        <div className="status-strip">
          <span className={`status-dot ${health ? 'online' : ''}`} />
          {health ? `${health.runtime} · ${health.framework} router online` : 'Checking edge router…'}
          <span className="status-separator">•</span>
          <span>{selectedDate}</span>
          {apod?.is_fallback && <span className="fallback-pill">APOD fallback active</span>}
        </div>

        {mainError && <div className="global-error glass">Some synchronized data could not be loaded: {mainError}</div>}

        <div className="workspace">
          <LunarDial tithi={tithi} loading={mainLoading} error={mainError} />
          <CalendarGrid
            anchor={viewMonth}
            selectedDate={selectedDate}
            today={today}
            mode={mode}
            cells={cells}
            monthData={monthData}
            loading={monthLoading}
            onSelect={selectDate}
            onPrevious={() => setViewMonth((current) => addMonths(current, -1))}
            onNext={() => setViewMonth((current) => addMonths(current, 1))}
            onToggleMode={() => setMode((current) => current === 'AD' ? 'BS' : 'AD')}
          />
        </div>
      </main>

      <NarrativeDrawer apod={apod} loading={mainLoading} />
    </div>
  );
}
