import {it,expect} from 'vitest'; import {firstPass} from '../src/core'; it('requests json stats',()=>expect(firstPass(-23,-1,'i').join(' ')).toContain('print_format=json'));
