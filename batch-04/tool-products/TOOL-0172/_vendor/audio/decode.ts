import { MAX_AUDIO_BYTES } from '../limits';
export async function decodeAudio(file: File): Promise<AudioBuffer> {
  if (file.size > MAX_AUDIO_BYTES) throw new Error('Audio file exceeds the 120 MiB browser decode limit.');
  const ctx = new AudioContext();
  try { return await ctx.decodeAudioData(await file.arrayBuffer()); }
  finally { await ctx.close(); }
}
export function mixMono(buffer: AudioBuffer): Float32Array {
  const out = new Float32Array(buffer.length);
  for (let c=0;c<buffer.numberOfChannels;c++) { const ch=buffer.getChannelData(c); for(let i=0;i<out.length;i++) out[i]+=ch[i]/buffer.numberOfChannels; }
  return out;
}
