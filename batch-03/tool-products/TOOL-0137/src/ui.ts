import * as core from './core'; import { $,file,num,checked,guarded,dl,resultText } from '../_vendor/ui'; $('primary').addEventListener('click',()=>guarded(async()=>{const b=await core.transform(file('file'),num('speed'),checked('reverse'));resultText(`Re-encoded GIF: ${b.size.toLocaleString()} bytes.`);dl(b,'transformed.gif')}));

