// Deferred test scaffold; intentionally not executed during source preparation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test("browser-only tool requires live browser fixtures", {skip:"Browser integration deferred"}, ()=>{});
