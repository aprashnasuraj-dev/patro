import {describe,it,expect} from 'vitest';
import {costBasis} from '../src/core';
describe('TOOL-0235 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(costBasis('date,symbol,action,quantity,price,fees\n2026-01-01,A,BUY,10,5,0\n2026-02-01,A,SELL,4,8,0').sales[0].fifoBasis).toBe(20);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
