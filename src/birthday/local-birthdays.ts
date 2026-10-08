import {occurrences} from '../patro-tools/tithi-events/engine';import type {BirthModel} from './birth-panchang';
/** Additional computed local dates. Never replaces the official Kathmandu archive comparison. */
export function localBirthdayDate(model:BirthModel,year:number){const p=model.p,rule={month:model.month,paksha:p.paksha,tithi:p.tithiInPaksha,observance:'udaya' as const,system:'purnimanta' as const,adhik:'nija' as const};return occurrences(rule,`${year}-01-01`,`${year}-12-31`,model.place)[0]?.date||null;}
