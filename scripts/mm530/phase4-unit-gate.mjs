#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),src=path.join(root,'reports','mm530-qa','all-tools.json'),out=path.join(root,'reports','mm530-phase4');
const data=JSON.parse(await fs.readFile(src,'utf8'));const tools=data.tools||[];
const expected=Array.from({length:530},(_,i)=>'TOOL-'+String(i+1).padStart(4,'0'));
const ids=tools.map(t=>t.id),identityOk=tools.length===530&&expected.every((id,i)=>ids[i]===id)&&new Set(ids).size===530;
const unacceptable=[];const blocked=[];for(const t of tools){for(const key of ['compile','unit']){const state=t.checks?.[key]?.state,note=t.checks?.[key]?.note||'';if(state==='BLOCKED')blocked.push({id:t.id,gate:key,state,note});else if(state!=='PASS')unacceptable.push({id:t.id,gate:key,state:state||'MISSING',note});}}
const summary={schema_version:'MM530_PHASE4_GATE_V1',source_commit:process.env.GITHUB_SHA||null,tools:tools.length,identity_ok:identityOk,compile:{PASS:tools.filter(t=>t.checks?.compile?.state==='PASS').length,BLOCKED:tools.filter(t=>t.checks?.compile?.state==='BLOCKED').length},unit:{PASS:tools.filter(t=>t.checks?.unit?.state==='PASS').length,BLOCKED:tools.filter(t=>t.checks?.unit?.state==='BLOCKED').length},unacceptable:unacceptable.length,blocked:blocked.length,physical_device_tests_executed:0,status:identityOk&&unacceptable.length===0?'PASS_WITH_DOCUMENTED_BLOCKERS':'FAIL'};
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2));await fs.writeFile(path.join(out,'all-tools.json'),JSON.stringify({summary,tools},null,2));await fs.writeFile(path.join(out,'failed-tools.json'),JSON.stringify({count:unacceptable.length,tools:unacceptable},null,2));await fs.writeFile(path.join(out,'blocked-tools.json'),JSON.stringify({count:blocked.length,tools:blocked},null,2));
console.log(JSON.stringify(summary));if(!identityOk||unacceptable.length)process.exitCode=1;
