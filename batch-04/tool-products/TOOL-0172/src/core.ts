export function planJoin(count:number,inputNames:string[],output:string):string[]{
  if(count<2||count>20||inputNames.length!==count) throw new Error('Choose 2–20 audio files.');
  const args:string[]=[]; for(const n of inputNames) args.push('-i',n);
  const prep=inputNames.map((_,i)=>`[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`).join(';');
  const refs=inputNames.map((_,i)=>`[a${i}]`).join('');
  return [...args,'-filter_complex',`${prep};${refs}concat=n=${count}:v=0:a=1[out]`,'-map','[out]','-c:a','libmp3lame','-b:a','192k',output];
}
