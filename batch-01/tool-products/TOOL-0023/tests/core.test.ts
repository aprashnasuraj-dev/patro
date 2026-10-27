import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("GitLab CI to GitHub Actions Converter",()=>{it('creates script-only GitHub workflow',()=>{const r=convert('stages: [test]\nsmoke:\n  stage: test\n  script: ["echo ok"]');expect(r.text).toContain('ubuntu-latest');expect(r.text).toContain('echo ok');});it('rejects unsupported extends',()=>expect(()=>convert('smoke:\n  extends: .base\n  script: echo ok')).toThrow());
});
