const MAX_PDF_BYTES=50_000_000;
let modPromise:Promise<any>|null=null;
export async function pdfjs(){if(!modPromise)modPromise=(async()=>{const m:any=await import('pdfjs-dist');if(m.GlobalWorkerOptions)m.GlobalWorkerOptions.workerSrc='/assets/vendor/pdfjs/pdf.worker.min.mjs';return m})();return modPromise}
export function assertPdf(buf:ArrayBuffer){if(buf.byteLength<5)throw new Error('PDF is too small.');if(buf.byteLength>MAX_PDF_BYTES)throw new Error('PDF exceeds the 50 MB local-processing limit.');const s=String.fromCharCode(...new Uint8Array(buf.slice(0,5)));if(s!=='%PDF-')throw new Error('File does not begin with a PDF header.');}
