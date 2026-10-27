export function planMovRemux(input:string,output:string):string[]{ return ['-i',input,'-map','0','-c','copy','-movflags','+faststart',output]; }
export const unsupported='If the MOV contains codecs MP4 cannot legally carry, this remux intentionally fails instead of silently transcoding.';
