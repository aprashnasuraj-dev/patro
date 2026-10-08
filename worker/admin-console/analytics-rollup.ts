import {all,type AdminEnv} from './db';
const DAY="date(ts/1000,'unixepoch','+345 minutes')";
export const ROLLUP_SCHEMA=[
 `create table if not exists aap_pageview_daily(day text not null,dimension text not null,key text not null,views real not null,visitors integer not null,primary key(day,dimension,key))`,
 `create table if not exists aap_pageview_rollup_days(day text primary key,completed_at integer not null)`,
 ...['path','visitor','country','device','browser','referrer'].map(c=>`create index if not exists aap_pageviews_${c}_ts_idx on aap_pageviews(${c},ts)`),
 `create index if not exists aap_pageview_daily_dimension_day_idx on aap_pageview_daily(dimension,day)`
];
const DIMENSIONS:Record<string,string>={total:"'all'",path:'path',referrer:"coalesce(referrer,'(direct)')",country:"coalesce(country,'??')",device:"coalesce(device,'Other')",browser:"coalesce(browser,'Other')"};
/** One D1 transaction per completed Nepal day: aggregates and coverage marker commit together. */
export async function rollupPageviews(env:AdminEnv){
 const days=await all<{day:string}>(env,`select distinct ${DAY} as day from aap_pageviews where ${DAY}<date('now','+345 minutes') and ${DAY} not in(select day from aap_pageview_rollup_days) order by day`);
 for(const {day} of days){const statements=Object.entries(DIMENSIONS).map(([dim,expr])=>env.DB.prepare(`insert into aap_pageview_daily(day,dimension,key,views,visitors) select ?1,?2,${expr},sum(weight),count(distinct visitor) from aap_pageviews where ts>=?3 and ts<?4 group by ${expr} on conflict(day,dimension,key) do update set views=excluded.views,visitors=excluded.visitors`).bind(day,dim,Date.parse(day+'T00:00:00Z')-345*60000,Date.parse(day+'T00:00:00Z')-345*60000+86400000));statements.push(env.DB.prepare('insert into aap_pageview_rollup_days(day,completed_at) values(?1,?2)').bind(day,Date.now()));await env.DB.batch(statements);}
}
/** Full covered days use rollups. Partial boundary days and unrolled days use raw rows.
 * Daily visitor salts prevent cross-day tracking: SUM of daily distinct counts preserves that definition.
 * Under sampling, visitors are observed visitors, not weighted estimates of unique people.
 */
export async function rolledStats(env:AdminEnv,dimension:string,since:number,until=Date.now()+1){
 const expr=DIMENSIONS[dimension];if(!expr)throw Error('unknown_dimension');
 const firstDay=new Date(since+345*60000).toISOString().slice(0,10),lastDay=new Date(until+345*60000).toISOString().slice(0,10);
 return all<any>(env,`with parts as (
 select day,key,views,visitors from aap_pageview_daily where dimension=?1 and day>?2 and day<?3
 union all
 select ${DAY} day,${expr} key,sum(weight) views,count(distinct visitor) visitors from aap_pageviews where ts>=?4 and ts<?5 and (${DAY}<=?2 or ${DAY}>=?3 or ${DAY} not in(select day from aap_pageview_rollup_days)) group by day,key
 ) select day,key,sum(views) views,sum(visitors) visitors from parts group by day,key order by day,key`,dimension,firstDay,lastDay,since,until);
}
