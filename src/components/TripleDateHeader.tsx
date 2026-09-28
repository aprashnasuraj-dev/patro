import type { SyncPayload } from "../types";

interface Props {
  sync: SyncPayload | null;
  loading: boolean;
  error: string | null;
  health: "checking" | "online" | "offline";
  selectedDate: string;
  onDateChange: (date: string) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

function Badge({
  label,
  value,
  detail,
  loading
}: {
  label: string;
  value?: string;
  detail?: string;
  loading: boolean;
}) {
  return (
    <div className="date-badge">
      <span className="date-badge__label">{label}</span>
      {loading ? (
        <span className="skeleton skeleton--line" />
      ) : (
        <>
          <strong>{value || "Unavailable"}</strong>
          {detail && <small>{detail}</small>}
        </>
      )}
    </div>
  );
}

export function TripleDateHeader({
  sync,
  loading,
  error,
  health,
  selectedDate,
  onDateChange,
  onPreviousDay,
  onNextDay,
  onToday
}: Props) {
  const bs = sync?.calendars.bikram_sambat_detail;
  const ns = sync?.calendars.nepal_sambat_detail;

  return (
    <header className="glass-panel dynamic-header">
      <div className="header-title-row">
        <div>
          <p className="eyebrow">Astronomical calendar synchronization</p>
          <h1>Patro Sky Calendar</h1>
        </div>
        <div className={"health-pill health-pill--" + health}>
          <span className="health-dot" aria-hidden="true" />
          <span>
            {health === "online"
              ? "Edge online"
              : health === "offline"
                ? "Edge unavailable"
                : "Checking edge"}
          </span>
        </div>
      </div>

      <div className="date-badges" aria-live="polite">
        <Badge label="Gregorian · AD" value={sync?.calendars.gregorian_ad} loading={loading} />
        <Badge
          label="Bikram Sambat · BS"
          value={sync?.calendars.bikram_sambat}
          detail={bs ? bs.month_ne + " · " + bs.month_en : undefined}
          loading={loading}
        />
        <Badge
          label="Nepal Sambat · NS"
          value={sync?.calendars.nepal_sambat}
          detail={ns?.formatted_ne}
          loading={loading}
        />
      </div>

      <div className="date-toolbar">
        <button className="icon-button" onClick={onPreviousDay} aria-label="Previous day">
          ←
        </button>
        <label className="date-input-wrap">
          <span>Selected date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => event.target.value && onDateChange(event.target.value)}
            aria-label="Select Gregorian date"
          />
        </label>
        <button className="icon-button" onClick={onNextDay} aria-label="Next day">
          →
        </button>
        <button className="secondary-button" onClick={onToday}>
          Today
        </button>
      </div>

      {error && (
        <div className="inline-error" role="alert">
          <strong>Date synchronization failed.</strong>
          <span>{error}</span>
        </div>
      )}
    </header>
  );
}
