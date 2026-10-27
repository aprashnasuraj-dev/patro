import {describe,it,expect} from 'vitest';
import {cardPayoff} from '../src/core';
describe('TOOL-0228 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(cardPayoff({balance:1200,apr:0,monthlyPayment:100,startDate:'2026-01-01',monthlyNewCharges:0}).periods).toBe(12);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
