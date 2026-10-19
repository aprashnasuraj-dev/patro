#!/usr/bin/env node
// Stable, resumable 50-topic batches. A batch never treats review/candidate as approved.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {loadState} from './plan.mjs';
export function partition(rows,size=50){if(!Number.isSafeInteger(size)||size<1)throw Error('Invalid batch size');return Array.from({length:Math.ceil(rows.length/size)},(_,i)=>({number:i+1,rows:rows.slice(i*size,(i+1)*size)}));}
export function selectBatch(batches,latest,index){const batch=batches[index];if(!batch)throw Error('Batch out of range');return {...batch,rows:batch.rows.filter(r=>latest.get(r.id)?.status!=='approved')};}
export async function prepareBatch({root=resolve('missionmangal'),index=0,size=50}={}){
 const plan=JSON.parse(await readFile(join(root,'v2-work','plan.json'),'utf8'));
 const state=await loadState(join(root,'state'));const batches=partition(plan.rows,size);
 const batch=selectBatch(batches,state.latest,index);
 await mkdir(join(root,'v2-work'),{recursive:true});
 await writeFile(join(root,'v2-work','full-plan.json'),JSON.stringify(plan,null,2));
 await writeFile(join(root,'v2-work','plan.json'),JSON.stringify({...plan,rows:batch.rows,batch:{index,number:index+1,total:batches.length,size,original_count:batches[index].rows.length,pending_count:batch.rows.length}},null,2));
 const manifest={batch:index+1,total:batches.length,original_count:batches[index].rows.length,pending_count:batch.rows.length,ids:batches[index].rows.map(r=>r.id),pending_ids:batch.rows.map(r=>r.id),generated_at:new Date().toISOString()};
 await writeFile(join(root,'v2-work','batch-manifest.json'),JSON.stringify(manifest,null,2));
 return manifest;
}
if(process.argv[1]?.endsWith('batch.mjs')){const a=process.argv.indexOf('--index');const n=a<0?0:Number(process.argv[a+1]);if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid --index');console.log(JSON.stringify(await prepareBatch({index:n}),null,2));}
