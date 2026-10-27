import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { divider }=M as any; describe('385',()=>it('prepared reference case',()=>{ expect(divider(5,3.3,'E24').v).toBeGreaterThan(3) }));
