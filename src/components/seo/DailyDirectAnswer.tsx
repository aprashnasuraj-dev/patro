import type { SyncPayload } from "../../types";

type Props = {
  selectedDate: string;
  today: string;
  sync: SyncPayload | null;
};

export function DailyDirectAnswer({ selectedDate, today, sync }: Props) {
  const isToday = selectedDate === today;
  const bs = sync?.calendars?.bikram_sambat || "लोड हुँदैछ…";
  const ns = sync?.calendars?.nepal_sambat || "लोड हुँदैछ…";
  const tithi = sync?.tithi ? `${sync.tithi.ne} (${sync.tithi.en}) · ${sync.tithi.paksha}` : "लोड हुँदैछ…";

  return (
    <section aria-label="Daily Date Summary" className="direct-answer-card glass-panel">
      <p className="eyebrow">{isToday ? "आजको मिति · Today" : "छानिएको मिति · Selected date"}</p>
      <h2>{isToday ? "Nepali Date Today" : "Nepali Date"}: {bs}</h2>
      <p>
        Gregorian Date: <strong>{selectedDate}</strong>
        {" · "}Nepal Sambat: <strong>{ns}</strong>
        {" · "}Tithi: <strong>{tithi}</strong>
      </p>
    </section>
  );
}
