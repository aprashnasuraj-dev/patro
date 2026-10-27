import * as core from './core'; import { $,file,checked,guarded,dl,resultText } from '../_vendor/ui'; $('primary').addEventListener('click',()=>guarded(async()=>{const z=await core.generate(file('file'),checked('ios'),checked('android'));resultText('Generated selected platform assets. Validate in current Xcode/Android Studio before shipping.');dl(z,'app-icon-set.zip')}));

