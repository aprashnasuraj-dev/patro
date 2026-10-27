import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const steps=integer(i,'steps',1,200000),stride=n(i,'stride',.2,2),cadence=n(i,'cadence',30,220),mass=n(i,'weight',20,350),met=n(i,'met',1,14),km=steps*stride/1000,min=steps/cadence,kcal=met*3.5*mass*min/200;return res('Walking distance and gross activity energy estimate',[m('Distance',f(km,2)+' km'),m('Time',duration(min*60)),m('Gross energy',f(kcal,0)+' kcal'),m('Steps per km',f(1000/stride,0))],['Metabolic estimate includes energy spent at rest; net exercise-only energy would be smaller.','Terrain, stride length, cadence and MET materially alter the estimate.'],[['Formula','Result'],['Distance','steps × stride length'],['Calories','MET × 3.5 × kg × minutes / 200']]);
}
