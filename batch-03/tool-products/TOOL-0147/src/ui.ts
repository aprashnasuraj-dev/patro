import * as core from './core'; import { $,file,checked,guarded,dl,resultText } from '../_vendor/ui'; $('primary').textContent='Flatten form fields';$('primary').addEventListener('click',()=>guarded(async()=>{const b=await core.flatten(file('file'),checked('updateAppearances'));resultText('Supported AcroForm fields flattened into page content.');dl(b,'flattened-form.pdf')}));

