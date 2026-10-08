export type RecordingProgress = { completed: number; pending: number; elapsedSeconds: number };
export type ChunkedRecording = { stop(): void; cancel(): void };

/** Each segment has its own recorder/container header, not a timeslice fragment. */
export function recordVoiceChunks(options: {
  stream: MediaStream;
  mimeType: string;
  transcribe: (audio: Blob, signal: AbortSignal) => Promise<string>;
  onText: (text: string) => void;
  onProgress: (progress: RecordingProgress) => void;
  onError: (error: unknown) => void;
  onEnd: () => void;
  chunkMs?: number;
}): ChunkedRecording {
  const controller = new AbortController();
  let active = true, failed = false, ended = false;
  let recorder: MediaRecorder | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = 0, completed = 0;
  let queue = Promise.resolve();
  const started = Date.now();
  const progress = () => options.onProgress({ completed, pending, elapsedSeconds: Math.floor((Date.now() - started) / 1000) });
  const clock = setInterval(progress, 1000);
  const tracks = () => options.stream.getTracks().forEach(track => track.stop());
  const finish = () => {
    if (ended || active || pending || recorder) return;
    ended = true; clearInterval(clock); tracks(); progress(); options.onEnd();
  };
  const stop = () => {
    active = false; clearTimeout(timer); clearInterval(clock);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    else { recorder = null; tracks(); finish(); }
  };
  const fail = (error: unknown) => {
    if (failed || controller.signal.aborted) return;
    failed = true; options.onError(error); stop();
  };
  const segment = () => {
    if (!active || controller.signal.aborted) return;
    try {
      const current = new MediaRecorder(options.stream, options.mimeType ? { mimeType: options.mimeType } : undefined);
      recorder = current;
      const parts: Blob[] = [];
      current.ondataavailable = event => { if (event.data?.size) parts.push(event.data); };
      current.onerror = () => fail(new Error('Audio recording failed.'));
      current.onstop = () => {
        if (recorder === current) recorder = null;
        const blob = new Blob(parts, { type: current.mimeType || options.mimeType || 'audio/webm' });
        if (blob.size && !controller.signal.aborted && !failed) {
          pending++; progress();
          queue = queue.then(async () => {
            try {
              if (controller.signal.aborted || failed) return;
              const text = await options.transcribe(blob, controller.signal);
              if (!controller.signal.aborted && !failed) { if (text) options.onText(text); completed++; }
            } catch (error) { fail(error); }
            finally { pending--; progress(); finish(); }
          });
        }
        if (!active) tracks();
        // Bound retained audio during a slow/offline provider rather than silently
        // accumulating an unlimited recording in memory.
        if (active && pending >= 4) fail(new Error('Transcription is too slow. Recording stopped; please retry.'));
        if (active) segment(); else finish();
      };
      current.start();
      timer = setTimeout(() => { if (current.state !== 'inactive') current.stop(); }, options.chunkMs ?? 12_000);
    } catch (error) { recorder = null; fail(error); finish(); }
  };
  segment(); progress();
  return { stop, cancel() { controller.abort(); stop(); tracks(); } };
}
