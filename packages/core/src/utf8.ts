export function utf8Bytes(input: string): number[] {
  return Array.from(new TextEncoder().encode(input));
}
