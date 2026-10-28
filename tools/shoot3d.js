/* Visual QA for the 3D "Core" experience — captures each chapter by
   scrolling to its scroll offset, plus the DOM content bands.
   Run: node tools/shoot3d.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:4173/3d/';
const OUT = path.join(__dirname, '..', '.shots3d');

const ARGS = [
  '--no-sandbox',
  '--disable-gpu-sandbox',
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--disable-dev-shm-usage'
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ARGS
  });

  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000);
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url() + ' ' + (r.failure()?.errorText || '')));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);   // boot + shader compile

  const gl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const ctx2 = c.getContext('webgl2') || c.getContext('webgl');
    return ctx2 ? ctx2.getParameter(ctx2.VERSION) : 'NONE';
  });
  console.log('WebGL context:', gl);

  // Chapter 0
  await page.screenshot({ path: path.join(OUT, 'ch0-ignition.png') });

  // Scroll through the five chapters
  const trackInfo = await page.evaluate(() => {
    const t = document.getElementById('scrollTrack');
    return { top: t.offsetTop, height: t.offsetHeight, vh: innerHeight };
  });
  console.log('track', trackInfo);

  const names = ['ch0-ignition', 'ch1-eight', 'ch2-arena', 'ch3-crown', 'ch4-uplink'];
  for (let i = 1; i < 5; i++) {
    const p = i / 4;
    const y = trackInfo.top + (trackInfo.height - trackInfo.vh) * p;
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(2600);
    await page.screenshot({ path: path.join(OUT, `${names[i]}.png`) });
  }

  // Interaction: click the first projected 3D label
  await page.evaluate((v) => window.scrollTo(0, v), trackInfo.top + (trackInfo.height - trackInfo.vh) * 0.25);
  await page.waitForTimeout(2200);
  const tag = await page.$('.tag3d');
  if (tag) {
    await tag.click({ force: true });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, 'panel-open.png') });
  } else {
    errors.push('no .tag3d label found');
  }

  // Content bands — viewport grabs, because the live canvas never lets an
  // element screenshot reach Playwright's "stable" requirement.
  for (const id of ['stats', 'domains2d', 'schedule', 'speakers2d', 'register']) {
    const el = await page.$(`#${id}`);
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(OUT, `band-${id}.png`) });
    }
  }

  // Mobile
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const mp = await mctx.newPage();
  mp.setDefaultTimeout(180000);
  mp.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
  await mp.goto(BASE, { waitUntil: 'networkidle' });
  await mp.waitForTimeout(6000);
  await mp.screenshot({ path: path.join(OUT, 'mobile-ch0.png') });
  await mp.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.22));
  await mp.waitForTimeout(2200);
  await mp.screenshot({ path: path.join(OUT, 'mobile-ch1.png') });
  await mctx.close();

  await ctx.close();
  await browser.close();

  if (errors.length) {
    console.log('\n=== ISSUES ===');
    [...new Set(errors)].forEach((e) => console.log('  •', e));
    process.exitCode = 1;
  } else {
    console.log('No console errors, page errors or failed requests.');
  }
}

main();
