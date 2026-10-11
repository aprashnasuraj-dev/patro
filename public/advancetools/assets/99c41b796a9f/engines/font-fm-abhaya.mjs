import {validate,replaceMap} from './font-common.mjs';
import fm from '../vendor/fm-abhaya.mjs';
export function convert(text){validate(text);return {output:replaceMap(replaceMap(text,fm.rules||{}),{...fm.singles,...fm.combos}),warnings:[]};}
