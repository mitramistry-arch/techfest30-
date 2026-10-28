import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { World } from './world.js';
import { UI } from './ui.js';
import { CHAPTERS } from './content.js';

const canvas = document.getElementById('scene');
const loaderStatus = document.getElementById('loaderStatus');
const loaderBar = document.getElementById('loaderBar');

const setLoader = (pct, text) => {
  if (loaderBar) loaderBar.style.transform = `scaleX(${pct})`;
  if (loaderStatus && text) loaderStatus.textContent = text;
};

/* ─────────────────────── WebGL support ─────────────────────── */
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

if (!webglAvailable()) {
  document.body.classList.add('no-webgl', 'is-loaded');
  setLoader(1, 'RENDERER UNAVAILABLE');
  const l = document.getElementById('loader');
  l?.classList.add('is-done');
  setTimeout(() => l?.remove(), 700);
  /* The 3D layer is an enhancement — the page still has to carry every
     domain, schedule slot, speaker and the registration form without it. */
  const fallbackUi = new UI();
  fallbackUi.hoistTitle();
  fallbackUi.setLoaded();
} else {
  boot();
}

async function boot() {
  setLoader(0.12, 'INITIALISING RENDERER');

  /* The DOM content (domains, schedule, speakers, form) is built before
     the renderer is touched, so the page is complete even when WebGL is
     unavailable — the 3D layer is an enhancement, never the content. */
  const ui = new UI();

  let renderer, world, composer, bloomPass;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
  } catch (err) {
    document.body.classList.add('no-webgl', 'is-loaded');
    setLoader(1, 'RENDERER UNAVAILABLE');
    document.getElementById('loader')?.classList.add('is-done');
    ui.hoistTitle();
    ui.setLoaded();
    return;
  }

  const small = Math.min(innerWidth, innerHeight) < 700;
  const maxDpr = small ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxDpr));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  await frame();
  setLoader(0.34, 'ASSEMBLING GEOMETRY');

  world = new World(canvas);
  world.resize(innerWidth, innerHeight);

  await frame();
  setLoader(0.62, 'COMPILING SHADERS');

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(world.scene, world.camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    small ? 0.34 : 0.44,   // strength
    0.58,                  // radius
    0.42                   // threshold — only genuinely hot pixels bloom
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  await frame();
  setLoader(0.88, 'IGNITING CORE');

  const coreCta = document.getElementById('coreCta');
  coreCta?.addEventListener('click', () => {
    document.getElementById('register')?.scrollIntoView({ behavior: ui.reduced ? 'auto' : 'smooth' });
  });

  /* ───────────── scroll → progress ───────────── */
  const track = document.getElementById('scrollTrack');
  if (track) track.style.height = `${CHAPTERS.length * 135}vh`;
  const trackInfo = { top: 0, height: 0 };
  const measureTrack = () => {
    trackInfo.top = track?.offsetTop ?? 0;
    trackInfo.height = track?.offsetHeight ?? innerHeight;
  };
  measureTrack();

  let progress = 0;
  let activeChapter = 0;
  let stage = 1;

  const readScroll = () => {
    // Progress is measured against the 3D scroll track only — the readable
    // content that follows it is a separate, normal-flow document.
    const len = Math.max(1, trackInfo.height - innerHeight);
    progress = THREE.MathUtils.clamp((scrollY - trackInfo.top) / len, 0, 1);
    ui.setProgress(progress);

    // Once the content bands start sliding over the canvas, the 3D chrome
    // (labels, chapter card, rail, core CTA) retires instead of floating
    // on top of the readable copy.
    const trackEnd = trackInfo.top + len;
    stage = THREE.MathUtils.clamp((trackEnd + 340 - scrollY) / 340, 0, 1);
    ui.setStage(stage);

    const idx = Math.round(progress * (CHAPTERS.length - 1));
    if (idx !== activeChapter) {
      activeChapter = idx;
      ui.setChapter(idx);
    }
    world.setDeploy(THREE.MathUtils.clamp((progress - 0.05) / 0.14, 0, 1));
    if (scrollY > 40) ui.dismissIntro();
  };

  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', measureTrack);
  setTimeout(() => { measureTrack(); readScroll(); }, 400);
  readScroll();
  ui.setChapter(0);

  /* ───────────── chapter jumping ───────────── */
  const scrollToChapter = (i) => {
    /* Chapters live inside the 3D scroll track — jumping must land on the
       track, not on the readable content that follows it. */
    const p = i / (CHAPTERS.length - 1);
    const len = Math.max(1, trackInfo.height - innerHeight);
    scrollTo({ top: trackInfo.top + len * p, behavior: ui.reduced ? 'auto' : 'smooth' });
  };
  ui.onChapterJump = scrollToChapter;
  ui.onStep = (dir) => {
    const next = THREE.MathUtils.clamp(activeChapter + dir, 0, CHAPTERS.length - 1);
    scrollToChapter(next);
  };

  /* ───────────── pointer: hover, click, drag ───────────── */
  let dragging = false;
  let moved = 0;
  let lastX = 0, lastY = 0;
  let downAt = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    downAt = performance.now();
    canvas.setPointerCapture?.(e.pointerId);
    document.body.classList.add('is-dragging');
  });

  addEventListener('pointermove', (e) => {
    world.setPointer(e.clientX, e.clientY, innerWidth, innerHeight);
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    world.setDrag(
      THREE.MathUtils.clamp(world.drag.tYaw + dx * 0.005, -0.7, 0.7),
      THREE.MathUtils.clamp(world.drag.tPitch + dy * 0.003, -0.35, 0.35)
    );
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('is-dragging');
    world.releaseDrag();
    const dur = performance.now() - downAt;
    if (moved < 8 && dur < 600) handleClick(e);
  };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => {
    if (!dragging) world.clearPointer();
  });

  function handleClick(e) {
    const rec = world.pick();
    if (rec) {
      ui.openPanel(rec.domain);
      return;
    }
    if (world.pickCore()) {
      world.emitShockwave(world.core.position);
    }
  }

  /* ───────────── resize ───────────── */
  let resizeTimer;
  addEventListener('resize', () => {
    world.resize(innerWidth, innerHeight);
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    bloomPass.setSize(innerWidth, innerHeight);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { /* debounced */ }, 120);
  });

  /* ───────────── render loop ───────────── */
  const projected = [];
  let hoverCheck = 0;
  let running = true;

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) loop();
  });

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);

    world.update(progress, activeChapter);

    // hover raycast, throttled
    hoverCheck += 1;
    if (hoverCheck % 3 === 0) {
      const rec = world.pick();
      world.hovered = rec;
      document.body.classList.toggle('is-hovering', !!rec);
      if (rec) canvas.style.cursor = 'pointer';
      else if (!dragging) canvas.style.cursor = '';
    }

    // project 3D anchors to DOM labels
    projected.length = 0;
    const v = new THREE.Vector3();

    // The core doubles as the final call to action.
    if (coreCta) {
      if (activeChapter === CHAPTERS.length - 1 && stage > 0.55) {
        v.copy(world.core.position);
        v.project(world.camera);
        const cx = (v.x * 0.5 + 0.5) * innerWidth;
        const cy = (-v.y * 0.5 + 0.5) * innerHeight;
        const onScreen = v.z <= 1 && cx > -40 && cx < innerWidth + 40 && cy > -40 && cy < innerHeight + 40;
        coreCta.hidden = !onScreen;
        if (onScreen) coreCta.style.transform = `translate3d(${cx}px, ${cy + 118}px, 0)`;
      } else if (!coreCta.hidden) {
        coreCta.hidden = true;
      }
    }
    for (const m of world.monoliths) {
      v.copy(m.group.position);
      v.y += 2.05;
      v.project(world.camera);
      const behind = v.z > 1;
      const x = (v.x * 0.5 + 0.5) * innerWidth;
      const y = (-v.y * 0.5 + 0.5) * innerHeight;
      const onScreen = !behind && x > -60 && x < innerWidth + 60 && y > -40 && y < innerHeight + 40;
      const dist = world.camera.position.distanceTo(m.group.position);
      const opacity = onScreen && world.deploy > 0.35
        ? THREE.MathUtils.clamp(1.28 - dist / 44, 0, 1) * (world.monoFade ?? 1) * stage
        : 0;
      projected.push({ id: m.domain.id, x, y, visible: opacity > 0.02, opacity });
    }
    ui.updateLabels(projected);

    composer.render();
  }

  /* Render-and-read-back probe used by the automated QA harness:
     draws one frame and samples the centre of the default framebuffer
     before the browser composites (and therefore clears) it. */
  window.__probe = () => {
    composer.render();
    const gl = renderer.getContext();
    const w = renderer.domElement.width;
    const h = renderer.domElement.height;
    const px = new Uint8Array(4 * 9);
    gl.readPixels(Math.floor(w / 2) - 1, Math.floor(h / 2) - 1, 3, 3, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return { w, h, px: Array.from(px) };
  };

  await frame();
  setLoader(1, 'LINK ESTABLISHED');
  ui.setLoaded();
  loop();
}

function frame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}
