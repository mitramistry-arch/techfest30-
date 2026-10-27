/* ═══════════════════════════════════════════════════════════
   TECHFEST 3.0 — CYBORG LANDING
   Interaction layer
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE  = window.matchMedia('(pointer: coarse)').matches;

  /* Shared palette so canvas elements follow the active theme. */
  const palette = { cyan: '#00f0ff', magenta: '#ff2d95' };
  function refreshPalette() {
    const cs = getComputedStyle(document.documentElement);
    palette.cyan    = cs.getPropertyValue('--cyan').trim() || '#00f0ff';
    palette.magenta = cs.getPropertyValue('--magenta').trim() || '#ff2d95';
  }

  /* ───────────────────────────────────────────────
     1. BOOT SEQUENCE
     ─────────────────────────────────────────────── */
  function boot() {
    const el   = $('#boot');
    const log  = $('#bootLog');
    const bar  = $('#bootBar');
    if (!el || !log || !bar) return;

    const lines = [
      ['> mounting neural interface ............ ', 'ok', 'OK'],
      ['> calibrating hud optics .............. ', 'ok', 'OK'],
      ['> linking campus mesh .................. ', 'ok', 'SYNC'],
      ['> scanning for threats ................. ', 'warn', '0'],
      ['> loading techfest 3.0 payload ......... ', 'ok', 'OK'],
      ['> welcome, operative.', '', '']
    ];

    let i = 0;
    const step = () => {
      if (i >= lines.length) {
        bar.style.width = '100%';
        setTimeout(() => {
          el.classList.add('is-done');
          document.body.classList.add('is-ready');
          setTimeout(() => el.remove(), 700);
        }, 420);
        return;
      }
      const [text, cls, tail] = lines[i++];
      const span = document.createElement('span');
      span.textContent = text;
      if (cls) {
        const b = document.createElement('b');
        b.className = cls;
        b.textContent = tail;
        span.appendChild(b);
      }
      log.appendChild(span);
      log.appendChild(document.createTextNode('\n'));
      bar.style.width = `${Math.round((i / lines.length) * 100)}%`;
      setTimeout(step, REDUCED ? 20 : 190);
    };
    setTimeout(step, REDUCED ? 20 : 260);
  }

  /* ───────────────────────────────────────────────
     2. THEME TOGGLE (night ⇄ day)
     ─────────────────────────────────────────────── */
  function theme() {
    const btn = $('#modeToggle');
    const label = $('#modeLabel');
    const root = document.documentElement;
    if (!btn) return;

    const apply = (mode) => {
      root.setAttribute('data-theme', mode);
      label.textContent = mode.toUpperCase();
      btn.setAttribute('aria-pressed', String(mode === 'day'));
      btn.setAttribute('aria-label', `Switch to ${mode === 'day' ? 'night' : 'day'} mode`);
      try { localStorage.setItem('tf30-theme', mode); } catch (e) {}
      refreshPalette();
    };

    let saved = null;
    try { saved = localStorage.getItem('tf30-theme'); } catch (e) {}
    apply(saved || 'night');

    btn.addEventListener('click', () => {
      apply(root.getAttribute('data-theme') === 'day' ? 'night' : 'day');
    });
  }

  /* ───────────────────────────────────────────────
     3. CUSTOM CURSOR
     ─────────────────────────────────────────────── */
  function cursor() {
    const dot  = $('#cursor');
    const ring = $('#cursorRing');
    if (!dot || !ring || COARSE || REDUCED) return;

    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my;
    let woke = false;

    addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      if (!woke) {
        woke = true;
        dot.classList.add('is-ready');
        ring.classList.add('is-ready');
      }
    }, { passive: true });

    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const hot = 'a, button, .card, .domain, .tl, .speaker, .voice, .tab, summary, .scene';
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest(hot);
      if (!t) return;
      if (t.matches('input, textarea, select')) ring.classList.add('is-text');
      else ring.classList.add('is-hot');
    });
    document.addEventListener('mouseout', (e) => {
      const t = e.target.closest(hot);
      if (!t) return;
      if (!t.matches('input, textarea, select')) ring.classList.remove('is-text');
      ring.classList.remove('is-hot');
    });
    addEventListener('mousedown', () => ring.style.scale = '0.82');
    addEventListener('mouseup',   () => ring.style.scale = '1');
  }

  /* ───────────────────────────────────────────────
     4. HEADER STATE + SCROLL PROGRESS
     ─────────────────────────────────────────────── */
  function scrollChrome() {
    const header = $('#header');
    const bar    = $('#scrollBar');
    const top    = $('#toTop');
    let ticking = false;

    const update = () => {
      const y = scrollY;
      header.classList.toggle('is-stuck', y > 24);
      if (bar) {
        const max = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;
      }
      if (top) top.classList.toggle('is-visible', y > 700);
      ticking = false;
    };

    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    update();

    if (top) {
      top.addEventListener('click', () => {
        scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
      });
    }
  }

  /* ───────────────────────────────────────────────
     5. MOBILE MENU
     ─────────────────────────────────────────────── */
  function mobileMenu() {
    const burger = $('#burger');
    const menu   = $('#mobileMenu');
    if (!burger || !menu) return;

    const setOpen = (open) => {
      burger.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    };

    burger.addEventListener('click', () => {
      setOpen(!menu.classList.contains('is-open'));
    });
    $$('[data-mnav]', menu).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    addEventListener('resize', () => { if (innerWidth > 1080) setOpen(false); });
  }

  /* ───────────────────────────────────────────────
     6. REVEAL ON SCROLL
     ─────────────────────────────────────────────── */
  function reveal() {
    const items = $$('.reveal');
    items.forEach((el) => {
      const d = el.dataset.delay;
      if (d !== undefined) el.style.setProperty('--d', `${Number(d) * 90}ms`);
    });

    if (REDUCED || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach((el) => io.observe(el));

    /* Trigger the telemetry bars once the core block enters view. */
    const core = $('.core');
    if (core) {
      const co = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          core.classList.add('is-in');
          obs.unobserve(core);
        });
      }, { threshold: 0.25 });
      co.observe(core);
    }
  }

  /* ───────────────────────────────────────────────
     7. COUNTERS
     ─────────────────────────────────────────────── */
  function counters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const pre = el.dataset.prefix || '';
      const suf = el.dataset.suffix || '';
      const dur = 1600;
      const t0 = performance.now();

      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + Math.round(target * eased) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (REDUCED || !('IntersectionObserver' in window)) {
      nums.forEach((el) => { el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || ''); });
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    nums.forEach((el) => io.observe(el));
  }

  /* ───────────────────────────────────────────────
     8. COUNTDOWN
     ─────────────────────────────────────────────── */
  function countdown() {
    const root = $('[data-countdown]');
    if (!root) return;
    const target = new Date(root.dataset.countdown).getTime();
    const get = (u) => root.querySelector(`[data-unit="${u}"]`);
    const pad = (n) => String(n).padStart(2, '0');
    const cells = { days: get('days'), hours: get('hours'), minutes: get('minutes'), seconds: get('seconds') };

    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (cells.days)    cells.days.textContent    = pad(d);
      if (cells.hours)   cells.hours.textContent   = pad(h);
      if (cells.minutes) cells.minutes.textContent = pad(m);
      if (cells.seconds) cells.seconds.textContent = pad(s);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ───────────────────────────────────────────────
     9. TABS (accessible)
     ─────────────────────────────────────────────── */
  function tabs() {
    const list = $$('.tab');
    if (!list.length) return;

    const select = (tab) => {
      list.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (!panel) return;
        panel.classList.toggle('is-active', on);
        panel.hidden = !on;
      });
    };

    list.forEach((tab) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const i = list.indexOf(tab);
        let next = null;
        if (e.key === 'ArrowRight') next = list[(i + 1) % list.length];
        if (e.key === 'ArrowLeft')  next = list[(i - 1 + list.length) % list.length];
        if (e.key === 'Home')       next = list[0];
        if (e.key === 'End')        next = list[list.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next);
        next.focus();
      });
    });
  }

  /* ───────────────────────────────────────────────
     10. 3D TILT + MAGNETIC BUTTONS
     ─────────────────────────────────────────────── */
  function tilt() {
    if (REDUCED || COARSE) return;
    $$('[data-tilt]').forEach((el) => {
      let raf = null, tx = 0, ty = 0, cx = 50, cy = 0;

      const apply = () => {
        el.style.setProperty('--tx', `${tx}deg`);
        el.style.setProperty('--ty', `${ty}deg`);
        el.style.setProperty('--mx', `${cx}%`);
        el.style.setProperty('--my', `${cy}%`);
        raf = null;
      };

      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ty = (px - 0.5) * 9;
        tx = (0.5 - py) * 9;
        cx = px * 100;
        cy = py * 100;
        if (!raf) raf = requestAnimationFrame(apply);
      });

      el.addEventListener('mouseleave', () => {
        tx = 0; ty = 0; cx = 50; cy = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      });
    });
  }

  function magnetic() {
    if (REDUCED || COARSE) return;
    $$('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate3d(${dx * 0.22}px, ${dy * 0.3}px, 0)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ───────────────────────────────────────────────
     11. HERO PARALLAX
     ─────────────────────────────────────────────── */
  function parallax() {
    if (REDUCED || COARSE) return;
    const hero = $('.hero');
    const hud  = $('[data-parallax]');
    if (!hero || !hud) return;

    let raf = null, tx = 0, ty = 0;
    const apply = () => {
      hud.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      raf = null;
    };

    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 26;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 18;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    hero.addEventListener('mouseleave', () => {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
  }

  /* ───────────────────────────────────────────────
     12. PARTICLE MESH CANVAS
     ─────────────────────────────────────────────── */
  function particles() {
    const canvas = $('#particles');
    if (!canvas || REDUCED) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, nodes = [], raf = null, visible = true;

    const build = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(24, Math.min(74, Math.round((w * h) / 17000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.5 + 0.5
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const link = 128;

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < link) {
            ctx.strokeStyle = palette.cyan;
            ctx.globalAlpha = (1 - d / link) * 0.16;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 0.55;
      ctx.fillStyle = palette.cyan;
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };

    const start = () => { if (!raf && visible) raf = requestAnimationFrame(draw); };
    const stop  = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };

    build();
    start();

    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(build, 180); });
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        visible ? start() : stop();
      }, { threshold: 0 });
      io.observe(canvas);
    }
  }

  /* ───────────────────────────────────────────────
     13. SCROLL SPY
     ─────────────────────────────────────────────── */
  function scrollSpy() {
    const links = $$('[data-nav]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    const map = new Map();
    links.forEach((link) => {
      const id = link.getAttribute('href').slice(1);
      const sec = document.getElementById(id);
      if (sec) map.set(sec, link);
    });
    if (!map.size) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        map.get(entry.target)?.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    map.forEach((_, sec) => io.observe(sec));
  }

  /* ───────────────────────────────────────────────
     14. REGISTRATION FORM
     ─────────────────────────────────────────────── */
  function form() {
    const f = $('#regForm');
    if (!f) return;

    const status = $('#formStatus');
    const out    = $('#formOut');
    const btn    = $('#submitBtn');

    const showError = (name, msg) => {
      const input = f.querySelector(`[name="${name}"]`);
      const err   = f.querySelector(`[data-err="${name}"]`);
      const field = input?.closest('.field');
      field?.classList.toggle('is-invalid', Boolean(msg));
      if (err) err.textContent = msg || '';
      return !msg;
    };

    const validators = {
      name: (v) => {
        if (!v.trim()) return 'NAME REQUIRED';
        if (v.trim().length < 2) return 'NAME TOO SHORT';
        return '';
      },
      email: (v) => {
        if (!v.trim()) return 'UPLINK ADDRESS REQUIRED';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'INVALID ADDRESS FORMAT';
        return '';
      },
      domain: (v) => (v ? '' : 'SELECT A TRACK')
    };

    Object.keys(validators).forEach((name) => {
      const input = f.querySelector(`[name="${name}"]`);
      if (!input) return;
      input.addEventListener('blur', () => showError(name, validators[name](input.value)));
      input.addEventListener('input', () => {
        const field = input.closest('.field');
        if (field?.classList.contains('is-invalid')) showError(name, validators[name](input.value));
      });
    });

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (status) status.textContent = 'VALIDATING';
      if (status) status.classList.remove('is-live');

      let valid = true;
      Object.keys(validators).forEach((name) => {
        const input = f.querySelector(`[name="${name}"]`);
        if (!input) return;
        if (!showError(name, validators[name](input.value))) valid = false;
      });

      if (!valid) {
        if (status) status.textContent = 'REJECTED';
        return;
      }

      const original = btn.innerHTML;
      btn.disabled = true;
      btn.style.opacity = '.65';
      if (status) status.textContent = 'TRANSMITTING';

      const data = Object.fromEntries(new FormData(f).entries());
      const id = `TF30-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      setTimeout(() => {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.innerHTML = original;
        if (status) { status.textContent = 'CONFIRMED'; status.classList.add('is-live'); }

        if (out) {
          out.hidden = false;
          out.innerHTML =
`<span class="k">&gt; identity</span> ......... ${escapeHtml(data.name)}
<span class="k">&gt; uplink</span> ........... ${escapeHtml(data.email)}
<span class="k">&gt; affiliation</span> ...... ${escapeHtml(data.org || 'INDEPENDENT')}
<span class="k">&gt; track</span> ............. ${escapeHtml(data.domain)}
<span class="k">&gt; pass id</span> ........... ${id}
<span class="k">&gt; status</span> ............ <b>ENROLLED</b>

Your credential will be transmitted to ${escapeHtml(data.email)} within 24 hours.
Need it faster? Write to hello@techfest.in and quote ${id}.`;
          out.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' });
        }
        f.reset();
      }, 1100);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /* ───────────────────────────────────────────────
     15. SMOOTH IN-PAGE ANCHORS
     ─────────────────────────────────────────────── */
  function anchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.getElementById(id.slice(1));
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + scrollY - 74;
        scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
        history.replaceState(null, '', id);
      });
    });
  }

  /* ───────────────────────────────────────────────
     INIT
     ─────────────────────────────────────────────── */
  function init() {
    refreshPalette();
    theme();
    boot();
    cursor();
    scrollChrome();
    mobileMenu();
    reveal();
    counters();
    countdown();
    tabs();
    tilt();
    magnetic();
    parallax();
    particles();
    scrollSpy();
    form();
    anchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
