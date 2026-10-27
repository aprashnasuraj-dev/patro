import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { led }=M as any; describe('383',()=>it('prepared reference case',()=>{ expect(led(12,3,20,3,1).ideal).toBeCloseTo(150) }));
