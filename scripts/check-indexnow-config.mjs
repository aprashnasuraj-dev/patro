// Offline check: reuse the existing IndexNow key; never rotate it during an SEO build.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=process.cwd();
const script=await readFile(resolve(root,'scripts/indexnow.mjs'),'utf8');
const match=script.match(/const key\s*=\s*["']([a-f0-9]{32})["']/);
if(!match)throw new Error('IndexNow script must contain a 32-character hex key');
const file=resolve(root,`public/${match[1]}.txt`);
if((await readFile(file,'utf8')).trim()!==match[1])throw new Error('Published IndexNow key does not match the script');
if(!script.includes('INDEXNOW_DRY_RUN'))throw new Error('IndexNow submission script lost dry-run support');
console.log('IndexNow key file and script agree; no submission or key rotation performed.');
