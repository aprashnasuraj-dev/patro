export type ArchiveDay = {
  ad: string;
  bs: { year: number; month: number; day: number; [key: string]: unknown };
  panchang: { tithi: { number: number; paksha: string; [key: string]: unknown }; [key: string]: unknown };
  [key: string]: unknown;
};
const years = new Map<number, Promise<ArchiveDay[]>>();
export async function archiveDay(date: string, signal?: AbortSignal): Promise<ArchiveDay> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) throw Error('Invalid archive date');
  const year = Number(date.slice(0, 4));
  if (!years.has(year)) years.set(year, (async () => {
    // Static assets are also available from the existing R2-backed asset route.
    const response = await fetch(`/data/calendar/ad/${year}.json`);
    if (!response.ok) throw Error('यो मितिको स्थिर पात्रो अभिलेख उपलब्ध छैन।');
    const payload = await response.json();
    if (payload.schema !== 1 || payload.calendar !== 'ad' || payload.year !== year || !Array.isArray(payload.rows)) throw Error('Invalid calendar archive');
    return payload.rows as ArchiveDay[];
  })().catch(error => { years.delete(year); throw error; }));
  const rows = await years.get(year)!;
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const row = rows.find(row => row.ad === date);
  if (!row?.panchang?.tithi || !row.bs) throw Error('यो मिति अभिलेखमा भेटिएन।');
  return row;
}
