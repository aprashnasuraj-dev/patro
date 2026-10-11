import {validate,transliterate} from './font-common.mjs';
import {getAllRulesZ2U} from '../vendor/zawgyi-z2u.mjs';
const rules=getAllRulesZ2U();
export function convert(text){validate(text);return {output:transliterate(text,rules),warnings:[]};}
