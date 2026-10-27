export function planRemoveAudio(input:string,output:string):string[]{ return ['-i',input,'-map','0:v:0','-map','0:s?','-c','copy','-an',output]; }
export const limitation='No video re-encoding is performed. Output therefore keeps the original video codec and must use a compatible container.';
