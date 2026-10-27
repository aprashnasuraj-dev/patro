import {N,Q,S,R} from '../_vendor/guard';
export function calculate(x:Record<string,unknown>){
 const shape=S(x,'shape',20),unit=S(x,'unit',3),length=N(x,'length',1,2000),width=N(x,'width',1,2000),drop=N(x,'drop',0,500),height=N(x,'height',1,1000);
 if(!['Rectangle','Square','Round'].includes(shape)||!['in','cm'].includes(unit))throw Error('Unsupported shape or unit.');
 const l=length+2*drop;const w=(shape==='Round'||shape==='Square'?length:width)+2*drop;
 const outputs=[{label:shape==='Round'?'Cloth diameter':'Cloth length',value:`${Q(l)} ${unit}`},{label:shape==='Round'?'Flat cloth diameter (repeat)':'Cloth width',value:`${Q(w)} ${unit}`},{label:'Drop on each side',value:`${Q(drop)} ${unit}`}];
 const warnings=['Dimensions are before hemming, shrinkage or seam allowances.','Round cloth diameter and rectangular dimensions refer to nominal cut size.'];
 if(drop>=height)warnings.push('Drape reaches the floor or beyond; check tripping and dragging.');
 return R(outputs,warnings,['For each lateral dimension, add twice the requested edge drop.','For square and round tables, use the entered length as side or diameter respectively.']);
}
