import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { gauge }=M as any; describe('399',()=>it('prepared reference case',()=>{ expect(gauge(20,10,50,0,1,0).cast).toBe(100) }));
