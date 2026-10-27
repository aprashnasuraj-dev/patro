import {describe,it,expect} from 'vitest';
import {loanPayoff} from '../src/core';
describe('TOOL-0221 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(loanPayoff({principal:1000,apr:0,monthlyPayment:100,extraMonthly:0,startDate:'2026-01-01'}).periods).toBe(10);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
