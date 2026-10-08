import type { TithiRule } from '../patro-tools/tithi-events/engine';
export type Review = { name:string; qualification:string; approvedAt:string } | null;
export type RitualRule = { name:string; source:string; reviewer:Review; rule:TithiRule; window:'official'|'aparahna'|'pradosh'|'nishitha'|'chhath'|'sunrise'|'parana'|'moonrise'|'interval' };
// Candidate rules from the existing engine: NOT approved religious advice.
const source='https://www.drikpanchang.com/';
export const RITUAL_CONFIG: Record<string,RitualRule> = {
 dashain:{name:'दशैं टीका / Dashain',source,reviewer:null,rule:{month:6,paksha:'shukla',tithi:10,observance:'aparahna'},window:'aparahna'},
 ghatasthapana:{name:'घटस्थापना / Ghatasthapana',source,reviewer:null,rule:{month:6,paksha:'shukla',tithi:1,observance:'udaya'},window:'official'},
 'bhai-tika':{name:'भाइटीका / Bhai tika',source,reviewer:null,rule:{month:7,paksha:'shukla',tithi:2,observance:'aparahna'},window:'aparahna'},
 'laxmi-puja':{name:'लक्ष्मी पूजा / Laxmi Puja',source,reviewer:null,rule:{month:7,paksha:'krishna',tithi:15,observance:'pradosh'},window:'pradosh'},
 chhath:{name:'छठ / Chhath',source,reviewer:null,rule:{month:7,paksha:'shukla',tithi:6,observance:'udaya'},window:'chhath'},
 shivaratri:{name:'महाशिवरात्रि / Shivaratri',source,reviewer:null,rule:{month:11,paksha:'krishna',tithi:14,observance:'nishitha'},window:'nishitha'},
 janmashtami:{name:'कृष्ण जन्माष्टमी / Janmashtami',source,reviewer:null,rule:{month:5,paksha:'krishna',tithi:8,observance:'nishitha'},window:'nishitha'},
 teej:{name:'तीज / Teej',source,reviewer:null,rule:{month:5,paksha:'shukla',tithi:3,observance:'udaya'},window:'sunrise'},
 'rishi-panchami':{name:'ऋषिपञ्चमी / Rishi Panchami',source,reviewer:null,rule:{month:5,paksha:'shukla',tithi:5,observance:'udaya'},window:'sunrise'},
 ekadashi:{name:'एकादशी / Ekadashi',source,reviewer:null,rule:{month:0,paksha:'shukla',tithi:11,observance:'udaya'},window:'parana'},
 purnima:{name:'पूर्णिमा / Purnima',source,reviewer:null,rule:{month:0,paksha:'shukla',tithi:15,observance:'udaya'},window:'interval'},
 aunsi:{name:'औंसी / Aunsi',source,reviewer:null,rule:{month:0,paksha:'krishna',tithi:15,observance:'udaya'},window:'interval'},
 chaturthi:{name:'चतुर्थी / Chaturthi',source,reviewer:null,rule:{month:0,paksha:'krishna',tithi:4,observance:'udaya'},window:'moonrise'},
};
export const RITUAL_WINDOWS = { reviewer:null as Review, source:'https://www.drikpanchang.com/vrats/ekadashidates.html', pradoshNightFraction:3/15,nishithaHalfNightFraction:1/30,hariVasaraFraction:1/4,solarSutakHours:12,lunarSutakHours:9,polarFallback:'unavailable' as 'unavailable'|'kathmandu' };
export function approved(review:Review) { return !!review?.name.trim() && !!review.qualification.trim() && Number.isFinite(Date.parse(review.approvedAt)); }
