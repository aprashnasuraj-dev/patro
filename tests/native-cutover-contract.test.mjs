import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root=new URL("../",import.meta.url);
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const json=(path)=>JSON.parse(read(path));

function walk(dir){
  const base=new URL("../"+dir,import.meta.url);
  const out=[];
  const visit=(path)=>{
    for(const name of readdirSync(path)){
      const full=join(path,name),stat=statSync(full);
      if(stat.isDirectory())visit(full);
      else if(/\.(ts|tsx|js|mjs)$/.test(name))out.push(full);
    }
  };
  visit(base.pathname);
  return out;
}

test("browser source has no direct Supabase runtime dependency and selective transition fallback stays Worker-side",()=>{
  const banned=[
    /https:\/\/[^"'\s]*supabase\.co/i,
    /SUPABASE_[A-Z_]+/,
    /@supabase\/supabase-js/,
    /functions\/v1\/nepal-miti-protected/,
    /functions\/v1\/router/
  ];
  const failures=[];
  for(const file of walk("src")){
    const text=readFileSync(file,"utf8");
    for(const pattern of banned) if(pattern.test(text)) failures.push(file.replace(root.pathname,"")+": "+pattern);
  }
  assert.deepEqual(failures,[]);
  const connected=read("worker/connected-entry.ts");
  assert.ok(connected.includes("SUPABASE_COMPAT_ORIGIN"));
  assert.ok(connected.includes('new Set(["tv", "fm", "samachar"])'));
  assert.ok(connected.includes('response.status !== 404'));
  assert.ok(connected.includes('request.method !== "GET" && request.method !== "HEAD"'));
});

test("cutover inventory is main-branch truthful and preserves selective compatibility until parity",()=>{
  const state=json("cloudflare/remaining-cutover.json");
  assert.equal(state.branch,"main");
  assert.equal(state.status.cloudflare_native_runtime_complete,true);
  assert.equal(state.status.code_cutover_blockers,0);
  assert.equal(state.status.safe_to_delete_supabase,false);
  assert.equal(state.status.safe_to_delete_vercel,false);
  assert.equal(state.status.active_supabase_runtime_dependency,true);
  assert.deepEqual(state.status.selective_compatibility_roots,["tv","fm","samachar"]);
  assert.ok(state.remaining_native_port_groups.some((x)=>String(x).includes("tv")));
  assert.ok(state.remaining_native_port_groups.some((x)=>String(x).includes("samachar")));
  const ids=new Set((state.non_code_cutover_dependencies||[]).map((x)=>x.id));
  for(const id of ["remote_d1","native_secrets","selective_compatibility","legacy_private_row","preview_validation","observation_window"])assert.ok(ids.has(id),id);
});

test("Google identity and private D1 schemas are present",()=>{
  const auth=read("worker/auth.ts"),schema=read("cloudflare/d1/migrations/0800_private_identity_state.sql"),family=read("cloudflare/d1/migrations/0801_family_events_admin_audit.sql");
  for(const endpoint of ["/api/v1/auth/config","/api/v1/auth/google","/api/v1/auth/me","/api/v1/auth/logout","/api/v1/me/state","/api/v1/my-data"])assert.ok(auth.includes(endpoint),endpoint);
  assert.ok(auth.includes("provider_subject"));
  assert.ok(auth.includes("token_hash"));
  for(const table of ["app_users","auth_sessions","user_calendar_state","user_community_preferences","families","family_members","family_invites","personal_ics_tokens","push_subscriptions","notification_jobs"])assert.ok(schema.includes(" "+table+" "),table);
  assert.ok(family.includes("family_events"));
  assert.ok(family.includes("admin_audit_log"));
});

test("family, ICS, push and admin APIs are Cloudflare-native and session-owned",()=>{
  const priv=read("worker/private.ts"),push=read("worker/push.ts"),admin=read("worker/admin.ts"),index=read("worker/index.ts");
  for(const endpoint of ["/api/family/state","/api/family/create","/api/family/invite","/api/family/join","/api/family/event","/api/ics/token","/api/v1/tools/tithi-feed.ics"])assert.ok(priv.includes(endpoint),endpoint);
  for(const endpoint of ["/api/push/vapid","/api/push/subscribe","/api/push/jobs"])assert.ok(push.includes(endpoint),endpoint);
  for(const endpoint of ["/api/v1/admin/community-overrides","/api/v1/admin/ns-festival-dates","/api/admin/holidays"])assert.ok(admin.includes(endpoint),endpoint);
  for(const module of ["authResponse","privateResponse","pushResponse","adminResponse","publicApiResponse","communityResponse","cronResponse"])assert.ok(index.includes(module),module);
  assert.ok(priv.includes("currentSession"));
  assert.ok(push.includes("currentSession"));
  assert.ok(admin.includes("currentSession"));
});

test("remaining public API compatibility surface is native",()=>{
  const api=read("worker/public-api.ts");
  for(const endpoint of [
    "/api/v1/today","/api/v1/convert","/api/v1/festivals","/api/v1/holidays","/api/v1/market/latest",
    "/api/v1/openapi.json","/api/v1/panchang","/api/v1/tithi/derive","/api/v1/tithi/next",
    "/api/v1/rashifal/metadata","/api/v1/rashifal/personalized","/api/v1/rashifal/service-token-hash",
    "/api/v1/typing/lexicon","/api/v1/tools/official-sait","/api/v1/doctor","/api/v1/noc/fuel-prices","/api/v1/media/proxy"
  ])assert.ok(api.includes(endpoint),endpoint);
  assert.ok(api.includes("astronomy_calendar_map"));
  assert.ok(api.includes("holiday_overrides"));
  assert.ok(api.includes("official_panchang_facts"));
});

test("personal pages use /me canonicals and legacy aliases",()=>{
  const router=read("src/PatroRouter.tsx"),pages=read("src/components/NativeProtectedPages.tsx"),diary=read("src/components/MyDiary.tsx");
  for(const path of ["/me","/me/diary","/me/notes","/me/planner","/me/family","/me/reminders","/me/cards","/me/settings","/me/data","/offline","/developers"])assert.ok(router.includes('"'+path+'"'),path);
  for(const alias of ["/aaja","/my-diary","/notes","/planner","/family","/family/join","/tithi","/settings/notifications","/card","/settings","/settings/holidays","/my-data","/diaspora"])assert.ok(router.includes('"'+alias+'"'),alias);
  for(const component of ["FamilyPage","MyDataPage","NotificationSettingsPage","HolidaySettingsPage","DevelopersPage","OfflinePage"])assert.ok(pages.includes("function "+component),component);
  assert.ok(!diary.includes("iframe"));
  assert.ok(!diary.includes("compat/page"));
});

test("personal frontend sync uses same-origin account APIs, not bearer tokens",()=>{
  const storage=read("src/patro-tools-integration/storage.ts"),preferences=read("src/community/preferences.ts"),admin=read("src/community/CommunityAdmin.tsx");
  assert.ok(storage.includes("/api/v1/me/state"));
  assert.ok(preferences.includes("/api/v1/community-preferences"));
  assert.ok(admin.includes("/api/v1/admin/community-overrides"));
  assert.ok(!/Authorization\s*:\s*["']Bearer/i.test(storage+preferences+admin));
  assert.ok((storage+preferences+admin).includes('credentials: "same-origin"'));
});

test("scheduled jobs and Wrangler crons cover push, maintenance and Rashifal without automatic market polling",()=>{
  const jobs=read("worker/jobs.ts"),entry=read("worker/entry.ts"),wrangler=read("wrangler.jsonc"),state=json("cloudflare/remaining-cutover.json");
  for(const endpoint of ["/api/cron/push","/api/cron/revalidate","/api/v1/cron/rashifal"])assert.ok(jobs.includes(endpoint),endpoint);
  for(const cron of ["*/5 * * * *","43 2 * * *","11 3 * * *"])assert.ok(wrangler.includes(cron),cron);
  assert.ok(!wrangler.includes("17 0,6,12,18 * * *"),"NEPSE/market polling cron must stay removed");
  assert.equal(Object.hasOwn(state.native_cron.schedules,"market"),false,"cutover state must not claim market is scheduled");
  assert.match(entry,/runScheduled\(\s*controller\.cron\s*,\s*env\s*\)/);
});

test("secret manifest keeps Supabase credentials retired and scopes native feature secrets explicitly",()=>{
  const manifest=json("cloudflare/secrets-manifest.json");
  assert.equal(manifest.schema_version,3);
  assert.equal(manifest.scopes.core.groups.length,0);
  assert.deepEqual(manifest.scopes.public.groups,["media_relay"]);
  for(const group of ["media_relay","jyotish_ai","google_login_sync","web_push","admin_allowlist"])assert.ok(manifest.scopes.full.groups.includes(group),group);

  const groups=manifest.feature_groups;
  assert.equal(groups.media_relay.mode,"one_of");
  for(const name of ["TV_RELAY_SECRET","RADIO_RELAY_SECRET"])assert.ok(groups.media_relay.names.includes(name),name);
  assert.equal(groups.google_login_sync.mode,"all_of");
  assert.deepEqual(groups.google_login_sync.names,["GOOGLE_CLIENT_ID"]);
  for(const name of ["VAPID_PUBLIC_KEY","VAPID_PRIVATE_KEY","VAPID_SUBJECT"])assert.ok(groups.web_push.names.includes(name),name);
  for(const name of ["ADMIN_GOOGLE_SUBJECTS","ADMIN_EMAILS"])assert.ok(groups.admin_allowlist.names.includes(name),name);

  for(const removed of ["SUPABASE_ANON_KEY","SUPABASE_DB_URL","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_URL"])assert.ok(manifest.removed_transition_secrets.includes(removed),removed);
  const activeSecretNames=Object.values(groups).flatMap((group)=>group.names||[]);
  assert.equal(activeSecretNames.some((name)=>/^SUPABASE_/i.test(name)),false,"selective compatibility must not require Supabase credentials");
  assert.ok(manifest.optional.CRON_SECRET);
  assert.ok(manifest.optional.RASHIFAL_SERVICE_TOKEN);

  const wrangler=read("wrangler.jsonc"),connected=read("worker/connected-entry.ts");
  assert.ok(wrangler.includes('"SUPABASE_COMPAT_ORIGIN"'));
  assert.ok(connected.includes("SUPABASE_COMPAT_ORIGIN"));
  assert.ok(connected.includes('new Set(["tv", "fm", "samachar"])'));
});

test("six community calendars plus Chakra remain release-gated",()=>{
  const state=json("cloudflare/remaining-cutover.json"),ids=state.community_frontend_parity.calendars.map((x)=>x.id);
  assert.deepEqual(ids,["nepal-sambat","lhosar","tharu","mithila","kirat","hijri"]);
  assert.equal(state.community_frontend_parity.aggregate_route,"/samudaya/chakra");
  assert.deepEqual(state.community_frontend_parity.pending_private_routes,[]);
});
