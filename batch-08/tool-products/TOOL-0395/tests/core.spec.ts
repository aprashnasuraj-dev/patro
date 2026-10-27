import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { baker }=M as any; describe('395',()=>it('prepared reference case',()=>{ expect(baker('flour: 500\nwater: 325').rows[1].pct).toBeCloseTo(65) }));
