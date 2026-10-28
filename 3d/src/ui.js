import { EVENT, STATS, DOMAINS, DAYS, SPEAKERS, CHAPTERS } from './content.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class UI {
  constructor() {
    this.currentChapter = -1;
    this.openDomain = null;
    this.labels = new Map();
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._buildLabels();
    this._buildChapterNav();
    this._buildDomainList();
    this._buildSchedule();
    this._buildSpeakers();
    this._buildPanel();
    this._bindForm();
    this._bindKeys();
    this.startCountdown();
    this.observeCounters();
  }

  /* ───────────────── stage fade ─────────────────────────── */
  /* `stage` is 1 while the reader is inside the 3D scroll track and
     falls to 0 as the readable content bands take over the viewport.
     It retires the narrative chrome so it never floats over the
     normal-flow content below the experience. */
  setStage(v) {
    this.stage = v;
    const card = $('#chapterCard');
    const nav = $('#chapterNav');
    const o = Math.max(0, Math.min(1, v)).toFixed(3);
    if (card) {
      card.style.opacity = o;
      card.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
    }
    if (nav) {
      nav.style.opacity = o;
      nav.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
    }
  }

  /* ───────────────── projected 3D labels ─────────────────── */
  _buildLabels() {
    const layer = $('#labels');
    if (!layer) return;
    DOMAINS.forEach((d) => {
      const el = document.createElement('button');
      el.className = 'tag3d';
      el.type = 'button';
      el.style.setProperty('--c', '#' + d.color.toString(16).padStart(6, '0'));
      el.innerHTML = `<span class="tag3d__id">${d.id}</span><span class="tag3d__name">${esc(d.short)}</span>`;
      el.setAttribute('aria-label', `Open details for ${d.name}`);
      el.addEventListener('click', () => this.openPanel(d));
      layer.appendChild(el);
      this.labels.set(d.id, el);
    });
  }

  /** Position DOM labels over their 3D counterparts. */
  updateLabels(entries) {
    for (const e of entries) {
      const el = this.labels.get(e.id);
      if (!el) continue;
      if (!e.visible) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        continue;
      }
      el.style.transform = `translate3d(${e.x}px, ${e.y}px, 0)`;
      el.style.opacity = String(e.opacity);
      el.style.pointerEvents = e.opacity > 0.5 ? 'auto' : 'none';
    }
  }

  /* ───────────────── chapter navigation ──────────────────── */
  _buildChapterNav() {
    const nav = $('#chapterNav');
    if (!nav) return;
    CHAPTERS.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chapdot';
      b.dataset.chapter = String(i);
      b.innerHTML = `<span class="chapdot__idx mono">${c.index}</span><span class="chapdot__label">${esc(c.title)}</span>`;
      b.setAttribute('aria-label', `Go to chapter ${c.index} — ${c.title}`);
      b.addEventListener('click', () => {
        this.onChapterJump?.(i);
      });
      nav.appendChild(b);
    });
    this.chapdots = $$('.chapdot', nav);
  }

  setChapter(index) {
    if (index === this.currentChapter) return;
    this.currentChapter = index;
    const c = CHAPTERS[index];
    if (!c) return;

    const readout = $('#chapterReadout');
    if (readout) {
      readout.innerHTML =
        `<span class="mono">${c.index}</span><span class="chapterReadout__sep">/</span>` +
        `<span class="mono">0${CHAPTERS.length - 1}</span>` +
        `<span class="chapterReadout__name">${esc(c.title)}</span>`;
    }

    const kicker = $('#chapterKicker');
    if (kicker) kicker.textContent = c.kicker;
    const body = $('#chapterBody');
    if (body) body.textContent = c.body;

    const card = $('#chapterCard');
    if (card) {
      card.classList.remove('is-swap');
      // force reflow so the animation restarts
      void card.offsetWidth;
      card.classList.add('is-swap');
    }

    this.chapdots?.forEach((d, i) => d.classList.toggle('is-active', i === index));
    document.body.dataset.chapter = c.id;
  }

  setProgress(p) {
    const bar = $('#progressFill');
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`;
    const pct = $('#progressPct');
    if (pct) pct.textContent = String(Math.round(p * 100)).padStart(3, '0');
  }

  /* ───────────────── domain list (2D fallback + a11y) ───── */
  _buildDomainList() {
    const list = $('#domainList');
    if (!list) return;
    DOMAINS.forEach((d) => {
      const li = document.createElement('li');
      li.className = 'domainRow';
      li.style.setProperty('--c', '#' + d.color.toString(16).padStart(6, '0'));
      li.innerHTML =
        `<button type="button" class="domainRow__btn">
           <span class="domainRow__id mono">${d.id}</span>
           <span class="domainRow__name">${esc(d.name)}</span>
           <span class="domainRow__blurb">${esc(d.blurb)}</span>
           <span class="domainRow__plus" aria-hidden="true">+</span>
         </button>`;
      li.querySelector('button').addEventListener('click', () => this.openPanel(d));
      list.appendChild(li);
    });
  }

  /* ───────────────── side panel ──────────────────────────── */
  _buildPanel() {
    this.panel = $('#panel');
    this.panelClose = $('#panelClose');
    this.panelClose?.addEventListener('click', () => this.closePanel());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closePanel();
    });
  }

  openPanel(domain) {
    if (!this.panel) return;
    this.openDomain = domain;
    const d = domain;
    this.panel.innerHTML =
`<div class="panel__head">
   <span class="panel__id mono" style="--c:#${d.color.toString(16).padStart(6, '0')}">${d.id}</span>
   <button type="button" class="panel__close" id="panelCloseX" aria-label="Close panel">×</button>
 </div>
 <h3 class="panel__title">${esc(d.name)}</h3>
 <p class="panel__blurb">${esc(d.blurb)}</p>
 <p class="panel__detail">${esc(d.detail)}</p>
 <ul class="panel__stats">${d.stats.map(([v, l]) => `<li><span class="panel__v">${esc(v)}</span><span class="panel__l mono">${esc(l)}</span></li>`).join('')}</ul>
 <a class="panel__cta" href="#register">Enter this domain <span aria-hidden="true">→</span></a>`;
    this.panel.querySelector('#panelCloseX')?.addEventListener('click', () => this.closePanel());
    this.panel.classList.add('is-open');
    document.body.classList.add('panel-open');
    this.panel.setAttribute('aria-hidden', 'false');
    this.panel.querySelector('#panelCloseX')?.focus();
  }

  closePanel() {
    if (!this.panel) return;
    this.openDomain = null;
    this.panel.classList.remove('is-open');
    this.panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('panel-open');
  }

  /* ───────────────── schedule ────────────────────────────── */
  _buildSchedule() {
    const tabs = $('#coreTabs');
    const panels = $('#corePanels');
    if (!tabs || !panels) return;

    DAYS.forEach((day, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `ctab${i === 0 ? ' is-active' : ''}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(i === 0));
      tab.setAttribute('aria-controls', `coreDay${i}`);
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.innerHTML = `<span class="ctab__d mono">${day.day}</span><span class="ctab__t mono">${day.date}</span>`;
      tabs.appendChild(tab);

      const panel = document.createElement('div');
      panel.className = `cpanel${i === 0 ? ' is-active' : ''}`;
      panel.setAttribute('role', 'tabpanel');
      panel.id = `coreDay${i}`;
      panel.setAttribute('aria-labelledby', '');
      if (i !== 0) panel.hidden = true;
      panel.innerHTML =
        `<ol class="ctl">${day.items.map((it) => `
          <li class="ctl__row">
            <span class="ctl__time mono">${it.time}</span>
            <span class="ctl__body">
              <span class="ctl__title">${esc(it.title)}</span>
              <span class="ctl__track mono">${esc(it.track)}</span>
            </span>
          </li>`).join('')}</ol>`;
      panels.appendChild(panel);
    });

    const list = $$('.ctab', tabs);
    const select = (tab) => {
      const i = list.indexOf(tab);
      list.forEach((t, k) => {
        const on = k === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const p = panels.children[k];
        if (p) { p.classList.toggle('is-active', on); p.hidden = !on; }
      });
    };
    list.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = list[(i + 1) % list.length];
        if (e.key === 'ArrowLeft') next = list[(i - 1 + list.length) % list.length];
        if (e.key === 'Home') next = list[0];
        if (e.key === 'End') next = list[list.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next);
        next.focus();
      });
    });
  }

  /* ───────────────── speakers ────────────────────────────── */
  _buildSpeakers() {
    const wrap = $('#coreSpeakers');
    if (!wrap) return;
    SPEAKERS.forEach((s, i) => {
      const card = document.createElement('article');
      card.className = 'spk';
      card.style.setProperty('--i', String(i));
      card.innerHTML =
`<div class="spk__glyph" aria-hidden="true">
   <svg viewBox="0 0 64 64"><path d="M32 4 58 18v28L32 60 6 46V18z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M32 16 48 25v14L32 48 16 39V25z" fill="none" stroke="currentColor" stroke-width="1" opacity=".45"/></svg>
 </div>
 <h3 class="spk__name">${esc(s.name)}</h3>
 <p class="spk__role mono">${esc(s.role)}</p>
 <p class="spk__talk">${esc(s.talk)}</p>`;
      wrap.appendChild(card);
    });
  }

  /* ───────────────── registration form ───────────────────── */
  _bindForm() {
    const f = $('#coreForm');
    if (!f) return;
    const status = $('#coreFormStatus');
    const out = $('#coreFormOut');

    const showError = (name, msg) => {
      const input = f.querySelector(`[name="${name}"]`);
      const err = f.querySelector(`[data-err="${name}"]`);
      input?.closest('.field')?.classList.toggle('is-invalid', Boolean(msg));
      if (err) err.textContent = msg || '';
      return !msg;
    };

    const validators = {
      name: (v) => (!v.trim() ? 'NAME REQUIRED' : v.trim().length < 2 ? 'NAME TOO SHORT' : ''),
      email: (v) => (!v.trim() ? 'UPLINK ADDRESS REQUIRED' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'INVALID ADDRESS FORMAT' : ''),
      domain: (v) => (v ? '' : 'SELECT A TRACK')
    };

    Object.keys(validators).forEach((name) => {
      const input = f.querySelector(`[name="${name}"]`);
      if (!input) return;
      input.addEventListener('blur', () => showError(name, validators[name](input.value)));
      input.addEventListener('input', () => {
        if (input.closest('.field')?.classList.contains('is-invalid')) showError(name, validators[name](input.value));
      });
    });

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (status) { status.textContent = 'VALIDATING'; status.classList.remove('is-live'); }
      let valid = true;
      Object.keys(validators).forEach((name) => {
        const input = f.querySelector(`[name="${name}"]`);
        if (!input) return;
        if (!showError(name, validators[name](input.value))) valid = false;
      });
      if (!valid) { if (status) status.textContent = 'REJECTED'; return; }

      const data = Object.fromEntries(new FormData(f).entries());
      const id = `TF30-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const btn = f.querySelector('button[type="submit"]');
      btn.disabled = true;
      if (status) status.textContent = 'TRANSMITTING';

      setTimeout(() => {
        btn.disabled = false;
        if (status) { status.textContent = 'CONFIRMED'; status.classList.add('is-live'); }
        if (out) {
          out.hidden = false;
          out.innerHTML =
`<span class="k">&gt; identity</span> ......... ${esc(data.name)}
<span class="k">&gt; uplink</span> ........... ${esc(data.email)}
<span class="k">&gt; track</span> ............. ${esc(data.domain)}
<span class="k">&gt; pass id</span> ........... ${id}
<span class="k">&gt; status</span> ............ <b>ENROLLED</b>

Your credential will be transmitted within 24 hours.
Need it faster? Write to hello@techfest.in and quote ${id}.`;
        }
        f.reset();
      }, 1100);
    });
  }

  /* ───────────────── keyboard ────────────────────────────── */
  _bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea')) return;
      if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        this.onStep?.(1);
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        this.onStep?.(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.onChapterJump?.(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        this.onChapterJump?.(CHAPTERS.length - 1);
      }
    });
  }

  /* ───────────────── countdown ───────────────────────────── */
  startCountdown() {
    const root = $('[data-countdown]');
    if (!root) return;
    const target = new Date(EVENT.countdownTarget).getTime();
    const get = (u) => root.querySelector(`[data-unit="${u}"]`);
    const pad = (n) => String(n).padStart(2, '0');
    const cells = { days: get('days'), hours: get('hours'), minutes: get('minutes'), seconds: get('seconds') };
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (cells.days) cells.days.textContent = pad(d);
      if (cells.hours) cells.hours.textContent = pad(h);
      if (cells.minutes) cells.minutes.textContent = pad(m);
      if (cells.seconds) cells.seconds.textContent = pad(s);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ───────────────── stat counters ───────────────────────── */
  observeCounters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const pre = el.dataset.prefix || '';
      const suf = el.dataset.suffix || '';
      const dur = 1500;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + Math.round(target * eased) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (this.reduced || !('IntersectionObserver' in window)) {
      nums.forEach((el) => { el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || ''); });
      return;
    }
    /* The observer must stay strongly referenced — an unreferenced
       IntersectionObserver can be garbage-collected and silently stop
       firing, which leaves every counter frozen at zero. */
    this._counterIO = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    nums.forEach((el) => this._counterIO.observe(el));
  }

  /* ───────────────── boot / intro ────────────────────────── */
  setLoaded() {
    document.body.classList.add('is-loaded');
    const loader = $('#loader');
    if (loader) {
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), 800);
    }
  }

  /* The splash owns the page <h1>. Rather than lose it with the overlay,
     re-home it inside <main> so the document always keeps exactly one
     accessible top-level heading. */
  hoistTitle() {
    const intro = $('#intro');
    const h1 = intro?.querySelector('h1');
    const main = $('#content');
    if (h1 && main && !main.contains(h1)) {
      h1.id = 'pageTitle';
      h1.classList.add('sr-only');
      main.prepend(h1);
    }
  }

  dismissIntro() {
    const intro = $('#intro');
    if (!intro || intro.classList.contains('is-gone')) return;
    intro.classList.add('is-gone');
    setTimeout(() => {
      this.hoistTitle();
      intro.remove();
    }, 900);
  }
}
