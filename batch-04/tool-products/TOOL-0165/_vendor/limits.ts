export const MiB = 1024 * 1024;
export const MAX_MEDIA_BYTES = 250 * MiB;
export const MAX_AUDIO_BYTES = 120 * MiB;
export const MAX_PDF_BYTES = 100 * MiB;
export const MAX_TEXT_BYTES = 2 * MiB;

export function assertFile(file: File, maxBytes: number, allowed?: RegExp): void {
  if (!file || file.size <= 0) throw new Error('Choose a non-empty file.');
  if (file.size > maxBytes) throw new Error(`File is too large for this browser-local tool (${Math.ceil(file.size / MiB)} MiB > ${Math.floor(maxBytes / MiB)} MiB limit).`);
  if (allowed && !allowed.test(file.name.toLowerCase()) && !allowed.test(file.type.toLowerCase())) {
    throw new Error('Unsupported file type for this tool.');
  }
}

export function finite(value: unknown, name: string, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return n;
}

export function safeStem(name: string): string {
  return (name.replace(/\.[^.]+$/, '').normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'output');
}
