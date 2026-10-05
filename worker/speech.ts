type SpeechEnv = Record<string, unknown> & {
  Groq_API?: string;
  GROQ_API_KEY?: string;
  GROQ_KEY?: string;
};

const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_STT_MODEL = "whisper-large-v3-turbo";
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

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

function groqKey(env: SpeechEnv) {
  const candidates = [env.Groq_API, env.GROQ_API_KEY, env.GROQ_KEY];
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() || "";
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
  if (!key) return json({ error: "speech_backend_unconfigured" }, 503);

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
  const upstream = new FormData();
  upstream.append("file", audio, audio.name && audio.name.includes(".") ? audio.name : audioFilename(audio));
  upstream.set("model", GROQ_STT_MODEL);
  upstream.set("language", language);
  upstream.set("response_format", "json");
  upstream.set("temperature", "0");
  if (language === "ne") {
    upstream.set(
      "prompt",
      "नेपाली बोलीलाई नेपाली देवनागरीमा यथार्थ लेख्नुहोस्। व्यक्ति, स्थान, संस्था र प्राविधिक शब्दको हिज्जे जोगाउनुहोस्। पूर्णविराम, अल्पविराम र प्रश्नचिन्ह स्वाभाविक राख्नुहोस्।",
    );
  }

  let response: Response;
  try {
    response = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}` },
      body: upstream,
    });
  } catch {
    return json({ error: "speech_provider_unreachable" }, 502);
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
    provider: GROQ_STT_MODEL,
  });
}

export async function speechApiResponse(request: Request, env: SpeechEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path === "/api/nepali/speech-capabilities" && request.method === "GET") {
    return json({
      stt: { browser: true, server: !!groqKey(env), model: GROQ_STT_MODEL },
      tts: { browser: true, server: false, locale: "ne-NP" },
    });
  }

  if (path !== "/api/nepali/stt") return null;
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  return transcribe(request, env);
}
