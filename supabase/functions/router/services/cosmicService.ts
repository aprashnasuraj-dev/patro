import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchNasaApod } from "./nasaService.ts";

const NASA_API_KEY = Deno.env.get("NASA_API_KEY") || "DEMO_KEY";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

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

async function cached<T>(
  cacheKey: string,
  source: string,
  requestDate: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  if (supabase) {
    const { data } = await supabase
      .from("nasa_cosmic_cache")
      .select("payload,expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (data?.payload && data.expires_at && Date.parse(data.expires_at) > Date.now()) {
      return data.payload as T;
    }
  }

  const payload = await producer();

  if (supabase) {
    const now = new Date();
    await supabase.from("nasa_cosmic_cache").upsert({
      cache_key: cacheKey,
      source,
      request_date: requestDate,
      payload,
      expires_at: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      updated_at: now.toISOString()
    }, { onConflict: "cache_key" });
  }

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
      const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${encodeURIComponent(date)}&end_date=${encodeURIComponent(date)}&api_key=${encodeURIComponent(NASA_API_KEY)}`;
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
  return cached(`epic:${date}`, "NASA EPIC", date, TTL.epic, async () => {
    try {
      const data = await fetchJson(`https://epic.gsfc.nasa.gov/api/natural/date/${encodeURIComponent(date)}`);
      const list = Array.isArray(data) ? data : [];
      const { year, month, day } = dateParts(date);
      const items = list.slice(0, 5).map((item: any) => ({
        image: safeText(item?.image),
        caption: safeText(item?.caption, "Earth from DSCOVR EPIC"),
        date: safeText(item?.date, date),
        centroid_coordinates: item?.centroid_coordinates || null,
        image_url: item?.image
          ? `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${item.image}.png`
          : ""
      })).filter((x: any) => x.image_url);
      return { status: items.length ? "ok" : "no_data_for_date", items };
    } catch (error) {
      return { status: "unavailable", items: [], error: String((error as Error)?.message || error) };
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
  return cached(`donki:${date}`, "NASA CCMC DONKI", date, TTL.donki, async () => {
    const base = "https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get";
    const paths = [
      `FLR?startDate=${date}&endDate=${date}`,
      `CME?startDate=${date}&endDate=${date}`,
      `GST?startDate=${date}&endDate=${date}`
    ];
    const settled = await Promise.allSettled(paths.map((suffix) => fetchJson(`${base}/${suffix}`)));
    const [flareRaw, cmeRaw, stormRaw] = settled.map((r) => r.status === "fulfilled" && Array.isArray(r.value) ? r.value : []);
    const flareClasses = flareRaw.map((x: any) => safeText(x?.classType)).filter(Boolean).sort((a: string, b: string) => flareClassRank(b) - flareClassRank(a));
    const maxFlare = flareClasses[0] || null;
    const elevated = flareRaw.length + cmeRaw.length + stormRaw.length;
    let level = "Quiet";
    if (stormRaw.length || (maxFlare && flareClassRank(maxFlare) >= 400)) level = "Elevated";
    else if (cmeRaw.length || (maxFlare && flareClassRank(maxFlare) >= 300)) level = "Moderate";
    else if (elevated) level = "Low";

    return {
      status: settled.some((r) => r.status === "fulfilled") ? "ok" : "unavailable",
      level,
      flares: flareRaw.slice(0, 6).map((x: any) => ({ id: safeText(x?.flrID), class_type: safeText(x?.classType), begin_time: safeText(x?.beginTime), peak_time: safeText(x?.peakTime), source_location: safeText(x?.sourceLocation) })),
      cmes: cmeRaw.slice(0, 6).map((x: any) => ({ id: safeText(x?.activityID), start_time: safeText(x?.startTime), source_location: safeText(x?.sourceLocation), note: safeText(x?.note).slice(0, 500) })),
      storms: stormRaw.slice(0, 6).map((x: any) => ({ id: safeText(x?.gstID), start_time: safeText(x?.startTime), kp: Array.isArray(x?.allKpIndex) ? x.allKpIndex.slice(0, 8) : [] })),
      counts: { flares: flareRaw.length, cmes: cmeRaw.length, storms: stormRaw.length },
      max_flare_class: maxFlare
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
      const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${encodeURIComponent(rover)}/photos?earth_date=${encodeURIComponent(date)}&api_key=${encodeURIComponent(NASA_API_KEY)}`;
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
      const data = await fetchJson(`https://api.nasa.gov/insight_weather/?api_key=${encodeURIComponent(NASA_API_KEY)}&feedtype=json&ver=1.0`);
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
      const data = await fetchJson(`https://api.nasa.gov/techtransfer/patent/?space&api_key=${encodeURIComponent(NASA_API_KEY)}`);
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

export async function fetchCosmicDay(date: string) {
  const apod = await fetchNasaApod(date);
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
