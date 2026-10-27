export const LIMITS = {
  maxImageBytes: 40 * 1024 * 1024,
  maxPdfBytes: 120 * 1024 * 1024,
  maxFiles: 100,
  maxPixels: 40_000_000,
  maxCanvasSide: 16_384,
  maxPdfPages: 1_000,
  maxSvgBytes: 5 * 1024 * 1024,
  maxAnimationFrames: 1_000,
} as const;

export function assertFinite(value: number, label: string, min?: number, max?: number): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  if (min !== undefined && value < min) throw new Error(`${label} must be at least ${min}.`);
  if (max !== undefined && value > max) throw new Error(`${label} must be at most ${max}.`);
  return value;
}

export function assertBoundedFiles(files: File[], max = LIMITS.maxFiles): void {
  if (!files.length) throw new Error('Choose at least one file.');
  if (files.length > max) throw new Error(`At most ${max} files can be processed at once.`);
}
