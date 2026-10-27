import * as core from './core'; import { $,file,val,guarded,dl,resultText } from '../_vendor/ui'; $('primary').addEventListener('click',()=>guarded(async()=>{const z=await core.generate(file('file'),val('appName'),val('theme'));resultText('Generated favicon.ico, PNG sizes, and site.webmanifest. Inspect tiny-size legibility before release.');dl(z,'favicon-set.zip')}));

