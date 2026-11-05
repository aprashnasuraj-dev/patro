import {readFile, writeFile, readdir, stat} from 'node:fs/promises';
import {join, resolve, relative} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {installAdsterra, adsterraCsp, adsterraEligible, ADSTERRA_POPUNDER, ADSTERRA_SOCIAL, ADSTERRA_NATIVE, ADSTERRA_CONTAINER} from '../shared/adsterra.ts';

export async function installAdsterraInBuild(root) {
  let count=0;
  async function walk(dir, base) {
    for(const entry of await readdir(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name), url='/'+relative(base,path).replaceAll('\\','/');
      if(!adsterraEligible(url))continue;
      if(entry.isDirectory()) {if(!['vendor','node_modules','downloads'].includes(entry.name))await walk(path,base);continue;}
      if(!entry.name.endsWith('.html'))continue;
      const before=await readFile(path,'utf8');
      if(!/<head\b/i.test(before)||!/<body\b/i.test(before))continue;
      const after=installAdsterra(before);
      for(const marker of [ADSTERRA_POPUNDER,ADSTERRA_SOCIAL,ADSTERRA_NATIVE,`id="${ADSTERRA_CONTAINER}"`]) {
        if(after.split(marker).length!==2)throw Error('Adsterra expected one instance of '+marker+' in '+path);
      }
      if(after!==before)await writeFile(path,after);
      count++;
    }
  }
  await walk(root,root);
  for(const base of [root,resolve(root,'../.cloudflare/date-pages')]) {
    try {
      await stat(base);
      if(base!==root)await walk(base,base);
      const hp=join(base,'_headers');
      const before=await readFile(hp,'utf8');
      await writeFile(hp,before.replace(/^(\s+Content-Security-Policy:\s*)(.+)$/gmi,(_,prefix,policy)=>prefix+adsterraCsp(policy)));
    } catch(e){if(e.code!=='ENOENT')throw e;}
  }
  // Recompute the deployed module inventory after the final HTML transform.
  const mp=join(root,'advancetools/module-manifest.json');
  try {
    const manifest=JSON.parse(await readFile(mp,'utf8'));let bytes=0;
    for(const file of Object.keys(manifest.hashes)) {
      const data=await readFile(join(root,'advancetools',file));
      manifest.hashes[file]=createHash('sha256').update(data).digest('hex');bytes+=data.byteLength;
    }
    manifest.bytes=bytes;await writeFile(mp,JSON.stringify(manifest,null,2)+'\n');
  }catch(e){if(e.code!=='ENOENT')throw e;}
  if(!count)throw Error('Adsterra: no eligible HTML documents found');
  console.log(`Adsterra installed in ${count} HTML documents; one Popunder, Social Bar and native widget per page.`);
  return count;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await installAdsterraInBuild(resolve(process.argv[2]||'dist'));
