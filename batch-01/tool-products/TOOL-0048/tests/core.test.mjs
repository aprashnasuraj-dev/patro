import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Detect credential wildcard conflict",()=>{assert.ok(compute({headers:'Access-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true',scheme:'HTTPS'}).text.includes('CORS conflict'));});
test("Obsolete folded line rejected",()=>{assert.throws(()=>compute({headers:'X-Test: ok\n injected',scheme:'Unknown'}));});
