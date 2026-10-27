import { finite } from '../_vendor/limits';
export interface GifOptions { start:number; duration:number; fps:number; width:number; dither:'sierra2_4a'|'bayer'|'floyd_steinberg'; }
export function planGif(o:GifOptions,input:string,output:string):string[]{
  const start=finite(o.start,'Start',0,86400), duration=finite(o.duration,'Duration',0.1,120), fps=finite(o.fps,'FPS',1,30), width=Math.round(finite(o.width,'Width',160,1280));
  const vf=`fps=${fps},scale=${width}:-2:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=${o.dither}`;
  return ['-ss',String(start),'-t',String(duration),'-i',input,'-filter_complex',vf,'-loop','0',output];
}
