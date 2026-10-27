import * as core from './core'; import { $,file,val,guarded,dl,resultText } from '../_vendor/ui'; $('primary').addEventListener('click',()=>guarded(async()=>{const r=await core.extract(file('file'),val('selection') as any);resultText(`Decoded ${r.frames.length} frames. First delays: ${r.frames.slice(0,12).map(f=>f.delayMs+'ms').join(', ')}.`);dl(r.zip,'gif-frames.zip')}));

