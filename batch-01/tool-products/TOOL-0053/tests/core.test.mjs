import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Reject WS endpoint",()=>{assert.throws(()=>compute({endpoint:'wss://example.com'}));});
test("Reject fragment",()=>{assert.throws(()=>compute({endpoint:'https://example.com/stream#private'}));});
