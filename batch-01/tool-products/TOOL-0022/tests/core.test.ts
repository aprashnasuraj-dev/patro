import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("GitHub Actions to GitLab CI Converter",()=>{it('creates a GitLab run-only stage',()=>{const r=convert('name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok');expect(r.text).toContain('stages:');expect(r.text).toContain('script:');});it('does not silently translate actions or marketplace steps',()=>expect(()=>convert('jobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4')).toThrow());
});
