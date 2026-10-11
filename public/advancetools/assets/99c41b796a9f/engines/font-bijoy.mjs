import {validate,replaceMap} from './font-common.mjs';
import {convertBijoyToUnicode,scanUnmapped} from '../vendor/bijoy.mjs';
export function convert(text){validate(text);const output=convertBijoyToUnicode(text);return {output,warnings:scanUnmapped(output).size?['Possible unmapped legacy symbols remain. Compare with the original document.']:[]};}
