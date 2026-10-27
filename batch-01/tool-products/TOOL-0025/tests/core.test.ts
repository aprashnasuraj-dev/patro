import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("Nginx Location Block Match Tester",()=>{it('selects exact location over prefix',()=>{const r=JSON.parse(convert('location = /health { return 200; }\nlocation / { return 404; }',{uri:'/health'}).text);expect(r.selected.type).toBe('exact');});it('prefers priority prefix over regex',()=>{const r=JSON.parse(convert('location ^~ /assets/ { return 200; }\nlocation ~ \\.png$ { return 404; }',{uri:'/assets/a.png'}).text);expect(r.selected.type).toBe('priority-prefix');});it('rejects unsupported encoded URIs',()=>expect(()=>convert('location / { }',{uri:'/%2e%2e/x'})).toThrow());
});
