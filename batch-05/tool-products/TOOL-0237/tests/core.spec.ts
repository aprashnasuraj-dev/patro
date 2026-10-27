import {describe,it,expect} from 'vitest';
import {netWorth} from '../src/core';
describe('TOOL-0237 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(netWorth([{id:'1',name:'Cash',category:'Cash',type:'asset',value:100},{id:'2',name:'Debt',category:'Debt',type:'liability',value:40}]).netWorth).toBe(60);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
