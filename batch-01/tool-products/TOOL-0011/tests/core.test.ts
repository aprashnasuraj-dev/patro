import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("Cron to GitHub Actions Schedule Generator",()=>{it('generates a five-field GitHub schedule and timezone',()=>{const r=convert('15 3 * * 1-5',{timezone:'UTC'});expect(r.text).toContain("cron: '15 3 * * 1-5'");expect(r.text).toContain('timezone:');});it('rejects invalid and too-frequent cron',()=>{expect(()=>convert('*/2 * * * *')).toThrow();expect(()=>convert('70 3 * * 1')).toThrow();expect(()=>convert('* * *')).toThrow();});
});
