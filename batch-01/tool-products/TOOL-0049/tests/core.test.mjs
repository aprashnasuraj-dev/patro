import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Sensitive no-store",()=>{assert.ok(compute({profile:'Sensitive no-store',maxAge:'1',sMaxAge:'0',stale:'0'}).text.includes('no-store'));});
test("Invalid TTL rejected",()=>{assert.throws(()=>compute({profile:'Public asset',maxAge:'-1',sMaxAge:'1',stale:'0'}));});
