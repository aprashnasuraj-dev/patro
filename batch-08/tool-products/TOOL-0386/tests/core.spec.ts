import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { solve }=M as any; describe('386',()=>it('prepared reference case',()=>{ expect(solve(16000000,1000,16,'fast').actual).toBeCloseTo(1000,0) }));
