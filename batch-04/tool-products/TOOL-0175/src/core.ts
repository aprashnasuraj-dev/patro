import { finite } from '../_vendor/limits';
export interface SilenceOptions { thresholdDb:number; minDuration:number; keepMs:number; mode:'edges'|'all-pauses'; }
export function planSilence(o:SilenceOptions,input:string,output:string):string[]{
  const th=finite(o.thresholdDb,'Threshold',-80,-10), d=finite(o.minDuration,'Minimum silence',0.05,10), keep=finite(o.keepMs,'Keep silence',0,1000)/1000;
  const filter=o.mode==='edges'
    ?`silenceremove=start_periods=1:start_duration=${d}:start_threshold=${th}dB:stop_periods=1:stop_duration=${d}:stop_threshold=${th}dB`
    :`silenceremove=start_periods=1:start_duration=${d}:start_threshold=${th}dB:stop_periods=-1:stop_duration=${d}:stop_threshold=${th}dB:stop_silence=${keep}`;
  return ['-i',input,'-vn','-af',filter,'-c:a','libmp3lame','-b:a','192k',output];
}
