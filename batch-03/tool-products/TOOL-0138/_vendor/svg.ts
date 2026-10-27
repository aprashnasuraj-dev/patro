import { LIMITS } from './limits';

const URL_ATTRS = new Set(['href','xlink:href','src']);
export function sanitizeSvg(source: string): string {
  if (new TextEncoder().encode(source).byteLength > LIMITS.maxSvgBytes) throw new Error('SVG exceeds local size limit.');
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('Malformed SVG/XML.');
  for (const el of [...doc.querySelectorAll('script,foreignObject,iframe,object,embed')]) el.remove();
  for (const el of [...doc.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) {
      const n=attr.name.toLowerCase(); const v=attr.value.trim();
      if (n.startsWith('on')) el.removeAttribute(attr.name);
      else if (URL_ATTRS.has(n) && /^(?:https?:|data:text\/html|javascript:)/i.test(v)) el.removeAttribute(attr.name);
      else if (n === 'style' && /url\s*\(\s*['"]?(?:https?:|javascript:)/i.test(v)) el.removeAttribute(attr.name);
    }
  }
  return new XMLSerializer().serializeToString(doc.documentElement);
}

export function svgBlob(source: string): Blob { return new Blob([sanitizeSvg(source)], {type:'image/svg+xml'}); }
