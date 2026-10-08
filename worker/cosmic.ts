export type CosmicEnv = {
  DB?: any;
  ARCHIVE?: any;
  NASA_API_KEY?: string;
};

let runtimeEnv: CosmicEnv | null = null;

function envNow() {
  if (!runtimeEnv) throw new Error("cosmic_runtime_not_initialized");
  return runtimeEnv;
}

function nasaApiKey() {
  return envNow().NASA_API_KEY || "DEMO_KEY";
}

const TTL = {
  media: 24 * 3600,
  neo: 6 * 3600,
  epic: 6 * 3600,
  eonet: 15 * 60,
  donki: 15 * 60,
  mars: 24 * 3600,
  insight: 7 * 24 * 3600,
  exoplanet: 24 * 3600,
  tech: 24 * 3600
};

function hashText(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dateParts(iso: string) {
  const [year, month, day] = iso.split("-");
  return { year, month, day };
}

function shiftIsoDate(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayOffset(candidate: string, requested: string) {
  const a = Date.parse(candidate + "T00:00:00Z");
  const b = Date.parse(requested + "T00:00:00Z");
  return Math.round((a - b) / 86_400_000);
}

function epicSearchWindow(date: string) {
  return [0, -1, 1, -2, 2, -3, 3].map((offset) => shiftIsoDate(date, offset));
}

type CosmicStored<T = unknown> = {
  payload: T;
  expires_at: string;
  stored_at: string;
};

const COSMIC_R2_PREFIX = "runtime/cosmic/v1";

function cosmicEdgeKey(cacheKey: string) {
  return new Request(`https://aafnaipatro.com/__cache/cosmic/${encodeURIComponent(cacheKey)}`, { method: "GET" });
}

function cosmicR2Key(cacheKey: string) {
  return `${COSMIC_R2_PREFIX}/${encodeURIComponent(cacheKey)}.json`;
}

async function readEdgeCache<T>(cacheKey: string): Promise<T | null> {
  if (typeof caches === "undefined") return null;
  try {
    const hit = await caches.default.match(cosmicEdgeKey(cacheKey));
    return hit ? await hit.json() as T : null;
  } catch {
    return null;
  }
}

async function writeEdgeCache<T>(cacheKey: string, payload: T, ttlSeconds: number) {
  if (typeof caches === "undefined") return;
  try {
    await caches.default.put(
      cosmicEdgeKey(cacheKey),
      new Response(JSON.stringify(payload), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": `public, max-age=${Math.max(60, ttlSeconds)}`
        }
      })
    );
  } catch {}
}

async function readR2Cache<T>(cacheKey: string): Promise<{ payload: T; expiresAt: number } | null> {
  const env = envNow();
  if (!env.ARCHIVE) return null;
  try {
    const object = await env.ARCHIVE.get(cosmicR2Key(cacheKey));
    if (!object) return null;
    const stored = JSON.parse(await object.text()) as CosmicStored<T>;
    if (stored?.payload == null) return null;
    return {
      payload: stored.payload,
      expiresAt: Date.parse(String(stored.expires_at || ""))
    };
  } catch {
    return null;
  }
}

async function writeR2Cache<T>(cacheKey: string, payload: T, ttlSeconds: number) {
  const env = envNow();
  if (!env.ARCHIVE) return;
  const now = Date.now();
  const stored: CosmicStored<T> = {
    payload,
    stored_at: new Date(now).toISOString(),
    expires_at: new Date(now + Math.max(60, ttlSeconds) * 1000).toISOString()
  };
  try {
    await env.ARCHIVE.put(cosmicR2Key(cacheKey), JSON.stringify(stored), {
      httpMetadata: { contentType: "application/json" },
      customMetadata: {
        patro_cache: "cosmic-v1",
        expires_at: stored.expires_at
      }
    });
  } catch {}
}

async function snapshotCache(cacheKey: string) {
  const env = envNow();
  if (!env.DB) return null;
  try {
    const row = await env.DB.prepare(
      "select payload from content_records where table_name='nasa_cosmic_cache' and record_key=?1 limit 1"
    ).bind(cacheKey).first();
    if (!row?.payload) return null;
    const record = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
    if (!record?.payload) return null;
    return {
      payload: record.payload,
      expiresAt: typeof record.expires_at === "string" ? Date.parse(record.expires_at) : 0
    };
  } catch {
    return null;
  }
}

