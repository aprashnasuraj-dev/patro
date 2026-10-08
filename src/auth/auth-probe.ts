/** Hint only: the HttpOnly session is still the sole authorization credential. */
export const AUTH_PROBE_KEY='aap_auth_probe_v1';
export function shouldProbeAccount(cookies:string,probed:string|null,now=Date.now(),force=false){
 if(force||/(?:^|;\s*)(?:aap_signed_in=1|mp_session=[^;]+)/.test(cookies))return true;
 return now<Date.parse('2026-11-07T00:00:00Z')&&!probed;
}
export function clearAccountMarker(){document.cookie='aap_signed_in=; Path=/; SameSite=Lax; Max-Age=0'+(location.protocol==='https:'?'; Secure':'');}
