import test from 'node:test';import assert from 'node:assert/strict';
import {partition,selectBatch} from '../v2/batch.mjs';
test('5000 topics yield exactly 100 stable non-overlapping batches of 50',()=>{
 const rows=Array.from({length:5000},(_,i)=>({id:'topic-'+i}));
 const batches=partition(rows);
 assert.equal(batches.length,100);assert.ok(batches.every(b=>b.rows.length===50));
 assert.deepEqual(batches.flatMap(b=>b.rows.map(r=>r.id)),rows.map(r=>r.id));
});
test('only approved topics are excluded when resuming a batch',()=>{
 const batches=partition([{id:'a'},{id:'b'},{id:'c'}],2);
 const latest=new Map([['a',{status:'approved'}],['b',{status:'release_candidate'}]]);
 assert.deepEqual(selectBatch(batches,latest,0).rows.map(x=>x.id),['b']);
 assert.throws(()=>selectBatch(batches,latest,3),/out of range/);
});
