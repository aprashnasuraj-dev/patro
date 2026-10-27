import { LIMITS } from './limits';
import { assertFileSize } from './files';

export async function loadPdfLib(file: File) {
  assertFileSize(file, 'pdf');
  const { PDFDocument } = await import('pdf-lib');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
  if (doc.getPageCount() > LIMITS.maxPdfPages) throw new Error(`PDF exceeds the ${LIMITS.maxPdfPages}-page safety limit.`);
  return { doc, bytes, PDFDocument };
}

export async function loadPdfJs(file: File) {
  assertFileSize(file, 'pdf');
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/assets/vendor/pdfjs/pdf.worker.min.mjs';
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false });
  const pdf = await task.promise;
  if (pdf.numPages > LIMITS.maxPdfPages) { await pdf.destroy(); throw new Error(`PDF exceeds the ${LIMITS.maxPdfPages}-page safety limit.`); }
  return { pdf, pdfjs };
}

export async function renderPdfPageToCanvas(pdf: any, pageNumber: number, scale = 1.25): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  if (viewport.width * viewport.height > LIMITS.maxPixels) throw new Error('Rendered PDF page exceeds canvas safety limits.');
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return canvas;
}
