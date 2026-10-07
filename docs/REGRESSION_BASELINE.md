# Regression baseline

Baseline scope: first-ten-fix candidate. Production base d56e169; GitHub PR #101. No A–H implementation is included.

## Verification

Initial `release:verify`: build, core, typing, language and community checks passed; one source contract failed because it required SpeechRecognition directly in MyDiary. The contract now checks the shared recognition hook and the same behaviours. Subsequent full-product checks and Cloudflare contracts (107 checks) pass. Full final validation is recorded separately.

## Route and Worker inventory

```text
/
/.well-known/
/.well-known/assetlinks.json
/404
/__patro/rashifal-broadcast
/aaja
/aap
/aap/runtime.js
/about
/admin
/admin-console
/admin-console/
/admin-console/app.css
/admin-console/app.js
/admin/
/admin/community-suites
/api
/api/
/api/aap/
/api/aap/admins
/api/aap/ai/chat
/api/aap/ai/key
/api/aap/ai/models
/api/aap/ai/proposal
/api/aap/ai/proposals
/api/aap/ai/settings
/api/aap/ai/test
/api/aap/ai/thread
/api/aap/ai/threads
/api/aap/analytics
/api/aap/analytics/cloudflare
/api/aap/analytics/live
/api/aap/audit
/api/aap/auth/login
/api/aap/auth/logout
/api/aap/auth/me
/api/aap/auth/password
/api/aap/auth/sessions
/api/aap/auth/totp/disable
/api/aap/auth/totp/enable
/api/aap/auth/totp/setup
/api/aap/config
/api/aap/config/discard
/api/aap/config/import
/api/aap/config/publish
/api/aap/config/restore
/api/aap/config/versions
/api/aap/dashboard
/api/aap/health
/api/aap/hit
/api/aap/preview
/api/aap/settings
/api/aap/site-config
/api/aap/users
/api/aap/users/revoke
/api/aap/users/summary
/api/admin/holidays
/api/agent/v1/convert
/api/agent/v1/festival
/api/agent/v1/sait
/api/agent/v1/today
/api/cron/push
/api/cron/revalidate
/api/family/create
/api/family/event
/api/family/invite
/api/family/join
/api/family/state
/api/fm/
/api/fm/play/
/api/fm/stations
/api/fm/v2/play/
/api/fm/v2/stations
/api/ics/token
/api/jyotish-chat
/api/my-data
/api/nepali/speech-capabilities
/api/nepali/stt
/api/push/jobs
/api/push/subscribe
/api/push/vapid
/api/rashifal-engine
/api/rashifal/metadata
/api/rashifal/personalized
/api/rashifal/universal
/api/rashifal_engine
/api/rashifal_engine.py
/api/v1/
/api/v1/admin/community-overrides
/api/v1/admin/ns-festival-dates
/api/v1/astronomy/tithi
/api/v1/auth/
/api/v1/auth/challenge
/api/v1/auth/config
/api/v1/auth/google
/api/v1/auth/logout
/api/v1/auth/me
/api/v1/calendar/{year}/{month}
/api/v1/communities
/api/v1/communities/feed.ics
/api/v1/communities/lho
/api/v1/community-preferences
/api/v1/compat-api/
/api/v1/convert
/api/v1/cron/rashifal
/api/v1/doctor
/api/v1/festivals
/api/v1/health
/api/v1/hijri
/api/v1/hijri/ramadan
/api/v1/holidays
/api/v1/jyotish-chat
/api/v1/market/latest
/api/v1/markets/latest
/api/v1/me/state
/api/v1/media/proxy
/api/v1/my-data
/api/v1/nasa/apod
/api/v1/nasa/cosmic
/api/v1/nepal-sambat
/api/v1/nepal-sambat/convert
/api/v1/nepal-sambat/festivals
/api/v1/nepal-sambat/ics
/api/v1/news
/api/v1/noc/fuel-prices
/api/v1/on-this-day
/api/v1/openapi.json
/api/v1/panchang
/api/v1/radio/catalog
/api/v1/radio/stream
/api/v1/rashifal/metadata
/api/v1/rashifal/personalized
/api/v1/rashifal/service-token-hash
/api/v1/rashifal/universal
/api/v1/sync
/api/v1/time-machine
/api/v1/tithi/derive
/api/v1/tithi/next
/api/v1/today
/api/v1/tools/catalog
/api/v1/tools/official-sait
/api/v1/tools/tithi-feed-token
/api/v1/tools/tithi-feed.ics
/api/v1/typing/lexicon
/api/v1/weather/daily
/assets
/assets/
/astro
/astro/
/astro/assets/
/astro/data/
/astro/index.html
/astro/sw.js
/astrology
/calendar/
/calendar/${bsYear}
/calendar/${bsYear}/${String(bsMonth).padStart(2,
/calendar/${year}
/calendar/${year}/${String(m).padStart(2,
/calendar/${year}/${String(month).padStart(2,
/card
/chat/completions
/compat-api/
/compat-api/samachar/feed
/contact
/convert
/corrections
/countdown/
/data-trust
/data/calendar
/data/community-event-index.json
/data/festival-index.json
/data/history-events-index.json
/data/on-this-day
/data/time-machine-index.json
/date/
/date/${esc(ad)}
/date/${esc(event.main)}
/date/${esc(moment.ad_date)}
/date/${esc(row.ad)}
/date/${next}
/date/${prev}
/developers
/diaspora
/embed/
/embed/converter
/embed/nepal-miti-converter.js
/embed/nepal-miti-today.js
/embed/today
/explore
/family
/family/
/family/join
/favicon.ico
/feedback
/festival/
/festivals
/festivals/
/festivals/${esc(festival.slug)}
/festivals/${esc(festival.slug)}/${item.year}
/festivals/${esc(festival.slug)}/${year}
/festivals/${esc(item.slug)}/${bsYear}
/festivals/${esc(slug)}/${year}
/fm
/fm-stream/
/fm-v2-stream/
/index.html
/janmapatro
/janmapatro/milan.html
/json/stations/search?
/jyotish/
/jyotish/china
/jyotish/china/rashi
/jyotish/janma-patro
/jyotish/matchmaking
/jyotish/rashifal
/manifest.webmanifest
/maxresdefault.jpg
/mcp
/me
/me/
/me/cards
/me/data
/me/diary
/me/family
/me/notes
/me/planner
/me/reminders
/me/settings
/messages
/methodology
/models
/my-data
/my-diary
/nepal-sambat
/nepal-sambat/
/nepal-sambat/mandala
/nepal-sambat/mandala/
/nepal-sambat/mandala/index.html
/nepali-typing
/nepali-typing/
/nepali-typing/index.html
/notes
/offline
/og-default.png
/on-this-day
/on-this-day/${esc(event.month_day)}
/panchang/
/path
/planner
/privacy
/rashifal
/robots.txt
/sait/
/samachar
/samudaya
/samudaya/
/samudaya/${esc(event.suite)}
/samudaya/${esc(suite)}
/samudaya/chakra
/samudaya/chakra/index.html
/samudaya/hijri
/samudaya/hijri/index.html
/samudaya/index.html
/samudaya/kirat
/samudaya/kirat/index.html
/samudaya/lhosar
/samudaya/lhosar/index.html
/samudaya/mithila
/samudaya/mithila/index.html
/samudaya/tharu
/samudaya/tharu/index.html
/search
/settings
/settings/
/settings/community
/settings/holidays
/settings/notifications
/sources
/sw.js
/terms
/time-machine
/time-machine/${esc(moment.next_slug)}
/time-machine/${esc(moment.previous_slug)}
/tithi
/today
/tools
/tools/
/tools/adtobs
/tools/api
/tools/astro
/tools/baby-names
/tools/bstoad
/tools/card
/tools/clock
/tools/convert
/tools/diaspora
/tools/family
/tools/fuel
/tools/fuelprice
/tools/future-letter
/tools/incometax
/tools/janmadin-akhbar
/tools/land
/tools/landconverter
/tools/my-data
/tools/name-check
/tools/nepali-typing
/tools/nepaliqr
/tools/ocr
/tools/patro-bot
/tools/preeti
/tools/preeti-converter
/tools/preeti-to-unicode
/tools/preetitounicode
/tools/qr
/tools/read-aloud
/tools/sait
/tools/samudaya
/tools/spell-check
/tools/sw.js
/tools/tax
/tools/tithi
/tools/type
/tools/typingtools
/tools/unicode-to-preeti
/tools/unicodetopreeti
/tools/voice-typing
/tv
/widget/
/widget/today
/x/
/x/index.html
```

