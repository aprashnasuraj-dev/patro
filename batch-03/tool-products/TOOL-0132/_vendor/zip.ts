export async function zipFiles(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  const { zipSync } = await import('fflate');
  return zipSync(files, { level: 6 });
}
