import { MAX_MEDIA_BYTES } from '../limits';

export type ProgressHandler = (ratio: number, timeUs: number) => void;
export type LogHandler = (message: string) => void;
export interface RunResult { bytes: Uint8Array; logs: string[]; }

let instance: any | null = null;
let loaded = false;
let active = false;

async function getFFmpeg(): Promise<any> {
  if (!instance) {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    instance = new FFmpeg();
  }
  if (!loaded) {
    // Deliberately same-origin. Production must host these assets locally.
    await instance.load({
      coreURL: '/assets/vendor/ffmpeg/ffmpeg-core.js',
      wasmURL: '/assets/vendor/ffmpeg/ffmpeg-core.wasm'
    });
    loaded = true;
  }
  return instance;
}

function token(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '')}`;
}

export async function runFFmpegFile(
  file: File,
  argsBuilder: (inputName: string, outputName: string) => string[],
  outputExt: string,
  opts: { maxBytes?: number; onProgress?: ProgressHandler; onLog?: LogHandler } = {}
): Promise<RunResult> {
  if (active) throw new Error('Another media job is already running in this tab.');
  const max = opts.maxBytes ?? MAX_MEDIA_BYTES;
  if (file.size > max) throw new Error(`File exceeds the ${Math.floor(max/1048576)} MiB browser-local limit.`);
  active = true;
  const ff = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');
  const base = token('mm');
  const inputName = `${base}-input${/\.[a-z0-9]{1,8}$/i.exec(file.name)?.[0] ?? '.bin'}`;
  const outputName = `${base}-output.${outputExt.replace(/^\./,'')}`;
  const logs: string[] = [];
  const onLog = ({ message }: any) => { logs.push(String(message)); opts.onLog?.(String(message)); };
  const onProgress = ({ progress, time }: any) => opts.onProgress?.(Number(progress) || 0, Number(time) || 0);
  ff.on('log', onLog); ff.on('progress', onProgress);
  try {
    await ff.writeFile(inputName, await fetchFile(file));
    const code = await ff.exec(['-hide_banner', '-nostdin', ...argsBuilder(inputName, outputName)]);
    if (code !== 0) throw new Error(`FFmpeg exited with code ${code}.`);
    const data = await ff.readFile(outputName);
    return { bytes: data instanceof Uint8Array ? data : new Uint8Array(data), logs };
  } finally {
    try { await ff.deleteFile(inputName); } catch {}
    try { await ff.deleteFile(outputName); } catch {}
    ff.off?.('log', onLog); ff.off?.('progress', onProgress);
    active = false;
  }
}

export async function runFFmpegMany(
  files: File[],
  build: (inputNames: string[], outputName: string) => string[],
  outputExt: string,
  opts: { maxTotalBytes?: number; onProgress?: ProgressHandler; onLog?: LogHandler } = {}
): Promise<RunResult> {
  if (active) throw new Error('Another media job is already running in this tab.');
  const total = files.reduce((n,f)=>n+f.size,0);
  if (total > (opts.maxTotalBytes ?? MAX_MEDIA_BYTES)) throw new Error('Combined files exceed the browser-local memory budget.');
  active = true;
  const ff = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');
  const base = token('mm');
  const names = files.map((f,i)=>`${base}-in${i}${/\.[a-z0-9]{1,8}$/i.exec(f.name)?.[0] ?? '.bin'}`);
  const outputName = `${base}-output.${outputExt.replace(/^\./,'')}`;
  const logs: string[] = [];
  const onLog = ({ message }: any) => { logs.push(String(message)); opts.onLog?.(String(message)); };
  const onProgress = ({ progress, time }: any) => opts.onProgress?.(Number(progress)||0, Number(time)||0);
  ff.on('log', onLog); ff.on('progress', onProgress);
  try {
    for (let i=0;i<files.length;i++) await ff.writeFile(names[i], await fetchFile(files[i]));
    const code = await ff.exec(['-hide_banner','-nostdin',...build(names, outputName)]);
    if (code !== 0) throw new Error(`FFmpeg exited with code ${code}.`);
    const data = await ff.readFile(outputName);
    return { bytes: data instanceof Uint8Array ? data : new Uint8Array(data), logs };
  } finally {
    for (const n of names) try { await ff.deleteFile(n); } catch {}
    try { await ff.deleteFile(outputName); } catch {}
    ff.off?.('log', onLog); ff.off?.('progress', onProgress);
    active = false;
  }
}

export async function runFFmpegFrames(
  file: File,
  argsBuilder: (inputName: string, pattern: string) => string[],
  ext: 'png'|'jpg',
  opts: { maxFrames: number; onProgress?: ProgressHandler } 
): Promise<{frames: Uint8Array[]; logs: string[]}> {
  if (active) throw new Error('Another media job is already running in this tab.');
  if (file.size > MAX_MEDIA_BYTES) throw new Error('File exceeds the browser-local media limit.');
  active = true;
  const ff = await getFFmpeg(); const { fetchFile } = await import('@ffmpeg/util');
  const base = token('frames'); const inputName = `${base}-input${/\.[a-z0-9]{1,8}$/i.exec(file.name)?.[0] ?? '.bin'}`;
  const pattern = `${base}-%05d.${ext}`; const logs: string[] = [];
  const onLog=({message}:any)=>logs.push(String(message)); const onProgress=({progress,time}:any)=>opts.onProgress?.(Number(progress)||0,Number(time)||0);
  ff.on('log',onLog); ff.on('progress',onProgress);
  try {
    await ff.writeFile(inputName, await fetchFile(file));
    const code=await ff.exec(['-hide_banner','-nostdin',...argsBuilder(inputName, pattern)]); if(code!==0) throw new Error(`FFmpeg exited with code ${code}.`);
    const entries=await ff.listDir('/');
    const names=entries.map((x:any)=>x.name).filter((n:string)=>n.startsWith(base+'-') && n.endsWith('.'+ext)).sort();
    if(names.length>opts.maxFrames) throw new Error(`Frame count ${names.length} exceeds the ${opts.maxFrames} frame cap.`);
    const frames:Uint8Array[]=[]; for(const n of names){ const d=await ff.readFile(n); frames.push(d instanceof Uint8Array?d:new Uint8Array(d)); await ff.deleteFile(n); }
    return {frames,logs};
  } finally { try{await ff.deleteFile(inputName);}catch{} ff.off?.('log',onLog); ff.off?.('progress',onProgress); active=false; }
}

export async function cancelFFmpeg(): Promise<void> {
  if (instance) { instance.terminate(); instance = null; loaded = false; active = false; }
}

export async function runFFmpegLogs(
  file: File,
  argsBuilder: (inputName: string) => string[],
  opts: { maxBytes?: number; onLog?: LogHandler; onProgress?: ProgressHandler } = {}
): Promise<string[]> {
  if (active) throw new Error('Another media job is already running in this tab.');
  if (file.size > (opts.maxBytes ?? MAX_MEDIA_BYTES)) throw new Error('File exceeds the browser-local media limit.');
  active = true;
  const ff = await getFFmpeg(); const { fetchFile } = await import('@ffmpeg/util');
  const base = token('probe'); const inputName = `${base}-input${/\.[a-z0-9]{1,8}$/i.exec(file.name)?.[0] ?? '.bin'}`; const logs:string[]=[];
  const onLog=({message}:any)=>{logs.push(String(message));opts.onLog?.(String(message));}; const onProgress=({progress,time}:any)=>opts.onProgress?.(Number(progress)||0,Number(time)||0);
  ff.on('log',onLog); ff.on('progress',onProgress);
  try { await ff.writeFile(inputName,await fetchFile(file)); const code=await ff.exec(['-hide_banner','-nostdin',...argsBuilder(inputName)]); if(code!==0) throw new Error(`FFmpeg exited with code ${code}.`); return logs; }
  finally { try{await ff.deleteFile(inputName);}catch{} ff.off?.('log',onLog); ff.off?.('progress',onProgress); active=false; }
}
