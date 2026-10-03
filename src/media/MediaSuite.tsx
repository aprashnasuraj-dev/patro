import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Star } from "lucide-react";
import { fuzzyMedia, MEDIA_CATALOG, type MediaItem, type MediaKind } from "./catalog";
import { useMedia } from "./MediaProvider";

type TvFacet = { name: string; code: string; flag?: string };
type TvCatalogResponse = {
  ok: boolean;
  total: number;
  page: number;
  pages: number;
  updated_at?: string;
  items: Array<{
    id: string;
    name: string;
    country: string;
    country_name: string;
    flag?: string;
    languages?: string[];
    language_names?: string[];
    categories?: string[];
    category_names?: string[];
    logo?: string;
    website?: string;
    stream: string;
    status?: string;
    quality?: string;
    official?: boolean;
    media_type?: string;
    playable?: boolean;
  }>;
  facets?: {
    countries?: TvFacet[];
    languages?: Array<{ name?: string; code?: string } | string>;
    categories?: Array<{ name?: string; id?: string; code?: string } | string>;
  };
};

type FmDirectoryResponse = {
  ok: boolean;
  total: number;
  catalog_total: number;
  verified_total: number;
  covered_districts?: number;
  languages?: string[];
  items: Array<{
    slug: string;
    name_ne?: string;
    name_en?: string;
    frequency?: string | null;
    district?: string | null;
    district_ne?: string | null;
    district_en?: string | null;
    province?: string | null;
    province_ne?: string | null;
    municipality?: string | null;
    languages?: string[];
    website?: string | null;
    logo_url?: string | null;
    type?: string | null;
    status?: string | null;
    playable?: boolean;
    category?: string | null;
    last_ok_at?: string | null;
  }>;
};

type RadioCatalogResponse = {
  ok: boolean;
  source?: string;
  directory_warning?: string | null;
  country: string;
  total: number;
  page: number;
  pages: number;
  page_size: number;
  has_more: boolean;
  verified_total: number;
  items: Array<{
    id: string;
    name: string;
    name_ne?: string;
    country: string;
    country_name: string;
    province?: string;
    district?: string;
    genre?: string;
    languages?: string[];
    language_codes?: string[];
    codec?: string;
    bitrate_kbps?: number;
    logo?: string;
    website?: string;
    stream: string;
    source_stream?: string;
    status?: string;
    playable?: boolean;
    media_type?: string;
    verified?: boolean;
    source?: string;
    last_ok_at?: string;
  }>;
  facets?: {
    countries?: Array<{ code: string; name: string; count: number }>;
  };
};

function storedFavorites() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem("patro.media.favorites") || "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function compat(path: string) {
  return "/api/v1/compat-api/" + path.replace(/^\/+/, "");
}

function tvToMedia(row: TvCatalogResponse["items"][number]): MediaItem {
  return {
    id: row.id,
    kind: "tv",
    name: row.name,
    nameNe: row.name,
    streamUrl: compat("tv/relay?id=" + encodeURIComponent(row.id)),
    sourceStreamUrl: row.stream,
    province: row.country_name || row.country || "Global",
    district: (row.language_names || row.languages || []).join(" · ") || "Live",
    genre: (row.category_names || row.categories || []).join(" · ") || "General",
    codec: (row.media_type || "auto").toUpperCase(),
    logo: row.logo || undefined,
    officialUrl: row.website || undefined,
    scheduleUrl: row.website || undefined,
    playable: row.playable !== false,
    status: row.status || "unknown",
    countryCode: row.country,
    countryName: row.country_name,
    languages: row.languages,
    languageNames: row.language_names,
    quality: row.quality || undefined,
    mediaType: row.media_type || "auto",
    verified: row.official === true
  };
}

function fmToMedia(row: FmDirectoryResponse["items"][number]): MediaItem {
  const name = row.name_en || row.name_ne || row.slug;
  return {
    id: row.slug,
    kind: "radio",
    name,
    nameNe: row.name_ne || name,
    streamUrl: "/fm-v2-stream/" + encodeURIComponent(row.slug),
    province: row.province_ne || row.province || "International",
    district: row.district_ne || row.district_en || row.district || row.municipality || "Online",
    genre: row.category || "Radio",
    codec: (row.type || "audio").toUpperCase(),
    logo: row.logo_url || undefined,
    officialUrl: row.website || undefined,
    scheduleUrl: row.website || undefined,
    playable: row.playable === true,
    status: row.status || "unknown",
    languages: row.languages,
    mediaType: (row.type || "audio").toLowerCase()
  };
}

