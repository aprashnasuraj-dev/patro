'use client';
/**
 * Nepali OCR in the browser with tesseract.js ("nep" model, ~ 10 MB, cached).
 *   npm i tesseract.js
 *
 * Tips that matter more than the model:
 *  - upscale small photos to ≥ 1500 px width
 *  - grayscale + Otsu threshold removes shadows from phone photos
 *  - run normalize() + spellcheck on the output; OCR confuses ि/ी and ब/व often
 *  - for PDFs typed in Preeti: extract text (not OCR) and run your Preeti→Unicode converter
 */
import { useCallback, useRef, useState } from 'react';
import { normalize } from '../spellcheck';

async function preprocess(file: Blob, threshold: boolean): Promise<HTMLCanvasElement> {
  const img = await createImageBitmap(file);
  const scale=Math.min(Math.max(1,1500/img.width),3000/Math.max(img.width,img.height),Math.sqrt(8_000_000/(img.width*img.height)));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  img.close();
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  const hist = new Array(256).fill(0);
  for (let i = 0; i < px.length; i += 4) {
    const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    px[i] = px[i + 1] = px[i + 2] = g;
    hist[g]++;
  }
  // Otsu threshold
  const total = c.width * c.height;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = t; }
  }
  if(threshold) for (let i = 0; i < px.length; i += 4) { const v = px[i] > thr ? 255 : 0; px[i] = px[i + 1] = px[i + 2] = v; }
  ctx.putImageData(data, 0, 0);
  return c;
}

export function useNepaliOcr() {
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const workerRef = useRef<any>(null);

  const recognize = useCallback(async (file: Blob, opts: { langs?: string; threshold?: boolean } = {}) => {
    setBusy(true);setProgress(0);
    try {
      const { createWorker } = await import('tesseract.js');
      if (!workerRef.current) {
        workerRef.current = await createWorker(opts.langs ?? 'nep+eng', 1, {
          logger: (m: any) => m.status === 'recognizing text' && setProgress(m.progress),
        });
      }
      const canvas = await preprocess(file,opts.threshold===true);
      const { data } = await workerRef.current.recognize(canvas);
      return { text: normalize(data.text).text, confidence: data.confidence as number };
    } finally {
      setBusy(false);
    }
  }, []);

  const dispose = useCallback(async () => { await workerRef.current?.terminate(); workerRef.current = null; }, []);
  return { recognize, dispose, progress, busy };
}
