/**
 * public/sitemap-nepalidictionary.xml + the root sitemap index + seo-manifest.json.
 * Runs BEFORE `vite build` (public/ is copied into dist/). Usage: node scripts/dictionary/sitemap.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import { DICT_BASE_PATH } from '../../src/lib/dictionary-core/index.ts';
import { BUILD_DATE, updateSitemapIndex, urlsetXml } from '../sitemap-utils.mjs';
import { encPath, loadBuild, plan } from './pages.ts';

const FILE = 'sitemap-nepalidictionary.xml';
const p = plan(loadBuild());
const routes: Array<{ route: string; lastmod?: string }> = [
  ...p.fixed.map((route) => ({ route })),
  ...p.lists.map((l) => ({ route: `${DICT_BASE_PATH}/sikau/${l.id}` })),
  ...p.browse.map((b) => ({ route: encPath(b.path) })),
  ...p.wordPaths.map((w) => ({ route: encPath(w.path), lastmod: w.lastmod?.slice(0, 10) })),
  ...p.rhymes.map((c) => ({ route: encPath(`${DICT_BASE_PATH}/anupras/${c.keys.slug}`) })),
  ...p.english.map((k) => ({ route: `${DICT_BASE_PATH}/en/${encodeURIComponent(k.replace(/\s+/g, '-'))}` })),
];
await writeFile(`public/${FILE}`, urlsetXml(routes));
await updateSitemapIndex('public/sitemap.xml', [{ file: FILE, lastmod: BUILD_DATE }]);
try {
  const manifest = JSON.parse(await readFile('public/seo-manifest.json', 'utf8'));
  manifest.sitemap_files = [...new Set([...(manifest.sitemap_files ?? []), FILE])];
  manifest.dictionary_route_count = routes.length;
  await writeFile('public/seo-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
}
console.log(`✔ ${FILE}: ${routes.length} URLs (${p.wordPaths.length} words, ${p.english.length} English, ${p.browse.length} A–Z, ${p.rhymes.length} rhyme pages)`);
