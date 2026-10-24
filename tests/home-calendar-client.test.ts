import {afterEach,describe,expect,it,vi} from 'vitest';
import {homeEvents} from '../src/home-calendar-client';
afterEach(()=>vi.unstubAllGlobals());
describe('homepage event availability',()=>{
 it('distinguishes a valid empty list from unavailable data',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({items:[]})));
  expect(await homeEvents(2026,new AbortController().signal)).toEqual({items:[],partial:false});
 });
 it('preserves available festival rows while reporting failed holiday data',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(Response.json({items:[{date:'2026-11-08',name_ne:'पर्व'}]})).mockResolvedValueOnce(new Response('',{status:503})));
  const result=await homeEvents(2026,new AbortController().signal);
  expect(result.partial).toBe(true);expect(result.items).toHaveLength(1);
 });
 it('rejects total failure instead of presenting an empty calendar as authoritative',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('offline')));
  await expect(homeEvents(2026,new AbortController().signal)).rejects.toThrow('Event details unavailable');
 });
});
