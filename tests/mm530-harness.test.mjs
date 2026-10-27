import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {metadataId,classifyTestFramework,browserBuildOptions,nodeTestBuildOptions} from '../scripts/mm530/harness-lib.mjs';

test('metadata normalization accepts established Mission Mangal schemas',()=>{
 assert.equal(metadataId({tool_id:'TOOL-0160'}),'TOOL-0160');
 assert.equal(metadataId({id:'TOOL-0003'}),'TOOL-0003');
 assert.equal(metadataId({toolId:'TOOL-0099'}),'TOOL-0099');
 assert.equal(metadataId({build_sequence:530}),'TOOL-0530');
 assert.equal(metadataId({id:'bad'}),null);
});
test('test framework detection is explicit, never guessed as pass',()=>{
 assert.equal(classifyTestFramework('core.spec.ts',"import {describe,it} from 'vitest'"),'vitest');
 assert.equal(classifyTestFramework('core.test.mjs',"import {test} from 'node:test'"),'node-test');
 assert.equal(classifyTestFramework('browser.cjs',"const x=1"),'browser');
 assert.equal(classifyTestFramework('custom.mjs',"console.log('x')"),'unknown');
});
test('browser source preflight supports CSS/static assets without hiding site-root dependencies',()=>{
 const o=browserBuildOptions('/tmp/core.ts');
 assert.equal(o.write,false); assert.ok(o.outdir);
 assert.equal(o.loader['.css'],'css');
 assert.ok(o.external.includes('/vendor/*'));
});
test('node fixture compiler has an explicit output and static-root externals',()=>{
 const o=nodeTestBuildOptions('/tmp/test.ts','/tmp/test.mjs');
 assert.equal(o.outfile,'/tmp/test.mjs'); assert.ok(o.external.includes('/vendor/*'));
});
