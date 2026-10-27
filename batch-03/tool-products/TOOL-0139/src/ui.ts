import * as core from './core'; import { $,file,num,guarded,dl,resultText } from '../_vendor/ui'; $('primary').addEventListener('click',()=>guarded(async()=>{const f=file('file'),b=await core.changeDpi(f,num('dpi'));resultText(`Updated density metadata to ${num('dpi')} DPI without resampling pixels.`);dl(b,f.name.replace(/(\.[^.]+)$/,'-dpi$1'))}));

