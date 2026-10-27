import { LIMITS } from './limits';

export function safeFilename(name: string, fallback = 'output'): string {
  const base = name.replace(/[\\/\0<>:"|?*\u0000-\u001f]/g, '_').replace(/\.{2,}/g, '.').trim();
  return (base || fallback).slice(0, 180);
}

export function stem(name: string): string {
  return safeFilename(name).replace(/\.[^.]+$/, '');
}

export function assertFileSize(file: File, kind: 'image'|'pdf'|'svg'|'generic' = 'generic'): void {
  const max = kind === 'image' ? LIMITS.maxImageBytes : kind === 'pdf' ? LIMITS.maxPdfBytes : kind === 'svg' ? LIMITS.maxSvgBytes : LIMITS.maxPdfBytes;
  if (file.size <= 0) throw new Error(`${file.name}: empty files are not supported.`);
  if (file.size > max) throw new Error(`${file.name}: file exceeds the ${Math.floor(max / 1024 / 1024)} MB local-processing limit.`);
}

export async function readBytes(file: File, kind: 'image'|'pdf'|'svg'|'generic' = 'generic'): Promise<Uint8Array> {
  assertFileSize(file, kind);
  return new Uint8Array(await file.arrayBuffer());
}

export function mimeFromMagic(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return 'image/jpeg';
  if (bytes.length >= 6 && String.fromCharCode(...bytes.slice(0,6)) === 'GIF89a') return 'image/gif';
  if (bytes.length >= 6 && String.fromCharCode(...bytes.slice(0,6)) === 'GIF87a') return 'image/gif';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return 'image/webp';
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0,5)) === '%PDF-') return 'application/pdf';
  return null;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = safeFilename(filename);
  a.rel = 'noopener';
  a.click();
  queueMicrotask(() => URL.revokeObjectURL(url));
}
