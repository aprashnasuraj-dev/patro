import {parseDocument,stringify} from 'yaml';
export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 if(input.length>120000)throw Error('CI file exceeds 120 KB');const doc=parseDocument(input,{uniqueKeys:true,maxAliasCount:0,merge:false});if(doc.errors.length)throw Error('Invalid YAML: '+doc.errors[0].message);const root=doc.toJS({maxAliasCount:0});if(!root||typeof root!=='object'||Array.isArray(root))throw Error('Expected GitLab CI mapping');
 const obj=root as Record<string,any>;for(const k of Object.keys(obj)){if(['include','workflow','variables','default','before_script','after_script','image','services','cache'].includes(k))throw Error(`Global GitLab directive ${k} requires manual mapping`);}
 if(obj.stages&&(!Array.isArray(obj.stages)||obj.stages.some((s:any)=>typeof s!=='string')))throw Error('Invalid stages array');
 const special=new Set(['stages']);const entries=Object.entries(obj).filter(([k])=>!special.has(k));if(!entries.length||entries.length>20)throw Error('Require 1–20 simple script jobs');
 const jobs:Record<string,any>={};for(const [name,jobRaw] of entries){if(!/^[A-Za-z_][\w-]*$/.test(name)||name.startsWith('.'))throw Error(`Unsupported hidden/special job ${name}`);
 if(!jobRaw||typeof jobRaw!=='object'||Array.isArray(jobRaw))throw Error('Unsupported job shape');const job=jobRaw as Record<string,any>;
 for(const k of Object.keys(job))if(!['stage','image','script'].includes(k))throw Error(`Job ${name}.${k} requires manual migration`);
 if(job.stage&&obj.stages&&!obj.stages.includes(job.stage))throw Error('Undeclared stage in '+name);
 if(!Array.isArray(job.script)&&typeof job.script!=='string')throw Error('Required script commands missing');const commands=typeof job.script==='string'?[job.script]:job.script;if(!commands.length||commands.length>80||commands.some((s:any)=>typeof s!=='string'||s.length>20000))throw Error('Invalid script commands');
 const compiled:Record<string,any>={'runs-on':'ubuntu-latest',permissions:{contents:'read'},steps:[{name:'Execute migrated GitLab script',run:commands.join('\n')}]};
 if(job.image){if(typeof job.image!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_./:@-]{0,200}$/.test(job.image))throw Error('Only literal image names supported');compiled.container=job.image;}
 jobs[name]=compiled;}
 const name=String(opts.workflowName||'Migrated pipeline');if(name.length>90||/[\r\n]/.test(name))throw Error('Invalid workflow name');
 const output={name,on:['push','workflow_dispatch'],permissions:{contents:'read'},jobs};
 return{text:'# Draft migration: update push triggers, permissions, runner image and project secrets before use.\n'+stringify(output),details:{jobs:entries.length},warnings:['GitLab stages imply ordering across jobs; this draft does NOT preserve inter-stage dependencies. Add needs explicitly.','All migrated jobs default to GitHub-hosted ubuntu-latest runners. Review containers and permissions before use.']};}
