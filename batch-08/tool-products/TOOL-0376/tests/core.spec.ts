import {describe,it,expect} from 'vitest';import {countSig} from '../src/core';describe('TOOL-0376 core',()=>{it('known-answer fixture',()=>{expect(countSig('0.004500')).toBe(4)})});
