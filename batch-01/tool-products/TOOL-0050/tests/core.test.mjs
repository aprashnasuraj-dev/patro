import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Candidate HSTS value",()=>{assert.ok(compute({maxAge:'63072000',subdomains:true,preload:true,cert:false,redirect:false,subdomainHTTPS:false,redirectHeaders:false}).text.includes('includeSubDomains; preload'));});
test("Preload incomplete warn",()=>{assert.ok(compute({maxAge:'31536000',subdomains:true,preload:true,cert:false,redirect:false,subdomainHTTPS:false,redirectHeaders:false}).warnings.join(" ").includes('NOT READY'));});
