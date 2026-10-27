import {describe,it,expect} from 'vitest';
import {parseEff,generate} from '../src/core';
function exactSyntheticList(){
 const rows:string[]=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++)for(let d=1;d<=6;d++)for(let e=1;e<=6;e++){const k=`${a}${b}${c}${d}${e}`;rows.push(`${k} word_${k}`)}
 return rows.join('\n');
}
describe('TOOL-0324 Diceware parser and generator boundaries',()=>{
 it('accepts exactly 7,776 unique five-die entries without substituting the EFF asset',()=>{const m=parseEff(exactSyntheticList());expect(m.size).toBe(7776);expect(m.get('11111')).toBe('word_11111');expect(m.get('66666')).toBe('word_66666')});
 it('rejects malformed and incomplete wordlists',()=>{expect(()=>parseEff('11111 ok\n77777 bad')).toThrow(/malformed/);expect(()=>parseEff('11111 only')).toThrow(/7,776/)});
 it('rejects duplicate Diceware indices',()=>{const rows=exactSyntheticList().split('\n');rows[1]=rows[0].replace('word_11111','another');expect(()=>parseEff(rows.join('\n'))).toThrow(/Duplicate/)});
 it('enforces word-count and separator bounds before random generation',()=>{const m=parseEff(exactSyntheticList());expect(()=>generate(m,3,'-')).toThrow(/4–12/);expect(()=>generate(m,13,'-')).toThrow(/4–12/);expect(()=>generate(m,4,'12345')).toThrow(/4 characters/)});
});
