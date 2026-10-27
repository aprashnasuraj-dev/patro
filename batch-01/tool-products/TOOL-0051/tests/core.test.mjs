import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("None and self allowlist",()=>{assert.ok(compute({'camera':'none','microphone':'none','geolocation':'self','fullscreen':'self','payment':'none','clipboard-read':'none',origins:''}).text.includes('camera=()'));});
test("Non HTTPS custom rejected",()=>{assert.throws(()=>compute({'camera':'custom','microphone':'none','geolocation':'self','fullscreen':'self','payment':'none','clipboard-read':'none',origins:'http://example.com'}));});
