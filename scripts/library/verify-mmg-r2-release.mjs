#!/usr/bin/env node
/**
 * Live release gate for the 13 restored Mission Mangal R2 calculators.
 * Checks article CTA -> exact calculator HTML -> local JS dependency.
 * Prevents generic HTTP-200 SPA fallback from passing release.
 * Run: node scripts/library/verify-mmg-r2-release.mjs
 */
import assert from 'node:assert/strict';

const site = (process.env.MMG_SITE_ORIGIN || 'https://aafnaipatro.com').replace(/\/$/, '');
const assets = (process.env.MMG_R2_ORIGIN || 'https://library-assets.aafnaipatro.com/phase1').replace(/\/$/, '');
const definitions = [
  ['0174', 'air-content-measurement-calculator-common-mistakes-limits-and-verification-checks', 'air-correction.html', 'Air correction arithmetic check', []],
  ['0300', 'pavement-crossfall-drainage-calculator-transparent-field-math-with-units-and-worked-checks', 'index.html', 'Crossfall and rainfall screening worksheet', []],
  ['0330', 'subgrade-cbr-interpretation-calculator-transparent-field-math-with-units-and-worked-checks', 'index.html', 'CBR arithmetic worksheet', []],
  ['0360', 'connection-slip-and-bolt-preload-calculator-transparent-field-math-with-units-and-worked-checks', 'index.html', 'Slip friction sensitivity worksheet', []],
  ['0810', 'optical-power-meter-uncertainty-estimator-visualizer-make-the-hidden-limits-inspectable', 'calculator.html', 'Optical power meter uncertainty estimator', []],
  ['1608', 'pga-versus-pgv-calculator-visualizer-explore-sensitivity-with-transparent-assumptions', 'calculator.html', 'PGA–PGV frequency explorer', []],
  ['2430', 'camera-pixel-scale-original-browser-only-calculator-or-tool', 'calculator.html', 'Camera pixel scale and field-of-view calculator', ['calculator.js']],
  ['2436', 'telescope-limiting-magnitude-calculator-visualizer-see-how-the-result-changes-with-inputs', 'calculator.html', 'Telescope aperture and limiting-magnitude comparison', ['calculator.js']],
  ['2832', 'poisson-event-probability-calculator-visualizer-explore-the-variables-step-by-step', 'index.html', 'Poisson event probability', ['calculator.mjs']],
  ['2838', 'binomial-confidence-interval-calculator-visualizer-explore-the-variables-step-by-step', 'calculator.html', 'Binomial confidence interval explorer', []],
  ['2844', 'monte-carlo-convergence-calculator-visualizer-explore-the-variables-step-by-step', 'calculator.html', 'Monte Carlo convergence lab', []],
  ['2874', 'effect-size-calculator-visualizer-explore-the-variables-step-by-step', 'calculator.html', 'Independent-group effect size calculator', ['effect_size_core.js','calculator_ui.js']],
  ['2964', 'linear-interpolation-uncertainty-calculator-visualizer-explore-the-variables-step-by-step', 'interpolation-tool.html', 'Linear interpolation with standard uncertainty', ['interpolation-calculator.js']],
];
async function read(url, type) {
  const response = await fetch(url, {redirect: 'follow', signal: AbortSignal.timeout(20000), headers: {'Cache-Control': 'no-cache'}});
  assert.equal(response.status, 200, `HTTP ${response.status}: ${url}`);
  const contentType = response.headers.get('content-type') || '';
  assert.ok(type === 'html' ? /text\/html/i.test(contentType) : /javascript|ecmascript|text\/plain/i.test(contentType),
    `Incorrect Content-Type ${contentType}: ${url}`);
  return response.text();
}
let passed = 0;
const errors = [];
for (const [id, slug, file, title, modules] of definitions) {
  const base = `${assets}/tools/MMG-${id}/`;
  const target = base + file;
  try {
    const [article, tool] = await Promise.all([
      read(`${site}/article/${slug}`, 'html'),
      read(target, 'html'),
    ]);
    assert.ok(article.includes(`href="${target}"`), `Missing live article CTA: MMG-${id}`);
    assert.ok(!article.includes('href="../../assets/MMG-' + id + '/') && !article.includes('href="../../tools/MMG-' + id + '/'),
      `Old relative calculator links remain: MMG-${id}`);
    assert.match(tool, /<!doctype html/i, `Not standalone HTML: MMG-${id}`);
    assert.ok(tool.includes(title), `Wrong calculator identity: MMG-${id}`);
    assert.match(tool, /<input\b/i, `No calculator inputs: MMG-${id}`);
    assert.match(tool, /<script\b/i, `No calculator JS: MMG-${id}`);
    for (const moduleName of modules) {
      const script = await read(base + moduleName, 'js');
      assert.ok(script.length > 100 && !/<html\b/i.test(script.slice(0, 400)),
        `Missing JS or HTML fallback for ${id}/${moduleName}`);
      assert.ok(tool.includes(moduleName), `HTML does not reference sibling module ${id}/${moduleName}`);
    }
    passed++;
  } catch (error) {
    errors.push({topic: `MMG-${id}`, error: error.message});
  }
}
console.log(JSON.stringify({checked: definitions.length, passed, failed: errors.length, module_count: definitions.reduce((n, x) => n + x[4].length, 0), errors}, null, 2));
if (errors.length) process.exitCode = 1;
