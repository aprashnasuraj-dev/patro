import {build} from 'esbuild';
import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ids=process.argv.slice(2);for(const id of ids.length?ids:(await readdir(root)).filter(x=>/^TOOL-\d{4}$/.test(x))){
 await build({entryPoints:[path.join(root,id,'src/ui.ts'),path.join(root,id,'src/worker.ts')],bundle:true,format:'esm',target:['es2022'],outdir:path.join(root,id,'dist'),minify:true,legalComments:'eof',metafile:true}).then(async r=>{const{writeFile}=await import('node:fs/promises');await writeFile(path.join(root,id,'qa/bundle.json'),JSON.stringify(r.metafile,null,2));});
 console.log('BUILT',id);
}