## Tools and communities

Canonical directory plus compatibility identities (the invariant of 29 primary tools remains authoritative in existing tests):

`adtobs`, `age`, `api`, `baby-names`, `bstoad`, `calc`, `card`, `clock`, `convert`, `diaspora`, `emi`, `family`, `forex`, `fuel`, `fuelprice`, `future-letter`, `gold`, `incometax`, `janmadin-akhbar`, `land`, `landconverter`, `my-data`, `name-check`, `nepali-typing`, `nepaliqr`, `ocr`, `patro-bot`, `preeti-converter`, `qr`, `read-aloud`, `sait`, `samudaya`, `spell-check`, `tax`, `tithi`, `tithi-reminder`, `units`, `vat`, `voice-typing`, `words`.
 Community suites: Nepal Sambat, Lhosar, Tharu, Mithila, Kirat, Hijri, Chakra.

## Storage, cookies and title writers

```text
src/pwa.ts:41:     if (localStorage.getItem(CACHE_EPOCH_KEY) === SW_REVISION) return;
src/pwa.ts:45:     localStorage.setItem(CACHE_EPOCH_KEY, SW_REVISION);
src/useUiLanguage.ts:6:   try { return localStorage.getItem("patro.ui.language") === "en" ? "en" : "ne"; } catch { return "ne"; }
src/localMorning.ts:9:   try{const value=JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}");return{enabled:value?.enabled===true,name:String(value?.name||"").trim().slice(0,80)}}catch{return{enabled:false,name:""}}
src/localMorning.ts:11: function writeConfig(config:MorningConfig){localStorage.setItem(CONFIG_KEY,JSON.stringify(config));return config}
src/SeoAuthorityPages.tsx:5:     document.title=title;
src/HomePageCurrent.tsx:136:     document.title = calendarYear && calendarMonth ? calendarTitle(calendarYear, calendarMonth) : pageTitle();
src/AafnaiPages.tsx:72:  useEffect(()=>{document.title=calendarYear&&calendarMonth?calendarTitle(calendarYear,calendarMonth):pageTitle()},[calendarYear,calendarMonth]);
src/title.ts:12:   document.title = pageTitle(page);
src/seo.ts:24: export function applyRouteSeo(path=location.pathname){const clean=path.replace(/\/+$/,"")||"/";const row=ROUTES[clean]||{title:"आफ्नै पात्रो",description:"नेपाली पात्रो, तिथि, चाडपर्व, राशिफल र दैनिक उपयोगी सुविधा।"};const title=row.title==="आफ्नै पात्रो"?"आफ्नै पात्रो":`${row.title} · आफ्नै पात्रो`;document.title=title;metaName("description",row.description);const preview=location.hostname!==PRODUCTION_HOST&&(location.hostname.endsWith(".workers.dev")||location.hostname.endsWith(".pages.dev"));metaName("robots",(row.private||preview)?"noindex, nofollow":"index, follow");metaProperty("og:title",title);metaProperty("og:description",row.description);metaProperty("og:url",BASE+clean);metaProperty("og:image",BASE+"/og-default.png");metaName("twitter:card","summary_large_image");metaName("twitter:title",title);metaName("twitter:description",row.description);metaName("twitter:image",BASE+"/og-default.svg");let canonical=document.querySelector('link[rel="canonical"]') as HTMLLinkElement|null;if(!canonical){canonical=document.createElement("link");canonical.rel="canonical";document.head.appendChild(canonical);}canonical.href=BASE+clean;}
src/jyotish/JanmaPatroSuite.tsx:155:     try{localStorage.setItem("aafnai.jyotish.china.context.v1",JSON.stringify(context));window.dispatchEvent(new CustomEvent("patro:china-updated",{detail:context}));}catch{}
src/components/CalendarGrid.tsx:135:   const [note,setNote]=useState(()=>localStorage.getItem("patro.note."+day.query_date) || "");
src/components/CalendarGrid.tsx:148:   const saveNote=(value:string)=>{setNote(value); try{localStorage.setItem("patro.note."+day.query_date,value);}catch{}};
src/components/JyotishAssistant.tsx:20:     const stored = localStorage.getItem(HISTORY_KEY) || localStorage.getItem(LEGACY_HISTORY_KEY) || "[]";
src/components/JyotishAssistant.tsx:34:     const value = localStorage.getItem(LANGUAGE_KEY) || localStorage.getItem(LEGACY_LANGUAGE_KEY);
src/components/JyotishAssistant.tsx:43:     const value = JSON.parse(localStorage.getItem(CHINA_KEY) || "null");
src/components/JyotishAssistant.tsx:153:       try { localStorage.setItem(CHINA_KEY, JSON.stringify(context)); } catch { /* optional */ }
src/components/JyotishAssistant.tsx:159:     try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_STORED))); } catch { /* local-only convenience */ }
src/components/JyotishAssistant.tsx:162:     try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* local-only convenience */ }
src/components/JyotishAssistant.tsx:204:       localStorage.removeItem(HISTORY_KEY);
src/components/JyotishAssistant.tsx:205:       localStorage.removeItem(LEGACY_HISTORY_KEY);
src/components/AppChrome.tsx:101: function applySeo(path:string){const meta=routeSeo(path);const fullTitle=`${meta.title} | आफ्नै पात्रो`;const canonicalUrl=SITE+meta.canonical;document.title=fullTitle;setMeta('meta[name="description"]',"name","description",meta.description);setMeta('meta[property="og:title"]',"property","og:title",fullTitle);setMeta('meta[property="og:description"]',"property","og:description",meta.description);setMeta('meta[property="og:url"]',"property","og:url",canonicalUrl);setMeta('meta[name="twitter:title"]',"name","twitter:title",fullTitle);setMeta('meta[name="twitter:description"]',"name","twitter:description",meta.description);setMeta('meta[name="robots"]',"name","robots",meta.index?"index,follow,max-image-preview:large":"noindex,nofollow");let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!canonical){canonical=document.createElement("link");canonical.rel="canonical";document.head.appendChild(canonical)}canonical.href=canonicalUrl;}
src/components/AppChrome.tsx:107:  const[language,setLanguage]=useState<UiLanguage>(()=>{try{return localStorage.getItem("patro.ui.language")==="en"?"en":"ne"}catch{return"ne"}});
src/components/AppChrome.tsx:108:  const[theme,setTheme]=useState<ThemeMode>(()=>{try{return localStorage.getItem("patro.ui.mode")==="dark"?"dark":"light"}catch{return"light"}});
src/components/AppChrome.tsx:109:  useEffect(()=>{document.documentElement.lang=language;try{localStorage.setItem("patro.ui.language",language)}catch{}},[language]);
src/components/AppChrome.tsx:110:  useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.mode=theme;try{localStorage.setItem("patro.ui.mode",theme)}catch{}},[theme]);
src/components/HomeWeather.tsx:22:   const [cityId, setCityId] = useState(() => { try { return localStorage.getItem("patro.weather.city.v1") || "kathmandu"; } catch { return "kathmandu"; } });
src/components/HomeWeather.tsx:29:     try { localStorage.setItem("patro.weather.city.v1", city.id); } catch {}
src/community/preferences.ts:17:     const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
src/community/preferences.ts:26:   localStorage.setItem(KEY, JSON.stringify(next));
src/rashifal/RashifalExperience.tsx:57: function readCache(key:string):Publication|null{try{return JSON.parse(localStorage.getItem(key)||"null")?.data||null}catch{return null}}
src/rashifal/RashifalExperience.tsx:58: function writeCache(key:string,data:Publication){try{localStorage.setItem(key,JSON.stringify({saved_at:new Date().toISOString(),data}))}catch{}}
src/rashifal/RashifalExperience.tsx:97:   const [selectedSign,setSelectedSign]=useState(()=>{try{return localStorage.getItem(PREF_KEY)||""}catch{return ""}});
src/rashifal/RashifalExperience.tsx:98:   const [remember,setRemember]=useState(()=>{try{return Boolean(localStorage.getItem(PREF_KEY))}catch{return false}});
src/rashifal/RashifalExperience.tsx:117:   const chooseSign=(id:string)=>{setSelectedSign(id);if(remember)try{localStorage.setItem(PREF_KEY,id)}catch{}};
src/rashifal/RashifalExperience.tsx:118:   const toggleRemember=(value:boolean)=>{setRemember(value);try{if(value&&selectedSign)localStorage.setItem(PREF_KEY,selectedSign);else if(!value)localStorage.removeItem(PREF_KEY)}catch{}};
src/utilities/UtilitySuite.tsx:233:       const raw = localStorage.getItem("patro.noc.fuel");
src/utilities/UtilitySuite.tsx:373:       try { localStorage.setItem("patro.noc.fuel", JSON.stringify(next)); } catch { /* best-effort offline cache */ }
src/patro-tools-integration/storage.ts:6: export function lifeAccount() { return localStorage.getItem(OWNER_KEY) || ""; }
src/patro-tools-integration/storage.ts:11:     const guest = localStorage.getItem(LIFE_KEY);
src/patro-tools-integration/storage.ts:12:     if (!localStorage.getItem(LIFE_KEY + ".account:" + id) && guest && !localStorage.getItem("patro.guest.claimed")) {
src/patro-tools-integration/storage.ts:13:       localStorage.setItem(LIFE_KEY + ".account:" + id, guest);
src/patro-tools-integration/storage.ts:14:       localStorage.setItem("patro.guest.claimed", id);
src/patro-tools-integration/storage.ts:16:     localStorage.setItem(OWNER_KEY,id);
src/patro-tools-integration/storage.ts:17:   } else localStorage.removeItem(OWNER_KEY);
src/patro-tools-integration/storage.ts:88:     const parsed = JSON.parse(localStorage.getItem(storageKey()) || "{}") as Record<string, unknown>;
src/patro-tools-integration/storage.ts:109:   localStorage.setItem(storageKey(), JSON.stringify(value));
src/media/MediaSuite.tsx:111:     return new Set<string>(JSON.parse(localStorage.getItem("patro.media.favorites") || "[]") as string[]);
src/media/MediaSuite.tsx:623:       localStorage.setItem("patro.media.favorites", JSON.stringify([...next]));
src/media/MediaSuite.tsx:721:           localStorage.setItem("patro.media.lastReport", JSON.stringify(saved));
src/time-machine/TimeMachineExperience.tsx:23: function readCache(): Row[] { try { const data = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); return Array.isArray(data?.items) ? data.items : []; } catch { return []; } }
src/time-machine/TimeMachineExperience.tsx:24: function writeCache(items: Row[]) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ saved_at: new Date().toISOString(), items: items.slice(0, 300) })); } catch {} }
src/components/seo/SeoMeta.tsx:92:     document.title = meta.title;
src/patro-tools/nepal-sambat/react/useNsScript.tsx:10:     try { const v = localStorage.getItem(KEY) as Script | null; if (v) setScript(v); } catch { /* private mode */ }
src/patro-tools/nepal-sambat/react/useNsScript.tsx:12:   const set = useCallback((s: Script) => { setScript(s); try { localStorage.setItem(KEY, s); } catch { /* ignore */ } }, []);
public/aap/runtime.js:4:  * in-app navigation, and sends an anonymous page-view beacon (no cookies). */
public/aap/runtime.js:96:     var t = document.title;
public/aap/runtime.js:100:     if (next !== t) document.title = next;
public/aap/runtime.js:116:   function storageGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
public/aap/runtime.js:117:   function storageSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
```

