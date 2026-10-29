import {build} from 'esbuild';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Run once during deployment, before accepting traffic. Runtime retains a versioned
// bootstrap for new databases and interrupted deployments, rather than replaying DDL.
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_D1_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN;
const config=JSON.parse(await readFile('wrangler.generated.jsonc','utf8'));
const database=config.d1_databases?.find(x=>x.binding==='DB')?.database_id;
if(!account||!token||!database)throw Error('Runtime schema initialization requires the existing D1 deployment credentials and DB binding');
const scratch=resolve('.cloudflare/quota-build');await mkdir(scratch,{recursive:true});
const outfile=resolve(scratch,'schema-bootstrap.mjs');
await build({stdin:{contents:'export {ensureSchema} from "./worker/admin-console/db.ts";export {ensureAuthSchema} from "./worker/auth.ts";',resolveDir:process.cwd()},outfile,bundle:true,format:'esm',platform:'node',logLevel:'silent'});
const {ensureSchema,ensureAuthSchema}=await import(pathToFileURL(outfile));
async function query(body){
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const result=await response.json();
  if(!response.ok||result.success!==true||result.result?.some(x=>x.success===false))throw Error('D1 runtime schema initialization failed: HTTP '+response.status);
  return result.result;
}
function statement(sql,params=[]){return {sql,params,bind(...values){return statement(sql,values);},async run(){return (await query({sql,params}))[0];},async all(){return (await query({sql,params}))[0];},async first(){return (await query({sql,params}))[0]?.results?.[0]??null;}};}
const DB={prepare:statement,async batch(statements){return query({batch:statements.map(({sql,params})=>({sql,params}))});}};
await ensureSchema({DB});await ensureAuthSchema({DB});
console.log('Admin and account schema versions initialized before deployment.');
