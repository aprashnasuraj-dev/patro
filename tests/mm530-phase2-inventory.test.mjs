import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {packageRoot,externalImports,declaredDependencies,identityFindings,canonicalLeaf,browserProfile,normalizedFamily,normalizedTitle} from '../scripts/mm530/inventory-lib.mjs';

test('package normalization handles scoped and ordinary imports',()=>{
 assert.equal(packageRoot('@scope/pkg/sub'),'@scope/pkg');
 assert.equal(packageRoot('zod/v4'),'zod');
 assert.equal(packageRoot('./core.js'),null);
 assert.deepEqual(externalImports("import x from 'zod'; import('@scope/pkg/sub'); require('./local')"),['@scope/pkg','zod']);
 assert.deepEqual(externalImports("const note=\"Found from 'not-a-module' in user text\";"),[]);
});
test('declared dependency variants normalize without inventing packages',()=>{
 assert.deepEqual(declaredDependencies({dependencies:{zod:'4'},requirements:{dependencies:{yaml:'2'},test_dev_dependencies:{vitest:'3'}}}),{runtime:['yaml','zod'],test:['vitest']});
});
test('identity gate accepts known schema variants',()=>{
 assert.deepEqual(identityFindings({expectedId:'TOOL-0003',expectedBatch:'BATCH-01',master:{id:'TOOL-0003',batch:'BATCH-01',canonical_proposed:'/generators/x-y'},batchRow:{id:'TOOL-0003',batch:'BATCH-01',canonical_proposed:'/generators/x-y'},meta:{id:'TOOL-0003'}}),[]);
});
test('route leaf, family and browser profile are deterministic',()=>{
 assert.equal(canonicalLeaf('/calculators/card-surcharge-cash-discount-calculator'),'card-surcharge-cash-discount-calculator');
 assert.equal(normalizedFamily({engineering_family:'F0318'},{engineering_family:'Finance'}).id,'F0318');
 assert.equal(normalizedTitle('Heating Cost Comparator | AafnaiPatro Tools'),'Heating Cost Comparator');
 assert.equal(browserProfile({browser_first:true},{has_page_html:true}).browser_first,true);
});
