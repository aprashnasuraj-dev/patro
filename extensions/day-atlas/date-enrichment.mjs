import {adToBs,formatBsDate} from '../../packages/core/src/bsDate.ts';
import cities from './cities.json' with {type:'json'};
import {panchang} from './panchang.mjs';
import {dateIndex,facts,clock,duration,esc} from './astronomy.mjs';
import {POLICY,indexDate} from './indexing.mjs';
export const VERSION='3.0.0';
const ktm=cities.find(c=>c.slug==='kathmandu');
const localStamp=(d,c)=>d?new Intl.DateTimeFormat('en-GB',{timeZone:c.tz,dateStyle:'medium',timeStyle:'short'}).format(new Date(Math.round(d.getTime()/60000)*60000)):'Unavailable';
const difference=m=>m===0?'Same clock time as Nepal':`${duration(Math.abs(m))} ${m>0?'ahead of':'behind'} Nepal`;
export function timingSection(c,d,f=facts(c,d),p=panchang(c,d,f)){
  const t=p.tithi;
  return `<section id="local-panchang" data-atlas-version="${VERSION}"><h2>${esc(c.name)} local sunrise panchang</h2><table><tbody><tr><th>Tithi at local sunrise · तिथि</th><td>${t?`${t.ne} · ${t.name} (${t.index}/30)`:'Unavailable: no local sunrise'}</td></tr><tr><th>Paksha · पक्ष</th><td>${t?`${t.pakshaNe} · ${t.paksha}`:'Unavailable'}</td></tr><tr><th>Tithi ends, local time</th><td>${localStamp(t?.end,c)}</td></tr><tr><th>Sunrise · सूर्योदय</th><td>${clock(f.rise,c)}</td></tr><tr><th>Sunset · सूर्यास्त</th><td>${clock(f.set,c)}</td></tr><tr><th>Rahu Kaal · राहु काल</th><td>${p.rahu?`${clock(p.rahu.start,c)}–${clock(p.rahu.end,c)}`:'Unavailable: no sunrise-to-sunset interval'}</td></tr><tr><th>Time difference at sunrise</th><td>${difference(p.nepalDifferenceMinutes)}</td></tr><tr><th>Nepal time at this sunrise</th><td>${p.nepalAtSunrise||'Unavailable'}</td></tr><tr><th>Moonrise / moonset</th><td>${clock(f.moonrise,c)} / ${clock(f.moonset,c)}</td></tr><tr><th>Moon illumination, local-day midpoint</th><td>${(100*f.illumination).toFixed(1)}%</td></tr></tbody></table><p>Times use ${esc(c.tz)} at city-centre coordinates ${c.lat}, ${c.lon}. <a href="/atlas/methodology">Methods and cross-checks</a>.</p></section>`;
}

/** Identical enrichment for build-time pages and dynamic archive fallback. */
export function dateEnrichment(date) {
  if(dateIndex(date)<0)return {html:'',index:false};
  const birth=date>=POLICY.birthFrom&&date<=POLICY.birthTo;
  return {index:indexDate(date),html:timingSection(ktm,date)+(birth?`<section id="birth-date-reference"><h2>Birth-date reference</h2><p>${date} corresponds to ${formatBsDate(adToBs(date))} BS. The tithi above is evaluated at Kathmandu sunrise. A birth tithi can change later that day; enter your birth time and location in <a href="/janmapatro">Janmapatro</a>.</p></section>`:'')};
}
export const DATE_DISCOVERY='<aside data-patro-discovery-v2 style="margin:24px auto 16px;max-width:1080px;padding:18px 20px;border:1px solid #dbe5df;border-radius:16px;background:#f7fbf8;color:#18352a;font:500 15px/1.6 system-ui,-apple-system,sans-serif"><p style="margin:0 0 8px;font-size:17px;font-weight:750">Explore AafnaiPatro · नेपालका उपयोगी डिजिटल सेवाहरू</p><p style="margin:0 0 12px;color:#46584d">Calendar, Nepal maps, date conversion, astrology, time and astronomy tools in one place.</p><nav aria-label="Explore AafnaiPatro features" style="display:flex;flex-wrap:wrap;gap:10px 18px"><a href="/">Nepali calendar today</a><a href="/nepalmap">Nepal map</a><a href="/nepal">Nepal guide</a><a href="/atlas">Worldwide calendar</a><a href="/rashifal">Rashifal</a><a href="/tools">All tools</a><a href="/tools/bstoad">BS to AD converter</a><a href="/tools/adtobs">AD to BS converter</a><a href="/on-this-day">On this day</a><a href="/moon">Moon</a><a href="/eclipse">Eclipses</a><a href="/nepal/trek-weather">Trek weather</a><a href="https://wa.me/?text=Explore%20AafnaiPatro%3A%20https%3A%2F%2Faafnaipatro.com%2F" rel="noopener noreferrer" target="_blank">Share with friends ↗</a></nav></aside>';
