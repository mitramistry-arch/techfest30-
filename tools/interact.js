/* Interaction QA — exercises tabs, form, theme toggle, mobile menu,
   counters and checks for horizontal overflow at every breakpoint.
   Run: node tools/interact.js */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const results = [];
const ok = (n, c, extra = '') => results.push({ n, pass: !!c, extra });

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  /* Boot overlay dismissed (it removes itself from the DOM when done) */
  const bootEl = await page.$('#boot');
  ok('boot overlay dismissed', !bootEl || (await bootEl.evaluate((e) => e.classList.contains('is-done'))));

  /* Hero reveal fired */
  ok('hero title revealed', await page.$eval('.hero__line--accent', (e) => e.classList.contains('is-in')));

  /* Counters (scroll them into view first — they animate on reveal) */
  await page.evaluate(() => document.querySelector('.hero__stats').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(2200);
  const stat = await page.$eval('.stat__num', (e) => e.textContent);
  ok('stat counter ran (' + stat + ')', stat !== '0' && stat.length > 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);

  /* Countdown numeric */
  const cd = await page.$eval('[data-unit="seconds"]', (e) => e.textContent);
  ok('countdown ticking (' + cd + ')', /^\d{2}$/.test(cd));

  /* Tabs */
  await page.click('#tab-3');
  await page.waitForTimeout(400);
  ok('tab 3 activates', await page.$eval('#panel-3', (e) => e.classList.contains('is-active') && !e.hidden));
  ok('tab 1 deactivates', await page.$eval('#panel-1', (e) => !e.classList.contains('is-active') && e.hidden));
  ok('tab aria-selected', await page.$eval('#tab-3', (e) => e.getAttribute('aria-selected') === 'true'));

  /* FAQ accordion */
  const d2 = await page.$('.faq__item:nth-child(2)');
  await d2.$eval('summary', (s) => s.click());
  await page.waitForTimeout(300);
  ok('faq opens', await d2.evaluate((e) => e.open));

  /* Form: empty submit is rejected */
  await page.click('#submitBtn');
  await page.waitForTimeout(300);
  const errCount = await page.$$eval('.field__err', (els) => els.filter((e) => e.textContent.trim()).length);
  ok('form rejects empty submit (' + errCount + ' errors)', errCount >= 3);
  ok('status shows REJECTED', (await page.$eval('#formStatus', (e) => e.textContent)) === 'REJECTED');

  /* Form: invalid email */
  await page.fill('#fName', 'Ada Lovelace');
  await page.fill('#fEmail', 'not-an-email');
  await page.selectOption('#fDomain', 'Web Development');
  await page.click('#submitBtn');
  await page.waitForTimeout(300);
  ok('email format validated', (await page.$eval('[data-err="email"]', (e) => e.textContent)).length > 0);

  /* Form: valid submit */
  await page.fill('#fEmail', 'ada@example.com');
  await page.fill('#fOrg', 'IIT Bombay');
  await page.click('#submitBtn');
  await page.waitForTimeout(1800);
  ok('form submits', (await page.$eval('#formStatus', (e) => e.textContent)) === 'CONFIRMED');
  const outTxt = await page.$eval('#formOut', (e) => e.textContent);
  ok('form shows pass id', /TF30-[A-Z0-9]{4}/.test(outTxt));
  ok('form echoes name', outTxt.includes('Ada Lovelace'));

  /* Theme toggle */
  await page.click('#modeToggle');
  await page.waitForTimeout(500);
  ok('theme switches to day', (await page.getAttribute('html', 'data-theme')) === 'day');
  ok('theme label updates', (await page.$eval('#modeLabel', (e) => e.textContent)) === 'DAY');

  /* Gradient-clipped headlines must stay clipped to their glyphs in both themes */
  for (const mode of ['day', 'night']) {
    if ((await page.getAttribute('html', 'data-theme')) !== mode) {
      await page.click('#modeToggle');
      await page.waitForTimeout(500);
    }
    const clip = await page.$eval('.hero__line--accent', (e) => {
      const cs = getComputedStyle(e);
      return { clip: cs.backgroundClip, color: cs.color, w: Math.round(e.getBoundingClientRect().width) };
    });
    ok(`headline gradient stays clipped to text in ${mode} mode`, clip.clip === 'text', JSON.stringify(clip));
    const word = await page.$eval('.footer__word', (e) => getComputedStyle(e).backgroundClip);
    ok(`footer wordmark clipped in ${mode} mode`, word === 'text');
  }
  if ((await page.getAttribute('html', 'data-theme')) !== 'night') {
    await page.click('#modeToggle');
    await page.waitForTimeout(500);
  }
  ok('theme switches back to night', (await page.getAttribute('html', 'data-theme')) === 'night', 'theme=' + (await page.getAttribute('html', 'data-theme')));

  /* Scroll spy */
  await page.evaluate(() => document.querySelector('#schedule').scrollIntoView());
  await page.waitForTimeout(900);
  const active = await page.$$eval('[data-nav]', (els) => els.filter((e) => e.classList.contains('is-active')).map((e) => e.getAttribute('href')));
  ok('scroll spy highlights a nav link (' + active.join() + ')', active.length >= 1);

  /* Anchor navigation */
  await page.click('a[href="#faq"][data-nav]');
  await page.waitForTimeout(1200);
  const faqTop = await page.$eval('#faq', (e) => e.getBoundingClientRect().top);
  ok('anchor scroll lands under header (' + Math.round(faqTop) + 'px)', faqTop > -10 && faqTop < 140);

  /* Back to top */
  await page.click('#toTop');
  await page.waitForTimeout(1400);
  ok('back-to-top works', (await page.evaluate(() => scrollY)) < 40);

  /* Lazy images actually loaded */
  const imgStats = await page.$$eval('img', (els) => {
    const total = els.length;
    const broken = els.filter((e) => !e.complete || e.naturalWidth === 0).length;
    return { total, broken };
  });
  ok('all images loaded (' + imgStats.total + ' total, ' + imgStats.broken + ' broken)', imgStats.broken === 0);

  /* Accessibility spot checks */
  const a11y = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length;
    const btns = [...document.querySelectorAll('button')].filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label')).length;
    const h1 = document.querySelectorAll('h1').length;
    const lang = document.documentElement.lang;
    return { imgs, btns, h1, lang };
  });
  ok('every img has alt (' + a11y.imgs + ' missing)', a11y.imgs === 0);
  ok('every button is labelled (' + a11y.btns + ' missing)', a11y.btns === 0);
  ok('exactly one h1 (' + a11y.h1 + ')', a11y.h1 === 1);
  ok('html lang set (' + a11y.lang + ')', a11y.lang === 'en');

  await ctx.close();

  /* ---- Responsive overflow sweep ---- */
  for (const w of [320, 360, 390, 414, 600, 768, 820, 1024, 1280, 1440, 1920]) {
    const c = await browser.newContext({ viewport: { width: w, height: 900 } });
    const p2 = await c.newPage();
    await p2.goto(BASE, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(2600);
    const over = await p2.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const clipped = (el) => {
        let p = el.parentElement;
        while (p && p !== document.documentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'hidden' || ox === 'clip' || ox === 'auto' || ox === 'scroll') return true;
          p = p.parentElement;
        }
        return false;
      };
      const bad = [];
      document.querySelectorAll('body *').forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return;
        const r = el.getBoundingClientRect();
        if (r.width === 0) return;
        if (r.right > vw + 2 || r.left < -2) {
          if (clipped(el)) return;
          bad.push(el.tagName.toLowerCase() + '.' + (el.className.toString().split(' ')[0] || '') + ` [${Math.round(r.left)}→${Math.round(r.right)}]`);
        }
      });
      return { vw, scrollW: document.documentElement.scrollWidth, bad: [...new Set(bad)].slice(0, 8) };
    });
    ok(`no h-overflow @${w}px (scrollW ${over.scrollW}/${over.vw})`, over.scrollW <= over.vw + 2 && over.bad.length === 0, over.bad.join(' | '));
    await c.close();
  }

  /* ---- Mobile menu ---- */
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await mctx.newPage();
  await mp.goto(BASE, { waitUntil: 'networkidle' });
  await mp.waitForTimeout(2600);
  await mp.click('#burger');
  await mp.waitForTimeout(800);
  ok('mobile menu opens', await mp.$eval('#mobileMenu', (e) => e.classList.contains('is-open')));
  ok('burger aria-expanded', (await mp.$eval('#burger', (e) => e.getAttribute('aria-expanded'))) === 'true');
  const burgerVisible = await mp.$eval('#burger', (e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 0; });
  ok('burger fully on-screen', burgerVisible);
  await mp.screenshot({ path: '.shots/mobile-menu.png' });
  await mp.click('#mobileMenu a[href="#faq"]');
  await mp.waitForTimeout(1200);
  ok('mobile menu closes on nav', await mp.$eval('#mobileMenu', (e) => !e.classList.contains('is-open')));
  await mctx.close();

  await browser.close();

  /* ---- Report ---- */
  let failed = 0;
  for (const r of results) {
    if (!r.pass) failed++;
    console.log(`${r.pass ? '  PASS' : '× FAIL'}  ${r.n}${r.extra ? '  → ' + r.extra : ''}`);
  }
  if (errors.length) {
    console.log('\n=== JS / NETWORK ISSUES ===');
    [...new Set(errors)].forEach((e) => console.log('  •', e));
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  if (failed || errors.length) process.exitCode = 1;
})();
