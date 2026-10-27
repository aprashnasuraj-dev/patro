import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Reject HTTP URL",()=>{assert.throws(()=>compute({endpoint:'http://example.com'}));});
test("Reject credentials",()=>{assert.throws(()=>compute({endpoint:'wss://user:pass@example.com'}));});
