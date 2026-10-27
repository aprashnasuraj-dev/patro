// After npm ci --prefix tool-products/_shared, expose dependencies to sibling source/tests.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));const target=path.join(here,'node_modules'),link=path.join(here,'../node_modules');
if(!fs.existsSync(target))throw new Error('Run npm ci --prefix tool-products/_shared first.');
if(fs.existsSync(link)){if(fs.realpathSync(link)!==fs.realpathSync(target))throw new Error('Existing node_modules differs; reconcile dependencies manually without overwriting it.');}else fs.symlinkSync(process.platform==='win32'?target:'_shared/node_modules',link,process.platform==='win32'?'junction':'dir');
console.log('Dependency resolution prepared.');
