import type { SyncPayload } from "../../types";

type Props = {
  selectedDate: string;
  today: string;
  sync: SyncPayload | null;
};

export function DailyDirectAnswer({ selectedDate, today, sync }: Props) {
  const isToday = selectedDate === today;
  const bs = sync?.calendars?.bikram_sambat || "—";
  const ns = sync?.calendars?.nepal_sambat || "—";
  const tithi = sync?.tithi ? `${sync.tithi.ne} (${sync.tithi.en}) · ${sync.tithi.paksha}` : "—";

  return (
    <section aria-label="मिति सारांश" className="direct-answer-card glass-panel">
      <p className="eyebrow">{isToday ? "आजको मिति" : "छानिएको मिति"}</p>
      <h2>{bs}</h2>
      <p>
        ई.सं.: <strong>{selectedDate}</strong>
        {" · "}नेपाल संवत्: <strong>{ns}</strong>
        {" · "}तिथि: <strong>{tithi}</strong>
      </p>
    </section>
  );
}
