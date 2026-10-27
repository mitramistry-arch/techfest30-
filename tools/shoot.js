/* Visual QA harness — renders the landing page at several breakpoints and
   writes screenshots to .shots/ (git-ignored). Run: node tools/shoot.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const OUT = path.join(__dirname, '..', '.shots');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop',  width: 1280, height: 800 },
  { name: 'tablet',  width: 820,  height: 1180 },
  { name: 'mobile',  width: 390,  height: 844 }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });

  const errors = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1
    });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${vp.name}] console: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`[${vp.name}] pageerror: ${e.message}`));
    page.on('requestfailed', (r) => errors.push(`[${vp.name}] 404/fail: ${r.url()} ${r.failure()?.errorText}`));

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3200);            // let the boot sequence finish
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);            // trigger lazy reveals
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);

    await page.screenshot({ path: path.join(OUT, `${vp.name}-top.png`) });
    await page.screenshot({ path: path.join(OUT, `${vp.name}-full.png`), fullPage: true });

    // Section-by-section captures
    if (vp.name === 'desktop') {
      for (const id of ['protocol', 'domains', 'schedule', 'speakers', 'showcase', 'voices', 'faq', 'register']) {
        const el = await page.$(`#${id}`);
        if (el) {
          await el.scrollIntoViewIfNeeded();
          await page.waitForTimeout(700);
          await el.screenshot({ path: path.join(OUT, `sec-${id}.png`) }).catch(() => {});
        }
      }
      // Day-mode capture
      await page.click('#modeToggle');
      await page.waitForTimeout(900);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT, 'desktop-day.png') });
    }

    if (vp.name === 'mobile') {
      await page.click('#burger');
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT, 'mobile-menu.png') });
    }

    await ctx.close();
  }

  await browser.close();

  if (errors.length) {
    console.log('\n=== PAGE ISSUES ===');
    [...new Set(errors)].forEach((e) => console.log(' •', e));
    process.exitCode = 1;
  } else {
    console.log('No console errors, page errors or failed requests.');
  }
})();