function producerUnavailable(value: any) {
  const status = value && typeof value === "object" ? String(value.status || "") : "";
  return status === "unavailable" || status === "archive_unavailable";
}

async function cached<T>(
  cacheKey: string,
  _source: string,
  _requestDate: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  const edge = await readEdgeCache<T>(cacheKey);
  if (edge != null) return edge;

  const r2 = await readR2Cache<T>(cacheKey);
  if (r2?.payload != null && r2.expiresAt > Date.now()) {
    await writeEdgeCache(cacheKey, r2.payload, ttlSeconds);
    return r2.payload;
  }

  const snapshot = await snapshotCache(cacheKey);
  if (snapshot?.payload && snapshot.expiresAt > Date.now()) {
    await writeEdgeCache(cacheKey, snapshot.payload as T, ttlSeconds);
    return snapshot.payload as T;
  }

  let payload: T;
  try {
    payload = await producer();
  } catch (error) {
    if (r2?.payload != null) return r2.payload;
    if (snapshot?.payload) return snapshot.payload as T;
    throw error;
  }

  if (producerUnavailable(payload)) {
    if (r2?.payload != null) return r2.payload;
    if (snapshot?.payload) return snapshot.payload as T;
  }

  await Promise.allSettled([
    writeEdgeCache(cacheKey, payload, ttlSeconds),
    writeR2Cache(cacheKey, payload, ttlSeconds)
  ]);
  return payload;
}

async function fetchJson(url: string, timeoutMs = 5500): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "Nepal-Miti-Astro/1.0" }
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function mediaItemsFrom(data: any) {
  const items = Array.isArray(data?.collection?.items) ? data.collection.items : [];
  return items.slice(0, 8).map((item: any) => {
    const meta = item?.data?.[0] || {};
    const link = Array.isArray(item?.links) ? item.links.find((x: any) => x?.href) : null;
    return {
      nasa_id: safeText(meta.nasa_id),
      title: safeText(meta.title, "NASA media"),
      description: safeText(meta.description || meta.description_508).slice(0, 900),
      media_type: safeText(meta.media_type, "image"),
      date_created: safeText(meta.date_created),
      preview_url: safeText(link?.href),
      center: safeText(meta.center),
      keywords: Array.isArray(meta.keywords) ? meta.keywords.slice(0, 10) : []
    };
  }).filter((x: any) => x.preview_url);
}

async function imageLibrarySearch(query: string, year?: string) {
  const params = new URLSearchParams({
    q: query,
    page_size: "8",
    media_type: "image,video"
  });
  if (year && /^\d{4}$/.test(year)) {
    params.set("year_start", year);
    params.set("year_end", year);
  }
  const data = await fetchJson(`https://images-api.nasa.gov/search?${params.toString()}`);
  return mediaItemsFrom(data);
}

