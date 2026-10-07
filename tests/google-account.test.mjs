import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
const tmp=await mkdtemp(join(tmpdir(),'patro-google-'));
for(const [name,path] of [['auth','worker/auth.ts'],['storage','src/patro-tools-integration/storage.ts']])await build({entryPoints:[path],outfile:join(tmp,name+'.mjs'),bundle:true,platform:'node',format:'esm'});
const auth=await import(pathToFileURL(join(tmp,'auth.mjs'))),storage=await import(pathToFileURL(join(tmp,'storage.mjs')));
test.after(()=>rm(tmp,{recursive:true,force:true}));
const origin='https://aafnaipatro.com',client='1057768734502-0on6v9gor3in7k09i0b1js1jp2iauk29.apps.googleusercontent.com';
const {publicKey,privateKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='test';
function d1(){const db=new DatabaseSync(':memory:');return {db,prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)||null},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}},async all(){return {results:db.prepare(sql).all(...args)}}}},async first(){return db.prepare(sql).get()||null}}}};}
function request(path,method='GET',body, cookie='',requestOrigin=origin){return new Request(origin+path,{method,headers:{origin:requestOrigin,cookie,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});}
async function token(nonce,props={}){return new SignJWT({nonce,email:'person@example.com',email_verified:true,name:'Person',...props}).setProtectedHeader({alg:'RS256',kid:'test'}).setAudience(client).setIssuer('https://accounts.google.com').setSubject(props.sub||'person-a').setIssuedAt().setExpirationTime('1h').sign(privateKey);}
async function setup(){const DB=d1();DB.db.exec(await readFile('cloudflare/d1/schema-migrations/0005_google_account_login.sql','utf8'));return {DB,GOOGLE_CLIENT_ID:client};}
async function login(env,sub='person-a'){
 const challenge=await auth.authResponse(request('/api/v1/auth/challenge','POST'),env),{nonce}=await challenge.json();
 const credential=await token(nonce,{sub});
 const result=await auth.authResponse(request('/api/v1/auth/google','POST',{credential},'mp_google_nonce='+nonce),env);
 assert.equal(result.status,200);
 const cookie=result.headers.getSetCookie().find(c=>c.startsWith('mp_session=')).split(';')[0];
 return {cookie,user:(await result.json()).user};
}
test('real signed Google JWT establishes a secure, hashed D1 session and private state',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[jwk]});
 try{
 const env=await setup(),{cookie,user}=await login(env);
 const me=await auth.authResponse(request('/api/v1/auth/me','GET',null,cookie),env);assert.equal((await me.json()).user.id,user.id);
 const row=env.DB.db.prepare('select token_hash from auth_sessions').get();assert.equal(row.token_hash.length,64);assert.ok(!cookie.includes(row.token_hash));
 const state=await auth.authResponse(request('/api/v1/me/state','GET',null,cookie),env);assert.equal(state.headers.get('cache-control'),'no-store');assert.equal((await state.json()).revision,0);
 const logout=await auth.authResponse(request('/api/v1/auth/logout','POST',null,cookie),env);assert.equal(logout.status,200);assert.equal(env.DB.db.prepare('select count(*) n from auth_sessions').get().n,0);
 }finally{globalThis.fetch=original;}
});
test('reject cross-origin writes, forged credentials, nonce mismatch and unverified email',async()=>{
 const env=await setup();
 assert.equal((await auth.authResponse(request('/api/v1/auth/google','POST',{credential:'forged'},'','https://evil.example'),env)).status,403);
 for(const credential of ['forged',await token('different'),await token('expected',{email_verified:false})]){
 assert.equal((await auth.authResponse(request('/api/v1/auth/google','POST',{credential},'mp_google_nonce=expected'),env)).status,401);
 }
 assert.equal((await auth.authResponse(request('/api/v1/me/state'),env)).status,401);
});
test('revision conflicts and account mismatch cannot overwrite another users private state',async()=>{
 const env=await setup(),a=await login(env),b=await login(env,'person-b');
 env.DB.db.prepare("update user_calendar_state set preferences=? where user_id=?").run(JSON.stringify({unrelated:'preserved'}),a.user.id);
 const body={account_id:a.user.id,revision:0,life:{notes:[{id:'n1',text:'Private'}]}};
 assert.equal((await auth.authResponse(request('/api/v1/me/state','PATCH',body,a.cookie),env)).status,200);
 assert.equal((await auth.authResponse(request('/api/v1/me/state','PATCH',body,a.cookie),env)).status,409);
 assert.equal((await auth.authResponse(request('/api/v1/me/state','PATCH',body,b.cookie),env)).status,409);
 const aState=await (await auth.authResponse(request('/api/v1/me/state','GET',null,a.cookie),env)).json();
 const bState=await (await auth.authResponse(request('/api/v1/me/state','GET',null,b.cookie),env)).json();
 assert.equal(aState.state.preferences.unrelated,'preserved');assert.equal(aState.state.preferences.life_tools.notes[0].text,'Private');assert.equal(bState.state.preferences.life_tools,undefined);
});
test('guest adoption is one-time, local accounts stay separate, and deleted notes do not return',async()=>{
 const values=new Map(),savedFetch=globalThis.fetch;
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 globalThis.window={dispatchEvent(){}};
 const note={id:'guest',text:'Guest note',inputMode:'english',createdAt:new Date().toISOString(),updatedAt:1};
 storage.updateLife(s=>({...s,notes:[note]}));storage.switchLifeAccount('a');assert.equal(storage.readLife().notes.length,1);
 storage.updateLife(s=>({...s,notes:[]}));
 globalThis.fetch=async(_url,options)=>options?.method==='PATCH'?Response.json({ok:true}):Response.json({user:{id:'a'},revision:0,state:{preferences:{life_tools:{notes:[note]}}}});
 assert.equal((await storage.syncLifeTools()).life.notes.length,0);
 storage.switchLifeAccount(null);assert.equal(storage.readLife().notes[0].text,'Guest note');
 storage.switchLifeAccount('b');assert.equal(storage.readLife().notes.length,0);
 storage.switchLifeAccount('a');assert.equal(storage.readLife().notes.length,0);
 globalThis.fetch=savedFetch;
});
