import { MAX_PDF_BYTES } from '../_vendor/limits';
export interface PdfLink { page:number; kind:'external'|'internal'; target:string; text?:string; rect?:number[]; }
export function classifyLink(raw:string): 'external'|'unsafe' { try { const u=new URL(raw); return /^(https?:|mailto:|tel:)$/i.test(u.protocol)?'external':'unsafe'; } catch { return 'unsafe'; } }
export async function extractPdfLinks(file:File):Promise<PdfLink[]> {
  if(file.size>MAX_PDF_BYTES) throw new Error('PDF exceeds the 100 MiB limit.');
  const pdfjs=await import('pdfjs-dist');
  (pdfjs as any).GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.mjs';
  const doc=await (pdfjs as any).getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
  if(doc.numPages>5000) throw new Error('PDF exceeds the 5,000-page safety cap.');
  const out:PdfLink[]=[];
  for(let p=1;p<=doc.numPages;p++){
    const page=await doc.getPage(p); const anns=await page.getAnnotations({intent:'any'});
    for(const a of anns){
      if(a.subtype!=='Link') continue;
      if(a.url && classifyLink(a.url)==='external') out.push({page:p,kind:'external',target:a.url,rect:a.rect});
      else if(a.dest) out.push({page:p,kind:'internal',target:typeof a.dest==='string'?a.dest:JSON.stringify(a.dest),rect:a.rect});
    }
  }
  await doc.destroy(); return out;
}
export function linksToCsv(rows:PdfLink[]):string { const q=(s:string)=>`"${s.replace(/"/g,'""')}"`; return ['page,kind,target',...rows.map(r=>`${r.page},${r.kind},${q(r.target)}`)].join('\r\n'); }
