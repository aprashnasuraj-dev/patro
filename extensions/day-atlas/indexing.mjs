import cities from './cities.json' with {type:'json'};
// A reviewed release window, intentionally fixed until Search Console review.
// Keep all 40,000 dates accessible. Only this subset is promoted for indexing.
export const POLICY={reviewedAt:'2026-10-10',from:'2025-10-10',to:'2029-10-10',birthFrom:'1940-01-01',birthTo:'2025-12-31',reviewAfter:'2027-01-08'};
const DAY=86400000;
const ts=d=>Date.parse(d+'T00:00:00Z');
const fmt=t=>new Date(t).toISOString().slice(0,10);
export const WINDOW_DAYS=(ts(POLICY.to)-ts(POLICY.from))/DAY+1;
export const BIRTH_DAYS=(ts(POLICY.birthTo)-ts(POLICY.birthFrom))/DAY+1;
export const OTHER_CITIES=cities.filter(c=>c.slug!=='kathmandu');
export const canonicalDateEnd=POLICY.to>POLICY.birthTo?POLICY.to:POLICY.birthTo;
export const CANONICAL_DAYS=(ts(canonicalDateEnd)-ts(POLICY.birthFrom))/DAY+1;
export const INDEX_TOTAL=OTHER_CITIES.length*WINDOW_DAYS+CANONICAL_DAYS;
export const inWindow=d=>d>=POLICY.from&&d<=POLICY.to;
export const indexDate=d=>inWindow(d)||(d>=POLICY.birthFrom&&d<=POLICY.birthTo);
export function indexedPath(i) {
  if(!Number.isInteger(i)||i<0||i>=INDEX_TOTAL)throw Error('Index out of range');
  const cityTotal=OTHER_CITIES.length*WINDOW_DAYS;
  if(i<cityTotal)return '/atlas/'+OTHER_CITIES[Math.floor(i/WINDOW_DAYS)].slug+'/'+fmt(ts(POLICY.from)+(i%WINDOW_DAYS)*DAY);
  return '/date/'+fmt(ts(POLICY.birthFrom)+(i-cityTotal)*DAY);
}
