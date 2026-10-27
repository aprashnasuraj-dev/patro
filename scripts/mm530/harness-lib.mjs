/** Shared QA-harness normalization. This must not change tool product behavior. */
export function metadataId(data){
  if(!data || typeof data!=='object') return null;
  for(const key of ['tool_id','id','toolId']){
    const value=data[key];
    if(typeof value==='string' && /^TOOL-\d{4}$/.test(value)) return value;
  }
  if(Number.isInteger(data.build_sequence) && data.build_sequence>=1 && data.build_sequence<=530){
    return 'TOOL-'+String(data.build_sequence).padStart(4,'0');
  }
  return null;
}
export function classifyTestFramework(file,source=''){
  const name=String(file).toLowerCase();
  if(name.includes('browser') || /\b(playwright|puppeteer)\b/i.test(source)) return 'browser';
  if(/from\s*['"]vitest['"]|require\(['"]vitest['"]\)|\bvitest\b/.test(source)) return 'vitest';
  if(/from\s*['"]node:test['"]|require\(['"]node:test['"]\)/.test(source)) return 'node-test';
  if(/from\s*['"]bun:test['"]|require\(['"]bun:test['"]\)/.test(source)) return 'bun-test';
  if(/@jest\/globals|\bjest\.(?:fn|mock|spyOn)\b/.test(source)) return 'jest';
  return 'unknown';
}
export function browserBuildOptions(entry){
  return {
    entryPoints:[entry], bundle:true, write:false, outdir:'.mm530-esbuild',
    format:'esm', platform:'browser', target:'es2022', packages:'external',
    external:['/vendor/*','/assets/*','/fonts/*'],
    logLevel:'silent',
    loader:{
      '.css':'css','.svg':'text','.png':'file','.jpg':'file','.jpeg':'file',
      '.gif':'file','.webp':'file','.woff':'file','.woff2':'file','.wasm':'file'
    }
  };
}
export function nodeTestBuildOptions(input,outfile){
  return {
    entryPoints:[input], outfile, bundle:true, platform:'node', format:'esm',
    target:'node24', packages:'external', write:true, logLevel:'silent',
    external:['/vendor/*','/assets/*','/fonts/*'],
    loader:{'.css':'text','.svg':'text','.png':'file','.jpg':'file','.jpeg':'file','.webp':'file','.wasm':'file'}
  };
}

export function classifyNodeTestFailure(note){
 const s=String(note||'');
 if(/ERR_MODULE_NOT_FOUND/.test(s)&&/Cannot find package/.test(s))return {state:'NOT_RUN',kind:'node-test-dependency-prerequisite'};
 if(/(?:\/|\\)tests(?:\/|\\)[^\s:]+.*SyntaxError|SyntaxError.*(?:\/|\\)tests(?:\/|\\)/s.test(s))return {state:'NOT_RUN',kind:'invalid-test-fixture'};
 return {state:'FAIL',kind:'test-failure'};
}
