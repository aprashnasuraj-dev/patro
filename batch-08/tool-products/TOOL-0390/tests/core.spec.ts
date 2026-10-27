import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { ndExposure }=M as any; describe('390',()=>it('prepared reference case',()=>{ expect(ndExposure(1,3,'stops').seconds).toBe(8) }));
