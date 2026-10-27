export type Mp3Bitrate=96|128|160|192|256|320;
export function validateWavHeader(bytes:Uint8Array):void { const s=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b)); if(bytes.length<44||s(0,4)!=='RIFF'||s(8,12)!=='WAVE') throw new Error('Input is not a RIFF/WAVE file.'); }
export function planWavToMp3(kbps:Mp3Bitrate,input:string,output:string):string[]{ if(![96,128,160,192,256,320].includes(kbps)) throw new Error('Unsupported MP3 bitrate.'); return ['-i',input,'-vn','-c:a','libmp3lame','-b:a',`${kbps}k`,'-map_metadata','-1',output]; }
