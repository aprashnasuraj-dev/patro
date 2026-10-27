import * as core from './core'; import { $,files,num,guarded,dl,resultText } from '../_vendor/ui'; $('primary').addEventListener('click',()=>guarded(async()=>{const fs=files('files');const z=await core.convert(fs,num('quality'));resultText(`Converted ${fs.length} file(s) locally. ZIP size: ${z.size.toLocaleString()} bytes.`);dl(z,'heic-to-jpg.zip')}));

