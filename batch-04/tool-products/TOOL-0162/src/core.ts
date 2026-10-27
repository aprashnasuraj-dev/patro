export type AudioFormat='mp3'|'wav'|'m4a';
export function planExtract(format:AudioFormat,input:string,output:string):string[]{
  const base=['-i',input,'-map','0:a:0','-vn'];
  if(format==='wav') return [...base,'-c:a','pcm_s16le','-ar','48000',output];
  if(format==='mp3') return [...base,'-c:a','libmp3lame','-b:a','192k',output];
  return [...base,'-c:a','aac','-b:a','192k','-movflags','+faststart',output];
}
