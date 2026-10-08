export type LocalSpeechStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable';
export type LocalSpeechAPI = { available?: (options: { langs: string[]; processLocally: true }) => Promise<string>; install?: (options: { langs: string[]; processLocally: true }) => Promise<boolean> };

async function bounded<T>(promise: Promise<T>, timeout: number, signal?: AbortSignal): Promise<T | null> {
  if (signal?.aborted) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([promise, new Promise<null>(resolve => {
      timer = setTimeout(() => resolve(null), Math.max(0, timeout));
      abort = () => resolve(null); signal?.addEventListener('abort', abort, { once: true });
    })]);
  } catch { return null; }
  finally { clearTimeout(timer); if (abort) signal?.removeEventListener('abort', abort); }
}

/** Only local availability is checked; exposed cloud SR is still probed at start. */
export async function localSpeechStatus(api: LocalSpeechAPI | null, language: string, timeout = 10_000, signal?: AbortSignal): Promise<LocalSpeechStatus> {
  if (!api?.available || signal?.aborted) return 'unavailable';
  const deadline = Date.now() + timeout;
  do {
    const state = await bounded(Promise.resolve().then(() => api.available!({ langs: [language], processLocally: true })), deadline - Date.now(), signal);
    if (state === 'available' || state === 'downloadable') return state;
    if (state !== 'downloading' || signal?.aborted || Date.now() >= deadline) return 'unavailable';
    await bounded(new Promise(resolve => setTimeout(resolve, Math.min(500, deadline - Date.now()))), deadline - Date.now(), signal);
  } while (!signal?.aborted && Date.now() < deadline);
  return 'unavailable';
}

export async function installLocalSpeech(api: LocalSpeechAPI | null, language: string, timeout = 60_000, signal?: AbortSignal): Promise<LocalSpeechStatus> {
  if (!api?.install || signal?.aborted) return 'unavailable';
  try {
    // Invoke immediately in the download-button gesture, before awaiting.
    const installed = await bounded(api.install({ langs: [language], processLocally: true }), timeout, signal);
    return installed ? localSpeechStatus(api, language, Math.min(timeout, 10_000), signal) : 'unavailable';
  } catch { return 'unavailable'; }
}
