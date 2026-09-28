import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";
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

function TvPlayer({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const hls = useRef<Hls | null>(null);
  const retryTimer = useRef<number | null>(null);
  const attempts = useRef(0);
  const [health, setHealth] = useState("loading");
  const [probe, setProbe] = useState<string | null>(null);
  const [low, setLow] = useState(false);

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
        if (row) setProbe(row.live ? "Pre-check live" : "Pre-check: " + (row.reason || "unavailable"));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [item.id]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let cancelled = false;
    attempts.current = 0;

    const clear = () => {
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
      hls.current?.destroy();
      hls.current = null;
      video.removeAttribute("src");
      video.load();
    };

    const retry = (start: () => void) => {
      attempts.current += 1;
      if (attempts.current > 6) {
        setHealth("error");
        return;
      }
      setHealth("retrying");
      const delay = Math.min(30_000, 900 * 2 ** Math.min(attempts.current, 5));
      retryTimer.current = window.setTimeout(start, delay);
    };

    const start = () => {
      if (cancelled) return;
      hls.current?.destroy();
      hls.current = null;
      setHealth(attempts.current ? "retrying" : "loading");

      const isHls = item.mediaType === "hls" || item.codec.toLowerCase().includes("hls") ||
        /\.m3u8(?:$|\?)/i.test(item.sourceStreamUrl || "");

      if (isHls && Hls.isSupported()) {
        const engine = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          capLevelToPlayerSize: true,
          maxBufferLength: low ? 8 : 30,
          maxMaxBufferLength: low ? 12 : 60,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 8,
          fragLoadingTimeOut: 20_000,
          manifestLoadingTimeOut: 15_000
        });
        hls.current = engine;
        engine.loadSource(item.streamUrl);
        engine.attachMedia(video);
        engine.on(Hls.Events.MANIFEST_PARSED, () => {
          attempts.current = 0;
          if (low) engine.autoLevelCapping = 0;
          setHealth("live");
          void video.play().catch(() => setHealth("ready"));
        });
        engine.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && attempts.current < 2) {
            attempts.current += 1;
            setHealth("retrying");
            engine.startLoad();
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && attempts.current < 3) {
            attempts.current += 1;
            setHealth("retrying");
            engine.recoverMediaError();
            return;
          }
          engine.destroy();
          retry(start);
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

    const onPlaying = () => setHealth("live");
    const onWaiting = () => setHealth("retrying");
    const onError = () => retry(start);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("error", onError);
    start();

    return () => {
      cancelled = true;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("error", onError);
      clear();
    };
  }, [item.id, item.streamUrl, item.mediaType, item.codec, item.sourceStreamUrl, low]);

  const pip = async () => {
    const video = ref.current;
    if (!video) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else if (document.pictureInPictureEnabled) await video.requestPictureInPicture();
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

  return (
    <div className="tv-stage">
      <video ref={ref} controls playsInline className={low ? "audio-only-video" : ""} aria-label={item.name + " live stream"} />
      <div className="tv-overlay">
        <span><i className={"health-dot " + health} />{health}{probe ? " · " + probe : ""}</span>
        {item.quality && <small>{item.quality}</small>}
        <button onClick={() => setLow((v) => !v)} aria-pressed={low}>{low ? "Video on" : "Low-data mode"}</button>
        <button onClick={pip}>PiP</button>
        <button onClick={remote}>Cast / AirPlay</button>
        {item.officialUrl && <a href={item.officialUrl} target="_blank" rel="noreferrer">Official</a>}
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
  const [fmPlayableOnly, setFmPlayableOnly] = useState(false);

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

  useEffect(() => {
    if (kind !== "radio") return;
    const controller = new AbortController();
    setLoadError(null);
    fetch(compat("fm/v2/stations"), { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("FM directory returned " + r.status);
        return r.json() as Promise<FmDirectoryResponse>;
      })
      .then((j) => {
        if (!j.ok) throw new Error("FM directory unavailable");
        setFmItems(j.items.map(fmToMedia));
        setFmMeta({
          total: j.catalog_total || j.items.length,
          verified: j.verified_total || j.items.filter((x) => x.playable).length,
          districts: j.covered_districts || new Set(j.items.map((x) => x.district).filter(Boolean)).size
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(String(error?.message || error));
        setFmItems(fallback);
        setFmMeta({ total: fallback.length, verified: fallback.length, districts: new Set(fallback.map((x) => x.district)).size });
      });
    return () => controller.abort();
  }, [kind, fallback]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTvSearch(query.trim());
      setTvPage(1);
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
        if (!r.ok) throw new Error("TV directory returned " + r.status);
        return r.json() as Promise<TvCatalogResponse>;
      })
      .then((j) => {
        if (!j.ok) throw new Error("TV directory unavailable");
        setTvItems(j.items.map(tvToMedia));
        setTvTotal(j.total);
        setTvPages(j.pages);
        if (j.facets) setTvFacets(j.facets);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(String(error?.message || error));
        setTvItems(fallback);
        setTvTotal(fallback.length);
        setTvPages(1);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTvLoading(false);
      });

    return () => controller.abort();
  }, [kind, fallback, tvSearch, tvCountry, tvLanguage, tvCategory, tvPage]);

  const fmProvinces = useMemo(
    () => ["All", ...Array.from(new Set(fmItems.map((x) => x.province).filter(Boolean))).sort()],
    [fmItems]
  );
  const fmDistricts = useMemo(
    () => ["All", ...Array.from(new Set(
      fmItems.filter((x) => fmProvince === "All" || x.province === fmProvince).map((x) => x.district).filter(Boolean)
    )).sort()],
    [fmItems, fmProvince]
  );

  const shownFm = useMemo(() => {
    const filtered = fuzzyMedia(fmItems, query).filter((x) =>
      (fmProvince === "All" || x.province === fmProvince) &&
      (fmDistrict === "All" || x.district === fmDistrict) &&
      (!fmPlayableOnly || x.playable !== false)
    );
    return filtered.sort((a, b) => Number(b.playable !== false) - Number(a.playable !== false) || a.name.localeCompare(b.name));
  }, [fmItems, query, fmProvince, fmDistrict, fmPlayableOnly]);

  const items = kind === "radio" ? shownFm : tvItems;
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
          <p className="eyebrow">{kind === "radio" ? "Nepal FM directory" : "Global free live TV directory"}</p>
          <h1>{kind === "radio" ? "FM Radio · रेडियो" : "Global Live TV · प्रत्यक्ष टिभी"}</h1>
          <p>
            {kind === "radio"
              ? "Full Patro FM directory with verified playback, province/district filters, persistent audio and recovery."
              : "Global TV catalog with relay-assisted HLS/HTTP playback, search, country/language/category filters, retry recovery, PiP and low-data mode."}
          </p>
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={kind === "radio" ? "Search station, district or category…" : "Search 9,000+ channels…"} aria-label="Search media" />
      </section>

      <div className="media-stats" aria-live="polite">
        {kind === "radio"
          ? <><strong>{fmMeta.total}</strong><span>stations</span><strong>{fmMeta.verified}</strong><span>verified live</span><strong>{fmMeta.districts}</strong><span>districts covered</span></>
          : <><strong>{tvTotal.toLocaleString()}</strong><span>matching channels</span><strong>{tvPage}</strong><span>page of {tvPages.toLocaleString()}</span><strong>60</strong><span>channels/page</span></>}
      </div>

      {loadError && <div className="media-warning" role="status">Live directory fallback active: {loadError}</div>}

      {kind === "radio" ? (
        <div className="media-directory-toolbar">
          <label>Province
            <select value={fmProvince} onChange={(e) => { setFmProvince(e.target.value); setFmDistrict("All"); }}>
              {fmProvinces.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>District
            <select value={fmDistrict} onChange={(e) => setFmDistrict(e.target.value)}>
              {fmDistricts.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="media-check"><input type="checkbox" checked={fmPlayableOnly} onChange={(e) => setFmPlayableOnly(e.target.checked)} /> Verified live only</label>
        </div>
      ) : (
        <div className="media-directory-toolbar">
          <label>Country
            <select value={tvCountry} onChange={(e) => { setTvCountry(e.target.value); setTvPage(1); }}>
              <option value="all">All countries</option>
              {countries.map((x) => <option key={x.code} value={x.code}>{x.flag ? x.flag + " " : ""}{x.name}</option>)}
            </select>
          </label>
          <label>Language
            <select value={tvLanguage} onChange={(e) => { setTvLanguage(e.target.value); setTvPage(1); }}>
              <option value="all">All languages</option>
              {languages.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>
          <label>Category
            <select value={tvCategory} onChange={(e) => { setTvCategory(e.target.value); setTvPage(1); }}>
              <option value="all">All categories</option>
              {categories.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => { setTvCountry("NP"); setTvLanguage("all"); setTvCategory("all"); setTvPage(1); }}>Nepal TV</button>
          <button type="button" onClick={() => { setTvCountry("all"); setTvLanguage("all"); setTvCategory("all"); setQuery(""); setTvPage(1); }}>Global reset</button>
        </div>
      )}

      {selectedTv && kind === "tv" && <TvPlayer item={selectedTv} />}

      <section className="station-grid" aria-live="polite" aria-busy={kind === "tv" && tvLoading}>
        {items.map((item) => (
          <article className={"station-card " + (item.playable === false ? "is-unavailable" : "")} key={item.id}>
            {item.logo
              ? <img className="station-logo" src={item.logo} alt="" loading="lazy" referrerPolicy="no-referrer" />
              : <div className="station-badge" aria-hidden="true">{item.kind === "radio" ? "FM" : (item.countryCode || "TV")}</div>}
            <div className="station-copy">
              <strong>{item.nameNe}</strong>
              {item.nameNe !== item.name && <span>{item.name}</span>}
              <small>{item.district} · {item.genre}</small>
              <small className="station-meta">
                {item.quality ? item.quality + " · " : ""}{item.codec}{item.status ? " · " + item.status : ""}
                {item.verified ? " · official" : ""}
              </small>
            </div>
            <button className="favorite-button" onClick={() => favorite(item.id)} aria-label={(favorites.has(item.id) ? "Remove " : "Add ") + item.name + " favorite"}>{favorites.has(item.id) ? "★" : "☆"}</button>
            <div className="station-actions">
              {kind === "radio"
                ? <button onClick={() => playRadio(item)} disabled={item.playable === false && !item.officialUrl}>{item.playable === false ? (item.officialUrl ? "Official site" : "Offline") : (media.item?.id === item.id && media.playing ? "Playing" : "Play")}</button>
                : <button onClick={() => setSelectedTv(item)} disabled={item.playable === false}>Watch</button>}
              <button onClick={() => setDrawer(item)}>{kind === "radio" ? "Info" : "EPG"}</button>
              <button onClick={() => setReport(item)} aria-label={"Report broken stream for " + item.name}>!</button>
            </div>
          </article>
        ))}
      </section>

      {kind === "tv" && tvPages > 1 && (
        <nav className="media-pagination" aria-label="TV directory pages">
          <button disabled={tvPage <= 1 || tvLoading} onClick={() => setTvPage((p) => Math.max(1, p - 1))}>← Previous</button>
          <span>Page {tvPage.toLocaleString()} / {tvPages.toLocaleString()}</span>
          <button disabled={tvPage >= tvPages || tvLoading} onClick={() => setTvPage((p) => Math.min(tvPages, p + 1))}>Next →</button>
        </nav>
      )}

      {!items.length && !tvLoading && <div className="media-empty">No station matches this search. Clear the filters to see the full directory.</div>}
      {kind === "tv" && tvLoading && <div className="media-empty">Loading global channel directory…</div>}

      {drawer && (
        <div className="media-modal-backdrop" onMouseDown={(e) => { if (e.currentTarget === e.target) setDrawer(null); }}>
          <section className="media-modal" role="dialog" aria-modal="true" aria-label={drawer.name + " details"}>
            <header>
              <div><p className="eyebrow">{drawer.kind === "tv" ? "Channel information" : "Station information"}</p><h2>{drawer.name}</h2></div>
              <button onClick={() => setDrawer(null)} aria-label="Close details">×</button>
            </header>
            <div className="epg-now"><span className="live-dot" />{drawer.playable === false ? "NOT VERIFIED LIVE" : "LIVE SOURCE AVAILABLE"}</div>
            <p>{drawer.district} · {drawer.genre} · {drawer.codec}{drawer.quality ? " · " + drawer.quality : ""}</p>
            <p>Playback availability can change at the broadcaster or source. The app retries network/media failures and uses the Patro relay for TV streams that need HTTP, redirect, manifest or referrer handling.</p>
            {drawer.scheduleUrl || drawer.officialUrl
              ? <a className="modal-primary" href={drawer.scheduleUrl || drawer.officialUrl} target="_blank" rel="noreferrer">Open official source</a>
              : <span>No official schedule link is listed.</span>}
          </section>
        </div>
      )}

      {report && (
        <div className="media-modal-backdrop">
          <form className="media-modal" onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const payload = {
              station: report.id,
              url: report.sourceStreamUrl || report.streamUrl,
              reason: String(form.get("reason") || "not-playing"),
              at: new Date().toISOString(),
              userAgent: navigator.userAgent
            };
            localStorage.setItem("patro.media.lastReport", JSON.stringify(payload));
            navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => undefined);
            setReport(null);
          }}>
            <header><div><p className="eyebrow">Broken link report</p><h2>{report.name}</h2></div><button type="button" onClick={() => setReport(null)}>×</button></header>
            <label>Issue
              <select name="reason">
                <option value="not-playing">Does not play</option>
                <option value="buffering">Buffers repeatedly</option>
                <option value="wrong-channel">Wrong channel</option>
                <option value="audio-only">Audio/video issue</option>
              </select>
            </label>
            <p>The diagnostic is saved locally and copied to your clipboard so it can be sent to support without silently transmitting device data.</p>
            <button className="modal-primary" type="submit">Create diagnostic report</button>
          </form>
        </div>
      )}
    </main>
  );
}
