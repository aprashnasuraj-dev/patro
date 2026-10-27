import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Secure host cookie",()=>{assert.ok(compute({mode:'Build',name:'__Host-session',value:'v',domain:'',path:'/',samesite:'Lax',secure:true,httpOnly:true,partitioned:false,maxAge:'60'}).text.includes('Path=/'));});
test("Host prefix Domain rejected",()=>{assert.throws(()=>compute({mode:'Build',name:'__Host-session',value:'v',domain:'example.com',path:'/',samesite:'Lax',secure:true,httpOnly:true,partitioned:false,maxAge:''}));});
test("Injection rejected",()=>{assert.throws(()=>compute({mode:'Build',name:'a',value:'a\r\nSet-Cookie: b=2',domain:'',path:'/',samesite:'Lax',secure:true,httpOnly:false,partitioned:false,maxAge:''}));});
