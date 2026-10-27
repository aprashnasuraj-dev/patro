import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {metadataId,classifyTestFramework,browserBuildOptions,nodeTestBuildOptions,classifyNodeTestFailure} from '../scripts/mm530/harness-lib.mjs';

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

test('Phase 1 preserves source-relative Node test execution assumptions',()=>{
 const framework=classifyTestFramework('deferred.test.mjs',"import {test} from 'node:test'; const x=new URL('./cases.json',import.meta.url)");
 assert.equal(framework,'node-test');
});

test('environment and fixture failures are not mislabeled as product failures',()=>{
 assert.deepEqual(classifyNodeTestFailure("Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'papaparse'"),{state:'NOT_RUN',kind:'node-test-dependency-prerequisite'});
 assert.deepEqual(classifyNodeTestFailure("/tool/tests/deferred.test.mjs:7 SyntaxError: missing )"),{state:'NOT_RUN',kind:'invalid-test-fixture'});
 assert.deepEqual(classifyNodeTestFailure("AssertionError: Missing expected rejection"),{state:'FAIL',kind:'test-failure'});
});
