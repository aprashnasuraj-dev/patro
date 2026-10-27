export type Rotation=0|90|180|270; export interface Transform { rotation:Rotation; flipH:boolean; flipV:boolean; }
export function filterFor(t:Transform):string {
  const f:string[]=[]; if(t.rotation===90) f.push('transpose=clock'); else if(t.rotation===270) f.push('transpose=cclock'); else if(t.rotation===180) f.push('hflip','vflip'); if(t.flipH)f.push('hflip'); if(t.flipV)f.push('vflip'); return f.join(',')||'null';
}
export function planTransform(t:Transform,input:string,output:string):string[]{ return ['-i',input,'-vf',filterFor(t),'-c:v','libx264','-preset','veryfast','-crf','20','-c:a','aac','-b:a','160k','-metadata:s:v:0','rotate=0','-movflags','+faststart',output]; }
