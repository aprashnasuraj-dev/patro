export function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing UI element #${id}`);
  return node as T;
}
export function setStatus(message: string, kind: 'info'|'ok'|'warn'|'error' = 'info'): void {
  const node = el<HTMLElement>('status');
  node.textContent = message;
  node.dataset.kind = kind;
}
export function pct(value: number): string { return `${Math.round(value * 100)}%`; }
export function bytes(value: number): string {
  const units = ['B','KiB','MiB','GiB']; let n = value; let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}
