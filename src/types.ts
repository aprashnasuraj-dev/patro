export interface ApodPayload {
  title: string;
  explanation: string;
  media_type: "image";
  source_media_type: "image" | "video";
  url: string;
  hdurl: string;
  date: string;
  copyright: string;
  is_fallback: boolean;
  fallback_reason?: string;
}

export interface CalendarBs {
  year: number;
  month: number;
  day: number;
  month_en: string;
  month_ne: string;
  formatted: string;
}

export interface NepalSambatDetail {
  year: number;
  month: {
    n?: number;
    roman?: string;
    dev?: string;
    newa?: string;
    [key: string]: unknown;
  } | null;
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
}

export interface TithiSummary {
  number: number;
  en: string;
  ne: string;
  paksha: string;
}

export interface TithiPayload {
  date: string;
  evaluated_at_utc: string;
  location: {
    lat: number;
    lng: number;
    reference_timezone: string;
  };
  sun_longitude_deg: number;
  moon_longitude_deg: number;
  phase_angle_deg: number;
  tithi_index: number;
  tithi_progress_percent: number;
  illumination_percent: number;
  paksha: "Shukla Paksha" | "Krishna Paksha";
  tithi_name: string;
  tithi_name_ne: string;
  next_tithi_at_utc: string | null;
  time_to_next_tithi_minutes: number | null;
  calendar_anomaly: {
    adhika_tithi: boolean;
    kshaya_tithi: boolean;
    skipped_tithi_indices: number[];
    sunrise_tithi?: {
      previous: number;
      current: number;
      next: number;
    };
    method: string;
  };
  bs_formatted: string | null;
  ns_formatted: string | null;
  methodology: {
    longitude_engine: string;
    illumination_model: string;
    date_anchor?: string;
    precision_note: string;
  };
}

export interface SyncPayload {
  success: boolean;
  query_date: string;
  calendars: {
    gregorian_ad: string;
    bikram_sambat: string;
    nepal_sambat: string;
    bikram_sambat_detail: CalendarBs;
    nepal_sambat_detail: NepalSambatDetail;
  };
  tithi: TithiSummary;
  archive_panchang: {
    tithi: TithiSummary;
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

export interface SyncRangePayload {
  success: boolean;
  start_date: string;
  end_date: string;
  requested_days: number;
  returned_days: number;
  days: SyncPayload[];
  coverage: {
    ad_start: string;
    ad_end: string;
    source_version: string;
    rows: number;
  };
}

export interface HealthPayload {
  status: "online";
  runtime: "Deno";
  framework: "Hono";
}
