export function downloadBlob(blob: Blob, filename: string){ const a=document.createElement('a'); const u=URL.createObjectURL(blob); a.href=u; a.download=filename; a.rel='noopener'; a.click(); setTimeout(()=>URL.revokeObjectURL(u),30_000); }
export function escapeHtml(v:string){ return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c)); }
