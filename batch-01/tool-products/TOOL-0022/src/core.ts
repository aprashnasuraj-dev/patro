import {parseDocument,stringify} from 'yaml';
export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
export function convert(input:string,opts:Record<string,string|boolean>={}):Result {
 if(input.length>120000)throw Error('Workflow exceeds 120 KB');const doc=parseDocument(input,{uniqueKeys:true,maxAliasCount:0,merge:false});if(doc.errors.length)throw Error('Invalid YAML: '+doc.errors[0].message);const v=doc.toJS({maxAliasCount:0});
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected workflow mapping');const workflow=v as Record<string,any>;
 const allowedTop=new Set(['name','on','jobs']);for(const k of Object.keys(workflow))if(!allowedTop.has(k))throw Error(`Top-level ${k} requires manual migration`);
 const trigger=workflow.on;if(trigger&&(!(typeof trigger==='string'||Array.isArray(trigger))||!(Array.isArray(trigger)?trigger:[trigger]).every(x=>x==='push'||x==='workflow_dispatch')))throw Error('Only push/workflow_dispatch triggers supported');
 const jobs=workflow.jobs;if(!jobs||typeof jobs!=='object'||Array.isArray(jobs))throw Error('Missing jobs');const entries=Object.entries(jobs);if(!entries.length||entries.length>20)throw Error('Require 1–20 jobs');
 const stageName=String(opts.stageName||'test');if(!/^[A-Za-z_][A-Za-z0-9_-]{0,40}$/.test(stageName))throw Error('Invalid stage name');
 const out:Record<string,any>={stages:[stageName]};const notes:string[]=['Runner labels and credentials cannot be inferred from GitHub runs-on values. Configure a trusted GitLab runner manually.'];
 for(const [name,jobRaw] of entries){if(!/^[A-Za-z_][\w-]*$/.test(name)||!jobRaw||typeof jobRaw!=='object'||Array.isArray(jobRaw))throw Error('Invalid job '+name);const job=jobRaw as Record<string,any>;
 const allowed=new Set(['runs-on','steps','name']);for(const k of Object.keys(job))if(!allowed.has(k))throw Error(`Job ${name}.${k} needs manual migration`);
 if(typeof job['runs-on']!=='string')throw Error('Literal runs-on required');const steps=job.steps;if(!Array.isArray(steps)||!steps.length||steps.length>80)throw Error('Job steps required');
 const cmds:string[]=[];for(const [i,step] of steps.entries()){if(!step||typeof step!=='object'||Array.isArray(step))throw Error('Invalid step');const keys=Object.keys(step);if(keys.some(k=>!['name','run','shell'].includes(k)))throw Error(`Step ${i+1} has action/env/condition unsupported`);if(typeof step.run!=='string'||step.run.length>20000)throw Error('Only run steps accepted');if(step.shell&&step.shell!=='bash')throw Error('Only bash shell accepted');cmds.push(step.run);}
 out[name]={stage:stageName,script:cmds};}
 return{text:'# Draft conversion — review runner tags, shell semantics, triggers and pipeline settings.\n'+stringify(out),details:{jobs:entries.length,scripts:entries.reduce((a,[,j])=>a+(j as any).steps.length,0)},warnings:notes.concat('GitLab CI does not reproduce GitHub event filtering, action context or permissions automatically.')};}
