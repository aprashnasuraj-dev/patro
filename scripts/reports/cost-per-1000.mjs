import { readFileSync } from "node:fs";
const path=process.argv[2];
if(!path){console.error("usage: node scripts/reports/cost-per-1000.mjs <usage.json>");process.exit(2);}
const x=JSON.parse(readFileSync(path,"utf8"));
const sessions=Number(x.sessions);
if(!(sessions>0))throw new Error("sessions must be > 0; cost-per-1000 is not meaningful without measured sessions");

const requests=Number(x.worker_requests||0),cpu=Number(x.worker_cpu_ms||0),logs=Number(x.worker_log_events||0);
const routing=Number(x.routing_provider_cost_usd||0),dem=Number(x.dem_provider_cost_usd||0),other=Number(x.other_incremental_cost_usd||0);
const actualCloudflare=x.cloudflare_incremental_charge_usd==null?null:Number(x.cloudflare_incremental_charge_usd);

const pricing={
  basis_date:"2026-10-29",
  worker_request_overage_per_million_usd:0.30,
  worker_cpu_ms_overage_per_million_usd:0.02,
  worker_logs_overage_per_million_usd:0.60,
  note:"Marginal overage scenario only. Account included usage/base plan allocation is not inferred. Workers Logs pricing is the published pre-Dec-1-2026 schedule."
};
const marginalCf=requests/1e6*pricing.worker_request_overage_per_million_usd+
  cpu/1e6*pricing.worker_cpu_ms_overage_per_million_usd+
  logs/1e6*pricing.worker_logs_overage_per_million_usd;
const provider=routing+dem+other;
const actualTotal=actualCloudflare==null?null:actualCloudflare+provider;
const marginalTotal=marginalCf+provider;
const per1000=(v)=>v==null?null:v/sessions*1000;
const out={
  status:actualCloudflare==null?"MARGINAL_SCENARIO_ONLY":"MEASURED_CHARGE_INPUT",
  sessions,
  usage:{worker_requests:requests,worker_cpu_ms:cpu,worker_log_events:logs},
  actual_incremental:{cloudflare_usd:actualCloudflare,routing_usd:routing,dem_usd:dem,other_usd:other,total_usd:actualTotal,cost_per_1000_sessions_usd:per1000(actualTotal)},
  marginal_overage_scenario:{cloudflare_usd:marginalCf,provider_and_other_usd:provider,total_usd:marginalTotal,cost_per_1000_sessions_usd:per1000(marginalTotal)},
  pricing,
  warning:"Do not treat marginal-overage cost as the invoice. Included usage and shared account base charges require billing data."
};
console.log(JSON.stringify(out,null,2));