function radioToMedia(row: RadioCatalogResponse["items"][number]): MediaItem {
  return {
    id: row.id,
    kind: "radio",
    name: row.name,
    nameNe: row.name_ne || row.name,
    streamUrl: row.stream,
    sourceStreamUrl: row.source_stream,
    province: row.province || row.country_name || row.country || "International",
    district: row.district || "Online",
    genre: row.genre || "Radio",
    codec: (row.codec || "audio").toUpperCase(),
    bitrateKbps: row.bitrate_kbps,
    logo: row.logo || undefined,
    officialUrl: row.website || undefined,
    scheduleUrl: row.website || undefined,
    playable: row.playable !== false,
    status: row.status || "verified-live",
    countryCode: row.country,
    countryName: row.country_name,
    languages: row.languages,
    mediaType: row.media_type || "audio",
    verified: row.verified !== false
  };
}

function TvPlayer({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hls = useRef<Hls | null>(null);
  const retryTimer = useRef<number | null>(null);
  const stallTimer = useRef<number | null>(null);
  const attempts = useRef(0);
  const [health, setHealth] = useState("loading");
  const [probe, setProbe] = useState<string | null>(null);
  const [low, setLow] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [levels, setLevels] = useState<Array<{ index: number; label: string }>>([]);
  const [quality, setQuality] = useState("auto");
  const [activeQuality, setActiveQuality] = useState("स्वचालित");

  useEffect(() => {
    setQuality("auto");
    setLevels([]);
    setActiveQuality("स्वचालित");
  }, [item.id]);

  useEffect(() => {
    const controller = new AbortController();
    setProbe(null);
    fetch(compat("tv/health?ids=" + encodeURIComponent(item.id)), {
      signal: controller.signal,
      cache: "no-store"
    })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        const row = j?.items?.[0];
        if (row) setProbe(row.live ? "available" : "unavailable");
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [item.id, retryNonce]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let cancelled = false;
    attempts.current = 0;

    const clearTimers = () => {
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      if (stallTimer.current) window.clearTimeout(stallTimer.current);
      retryTimer.current = null;
      stallTimer.current = null;
    };

    const clear = () => {
      clearTimers();
      hls.current?.destroy();
      hls.current = null;
      video.removeAttribute("src");
      video.load();
    };

    const retry = (startPlayback: () => void) => {
      attempts.current += 1;
      if (attempts.current > 6) {
        setHealth("error");
        return;
      }
      setHealth("retrying");
      const delay = Math.min(30_000, 800 * 2 ** Math.min(attempts.current, 5));
      retryTimer.current = window.setTimeout(startPlayback, delay);
    };

    const startPlayback = () => {
      if (cancelled) return;
      hls.current?.destroy();
      hls.current = null;
      clearTimers();
      setHealth(attempts.current ? "retrying" : "loading");

      const isHls = item.mediaType === "hls" || item.codec.toLowerCase().includes("hls") ||
        /\.m3u8(?:$|\?)/i.test(item.sourceStreamUrl || "");

      if (isHls && Hls.isSupported()) {
        const engine = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          capLevelToPlayerSize: true,
          maxBufferLength: low ? 8 : 30,
          maxMaxBufferLength: low ? 14 : 70,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 8,
          fragLoadingTimeOut: 20_000,
          manifestLoadingTimeOut: 15_000,
          levelLoadingTimeOut: 15_000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2
        });
        hls.current = engine;
        engine.loadSource(item.streamUrl);
        engine.attachMedia(video);

        engine.on(Hls.Events.MANIFEST_PARSED, () => {
          attempts.current = 0;
          const choices = engine.levels.map((level, index) => ({
            index,
            label: level.height ? level.height + "p" : (level.bitrate ? Math.round(level.bitrate / 1000) + " kbps" : "स्तर " + (index + 1))
          }));
          setLevels(choices);
          if (low) engine.autoLevelCapping = 0;
          if (quality !== "auto") engine.currentLevel = Number(quality);
          setHealth("live");
          void video.play().catch(() => setHealth("ready"));
        });

        engine.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          const level = engine.levels[data.level];
          setActiveQuality(level?.height ? level.height + "p" : (level?.bitrate ? Math.round(level.bitrate / 1000) + " kbps" : "स्वचालित"));
        });

        engine.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && attempts.current < 2) {
            attempts.current += 1;
            setHealth("retrying");
            engine.startLoad(-1);
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && attempts.current < 3) {
            attempts.current += 1;
            setHealth("retrying");
            engine.recoverMediaError();
            return;
          }
          engine.destroy();
          retry(startPlayback);
        });
        return;
      }

      video.src = item.streamUrl;
      video.load();
      void video.play().then(() => {
        attempts.current = 0;
        setHealth("live");
      }).catch(() => setHealth("ready"));
    };

    const onPlaying = () => {
      setHealth("live");
      if (stallTimer.current) window.clearTimeout(stallTimer.current);
      stallTimer.current = null;
    };
    const onWaiting = () => {
      setHealth("retrying");
      if (stallTimer.current) window.clearTimeout(stallTimer.current);
      stallTimer.current = window.setTimeout(() => {
        if (hls.current) hls.current.startLoad(-1);
        else retry(startPlayback);
      }, 8_000);
    };
    const onStalled = onWaiting;
    const onError = () => retry(startPlayback);

    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("error", onError);
    startPlayback();

    return () => {
      cancelled = true;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("error", onError);
      clear();
    };
  }, [item.id, item.streamUrl, item.mediaType, item.codec, item.sourceStreamUrl, retryNonce]);

  useEffect(() => {
    const engine = hls.current;
    if (!engine) return;
    engine.autoLevelCapping = low ? 0 : -1;
    engine.currentLevel = quality === "auto" ? -1 : Number(quality);
  }, [quality, low]);

  const pip = async () => {
    const video = ref.current;
    if (!video) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else if (document.pictureInPictureEnabled) await video.requestPictureInPicture();
  };

  const fullscreen = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen?.();
  };

  const remote = () => {
    const video = ref.current as (HTMLVideoElement & {
      webkitShowPlaybackTargetPicker?: () => void;
      remote?: { prompt: () => Promise<void> };
    }) | null;
    if (!video) return;
    if (video.webkitShowPlaybackTargetPicker) video.webkitShowPlaybackTargetPicker();
    else void video.remote?.prompt().catch(() => undefined);
  };

  const healthLabel = health === "live" ? "लाइभ" : health === "retrying" ? "फेरि जोडिँदै…" : health === "ready" ? "चलाउन तयार" : health === "error" ? "अहिले उपलब्ध छैन" : "जोडिँदै…";
  return (
    <div className="tv-stage" ref={stageRef}>
      <video ref={ref} controls playsInline preload="metadata" className={low ? "audio-only-video" : ""} aria-label={`${item.name} लाइभ प्रसारण`} />
      <div className="tv-overlay">
        <span><i className={"health-dot " + health} />{healthLabel}{probe === "unavailable" && health !== "live" ? " · उपलब्धता जाँचिँदै" : ""}</span>
        <small>{activeQuality}{item.quality ? " · " + item.quality : ""}</small>
        {levels.length > 1 && (
          <label className="tv-quality">गुणस्तर
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="auto">स्वचालित</option>
              {levels.map((level) => <option key={level.index} value={String(level.index)}>{level.label}</option>)}
            </select>
          </label>
        )}
        <button onClick={() => setLow((v) => !v)} aria-pressed={low}>{low ? "सामान्य डेटा" : "कम डेटा"}</button>
        <button onClick={() => setRetryNonce((n) => n + 1)}>फेरि जोड्नुहोस्</button>
        <button onClick={fullscreen}>पूरा पर्दा</button>
        <button onClick={pip}>सानो पर्दा</button>
        <button onClick={remote}>TV मा चलाउनुहोस्</button>
        {item.officialUrl && <a href={item.officialUrl} target="_blank" rel="noreferrer">आधिकारिक साइट</a>}
      </div>
    </div>
  );
}

