/** Strict standalone Docker Compose service subset -> docker run shell drafts. */
import { parseDocument } from 'yaml';
export type Result={text:string;warnings:string[];details:{Services:number;Commands:number}};
type Obj=Record<string,unknown>;const obj=(v:unknown):v is Obj=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const shq=(s:string)=>"'"+s.replace(/'/g,"'\\''")+"'";
const arr=(v:unknown)=>Array.isArray(v)?v:[];
export function convert(input:string):Result{
 if(input.length>200_000)throw Error('Compose YAML over 200 KB');const doc=parseDocument(input,{uniqueKeys:true,merge:false,strict:true});
 if(doc.errors.length)throw Error('YAML parse error: '+doc.errors[0].message);
 const root=doc.toJS({maxAliasCount:0});if(!obj(root)||!obj(root.services))throw Error('Expected a Compose services mapping');
 const all=Object.entries(root.services);if(!all.length||all.length>30)throw Error('Expected 1–30 services');
 if(root.secrets||root.configs)throw Error('Top-level secrets/configs need Compose orchestrator and cannot be reproduced safely');
 const warnings=['Generated commands do not set up Compose-created networks, dependencies or service DNS. Review topology before use.'];
 const scripts=['#!/bin/sh','# Docker run drafts. Review volumes/ports and secret handling before execution.','set -eu'];
 const permitted=new Set(['image','container_name','ports','volumes','environment','env_file','restart','working_dir','user','entrypoint','command','stdin_open','tty','read_only','hostname']);
 for(const [label,s] of all){if(!obj(s))throw Error('Service '+label+' must be a mapping');
  for(const key of Object.keys(s))if(!permitted.has(key))throw Error('Service '+label+': unsupported Compose key '+key+' (cannot preserve semantics)');
  if(typeof s.image!=='string'||!s.image||s.image.includes('$'))throw Error('Service '+label+' needs a literal image');
  const command=['docker','run','--detach'];
  const name=String(s.container_name||label);if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,80}$/.test(name))throw Error('Invalid container name for '+label);
  command.push('--name',shq(name));
  if(s.restart){if(typeof s.restart!=='string'||!/^(no|always|unless-stopped|on-failure(?::\d+)?)$/.test(s.restart))throw Error('Unsupported restart policy');command.push('--restart',shq(s.restart));}
  if(s.read_only===true)command.push('--read-only');if(s.stdin_open===true)command.push('--interactive');if(s.tty===true)command.push('--tty');
  for(const [key,flag] of [['working_dir','--workdir'],['user','--user'],['hostname','--hostname']] as const)if(s[key]!=null){const option=s[key];if(typeof option!=='string'&&!(typeof option==='number'&&Number.isInteger(option)))throw Error('Invalid '+key);command.push(flag,shq(String(option)));}
  if(s.environment){let env:Array<[string,string]>=[];
   if(obj(s.environment))env=Object.entries(s.environment).map(([k,v])=>[k,String(v??'')]);
   else if(Array.isArray(s.environment))env=s.environment.map(v=>{if(typeof v!=='string'||!v.includes('='))throw Error('Explicit KEY=value required (no host env lookup)');const ix=v.indexOf('=');return[v.slice(0,ix),v.slice(ix+1)];});
   else throw Error('Unsupported environment syntax');
   for(const [key,value] of env){if(!/^[A-Za-z_][\w]*$/.test(key))throw Error('Invalid env key');if(value.includes('${'))throw Error('Environment interpolation is not evaluated');command.push('--env',shq(key+'='+value));}
   if(env.length)warnings.push('Inline --env values appear in process arguments/history. Use --env-file or runtime secret management for secrets.');
  }
  if(s.env_file){for(const file of (typeof s.env_file==='string'?[s.env_file]:arr(s.env_file))){if(typeof file!=='string'||file.includes('${'))throw Error('Only simple env_file strings supported');command.push('--env-file',shq(file));}warnings.push('--env-file paths resolve relative to the shell working directory, not Compose file location.');}
  if(s.ports){if(!Array.isArray(s.ports))throw Error('ports must be list');for(const p of s.ports){const port=String(p);if(!/^(?:(?:127\.0\.0\.1|0\.0\.0\.0):)?\d{1,5}:\d{1,5}(?:\/(?:tcp|udp))?$/.test(port))throw Error('Unsupported port syntax: '+port);command.push('--publish',shq(port));}}
  if(s.volumes){if(!Array.isArray(s.volumes))throw Error('volumes must be list');for(const v of s.volumes){if(typeof v!=='string'||v.includes('${')||!/^([^:]+):(\/[^:]+)(?::(ro|rw))?$/.test(v))throw Error('Unsupported volume syntax: '+String(v));command.push('--volume',shq(v));}}
  if(s.entrypoint){if(!Array.isArray(s.entrypoint)||!s.entrypoint.every(v=>typeof v==='string'))throw Error('String entrypoint and non-string array unsupported');
   if(s.entrypoint.length!==1)throw Error('Array entrypoint with multiple elements cannot be safely expressed via --entrypoint');command.push('--entrypoint',shq(s.entrypoint[0]));}
  command.push(shq(s.image));if(s.command){if(!Array.isArray(s.command)||!s.command.every(v=>typeof v==='string'))throw Error('Only array-form command is supported');command.push(...s.command.map(v=>shq(v)));}
  scripts.push('# Service: '+label.replace(/[\r\n]/g,''),command.join(' '));
 }
 return{text:scripts.join('\n')+'\n',warnings:[...new Set(warnings)],details:{Services:all.length,Commands:all.length}};
}
