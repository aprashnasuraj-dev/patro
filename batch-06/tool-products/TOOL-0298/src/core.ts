import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const distance=n(i,'distance',.1,150),up=n(i,'ascent',0,10000),down=n(i,'descent',0,10000),slope=(up-down)/(1000*distance);if(Math.abs(slope)>.6)throw new Error('Slope outside simplified model range; use a route elevation profile.');const naismith=distance/5+up/600,toblerSpeed=6*Math.exp(-3.5*Math.abs(slope+.05)),tobler=distance/toblerSpeed;return res('Hiking time model comparison',[m('Naismith',f(naismith,2)+' h'),m('Tobler (net-grade proxy)',f(tobler,2)+' h'),m('Net grade',f(slope*100,2)+'%')],['Tobler output from a single net grade can misrepresent rolling trails. Use segment-by-segment slopes for accuracy.','Weather, altitude, loaded pack, breaks and navigational delays excluded.'],[['Model','Formula'],['Naismith','km / 5 + ascent metres / 600'],['Tobler','6 × exp(-3.5 × |slope + 0.05|) km/h']]);
}
