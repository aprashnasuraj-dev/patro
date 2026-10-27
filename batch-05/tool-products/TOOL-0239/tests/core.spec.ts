import {describe,it,expect} from 'vitest';
import {compareLoans} from '../src/core';
describe('TOOL-0239 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(compareLoans({principal:1200,annualRatePct:0,termMonths:12,upfrontFees:0},{principal:1200,annualRatePct:0,termMonths:12,upfrontFees:10}).lowerTotal).toBe('A');});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
