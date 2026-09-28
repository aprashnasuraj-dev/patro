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

export interface CosmicMediaItem {
  nasa_id: string;
  title: string;
  description: string;
  media_type: string;
  date_created: string;
  preview_url: string;
  center: string;
  keywords: string[];
}

export interface CosmicNeo {
  id: string;
  name: string;
  hazardous: boolean;
  absolute_magnitude_h: number;
  diameter_m: number;
  miss_distance_km: number;
  miss_distance_au: number;
  velocity_kph: number;
  orbiting_body: string;
  nasa_url: string;
}

export interface EpicImage {
  image: string;
  caption: string;
  date: string;
  centroid_coordinates: unknown;
  image_url: string;
}

export interface EonetEvent {
  id: string;
  title: string;
  closed: string | null;
  categories: string[];
  sources: { id: string; url: string }[];
  geometry: unknown[];
}

export interface RoverPhoto {
  id: string;
  img_src: string;
  earth_date: string;
  sol: number | null;
  camera: string;
  rover: string;
}

export interface CosmicDayPayload {
  requested_date: string;
  generated_at: string;
  apod: ApodPayload;
  related_media: {
    status: string;
    items: CosmicMediaItem[];
    error?: string;
  };
  neo: {
    status: string;
    count: number;
    hazardous_count: number;
    close_count_005_au: number;
    closest_km: number | null;
    items: CosmicNeo[];
    error?: string;
  };
  earth: {
    epic: {
      status: string;
      items: EpicImage[];
      error?: string;
    };
    eonet: {
      status: string;
      count: number;
      events: EonetEvent[];
      error?: string;
    };
    gibs: {
      status: string;
      provider: string;
      worldview_url: string;
    };
  };
  mars: {
    status: string;
    official_api_status: string;
    rovers: {
      rover: string;
      status: string;
      photos: RoverPhoto[];
      error?: string;
    }[];
    insight_weather: {
      status: string;
      sols: {
        sol: string;
        season: string | null;
        average_temp_c: number | null;
        min_temp_c: number | null;
        max_temp_c: number | null;
        pressure_pa: number | null;
        wind_mps: number | null;
      }[];
      error?: string;
    };
  };
  solar: {
    status: string;
    level: "Quiet" | "Low" | "Moderate" | "Elevated";
    counts: { flares: number; cmes: number; storms: number };
    max_flare_class: string | null;
    flares: {
      id: string;
      class_type: string;
      begin_time: string;
      peak_time: string;
      source_location: string;
    }[];
    cmes: {
      id: string;
      start_time: string;
      source_location: string;
      note: string;
    }[];
    storms: {
      id: string;
      start_time: string;
      kp: unknown[];
    }[];
  };
  exoplanet: {
    status: string;
    highlight: null | {
      name: string;
      host: string;
      discovery_year: number | null;
      discovery_method: string;
      radius_earth: number | null;
      mass_earth: number | null;
      orbital_period_days: number | null;
      distance_pc: number | null;
    };
    error?: string;
  };
  technology: {
    status: string;
    items: {
      id: string;
      title: string;
      description: string;
      category: string;
    }[];
    error?: string;
  };
  source_notes: Record<string, string>;
}
