import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Report only",()=>{assert.ok(compute({rules:'script-src https://cdn.example.com',reportOnly:true,upgrade:false}).text.includes('Content-Security-Policy-Report-Only'));});
test("Malformed origin rejected",()=>{assert.throws(()=>compute({rules:'script-src https://evil.example/x',reportOnly:false,upgrade:false}));});