async function fetchNeo(date: string) {
  return cached(`neo:${date}`, "NASA NeoWs", date, TTL.neo, async () => {
    try {
      const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${encodeURIComponent(date)}&end_date=${encodeURIComponent(date)}&api_key=${encodeURIComponent(nasaApiKey())}`;
      const data = await fetchJson(url);
      const raw = Array.isArray(data?.near_earth_objects?.[date]) ? data.near_earth_objects[date] : [];
      const items = raw.slice(0, 24).map((neo: any) => {
        const approach = Array.isArray(neo?.close_approach_data) ? neo.close_approach_data[0] : {};
        const missKm = Number(approach?.miss_distance?.kilometers || 0);
        const missAu = Number(approach?.miss_distance?.astronomical || 0);
        const diameterMin = Number(neo?.estimated_diameter?.meters?.estimated_diameter_min || 0);
        const diameterMax = Number(neo?.estimated_diameter?.meters?.estimated_diameter_max || 0);
        return {
          id: String(neo?.id || ""),
          name: safeText(neo?.name, "Unnamed object"),
          hazardous: Boolean(neo?.is_potentially_hazardous_asteroid),
          absolute_magnitude_h: Number(neo?.absolute_magnitude_h || 0),
          diameter_m: (diameterMin + diameterMax) / 2,
          miss_distance_km: missKm,
          miss_distance_au: missAu,
          velocity_kph: Number(approach?.relative_velocity?.kilometers_per_hour || 0),
          orbiting_body: safeText(approach?.orbiting_body, "Earth"),
          nasa_url: safeText(neo?.nasa_jpl_url)
        };
      }).sort((a: any, b: any) => a.miss_distance_km - b.miss_distance_km);

      return {
        status: "ok",
        count: items.length,
        hazardous_count: items.filter((x: any) => x.hazardous).length,
        close_count_005_au: items.filter((x: any) => x.miss_distance_au > 0 && x.miss_distance_au <= 0.05).length,
        closest_km: items[0]?.miss_distance_km ?? null,
        items: items.slice(0, 12)
      };
    } catch (error) {
      return { status: "unavailable", count: 0, hazardous_count: 0, close_count_005_au: 0, closest_km: null, items: [], error: String((error as Error)?.message || error) };
    }
  });
}

async function fetchEpic(date: string) {
  return cached(`epic-v2:${date}`, "NASA EPIC", date, TTL.epic, async () => {
    const searchedDates = epicSearchWindow(date);

    const normalize = (raw: any, imageDate: string) => {
      const list = Array.isArray(raw) ? raw : [];
      const { year, month, day } = dateParts(imageDate);
      return list.slice(0, 5).map((item: any) => ({
        image: safeText(item?.image),
        caption: safeText(item?.caption, "Earth from DSCOVR EPIC"),
        date: safeText(item?.date, imageDate),
        centroid_coordinates: item?.centroid_coordinates || null,
        image_url: item?.image
          ? `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${item.image}.png`
          : ""
      })).filter((item: any) => item.image_url);
    };

    let exactError = "";
    try {
      const exactRaw = await fetchJson(`https://epic.gsfc.nasa.gov/api/natural/date/${encodeURIComponent(date)}`, 5000);
      const exactItems = normalize(exactRaw, date);
      if (exactItems.length) {
        return {
          status: "ok",
          requested_date: date,
          image_date: date,
          nearest_available_date: null,
          latest_available_date: date,
          offset_days: 0,
          fallback_used: false,
          searched_dates: [date],
          items: exactItems
        };
      }
    } catch (error) {
      exactError = String((error as Error)?.message || error);
    }

    let latestAvailableDate: string | null = null;
    try {
      const availabilityRaw = await fetchJson("https://epic.gsfc.nasa.gov/api/natural/all", 6000);
      const availableDates = (Array.isArray(availabilityRaw) ? availabilityRaw : [])
        .map((entry: any) => typeof entry === "string" ? entry.slice(0, 10) : safeText(entry?.date).slice(0, 10))
        .filter((value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value))
        .sort((a: string, b: string) => b.localeCompare(a));

      latestAvailableDate = availableDates[0] || null;

      const nearest = availableDates
        .map((candidate: string) => ({ candidate, offset: dayOffset(candidate, date) }))
        .filter(({ offset }: { offset: number }) => Math.abs(offset) <= 3 && offset !== 0)
        .sort((a: { offset: number }, b: { offset: number }) => {
          const distance = Math.abs(a.offset) - Math.abs(b.offset);
          if (distance !== 0) return distance;
          return a.offset - b.offset;
        })[0];

      if (nearest) {
        const nearestRaw = await fetchJson(
          `https://epic.gsfc.nasa.gov/api/natural/date/${encodeURIComponent(nearest.candidate)}`,
          5000
        );
        const nearestItems = normalize(nearestRaw, nearest.candidate);
        if (nearestItems.length) {
          return {
            status: "nearest_available",
            requested_date: date,
            image_date: nearest.candidate,
            nearest_available_date: nearest.candidate,
            latest_available_date: latestAvailableDate,
            offset_days: nearest.offset,
            fallback_used: true,
            searched_dates: searchedDates,
            items: nearestItems
          };
        }
      }

      return {
        status: "no_data_within_window",
        requested_date: date,
        image_date: null,
        nearest_available_date: null,
        latest_available_date: latestAvailableDate,
        offset_days: null,
        fallback_used: false,
        searched_dates: searchedDates,
        items: [],
        ...(exactError ? { error: exactError } : {})
      };
    } catch (error) {
      return {
        status: "unavailable",
        requested_date: date,
        image_date: null,
        nearest_available_date: null,
        latest_available_date: latestAvailableDate,
        offset_days: null,
        fallback_used: false,
        searched_dates: searchedDates,
        items: [],
        error: String((error as Error)?.message || error || exactError)
      };
    }
  });
}

