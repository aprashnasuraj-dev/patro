import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { friendly }=M as any; describe('394',()=>it('prepared reference case',()=>{ expect(friendly(.75)).toBe('3/4') }));
