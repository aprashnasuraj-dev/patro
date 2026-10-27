import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Chrome Windows heuristic",()=>{assert.ok(compute({uas:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0 Safari/537.36'}).text.includes('Windows'));});
test("Over 200 lines rejected",()=>{assert.throws(()=>compute({uas:Array(201).fill('Firefox/1.0').join('\n')}));});
