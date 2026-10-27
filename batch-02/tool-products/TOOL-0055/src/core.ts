import {rows} from '../_vendor/guards.js';
export function compute(x){
 const mimes=rows(x.mimes,32,6000);if(!mimes.length)throw Error('Enter at least one MIME type.');
 const out=[];for(const mime of mimes){if(mime.length>180||/[\r\n<>]/.test(mime)||!/^(audio|video)\/[a-z0-9.+-]+(?:\s*;\s*codecs="[a-z0-9., -]+")?$/i.test(mime))throw Error('Invalid codec MIME string: '+mime.slice(0,80));
  const tag=mime.startsWith('audio/')?'audio':'video',node=document.createElement(tag),res=node.canPlayType(mime),mse=typeof MediaSource!=='undefined'&&typeof MediaSource.isTypeSupported==='function'?MediaSource.isTypeSupported(mime):null;
  out.push({mime,playback:res||'not declared',mediaSource:mse===null?'unavailable':mse?'supported':'not supported'});
 }
 return {summary:`Checked ${out.length} MIME declaration(s) in this browser.`,text:JSON.stringify(out,null,2),warnings:['Browser reports are hints rather than proof that media will play.','MediaSource support, codecs, hardware, OS and DRM can vary.']};
}
