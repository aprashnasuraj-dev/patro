import {validate,transliterate} from './font-common.mjs';
import {getAllRulesU2Z} from '../vendor/zawgyi-u2z.mjs';
const rules=getAllRulesU2Z();
export function convert(text){validate(text);return {output:transliterate(text,rules),warnings:[]};}
