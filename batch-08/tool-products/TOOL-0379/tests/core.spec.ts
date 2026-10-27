import {describe,it,expect} from 'vitest';import {generate} from '../src/core';describe('TOOL-0379 core',()=>{it('known-answer fixture',()=>{expect(generate(1,5,1,10,['add'])).toHaveLength(5)})});
