/* Interaction QA for the 3D "Core" experience.
   Run: node tools/interact3d.js */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:4173/3d/';
const results = [];
const ok = (n, c, extra = '') => results.push({ n, pass: !!c, extra });

const ARGS = [
  '--no-sandbox',
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--disable-dev-shm-usage'
];

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ARGS
  });

  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000);
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);

  /* WebGL + loader --------------------------------------------------- */
  const gl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const g = c.getContext('webgl2') || c.getContext('webgl');
    return g ? g.getParameter(g.VERSION) : 'NONE';
  });
  ok('WebGL context created (' + gl + ')', gl !== 'NONE');
  ok('loader dismissed', await page.evaluate(() => !document.getElementById('loader')));
  ok('body marked loaded', await page.evaluate(() => document.body.classList.contains('is-loaded')));

  /* Canvas is actually painting -------------------------------------- */
  const painted = await page.evaluate(() => (window.__probe ? window.__probe() : null));
  ok('render probe available', !!painted);
  if (painted) {
    ok('canvas has real dimensions (' + painted.w + '×' + painted.h + ')', painted.w > 0 && painted.h > 0);
    const lum = painted.px.reduce((a, b) => a + b, 0) / painted.px.length;
    ok('canvas renders non-black pixels (mean ' + lum.toFixed(1) + ')', lum > 6);
    const variety = new Set(painted.px).size;
    ok('frame has tonal variety (' + variety + ' distinct samples)', variety > 3);
  }

  /* Scroll drives the chapters --------------------------------------- */
  const track = await page.evaluate(() => {
    const t = document.getElementById('scrollTrack');
    return { top: t.offsetTop, height: t.offsetHeight, vh: innerHeight };
  });
  const readChapter = () => page.$eval('#chapterReadout', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  const waitChapter = async (needle, ms = 15000) => {
    const t0 = Date.now();
    let seen = '';
    while (Date.now() - t0 < ms) {
      seen = await readChapter();
      if (seen.includes(needle)) return seen;
      await page.waitForTimeout(250);
    }
    return seen;
  };
  const goto = async (f) => {
    // `behavior: instant` overrides the page's CSS `scroll-behavior: smooth`
    // — an animated jump leaves elements unsettled under software rendering.
    await page.evaluate(([top, h, vh, ff]) =>
      scrollTo({ top: top + (h - vh) * ff, behavior: 'instant' }), [track.top, track.height, track.vh, f]);
    await page.waitForTimeout(2600);
  };

  await goto(0.25);
  ok('chapter 01 reached (' + (await readChapter()) + ')', (await readChapter()).includes('THE EIGHT'));
  const pct1 = await page.$eval('#progressPct', (e) => e.textContent);
  ok('progress readout tracks scroll (' + pct1 + ')', Number(pct1) > 15 && Number(pct1) < 40);

  await goto(0.75);
  ok('chapter 03 reached (' + (await readChapter()) + ')', (await readChapter()).includes('THE CROWN'));

  await goto(1);
  ok('chapter 04 reached (' + (await readChapter()) + ')', (await readChapter()).includes('UPLINK'));
  ok('core CTA visible in the finale', await page.$eval('#coreCta', (e) => !e.hidden));

  /* Chapter nav buttons ---------------------------------------------- */
  await page.click('.chapdot[data-chapter="0"]', { force: true });
  const back = await waitChapter('IGNITION');
  ok('chapter dot jumps to the start (' + back + ')', back.includes('IGNITION'));
  await page.waitForTimeout(900);
  ok('core CTA hidden outside the finale', await page.$eval('#coreCta', (e) => e.hidden));

  await page.click('.chapdot[data-chapter="2"]', { force: true });
  const mid = await waitChapter('THE ARENA');
  ok('chapter dot jumps into the arena (' + mid + ')', mid.includes('THE ARENA'));
  ok('chapter jump stays inside the 3D track', await page.evaluate(() => {
    const t = document.getElementById('scrollTrack');
    return scrollY <= t.offsetTop + t.offsetHeight - innerHeight + 4;
  }));

  /* Projected 3D labels + panel --------------------------------------- */
  await goto(0.25);
  const labelCount = await page.$$eval('.tag3d', (els) => els.filter((e) => Number(e.style.opacity) > 0.4).length);
  ok('projected 3D labels visible (' + labelCount + ')', labelCount >= 3);

  const tag = await page.$('.tag3d');
  await tag.click({ force: true });
  await page.waitForTimeout(1000);
  ok('clicking a 3D label opens the panel', await page.$eval('#panel', (e) => e.classList.contains('is-open')));
  const panelTitle = await page.$eval('.panel__title', (e) => e.textContent).catch(() => '');
  ok('panel shows a domain (' + panelTitle + ')', panelTitle.length > 2);
  ok('panel aria-hidden flipped to false', (await page.$eval('#panel', (e) => e.getAttribute('aria-hidden'))) === 'false');
  ok('panel lists domain stats', (await page.$$eval('.panel__stats li', (l) => l.length)) >= 3);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  ok('Escape closes the panel', await page.$eval('#panel', (e) => !e.classList.contains('is-open')));

  /* 2D domain list (the accessible route) ----------------------------- */
  await page.evaluate(() => document.querySelector('#domainList .domainRow__btn').scrollIntoView());
  await page.waitForTimeout(600);
  await page.click('#domainList .domainRow__btn', { force: true });
  await page.waitForTimeout(800);
  ok('domain list row opens the panel', await page.$eval('#panel', (e) => e.classList.contains('is-open')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  /* Schedule tabs ------------------------------------------------------ */
  await page.evaluate(() => document.querySelector('#coreTabs').scrollIntoView());
  await page.waitForTimeout(600);
  const tabs = await page.$$('.ctab');
  ok('schedule has 4 day tabs (' + tabs.length + ')', tabs.length === 4);
  await tabs[2].click({ force: true });
  await page.waitForTimeout(500);
  ok('tab 3 activates', await page.$eval('#corePanels .cpanel:nth-child(3)', (e) => e.classList.contains('is-active') && !e.hidden));
  ok('tab 1 deactivates', await page.$eval('#corePanels .cpanel:nth-child(1)', (e) => !e.classList.contains('is-active') && e.hidden));

  await tabs[2].focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  ok('arrow keys move between tabs', await page.$eval('#corePanels .cpanel:nth-child(4)', (e) => e.classList.contains('is-active')));
  await page.keyboard.press('Home');
  await page.waitForTimeout(300);
  ok('Home key jumps to the first tab', await page.$eval('#corePanels .cpanel:nth-child(1)', (e) => e.classList.contains('is-active')));

  /* Speakers ----------------------------------------------------------- */
  const speakers = await page.$$eval('#coreSpeakers .spk', (s) => s.length);
  ok('speakers rendered (' + speakers + ')', speakers >= 8);

  /* Stat counters ------------------------------------------------------- */
  await page.evaluate(() => document.querySelector('#stats').scrollIntoView());
  await page.waitForTimeout(2200);
  const stat = await page.$eval('.statCell__n', (e) => e.textContent);
  ok('stat counter ran (' + stat + ')', stat !== '0' && stat !== '');

  /* Form ---------------------------------------------------------------- */
  await page.evaluate(() => document.querySelector('#register').scrollIntoView());
  await page.waitForTimeout(600);
  await page.click('#coreForm button[type="submit"]', { force: true });
  await page.waitForTimeout(600);
  const errs = await page.$$eval('#coreForm .field__err', (els) => els.filter((e) => e.textContent.trim()).length);
  ok('form rejects an empty submit (' + errs + ' errors)', errs >= 3);
  ok('status reads REJECTED', (await page.$eval('#coreFormStatus', (e) => e.textContent)) === 'REJECTED');

  await page.fill('#coreForm [name="name"]', 'Ada Lovelace');
  await page.fill('#coreForm [name="email"]', 'ada@example.com');
  await page.selectOption('#coreForm [name="domain"]', 'Web Development');
  await page.click('#coreForm button[type="submit"]', { force: true });
  await page.waitForTimeout(2000);
  ok('form submits', (await page.$eval('#coreFormStatus', (e) => e.textContent)) === 'CONFIRMED');
  ok('form prints a pass id', /TF30-[A-Z0-9]{4}/.test(await page.$eval('#coreFormOut', (e) => e.textContent)));

  /* Countdown ------------------------------------------------------------ */
  const cd = await page.$eval('[data-unit="seconds"]', (e) => e.textContent);
  ok('countdown ticking (' + cd + ')', /^\d{2}$/.test(cd));

  /* Accessibility -------------------------------------------------------- */
  const a11y = await page.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    imgs: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
    btns: [...document.querySelectorAll('button')].filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
    landmarks: [...document.querySelectorAll('header,nav,main,footer,aside')].map((e) => e.tagName.toLowerCase()),
    lang: document.documentElement.lang
  }));
  ok('exactly one h1 (' + a11y.h1 + ')', a11y.h1 === 1);
  const h1InMain = await page.evaluate(() => {
    const h = document.querySelector('h1');
    return h ? { inMain: !!h.closest('main'), text: h.textContent.replace(/\s+/g, ' ').trim() } : null;
  });
  ok('h1 lives inside <main> (' + (h1InMain && h1InMain.text) + ')', !!h1InMain && h1InMain.inMain);
  ok('every img has alt (' + a11y.imgs + ' missing)', a11y.imgs === 0);
  ok('every button is labelled (' + a11y.btns + ' missing)', a11y.btns === 0);
  ok('html lang set', a11y.lang === 'en');
  ok('landmarks present (' + a11y.landmarks.join(',') + ')', a11y.landmarks.includes('main') && a11y.landmarks.includes('header'));

  await ctx.close();

  /* ---- Responsive: no horizontal overflow, canvas resizes ---- */
  for (const w of [360, 390, 768, 1024, 1440, 1920]) {
    const c = await browser.newContext({ viewport: { width: w, height: 800 } });
    const p2 = await c.newPage();
    p2.setDefaultTimeout(120000);
    await p2.goto(BASE, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(4000);
    const over = await p2.evaluate(() => ({
      vw: document.documentElement.clientWidth,
      sw: document.documentElement.scrollWidth,
      canvasW: document.getElementById('scene').width
    }));
    ok(`no h-overflow @${w}px (${over.sw}/${over.vw})`, over.sw <= over.vw + 2);
    ok(`canvas sized @${w}px (${over.canvasW}px)`, over.canvasW > 0);
    await c.close();
  }

  /* ---- No-WebGL fallback: the content must survive without a canvas ---- */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p3 = await c.newPage();
    p3.setDefaultTimeout(120000);
    await p3.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (String(type).startsWith('webgl')) return null;
        return orig.call(this, type, ...rest);
      };
    });
    await p3.goto(BASE, { waitUntil: 'networkidle' });
    await p3.waitForTimeout(3500);
    const fb = await p3.evaluate(() => ({
      noWebgl: document.body.classList.contains('no-webgl'),
      domains: document.querySelectorAll('#domainList .domainRow').length,
      tabs: document.querySelectorAll('.ctab').length,
      speakers: document.querySelectorAll('#coreSpeakers .spk').length,
      form: !!document.querySelector('#coreForm'),
      h1: document.querySelectorAll('h1').length,
      sceneHidden: getComputedStyle(document.getElementById('scene')).display === 'none'
    }));
    ok('no-WebGL fallback engages', fb.noWebgl);
    ok('fallback hides the canvas', fb.sceneHidden);
    ok('fallback keeps all 8 domains', fb.domains === 8);
    ok('fallback keeps the schedule tabs', fb.tabs === 4);
    ok('fallback keeps the speakers', fb.speakers >= 8);
    ok('fallback keeps the registration form', fb.form);
    ok('fallback keeps exactly one h1', fb.h1 === 1);
    await c.close();
  }

  await browser.close();

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
