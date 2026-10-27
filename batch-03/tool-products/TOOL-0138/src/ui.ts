import * as core from './core'; import { $,file,num,guarded,dl,resultText } from '../_vendor/ui'; $('primary').addEventListener('click',()=>guarded(async()=>{const b=await core.toGif(file('file'),num('loop'));resultText(`GIF created locally: ${b.size.toLocaleString()} bytes. Expect indexed-colour loss versus APNG/WebP.`);dl(b,'animation.gif')}));

