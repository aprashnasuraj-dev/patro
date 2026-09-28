export type CalendarSync = {
  success: boolean;
  query_date: string;
  calendars: {
    gregorian_ad: string;
    bikram_sambat: string;
    nepal_sambat: string;
    bikram_sambat_detail?: {
      year: number;
      month: number;
      day: number;
      month_en: string;
      month_ne: string;
      formatted: string;
    };
    nepal_sambat_detail?: Record<string, unknown>;
  };
  tithi: {
    number: number;
    en: string;
    ne: string;
    paksha: string;
  };
  archive_panchang?: {
    tithi?: { number: number; en: string; ne: string; paksha: string };
    tithi_transition?: { minutes: number; time: string | null; next_en: string; next_ne: string } | null;
    sunrise?: string | null;
    sunset?: string | null;
    location?: string;
    source?: string;
  };
};

export type ApodPayload = {
  title: string;
  explanation: string;
  media_type: 'image';
  source_media_type: 'image' | 'video';
  url: string;
  hdurl: string;
  date: string;
  copyright: string;
  is_fallback: boolean;
  fallback_reason?: string;
};

export type TithiPayload = {
  date: string;
  evaluated_at_utc: string;
  location: { lat: number; lng: number; reference_timezone: string };
  sun_longitude_deg: number;
  moon_longitude_deg: number;
  phase_angle_deg: number;
  tithi_index: number;
  tithi_progress_percent: number;
  illumination_percent: number;
  paksha: string;
  tithi_name: string;
  tithi_name_ne: string;
  next_tithi_at_utc: string | null;
  time_to_next_tithi_minutes: number | null;
  calendar_anomaly?: {
    adhika_tithi: boolean;
    kshaya_tithi: boolean;
    skipped_tithi_indices: number[];
    method?: string;
  };
  bs_formatted: string | null;
  ns_formatted: string | null;
  methodology?: {
    longitude_engine: string;
    illumination_model: string;
    precision_note: string;
  };
};

export type HealthPayload = {
  status: 'online';
  runtime: 'Deno';
  framework: 'Hono';
};

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  const relayAbort = () => controller.abort();
  signal?.addEventListener('abort', relayAbort, { once: true });

  try {
    const response = await fetch(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${response.statusText}${body ? ` · ${body.slice(0, 160)}` : ''}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', relayAbort);
  }
}

const enc = encodeURIComponent;

export const api = {
  health: (signal?: AbortSignal) => getJson<HealthPayload>('/api/v1/health', signal),
  sync: (date: string, signal?: AbortSignal) => getJson<CalendarSync>(`/api/v1/sync?date=${enc(date)}`, signal),
  apod: (date: string, signal?: AbortSignal) => getJson<ApodPayload>(`/api/v1/nasa/apod?date=${enc(date)}`, signal),
  tithi: (date: string, lat = 27.7172, lng = 85.324, signal?: AbortSignal) =>
    getJson<TithiPayload>(`/api/v1/astronomy/tithi?date=${enc(date)}&lat=${enc(String(lat))}&lng=${enc(String(lng))}`, signal)
};
