import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve('public');
const specs = [
  ['/tools/MMG-0174/air-correction.html', 'Air correction arithmetic check'],
  ['/tools/MMG-0300/index.html', 'Crossfall and rainfall screening worksheet'],
  ['/tools/MMG-0330/index.html', 'CBR arithmetic worksheet'],
  ['/tools/MMG-0360/index.html', 'Slip friction sensitivity worksheet'],
  ['/assets/MMG-0810/calculator.html', 'Optical power meter uncertainty estimator'],
  ['/assets/MMG-1608/calculator.html', 'PGA–PGV frequency explorer'],
  ['/assets/MMG-2430/calculator.html', 'Camera pixel scale and field-of-view calculator'],
  ['/assets/MMG-2436/calculator.html', 'Telescope aperture and limiting-magnitude comparison'],
  ['/tools/MMG-2832/index.html', 'Poisson event probability'],
  ['/assets/MMG-2838/calculator.html', 'Binomial confidence interval explorer'],
  ['/assets/MMG-2844/calculator.html', 'Monte Carlo convergence lab'],
  ['/assets/MMG-2874/calculator.html', 'Independent-group effect size calculator'],
  ['/assets/MMG-2964/interpolation-tool.html', 'Linear interpolation with standard uncertainty'],
];
async function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(root, '.' + pathname);
      if (!file.startsWith(root + sep)) {
        res.writeHead(403); res.end(); return;
      }
      const data = await readFile(file);
      res.setHeader('content-type', pathname.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
      res.writeHead(200); res.end(data);
    } catch {
      res.writeHead(404); res.end('File not found');
    }
  });
  await new Promise(resolveReady => server.listen(0, '127.0.0.1', resolveReady));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test('all 13 static calculators boot on desktop and mobile with no uncaught JS errors', { timeout: 120000 }, async () => {
  const { server, base } = await startStaticServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      let errors = [];
      page.on('pageerror', e => errors.push(e.message));
      for (const [path, needle] of specs) {
        errors = [];
        const response = await page.goto(base + path, { waitUntil: 'load' });
        assert.equal(response.status(), 200, path);
        assert.ok((await page.locator('h1').innerText()).toLowerCase().includes(needle.toLowerCase()), path);
        assert.ok(await page.locator('input').count() > 0, `No inputs: ${path}`);
        assert.ok(await page.locator('input').first().isVisible(), `Inputs hidden: ${path}`);
        assert.deepEqual(errors, [], `Uncaught browser errors: ${path}, viewport ${viewport.width}`);
      }
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(done => server.close(done));
  }
});

test('optical uncertainty calculator exercises REVIEW/PASS/FAIL and invalid input', { timeout: 30000 }, async () => {
  const { server, base } = await startStaticServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(base + '/assets/MMG-0810/calculator.html');
    assert.match(await page.locator('#decision').innerText(), /^REVIEW/);
    assert.match(await page.locator('#working').innerText(), /0\.1612/);
    await page.locator('#loss').fill('0.5');
    assert.match(await page.locator('#decision').innerText(), /^PASS/);
    await page.locator('#loss').fill('5');
    assert.match(await page.locator('#decision').innerText(), /^FAIL/);
    await page.locator('#source').fill('-1');
    assert.match(await page.locator('#decision').innerText(), /Invalid inputs/i);
  } finally {
    if (browser) await browser.close();
    await new Promise(done => server.close(done));
  }
});

test('concrete air correction checks arithmetic and rejects correction larger than apparent air', { timeout: 30000 }, async () => {
  const { server, base } = await startStaticServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(base + '/tools/MMG-0174/air-correction.html');
    await page.locator('#a').fill('8');
    await page.locator('#g').fill('1');
    await page.locator('#f button').click();
    assert.match(await page.locator('#o').innerText(), /7\.00%/);
    await page.locator('#g').fill('9');
    await page.locator('#f button').click();
    assert.match(await page.locator('#o').innerText(), /correction no greater than apparent air/i);
  } finally {
    if (browser) await browser.close();
    await new Promise(done => server.close(done));
  }
});