async function fetchEonet(date: string) {
  return cached(`eonet:${date}`, "NASA EONET v3", date, TTL.eonet, async () => {
    try {
      const url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=all&start=${encodeURIComponent(date)}&end=${encodeURIComponent(date)}&limit=12`;
      const data = await fetchJson(url);
      const events = (Array.isArray(data?.events) ? data.events : []).slice(0, 8).map((event: any) => ({
        id: safeText(event?.id),
        title: safeText(event?.title, "Natural event"),
        closed: event?.closed ?? null,
        categories: Array.isArray(event?.categories) ? event.categories.map((x: any) => safeText(x?.title)).filter(Boolean) : [],
        sources: Array.isArray(event?.sources) ? event.sources.slice(0, 4).map((x: any) => ({ id: safeText(x?.id), url: safeText(x?.url) })) : [],
        geometry: Array.isArray(event?.geometry) ? event.geometry.slice(-2) : []
      }));
      return { status: "ok", count: events.length, events };
    } catch (error) {
      return { status: "unavailable", count: 0, events: [], error: String((error as Error)?.message || error) };
    }
  });
}

function flareClassRank(value: string) {
  const m = /^([ABCMX])(\d+(?:\.\d+)?)/i.exec(value || "");
  if (!m) return 0;
  const base: Record<string, number> = { A: 1, B: 2, C: 3, M: 4, X: 5 };
  return (base[m[1].toUpperCase()] || 0) * 100 + Number(m[2]);
}

async function fetchDonki(date: string) {
  return cached(`donki-v2:${date}`, "NASA CCMC DONKI", date, TTL.donki, async () => {
    const windowStart = shiftIsoDate(date, -2);
    const base = "https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get";
    const paths = [
      `FLR?startDate=${windowStart}&endDate=${date}`,
      `CME?startDate=${windowStart}&endDate=${date}`,
      `GST?startDate=${windowStart}&endDate=${date}`
    ];

    const settled = await Promise.allSettled(paths.map((suffix) => fetchJson(`${base}/${suffix}`, 6000)));
    const [flareRaw, cmeRaw, stormRaw] = settled.map((result) =>
      result.status === "fulfilled" && Array.isArray(result.value) ? result.value : []
    );

    const flareClasses = flareRaw
      .map((item: any) => safeText(item?.classType))
      .filter(Boolean)
      .sort((a: string, b: string) => flareClassRank(b) - flareClassRank(a));
    const maxFlare = flareClasses[0] || null;

    const stormKpValues = stormRaw.flatMap((storm: any) =>
      (Array.isArray(storm?.allKpIndex) ? storm.allKpIndex : [])
        .map((entry: any) => Number(entry?.kpIndex ?? entry?.kp ?? entry))
        .filter((value: number) => Number.isFinite(value))
    );
    const maxKp = stormKpValues.length ? Math.max(...stormKpValues) : null;

    const eventCount = flareRaw.length + cmeRaw.length + stormRaw.length;
    let level: "Quiet" | "Low" | "Moderate" | "Elevated" = "Quiet";
    if ((maxKp != null && maxKp >= 7) || (maxFlare && flareClassRank(maxFlare) >= 500)) {
      level = "Elevated";
    } else if (
      (maxKp != null && maxKp >= 5) ||
      (maxFlare && flareClassRank(maxFlare) >= 400) ||
      cmeRaw.length >= 2
    ) {
      level = "Moderate";
    } else if (eventCount) {
      level = "Low";
    }

    return {
      status: settled.some((result) => result.status === "fulfilled") ? "ok" : "unavailable",
      level,
      window_start: windowStart,
      window_end: date,
      flares: flareRaw.slice(0, 8).map((item: any) => ({
        id: safeText(item?.flrID),
        class_type: safeText(item?.classType),
        begin_time: safeText(item?.beginTime),
        peak_time: safeText(item?.peakTime),
        source_location: safeText(item?.sourceLocation)
      })),
      cmes: cmeRaw.slice(0, 8).map((item: any) => {
        const analyses = Array.isArray(item?.cmeAnalyses) ? item.cmeAnalyses : [];
        const analysis = analyses.find((entry: any) => entry?.isMostAccurate) || analyses[0] || {};
        const speed = Number(analysis?.speed);
        const halfAngle = Number(analysis?.halfAngle);
        return {
          id: safeText(item?.activityID),
          start_time: safeText(item?.startTime),
          source_location: safeText(item?.sourceLocation),
          note: safeText(item?.note).slice(0, 500),
          speed_kps: Number.isFinite(speed) ? speed : null,
          half_angle_deg: Number.isFinite(halfAngle) ? halfAngle : null,
          cme_type: safeText(analysis?.type)
        };
      }),
      storms: stormRaw.slice(0, 8).map((item: any) => {
        const kp = Array.isArray(item?.allKpIndex) ? item.allKpIndex.slice(0, 12) : [];
        const kpValues = kp
          .map((entry: any) => Number(entry?.kpIndex ?? entry?.kp ?? entry))
          .filter((value: number) => Number.isFinite(value));
        return {
          id: safeText(item?.gstID),
          start_time: safeText(item?.startTime),
          max_kp: kpValues.length ? Math.max(...kpValues) : null,
          kp
        };
      }),
      counts: { flares: flareRaw.length, cmes: cmeRaw.length, storms: stormRaw.length },
      max_flare_class: maxFlare,
      max_kp: maxKp
    };
  });
}

async function fetchExoplanet(date: string) {
  return cached(`exoplanet:${date}`, "NASA Exoplanet Archive TAP", date, TTL.exoplanet, async () => {
    try {
      const year = Number(date.slice(0, 4));
      const currentYear = new Date().getUTCFullYear();
      const where = year >= 1992 && year <= currentYear ? ` where disc_year=${year}` : "";
      const query = `select top 18 pl_name,hostname,disc_year,discoverymethod,pl_rade,pl_bmasse,pl_orbper,sy_dist from pscomppars${where} order by disc_year desc`;
      let rows = await fetchJson(`https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(query)}&format=json`, 7000);
      if (!Array.isArray(rows) || rows.length === 0) {
        const fallbackQuery = "select top 18 pl_name,hostname,disc_year,discoverymethod,pl_rade,pl_bmasse,pl_orbper,sy_dist from pscomppars where disc_year is not null order by disc_year desc";
        rows = await fetchJson(`https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(fallbackQuery)}&format=json`, 7000);
      }
      const list = Array.isArray(rows) ? rows : [];
      if (!list.length) return { status: "no_data", highlight: null };
      const row = list[hashText(date) % list.length];
      return {
        status: "ok",
        highlight: {
          name: safeText(row?.pl_name, "Unnamed exoplanet"),
          host: safeText(row?.hostname),
          discovery_year: row?.disc_year ?? null,
          discovery_method: safeText(row?.discoverymethod),
          radius_earth: row?.pl_rade ?? null,
          mass_earth: row?.pl_bmasse ?? null,
          orbital_period_days: row?.pl_orbper ?? null,
          distance_pc: row?.sy_dist ?? null
        }
      };
    } catch (error) {
      return { status: "unavailable", highlight: null, error: String((error as Error)?.message || error) };
    }
  });
}

async function fetchMarsRover(date: string, rover: string) {
  return cached(`mars:${rover}:${date}`, "NASA Mars Rover archive", date, TTL.mars, async () => {
    try {
      const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${encodeURIComponent(rover)}/photos?earth_date=${encodeURIComponent(date)}&api_key=${encodeURIComponent(nasaApiKey())}`;
      const data = await fetchJson(url);
      const photos = (Array.isArray(data?.photos) ? data.photos : []).slice(0, 3).map((p: any) => ({
        id: String(p?.id || ""),
        img_src: safeText(p?.img_src),
        earth_date: safeText(p?.earth_date),
        sol: p?.sol ?? null,
        camera: safeText(p?.camera?.full_name || p?.camera?.name),
        rover: safeText(p?.rover?.name, rover)
      })).filter((x: any) => x.img_src);
      if (photos.length) return { rover, status: "archived_api_available", photos };
    } catch {}

    try {
      const media = await imageLibrarySearch(`${rover} Mars rover`, date.slice(0, 4));
      return {
        rover,
        status: "media_library_fallback",
        photos: media.slice(0, 3).map((m: any) => ({
          id: m.nasa_id,
          img_src: m.preview_url,
          earth_date: m.date_created?.slice(0, 10) || "",
          sol: null,
          camera: m.center || "NASA media archive",
          rover
        }))
      };
    } catch (error) {
      return { rover, status: "unavailable", photos: [], error: String((error as Error)?.message || error) };
    }
  });
}

