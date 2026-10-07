import { describe,it,expect } from 'vitest';
import {tithiAlarmUtc} from '../src/tithiAlarm';
import {autoFix,createDictionary} from '../src/patro-tools/language/spellcheck';
import {bsAdapter} from '../src/patro-tools-integration/bsAdapter';
describe('reported workflow regressions',()=>{
 it('same-day alarm uses selected Nepal time',()=>{expect(tithiAlarmUtc('2026-10-07','07:00',0)).toBe('20261007T011500Z');expect(tithiAlarmUtc('2026-10-07','07:00',7)).toBe('20260930T011500Z')});
 it('BS birthday round-trips with AD',()=>{const ad=bsAdapter.toAD({year:2056,month:9,day:17});expect(bsAdapter.toBS(ad)).toEqual({year:2056,month:9,day:17})});
 it('curated spelling fixes preserve attached endings',()=>{const dict=createDictionary(['विद्यालय','परीक्षा','सूचना','चाहन्छु']);expect(autoFix('बिद्यालयमा परिक्षा छ। सुचना चाहान्छु।',dict)).toBe('विद्यालयमा परीक्षा छ। सूचना चाहन्छु।')});
});
