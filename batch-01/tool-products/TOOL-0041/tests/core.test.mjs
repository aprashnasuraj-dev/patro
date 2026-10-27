import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Nginx fixed explicit origin",()=>{assert.ok(compute({server:'Nginx',origins:'https://app.example.com',methods:'GET, OPTIONS',headers:'Content-Type',credentials:true,maxAge:'600'}).text.includes('Access-Control-Allow-Credentials'));});
test("Credentialed wildcard rejected",()=>{assert.throws(()=>compute({server:'Express',origins:'*',methods:'GET',headers:'',credentials:true,maxAge:'60'}));});
test("Origin path rejected",()=>{assert.throws(()=>compute({server:'Apache',origins:'https://example.com/path',methods:'GET',headers:'',credentials:false,maxAge:'60'}));});