async function fetchInsight(date: string) {
  return cached(`insight:${date.slice(0, 7)}`, "NASA InSight weather archive", date, TTL.insight, async () => {
    try {
      const data = await fetchJson(`https://api.nasa.gov/insight_weather/?api_key=${encodeURIComponent(nasaApiKey())}&feedtype=json&ver=1.0`);
      const sols = Array.isArray(data?.sol_keys) ? data.sol_keys.slice(-7).reverse().map((sol: string) => ({
        sol,
        season: data?.[sol]?.Season ?? null,
        average_temp_c: data?.[sol]?.AT?.av ?? null,
        min_temp_c: data?.[sol]?.AT?.mn ?? null,
        max_temp_c: data?.[sol]?.AT?.mx ?? null,
        pressure_pa: data?.[sol]?.PRE?.av ?? null,
        wind_mps: data?.[sol]?.HWS?.av ?? null
      })) : [];
      return { status: sols.length ? "archive_available" : "archive_no_data", sols };
    } catch (error) {
      return { status: "archive_unavailable", sols: [], error: String((error as Error)?.message || error) };
    }
  });
}

async function fetchTech(date: string) {
  return cached(`tech:${date.slice(0, 7)}`, "NASA Tech Transfer", date, TTL.tech, async () => {
    try {
      const data = await fetchJson(`https://api.nasa.gov/techtransfer?patent=space&api_key=${encodeURIComponent(nasaApiKey())}`);
      const rows = Array.isArray(data?.results) ? data.results.slice(0, 5) : [];
      return {
        status: rows.length ? "ok" : "no_data",
        items: rows.map((row: any[]) => ({
          id: String(row?.[0] || ""),
          title: safeText(row?.[1], "NASA technology"),
          description: safeText(row?.[3]).replace(/<[^>]+>/g, "").slice(0, 500),
          category: safeText(row?.[5])
        }))
      };
    } catch (error) {
      return { status: "unavailable", items: [], error: String((error as Error)?.message || error) };
    }
  });
}

