import {createHash} from 'node:crypto';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {join, relative, resolve} from 'node:path';

const root = resolve('public/advancetools');
const manifestPath = join(root, 'module-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const slot = '<div class="ad-slot" data-ad-slot="content-end"></div>';
const forbidden = /fe7eda2cd06bda210f4e85075df3069c|d526bb158baa587de984d6036f99adaf|b86f7b1b852ea7f8de7539079e6e7816|c752b529eb7d6d4ebf1096d225dfb10a|b1871169a9878fda2bc2de21a208995a|adsbygoogle|data-ad-slot/i;

async function listFiles(dir) {
  const result = [];
  for (const item of await readdir(dir, {withFileTypes:true})) {
    const path = join(dir, item.name);
    if (item.isDirectory()) result.push(...await listFiles(path));
    else if (item.isFile() && path !== manifestPath) result.push(path);
  }
  return result;
}

const files = await listFiles(root);
let pagesChanged = 0;
for (const path of files.filter(name => name.endsWith('.html'))) {
  const before = await readFile(path, 'utf8');
  const after = before.replaceAll(slot, '');
  if (after !== before) { await writeFile(path, after); pagesChanged++; }
  if (forbidden.test(after)) throw new Error('Unmapped advertising markup: ' + relative(root, path));
}
for (const path of files.filter(name => /\.(?:mjs|js)$/.test(name))) {
  if (forbidden.test(await readFile(path, 'utf8'))) throw new Error('Unmapped advertising code: ' + relative(root, path));
}

const hashes = {}, paths = files.map(path => relative(root, path).split('\\').join('/')).sort();
const previous = Object.keys(manifest.hashes || {}).sort();
if (JSON.stringify(paths) !== JSON.stringify(previous)) throw new Error('Generated asset inventory differs from its manifest.');
let bytes = 0;
for (const name of paths) {
  const body = await readFile(join(root, name));
  bytes += body.length;
  hashes[name] = createHash('sha256').update(body).digest('hex');
}
manifest.hashes = hashes;
manifest.bytes = bytes;
manifest.files = files.length + 1;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({pagesChanged, files:manifest.files, bytes}));