## Admin runtime preservation

Text renames (exact/contains and attributes), announcement banner, disabled-section links and redirects, theme/custom CSS/head, draft preview, maintenance, analytics beacon and config publishing remain required. Authoritative implementation: `worker/admin-console/site-config.ts`, `public/aap/runtime.js`.

## Service worker

Private routes and unknown APIs are excluded; bounded public calendar caching, navigation shell fallback, language warming, network update/revision checks, morning notifications and push handlers are retained. Exact baseline source is tracked in `public/sw.js` and `src/pwa.ts`.

## Visual/performance evidence

Captured 78 screenshots in `tests/visual-baseline/`: 13 requested routes × three viewports × two languages. Capture metadata records six astronomy failures caused by a missing `calendars` object in the bounded local audit fixture. Live browser navigation timed out; these are local production-artifact screenshots, not authenticated/media backend validation.

`cold-home.json` records cache-disabled TTFB, FCP, LCP, DOMContentLoaded, CLS and per-chunk JS bytes; initial JS totals 1,225,427 bytes. The local static server does not simulate Worker admin config injection or edge latency. `lighthouse-home.json` records the actual Lighthouse homepage audit. The first unmodified audit could not launch Chromium as root; rerun adds sandbox flags for this container only. The broader tools/FM audit is still in progress. No production performance or visual-parity claim is inferred from these local artifacts.