function labelOfFacet(value: Array<{ name?: string; code?: string } | string> | undefined) {
  return (value || []).map((x) => typeof x === "string" ? { value: x, label: x } : {
    value: x.code || x.name || "",
    label: x.name || x.code || ""
  }).filter((x) => x.value);
}

function reportReasonLabel(value: string) {
  if (value === "buffering") return "बारम्बार रोकिन्छ";
  if (value === "wrong-channel") return "गलत च्यानल";
  if (value === "audio-only") return "अडियो/भिडियो समस्या";
  return "चल्दैन";
}

export function MediaSuite({ kind }: { kind: MediaKind }) {
  const media = useMedia();
  const fallback = useMemo(() => MEDIA_CATALOG.filter((x) => x.kind === kind), [kind]);
  const [favorites, setFavorites] = useState<Set<string>>(storedFavorites);
  const [drawer, setDrawer] = useState<MediaItem | null>(null);
  const [report, setReport] = useState<MediaItem | null>(null);
  const [selectedTv, setSelectedTv] = useState<MediaItem | null>(null);

  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fmItems, setFmItems] = useState<MediaItem[]>([]);
  const [fmMeta, setFmMeta] = useState({ total: 0, verified: 0, districts: 0 });
  const [fmProvince, setFmProvince] = useState("All");
  const [fmDistrict, setFmDistrict] = useState("All");
  const [fmPlayableOnly, setFmPlayableOnly] = useState(true);
  const [fmCountry, setFmCountry] = useState("NP");
  const [fmPage, setFmPage] = useState(1);
  const [fmPages, setFmPages] = useState(1);
  const [fmSearch, setFmSearch] = useState("");
  const [fmLoading, setFmLoading] = useState(false);
  const [fmCountries, setFmCountries] = useState<Array<{ code: string; name: string; count: number }>>([]);

  const [tvItems, setTvItems] = useState<MediaItem[]>([]);
  const [tvTotal, setTvTotal] = useState(0);
  const [tvPage, setTvPage] = useState(1);
  const [tvPages, setTvPages] = useState(1);
  const [tvCountry, setTvCountry] = useState("all");
  const [tvLanguage, setTvLanguage] = useState("all");
  const [tvCategory, setTvCategory] = useState("all");
  const [tvSearch, setTvSearch] = useState("");
  const [tvLoading, setTvLoading] = useState(false);
  const [tvFacets, setTvFacets] = useState<TvCatalogResponse["facets"]>({});
  const [tvHealth, setTvHealth] = useState<Record<string, "checking" | "live" | "dead" | "unknown">>({});
  const [tvHideDead, setTvHideDead] = useState(true);
  const [tvHealthTick, setTvHealthTick] = useState(0);

  useEffect(() => {
    if (kind !== "radio") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ country: fmCountry, page: String(fmPage), limit: "60" });
    if (fmSearch) params.set("q", fmSearch);
    setFmLoading(true);
    setLoadError(null);
    fetch("/api/v1/radio/catalog?" + params.toString(), { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("directory_unavailable");
        return r.json() as Promise<RadioCatalogResponse>;
      })
      .then((j) => {
        if (!j.ok) throw new Error("directory_unavailable");
        const mapped = j.items.map(radioToMedia);
        setFmItems(mapped);
        setFmPages(j.pages || 1);
        setFmCountries(j.facets?.countries || []);
        setFmMeta({ total: j.total || mapped.length, verified: mapped.filter((x) => x.playable !== false).length, districts: new Set(mapped.map((x) => x.district).filter(Boolean)).size });
        if (j.directory_warning) setLoadError("limited");
      })
      .catch(async () => {
        if (controller.signal.aborted) return;
        setLoadError("limited");
        try {
          const response = await fetch(compat("fm/v2/stations"), { signal: controller.signal, cache: "no-store" });
          if (!response.ok) throw new Error("directory_unavailable");
          const j = await response.json() as FmDirectoryResponse;
          const mapped = j.items.map(fmToMedia);
          setFmItems(mapped);
          setFmPages(1);
          setFmMeta({ total: j.catalog_total || mapped.length, verified: j.verified_total || mapped.filter((x) => x.playable).length, districts: j.covered_districts || new Set(mapped.map((x) => x.district)).size });
        } catch {
          setFmItems(fallback);
          setFmPages(1);
          setFmMeta({ total: fallback.length, verified: fallback.length, districts: new Set(fallback.map((x) => x.district)).size });
        }
      })
      .finally(() => { if (!controller.signal.aborted) setFmLoading(false); });
    return () => controller.abort();
  }, [kind, fallback, fmCountry, fmPage, fmSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const value = query.trim();
      setTvSearch(value);
      setFmSearch(value);
      setTvPage(1);
      setFmPage(1);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (kind !== "tv") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(tvPage), limit: "60" });
    if (tvSearch) params.set("q", tvSearch);
    if (tvCountry !== "all") params.set("country", tvCountry);
    if (tvLanguage !== "all") params.set("language", tvLanguage);
    if (tvCategory !== "all") params.set("category", tvCategory);
    setTvLoading(true);
    setLoadError(null);
    fetch(compat("tv/catalog?" + params.toString()), { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("directory_unavailable");
        return r.json() as Promise<TvCatalogResponse>;
      })
      .then((j) => {
        if (!j.ok) throw new Error("directory_unavailable");
        setTvItems(j.items.map(tvToMedia));
        setTvTotal(j.total);
        setTvPages(j.pages);
        if (j.facets) setTvFacets(j.facets);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadError("limited");
        setTvItems(fallback);
        setTvTotal(fallback.length);
        setTvPages(1);
      })
      .finally(() => { if (!controller.signal.aborted) setTvLoading(false); });
    return () => controller.abort();
  }, [kind, fallback, tvSearch, tvCountry, tvLanguage, tvCategory, tvPage]);

  useEffect(() => {
    if (kind !== "tv" || !tvItems.length) {
      if (kind === "tv") setTvHealth({});
      return;
    }
    const controller = new AbortController();
    let disposed = false;
    const ids = tvItems.map((item) => item.id);
    setTvHealth(Object.fromEntries(ids.map((id) => [id, "checking"])));
    const run = async () => {
      for (let offset = 0; offset < ids.length && !disposed; offset += 20) {
        const batch = ids.slice(offset, offset + 20);
        try {
          const response = await fetch(compat("tv/health?ids=" + encodeURIComponent(batch.join(","))), { signal: controller.signal, cache: "no-store", headers: { "x-patro-probe": "tv-health-batch" } });
          if (!response.ok) throw new Error("health_unavailable");
          const payload = await response.json();
          if (disposed) return;
          setTvHealth((current) => {
            const next = { ...current };
            for (const row of payload?.items || []) next[row.id] = row.live ? "live" : "dead";
            for (const id of batch) if (!payload?.items?.some((row: any) => row.id === id)) next[id] = "unknown";
            return next;
          });
        } catch {
          if (controller.signal.aborted) return;
          setTvHealth((current) => {
            const next = { ...current };
            for (const id of batch) next[id] = "unknown";
            return next;
          });
        }
      }
    };
    void run();
    return () => { disposed = true; controller.abort(); };
  }, [kind, tvItems, tvHealthTick]);

  const fmProvinces = useMemo(() => ["All", ...Array.from(new Set(fmItems.map((x) => x.province).filter(Boolean))).sort()], [fmItems]);
  const fmDistricts = useMemo(() => ["All", ...Array.from(new Set(fmItems.filter((x) => fmProvince === "All" || x.province === fmProvince).map((x) => x.district).filter(Boolean))).sort()], [fmItems, fmProvince]);

  const shownFm = useMemo(() => {
    const filtered = fuzzyMedia(fmItems, query).filter((x) => (fmProvince === "All" || x.province === fmProvince) && (fmDistrict === "All" || x.district === fmDistrict) && (!fmPlayableOnly || x.playable !== false));
    return filtered.sort((a, b) => Number(b.playable !== false) - Number(a.playable !== false) || a.name.localeCompare(b.name));
  }, [fmItems, query, fmProvince, fmDistrict, fmPlayableOnly]);

  const shownTv = useMemo(() => tvItems.filter((item) => !tvHideDead || tvHealth[item.id] !== "dead"), [tvItems, tvHealth, tvHideDead]);
  const tvLiveCount = Object.values(tvHealth).filter((value) => value === "live").length;
  const tvDeadCount = Object.values(tvHealth).filter((value) => value === "dead").length;
  const items = kind === "radio" ? shownFm : shownTv;
  const countries = tvFacets?.countries || [];
  const languages = labelOfFacet(tvFacets?.languages);
  const categories = labelOfFacet(tvFacets?.categories);

  const favorite = (id: string) => {
    setFavorites((old) => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("patro.media.favorites", JSON.stringify([...next]));
      return next;
    });
  };

  const playRadio = (item: MediaItem) => {
    if (item.playable === false) {
      if (item.officialUrl) window.open(item.officialUrl, "_blank", "noopener,noreferrer");
      return;
    }
    void media.play(item);
  };

  return (
    <main className="media-suite">
      <section className="media-hero">
        <div>
          <p className="eyebrow">{kind === "radio" ? "रेडियो" : "लाइभ टिभी"}</p>
          <h1>{kind === "radio" ? "आफ्नै पात्रो रेडियो" : "लाइभ टिभी"}</h1>
          <p>{kind === "radio" ? "नेपाल र विश्वका उपलब्ध FM स्टेशन खोज्नुहोस्, मनपर्नेमा राख्नुहोस् र पृष्ठ बदल्दा पनि सुन्न जारी राख्नुहोस्।" : "देश, भाषा र विषयअनुसार उपलब्ध लाइभ TV च्यानल खोज्नुहोस् र उपयुक्त गुणस्तरमा हेर्नुहोस्।"}</p>
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={kind === "radio" ? "स्टेशन, जिल्ला वा विषय खोज्नुहोस्…" : "च्यानल खोज्नुहोस्…"} aria-label={kind === "radio" ? "रेडियो खोज्नुहोस्" : "टिभी च्यानल खोज्नुहोस्"} />
      </section>

      <div className="media-stats" aria-live="polite">
        {kind === "radio"
          ? <><strong>{fmMeta.total.toLocaleString()}</strong><span>स्टेशन</span><strong>{fmMeta.verified}</strong><span>अहिले उपलब्ध</span><strong>{fmPage}</strong><span>{fmPages.toLocaleString()} मध्ये पृष्ठ</span></>
          : <><strong>{tvTotal.toLocaleString()}</strong><span>च्यानल</span><strong>{tvLiveCount}</strong><span>चलिरहेका</span><strong>{tvDeadCount}</strong><span>अहिले नचल्ने</span></>}
      </div>

      {loadError && <div className="media-warning" role="status">पूरा सूची अहिले उपलब्ध छैन; उपलब्ध स्टेशन र च्यानलहरू देखाइएका छन्।</div>}

      {kind === "radio" ? (
        <div className="media-directory-toolbar">
          <label>देश<select value={fmCountry} onChange={(e) => { setFmCountry(e.target.value); setFmPage(1); setFmProvince("All"); setFmDistrict("All"); }}><option value="NP">🇳🇵 नेपाल</option><option value="ALL">विश्वभर</option>{fmCountries.filter((x) => x.code !== "NP").map((x) => <option key={x.code} value={x.code}>{x.name} ({x.count.toLocaleString()})</option>)}</select></label>
          <label>प्रदेश / क्षेत्र<select value={fmProvince} onChange={(e) => { setFmProvince(e.target.value); setFmDistrict("All"); }}>{fmProvinces.map((x) => <option key={x}>{x === "All" ? "सबै" : x}</option>)}</select></label>
          <label>जिल्ला / स्थान<select value={fmDistrict} onChange={(e) => setFmDistrict(e.target.value)}>{fmDistricts.map((x) => <option key={x}>{x === "All" ? "सबै" : x}</option>)}</select></label>
          <label className="media-check"><input type="checkbox" checked={fmPlayableOnly} onChange={(e) => setFmPlayableOnly(e.target.checked)} /> उपलब्ध मात्र</label>
          <button type="button" onClick={() => { setFmCountry("NP"); setFmProvince("All"); setFmDistrict("All"); setQuery(""); setFmPage(1); }}>नेपालमा फर्कनुहोस्</button>
        </div>
      ) : (
        <div className="media-directory-toolbar">
          <label>देश<select value={tvCountry} onChange={(e) => { setTvCountry(e.target.value); setTvPage(1); }}><option value="all">सबै देश</option>{countries.map((x) => <option key={x.code} value={x.code}>{x.flag ? x.flag + " " : ""}{x.name}</option>)}</select></label>
          <label>भाषा<select value={tvLanguage} onChange={(e) => { setTvLanguage(e.target.value); setTvPage(1); }}><option value="all">सबै भाषा</option>{languages.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
          <label>विषय<select value={tvCategory} onChange={(e) => { setTvCategory(e.target.value); setTvPage(1); }}><option value="all">सबै विषय</option>{categories.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
          <label className="media-check"><input type="checkbox" checked={tvHideDead} onChange={(e) => setTvHideDead(e.target.checked)} /> नचल्ने च्यानल लुकाउनुहोस्</label>
          <button type="button" onClick={() => setTvHealthTick((n) => n + 1)}>उपलब्धता फेरि जाँच्नुहोस्</button>
          <button type="button" onClick={() => { setTvCountry("NP"); setTvLanguage("all"); setTvCategory("all"); setTvPage(1); }}>नेपालका TV</button>
          <button type="button" onClick={() => { setTvCountry("all"); setTvLanguage("all"); setTvCategory("all"); setQuery(""); setTvPage(1); }}>सबै देखाउनुहोस्</button>
        </div>
      )}

      {selectedTv && kind === "tv" && <TvPlayer item={selectedTv} />}

      <section className="station-grid" aria-live="polite" aria-busy={kind === "tv" && tvLoading}>
        {items.map((item) => {
          const liveState = kind === "tv" ? tvHealth[item.id] : undefined;
          const availability = liveState === "live" ? "लाइभ" : liveState === "dead" ? "अहिले उपलब्ध छैन" : liveState === "checking" ? "जाँचिँदैछ" : "";
          return <article className={"station-card " + (item.playable === false || liveState === "dead" ? "is-unavailable" : "")} key={item.id}>
            {item.logo ? <img className="station-logo" src={item.logo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <div className="station-badge" aria-hidden="true">{item.kind === "radio" ? "FM" : (item.countryCode || "TV")}</div>}
            <div className="station-copy">
              <strong>{item.nameNe}</strong>{item.nameNe !== item.name && <span>{item.name}</span>}<small>{item.district} · {item.genre}</small>
              {(item.quality || availability) && <small className="station-meta">{[item.quality, availability].filter(Boolean).join(" · ")}</small>}
            </div>
            <button className="favorite-button" onClick={() => favorite(item.id)} aria-label={`${item.name} ${favorites.has(item.id) ? "मनपर्नेबाट हटाउनुहोस्" : "मनपर्नेमा राख्नुहोस्"}`}><Star size={19} fill={favorites.has(item.id) ? "currentColor" : "none"} aria-hidden="true"/></button>
            <div className="station-actions">
              {kind === "radio" ? <button onClick={() => playRadio(item)} disabled={item.playable === false && !item.officialUrl}>{item.playable === false ? (item.officialUrl ? "आधिकारिक साइट" : "अहिले उपलब्ध छैन") : (media.item?.id === item.id && media.playing ? "बजिरहेको" : "सुन्नुहोस्")}</button> : <button onClick={() => setSelectedTv(item)} disabled={item.playable === false || liveState === "dead"}>{liveState === "dead" ? "अहिले उपलब्ध छैन" : "हेर्नुहोस्"}</button>}
              <button onClick={() => setDrawer(item)}>विवरण</button>
              <button onClick={() => setReport(item)} aria-label={`${item.name} को प्रसारण समस्या रिपोर्ट गर्नुहोस्`}>!</button>
            </div>
          </article>;
        })}
      </section>

      {kind === "radio" && fmPages > 1 && <nav className="media-pagination" aria-label="रेडियो पृष्ठ"><button disabled={fmPage <= 1 || fmLoading} onClick={() => setFmPage((p) => Math.max(1, p - 1))}>← अघिल्लो</button><span>पृष्ठ {fmPage.toLocaleString()} / {fmPages.toLocaleString()}</span><button disabled={fmPage >= fmPages || fmLoading} onClick={() => setFmPage((p) => Math.min(fmPages, p + 1))}>अर्को →</button></nav>}
      {kind === "tv" && tvPages > 1 && <nav className="media-pagination" aria-label="टिभी पृष्ठ"><button disabled={tvPage <= 1 || tvLoading} onClick={() => setTvPage((p) => Math.max(1, p - 1))}>← अघिल्लो</button><span>पृष्ठ {tvPage.toLocaleString()} / {tvPages.toLocaleString()}</span><button disabled={tvPage >= tvPages || tvLoading} onClick={() => setTvPage((p) => Math.min(tvPages, p + 1))}>अर्को →</button></nav>}

      {!items.length && !tvLoading && kind === "tv" && tvHideDead && tvItems.length > 0 && Object.values(tvHealth).some((value) => value === "checking") && <div className="media-empty">च्यानल उपलब्धता जाँचिँदैछ…</div>}
      {!items.length && !tvLoading && !(kind === "tv" && tvHideDead && tvItems.length > 0 && Object.values(tvHealth).some((value) => value === "checking")) && <div className="media-empty">यो खोजसँग मिल्ने उपलब्ध स्टेशन भेटिएन। फिल्टर हटाएर वा उपलब्धता फेरि जाँचेर हेर्नुहोस्।</div>}
      {kind === "tv" && tvLoading && <div className="media-empty">TV च्यानल लोड हुँदैछन्…</div>}
      {kind === "radio" && fmLoading && <div className="media-empty">रेडियो स्टेशन लोड हुँदैछन्…</div>}

      {drawer && <div className="media-modal-backdrop" onMouseDown={(e) => { if (e.currentTarget === e.target) setDrawer(null); }}>
        <section className="media-modal" role="dialog" aria-modal="true" aria-label={`${drawer.name} को विवरण`}>
          <header><div><p className="eyebrow">{drawer.kind === "tv" ? "च्यानल विवरण" : "स्टेशन विवरण"}</p><h2>{drawer.name}</h2></div><button onClick={() => setDrawer(null)} aria-label="विवरण बन्द गर्नुहोस्">×</button></header>
          <div className="epg-now"><span className="live-dot" />{drawer.playable === false ? "अहिले उपलब्ध छैन" : "लाइभ प्रसारण उपलब्ध"}</div>
          <p>{drawer.district} · {drawer.genre}{drawer.quality ? " · " + drawer.quality : ""}</p>
          <p>लाइभ प्रसारणको उपलब्धता प्रसारकअनुसार बदलिन सक्छ। प्रसारण रोकिएमा फेरि जोड्नुहोस् वा आधिकारिक साइट खोल्नुहोस्।</p>
          {drawer.scheduleUrl || drawer.officialUrl ? <a className="modal-primary" href={drawer.scheduleUrl || drawer.officialUrl} target="_blank" rel="noreferrer">आधिकारिक स्रोत खोल्नुहोस्</a> : <span>आधिकारिक लिंक उपलब्ध छैन।</span>}
        </section>
      </div>}

      {report && <div className="media-modal-backdrop">
        <form className="media-modal" onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const reason = String(form.get("reason") || "not-playing");
          const saved = { station: report.id, reason, at: new Date().toISOString() };
          localStorage.setItem("patro.media.lastReport", JSON.stringify(saved));
          const subject = encodeURIComponent(`प्रसारण समस्या: ${report.name}`);
          const body = encodeURIComponent(`स्टेशन/च्यानल: ${report.name}\nसमस्या: ${reportReasonLabel(reason)}\nमिति: ${new Date().toLocaleString()}\n\nआफ्नै पात्रोबाट पठाइएको प्रसारण प्रतिक्रिया।`);
          window.location.href = `mailto:meroaafnaipatro@gmail.com?subject=${subject}&body=${body}`;
          setReport(null);
        }}>
          <header><div><p className="eyebrow">प्रसारण समस्या</p><h2>{report.name}</h2></div><button type="button" onClick={() => setReport(null)} aria-label="रिपोर्ट बन्द गर्नुहोस्">×</button></header>
          <label>समस्या<select name="reason"><option value="not-playing">चल्दैन</option><option value="buffering">बारम्बार रोकिन्छ</option><option value="wrong-channel">गलत च्यानल</option><option value="audio-only">अडियो/भिडियो समस्या</option></select></label>
          <p>रिपोर्ट थिच्दा तपाईंको इमेल एपमा तयार सन्देश खुल्छ। पठाउनुअघि विवरण जाँच्न सक्नुहुन्छ।</p>
          <button className="modal-primary" type="submit">इमेल रिपोर्ट खोल्नुहोस्</button>
        </form>
      </div>}
    </main>
  );
}
