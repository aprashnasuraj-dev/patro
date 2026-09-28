import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

export interface CalendarSyncData {
  ad: string;
  bs: {
    year: number;
    month: number;
    day: number;
    month_en: string;
    month_ne: string;
    formatted: string;
  };
  ns: {
    year: number;
    month: Record<string, unknown> | null;
    month_no: number;
    paksha: string;
    paksha_dev: string;
    tithi_number: number;
    tithi_ordinal: number;
    tithi_name: string;
    tithi_name_ne: string;
    adhika: boolean;
    formatted: string;
    formatted_ne: string;
    [key: string]: unknown;
  };
  panchang: {
    tithi: { number: number; en: string; ne: string; paksha: string };
    tithi_transition: {
      minutes: number;
      time: string | null;
      next_en: string;
      next_ne: string;
    } | null;
    sunrise: string | null;
    sunset: string | null;
    location: string;
    source: string;
  };
}

const memory = new Map<string, CalendarSyncData>();

export async function getCalendarDate(iso: string): Promise<CalendarSyncData | null> {
  const cached = memory.get(iso);
  if (cached) return cached;
  if (!supabase) throw new Error("missing_supabase_runtime_secrets");

  const { data, error } = await supabase
    .from("astronomy_calendar_map")
    .select("payload")
    .eq("ad_date", iso)
    .maybeSingle();

  if (error) throw new Error("calendar_map_read_failed");
  if (!data?.payload) return null;

  const payload = data.payload as CalendarSyncData;
  if (memory.size >= 512) {
    const first = memory.keys().next().value;
    if (first) memory.delete(first);
  }
  memory.set(iso, payload);
  return payload;
}


export async function getCalendarRange(
  startIso: string,
  endIso: string
): Promise<CalendarSyncData[]> {
  if (!supabase) throw new Error("missing_supabase_runtime_secrets");

  const { data, error } = await supabase
    .from("astronomy_calendar_map")
    .select("ad_date,payload")
    .gte("ad_date", startIso)
    .lte("ad_date", endIso)
    .order("ad_date", { ascending: true });

  if (error) throw new Error("calendar_map_range_read_failed");

  const rows: CalendarSyncData[] = [];
  for (const row of data ?? []) {
    if (!row?.payload) continue;
    const payload = row.payload as CalendarSyncData;
    rows.push(payload);

    if (memory.size >= 512) {
      const first = memory.keys().next().value;
      if (first) memory.delete(first);
    }
    memory.set(String(row.ad_date), payload);
  }
  return rows;
}

export function getCalendarCoverage() {
  return {
    ad_start: "1826-04-11",
    ad_end: "2037-04-13",
    source_version: "patro-archive-v79",
    rows: 77070
  };
}
