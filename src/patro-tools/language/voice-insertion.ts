export function insertDictatedText(value: string, chunk: string, start = value.length, end = start, maxLength = Infinity) {
  start = Math.max(0, Math.min(value.length, start)); end = Math.max(start, Math.min(value.length, end));
  const before = value.slice(0, start), after = value.slice(end);
  const gap = before && !/\s$/.test(before) && !/^\s|^[,?.!।]/.test(chunk) ? ' ' : '';
  const available = Math.max(0, maxLength - before.length - after.length);
  const addition = (gap + chunk).slice(0, available);
  return { text: before + addition + after, cursor: before.length + addition.length };
}
