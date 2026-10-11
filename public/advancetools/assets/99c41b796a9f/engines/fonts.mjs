import * as f0 from './font-krutidev.mjs';
import * as f1 from './font-bijoy.mjs';
import * as f2 from './font-fm-abhaya.mjs';
import * as f3 from './font-bamini.mjs';
import * as f4 from './font-zawgyi.mjs';
import * as f5 from './font-unicode-zawgyi.mjs';
export {ENCODINGS} from '../font-catalog.mjs';
export {baminiAmbiguities} from './font-bamini.mjs';
const adapters={'krutidev':f0,'bijoy':f1,'fm-abhaya':f2,'bamini':f3,'zawgyi':f4,'unicode-zawgyi':f5};
export function convert(id,text){if(!adapters[id])throw Error('Unknown converter.');return adapters[id].convert(text);}
