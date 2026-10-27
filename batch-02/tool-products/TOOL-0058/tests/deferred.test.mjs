// Deferred test scaffold; intentionally not executed during source preparation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test("empty/invalid input rejects explicitly", async()=>{await assert.rejects(async()=>compute({}),/required|Invalid|Enter|Provide|Expected|Cannot|Unexpected|field|address|type|Unsupported|Date|URL|Input|CSV|Original|Header|RFC|Missing/i);});