export async function fetchCosmicDay(date: string, env: CosmicEnv, apod: any) {
  runtimeEnv = env;
  const query = apod?.title && !apod.is_fallback ? apod.title : `astronomy ${date.slice(0, 4)}`;

  const [relatedMedia, neo, epic, eonet, solar, exoplanet, insight, tech, curiosity, perseverance, opportunity, spirit] = await Promise.all([
    cached(`media:${date}:${hashText(query)}`, "NASA Image and Video Library", date, TTL.media, async () => {
      try { return { status: "ok", items: await imageLibrarySearch(query, date.slice(0, 4)) }; }
      catch (error) { return { status: "unavailable", items: [], error: String((error as Error)?.message || error) }; }
    }),
    fetchNeo(date),
    fetchEpic(date),
    fetchEonet(date),
    fetchDonki(date),
    fetchExoplanet(date),
    fetchInsight(date),
    fetchTech(date),
    fetchMarsRover(date, "curiosity"),
    fetchMarsRover(date, "perseverance"),
    fetchMarsRover(date, "opportunity"),
    fetchMarsRover(date, "spirit")
  ]);

  return {
    requested_date: date,
    generated_at: new Date().toISOString(),
    apod,
    related_media: relatedMedia,
    neo,
    earth: {
      epic,
      eonet,
      gibs: {
        status: "ok",
        provider: "NASA Earthdata Worldview / GIBS",
        worldview_url: `https://worldview.earthdata.nasa.gov/?t=${encodeURIComponent(date + "T12:00:00Z")}&l=VIIRS_SNPP_CorrectedReflectance_TrueColor,Coastlines_15m,Reference_Labels_15m`
      }
    },
    mars: {
      status: "archive_aware",
      official_api_status: "Mars Rover Photos is archived by NASA Open APIs; exact-date calls are attempted and otherwise fall back to the NASA Image and Video Library.",
      rovers: [curiosity, perseverance, opportunity, spirit],
      insight_weather: insight
    },
    solar,
    exoplanet,
    technology: tech,
    source_notes: {
      apod: "Legacy APOD endpoint remains active until NASA's announced 2026-12-01 retirement; the server proxy isolates clients so the upstream can be swapped without SPA changes.",
      mars: "NASA Open APIs marks Mars Rover Photos archived.",
      earth: "Legacy Earth API is archived; this experience uses EPIC plus Earthdata Worldview/GIBS.",
      astronomy: "Lunar/Tithi calculation is independent of NASA media feeds and uses the existing Astronomy Engine pipeline."
    }
  };
}
