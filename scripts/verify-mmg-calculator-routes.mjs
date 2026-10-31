#!/usr/bin/env node
/**
 * Mission Mangal static calculator release gate.
 * Default: inspect public/ and dist/; --source-only: public/ only;
 * --remote: inspect deployed routes on the public domain.
 * HTTP 200 is never sufficient: verify tool identity and JS dependencies.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const tools = [
  ['0174', '/tools/MMG-0174/air-correction.html', 'Air correction arithmetic check'],
  ['0300', '/tools/MMG-0300/index.html', 'Crossfall and rainfall screening worksheet'],
  ['0330', '/tools/MMG-0330/index.html', 'CBR arithmetic worksheet'],
  ['0360', '/tools/MMG-0360/index.html', 'Slip friction sensitivity worksheet'],
  ['0810', '/assets/MMG-0810/calculator.html', 'Optical power meter uncertainty estimator'],
  ['1608', '/assets/MMG-1608/calculator.html', 'PGA–PGV frequency explorer'],
  ['2430', '/assets/MMG-2430/calculator.html', 'Camera pixel scale and field-of-view calculator'],
  ['2436', '/assets/MMG-2436/calculator.html', 'Telescope aperture and limiting-magnitude comparison'],
  ['2832', '/tools/MMG-2832/index.html', 'Poisson event probability'],
  ['2838', '/assets/MMG-2838/calculator.html', 'Binomial confidence interval explorer'],
  ['2844', '/assets/MMG-2844/calculator.html', 'Monte Carlo convergence lab'],
  ['2874', '/assets/MMG-2874/calculator.html', 'Independent-group effect size calculator'],
  ['2964', '/assets/MMG-2964/interpolation-tool.html', 'Linear interpolation with standard uncertainty'],
];
const dependencies = [
  '/assets/MMG-2430/calculator.js',
  '/assets/MMG-2436/calculator.js',
  '/tools/MMG-2832/calculator.mjs',
  '/assets/MMG-2874/effect_size_core.js',
  '/assets/MMG-2874/calculator_ui.js',
  '/assets/MMG-2964/interpolation-calculator.js',
];
const mode = process.argv.includes('--remote') ? 'remote' : process.argv.includes('--source-only') ? 'source' : 'dist';
const origin = (process.env.MMG_TOOL_ORIGIN || 'https://aafnaipatro.com').replace(/\/$/, '');
const paths = [...tools.map(row => row[1]), ...dependencies];

function verifyHtml(body, id, needle, path) {
  assert.match(body, /<!doctype html>/i, `Missing document doctype: ${path}`);
  assert.match(body, /<title\b/i, `Missing title: ${path}`);
  assert.match(body, /<input\b/i, `No calculator inputs: ${path}`);
  assert.match(body, /<script\b/i, `No calculator code: ${path}`);
  assert.ok(body.toLowerCase().includes(needle.toLowerCase()), `Unexpected generic page instead of MMG-${id}: ${path}`);
}
function verifyDependency(body, path) {
  assert.ok(body.length > 80, `Empty/truncated module: ${path}`);
  assert.ok(!/<html\b/i.test(body.slice(0, 400)), `HTML fallback instead of JS: ${path}`);
}
async function read(root, path) {
  return readFile(join(resolve(root), path.slice(1)));
}
async function localCheck() {
  for (const path of paths) {
    const source = await read('public', path);
    if (mode === 'dist') {
      const shipped = await read('dist', path);
      assert.deepEqual(shipped, source, `Vite build lost/changed calculator source ${path}`);
    }
    const text = source.toString('utf8');
    const spec = tools.find(row => row[1] === path);
    if (spec) verifyHtml(text, spec[0], spec[2], path);
    else verifyDependency(text, path);
  }
}
async function fetchRoute(path) {
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(15000), redirect: 'follow', headers: {'accept': path.endsWith('.html') ? 'text/html' : 'application/javascript'} });
  assert.equal(response.status, 200, `Unexpected HTTP ${response.status}: ${path}`);
  const type = response.headers.get('content-type') || '';
  assert.ok(path.endsWith('.html') ? /text\/html/i.test(type) : /javascript|ecmascript|text\/plain/i.test(type), `Wrong content type ${type}: ${path}`);
  return response.text();
}
async function remoteCheck() {
  for (const [id, path, needle] of tools) verifyHtml(await fetchRoute(path), id, needle, path);
  for (const path of dependencies) verifyDependency(await fetchRoute(path), path);
}
try {
  if (mode === 'remote') await remoteCheck(); else await localCheck();
  console.log(`PASS: Mission Mangal ${tools.length} HTML calculators + ${dependencies.length} JavaScript dependencies (${mode})`);
} catch (error) {
  console.error('Mission Mangal calculator release gate FAILED:', error.message);
  process.exitCode = 1;
}
