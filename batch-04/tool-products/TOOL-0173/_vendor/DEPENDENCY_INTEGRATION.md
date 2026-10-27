# Batch-04 media dependency integration notes

This checkpoint intentionally does not vendor runtime binaries. Production integration must pin and self-host every dependency; normal tool usage must not fetch a third-party CDN.

## FFmpeg/WASM

- Source imports target the `@ffmpeg/ffmpeg` 0.12 API family and same-origin `/assets/vendor/ffmpeg/ffmpeg-core.js` + `.wasm`.
- The single-thread core is intentional: it avoids making SharedArrayBuffer / cross-origin isolation a hard requirement for ordinary users. Heavy jobs will be slower than a multithread core.
- Required filters: `palettegen`, `paletteuse`, `transpose`, `hflip`, `vflip`, `setpts`, `atempo`, `atrim`, `afade`, `aresample`, `aformat`, `concat`, `loudnorm`, `silenceremove`, `fps`, `scale`.
- Required muxers/encoders depend on enabled tools. Source planners currently request H.264 via `libx264`, AAC, MP3 via `libmp3lame`, PCM WAV, GIF, PNG, and MJPEG.
- **Licensing gate:** FFmpeg is LGPL 2.1+ by default, but optional GPL components change the resulting build's obligations. FFmpeg's own legal guidance explicitly calls out libx264 as GPL. Do not publish an arbitrary prebuilt core without a license/compliance review. If the site cannot meet those obligations, replace GPL encoder choices with a reviewed alternative and update planners/tests/claims accordingly.
- Browser memory is deliberately capped below ffmpeg.wasm's theoretical WASM limit. Current source rejects individual media above 250 MiB and audio-native decode above 120 MiB.

## PDF.js

- TOOL-0160 expects `pdfjs-dist` with its worker self-hosted at `/assets/vendor/pdfjs/pdf.worker.min.mjs`.
- JavaScript evaluation is disabled for PDF loading in the source.
- Link extraction reads Link annotations; it does not pretend that unannotated text resembling a URL is a clickable PDF link.

## fflate

- TOOL-0167 lazily imports `fflate` solely to ZIP extracted image frames locally. Pin the package in the production lockfile and bundle it with the app; do not fetch it from a CDN at runtime.

## Native browser audio

- TOOL-0177–0179 use `AudioContext.decodeAudioData` and local numeric analysis instead of FFmpeg. Browser-decodable input support therefore varies by browser/OS codec support.
- BPM is an onset/autocorrelation estimate. Spectrogram is a bounded local STFT. Neither is marketed as laboratory-grade metrology.
