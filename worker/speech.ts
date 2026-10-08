import { Buffer } from 'node:buffer';
import { consumeSpeechQuota } from './speech-quota';

type SpeechEnv = Record<string, unknown> & {
  AI?: { run(model: string, input: Record<string, unknown>): Promise<any> };
  Groq_API?: string;
  GROQ_API_KEY?: string;
  GROQ_KEY?: string;
  GROQ_STT_MODEL?: string;
};

const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_GROQ_STT_MODEL = "whisper-large-v3-turbo";
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const PROVIDER_TIMEOUT_MS = 45_000;
const WORKERS_AI_MODEL = '@cf/openai/whisper-large-v3-turbo';
const NEPALI_PROMPT = 'नेपाली बोलीलाई नेपाली देवनागरीमा यथार्थ लेख्नुहोस्। व्यक्ति, स्थान, संस्था र प्राविधिक शब्दको हिज्जे जोगाउनुहोस्। पूर्णविराम, अल्पविराम र प्रश्नचिन्ह स्वाभाविक राख्नुहोस्।';

function workersAiAvailable(env: SpeechEnv) { return typeof env.AI?.run === 'function'; }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}

function groqKey(env: SpeechEnv) {
  // Speech must stay available even when D1 has exhausted its read quota.
  // Only Worker secrets/vars are consulted here; never read DB/admin-console overlays.
  return firstString(env.Groq_API, env.GROQ_API_KEY, env.GROQ_KEY);
}

function sttModel(env: SpeechEnv) {
  return firstString(env.GROQ_STT_MODEL) || DEFAULT_GROQ_STT_MODEL;
}

function languageCode(value: FormDataEntryValue | null) {
  return String(value || "ne-NP").toLowerCase().startsWith("en") ? "en" : "ne";
}

function audioLike(value: FormDataEntryValue | null): value is File {
  return !!value && typeof value !== "string" && typeof (value as File).arrayBuffer === "function";
}

function audioFilename(audio: File) {
  const type = audio.type.toLowerCase();
  if (type.includes("ogg")) return "speech.ogg";
  if (type.includes("mp4") || type.includes("m4a")) return "speech.m4a";
  if (type.includes("mpeg") || type.includes("mp3")) return "speech.mp3";
  if (type.includes("wav")) return "speech.wav";
  if (type.includes("flac")) return "speech.flac";
  return "speech.webm";
}

async function transcribe(request: Request, env: SpeechEnv) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_AUDIO_BYTES + 512_000) {
    return json({ error: "audio_too_large", maxBytes: MAX_AUDIO_BYTES }, 413);
  }

  const key = groqKey(env);
  const ai = workersAiAvailable(env);
  if (!ai && !key) return json({ error: "speech_backend_unconfigured" }, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "invalid_multipart_audio" }, 400);
  }

  const audio = form.get("audio");
  if (!audioLike(audio)) return json({ error: "audio_file_required" }, 400);
  if (audio.size <= 0) return json({ error: "empty_audio" }, 400);
  if (audio.size > MAX_AUDIO_BYTES) return json({ error: "audio_too_large", maxBytes: MAX_AUDIO_BYTES }, 413);

  const language = languageCode(form.get("language"));
  const quota = await consumeSpeechQuota(request);
  if (!quota.allowed) {
    const response = json({ error: quota.unavailable ? 'speech_rate_limit_unavailable' : 'speech_rate_limited' }, quota.unavailable ? 503 : 429);
    response.headers.set('retry-after', String(quota.retryAfter));
    return response;
  }
  if (ai) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const input: Record<string, unknown> = {
        audio: Buffer.from(await audio.arrayBuffer()).toString('base64'),
        language, task: 'transcribe',
      };
      if (language === 'ne') input.initial_prompt = NEPALI_PROMPT;
      const payload = await Promise.race([
        env.AI!.run(WORKERS_AI_MODEL, input),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('speech_provider_timeout')), PROVIDER_TIMEOUT_MS); }),
      ]) as any;
      const raw = payload?.text ?? payload?.transcription_info?.text;
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (text) return json({ text, language: language === 'ne' ? 'ne-NP' : 'en-US', provider: WORKERS_AI_MODEL });
      if (!key) return json({ error: 'no_speech_detected' }, 422);
    } catch (error) {
      if (!key) return json({ error: error instanceof Error && error.message === 'speech_provider_timeout' ? 'speech_provider_timeout' : 'speech_provider_failed' }, error instanceof Error && error.message === 'speech_provider_timeout' ? 504 : 502);
    } finally { if (timer) clearTimeout(timer); }
  }
  const model = sttModel(env);
  const upstream = new FormData();
  upstream.append("file", audio, audio.name && audio.name.includes(".") ? audio.name : audioFilename(audio));
  upstream.set("model", model);
  upstream.set("language", language);
  upstream.set("response_format", "json");
  upstream.set("temperature", "0");
  if (language === "ne") {
    upstream.set(
      "prompt",
      NEPALI_PROMPT,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("speech_provider_timeout"), PROVIDER_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}` },
      body: upstream,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) return json({ error: "speech_provider_timeout" }, 504);
    return json({ error: "speech_provider_unreachable" }, 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return json({ error: "speech_provider_failed", status: response.status }, response.status === 429 ? 429 : 502);
  }

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    return json({ error: "speech_provider_invalid_response" }, 502);
  }

  const text = typeof payload?.text === "string" ? payload.text.trim() : "";
  if (!text) return json({ error: "no_speech_detected" }, 422);

  return json({
    text,
    language: language === "ne" ? "ne-NP" : "en-US",
    provider: model,
  });
}

export async function speechApiResponse(request: Request, env: SpeechEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path === "/api/nepali/speech-capabilities" && request.method === "GET") {
    return json({
      stt: { browser: true, server: workersAiAvailable(env) || !!groqKey(env), model: workersAiAvailable(env) ? WORKERS_AI_MODEL : sttModel(env), databaseRequired: false },
      tts: { browser: true, server: false, locale: "ne-NP", databaseRequired: false },
    });
  }

  if (path !== "/api/nepali/stt") return null;
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  return transcribe(request, env);
}
