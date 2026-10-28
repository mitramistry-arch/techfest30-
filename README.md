<div align="center">

# TECHFEST 3.0 — Cyborg-Themed Landing Page **&** a 3D Interactive Site

**Task 1 · Web Development domain · 50 points** — *Cyborg-Themed Landing Page*
**Task 2 · Build in 3D · 100 points** — *Enter the Core*

Techfest, IIT Bombay · 19–22 February 2027

`UNLEASH YOUR INNER CYBORG` · `ENTER THE CORE`

</div>

---

## ✦ Live preview

| | Task 1 — Cyborg landing page | Task 2 — Build in 3D |
|---|---|---|
| **Source** | <https://github.com/mitramistry-arch/techfest30-> | same repository, `/3d/` |
| **Path** | `/` | `/3d/` |
| **Pull request** | <https://github.com/mitramistry-arch/techfest30-/pull/1> | see the repo's PR list |
| **Live site** | <https://mitramistry-arch.github.io/techfest30-/> &nbsp;_(see note)_ | <https://mitramistry-arch.github.io/techfest30-/3d/> |
| **Mirror (works today)** | <https://cdn.jsdelivr.net/gh/mitramistry-arch/techfest30-@main/index.html> | <https://cdn.jsdelivr.net/gh/mitramistry-arch/techfest30-@main/3d/index.html> |
| **Demo recording** | _add your Google Drive link here (viewer access enabled)_ | _same Drive link works for both tasks_ |

> **Note on the live site.** GitHub Pages has to be switched on for this repository before
> the first deploy can succeed: **Settings → Pages → Source → *GitHub Actions***.
> A repo admin needs to flip that once; after that `.github/workflows/pages.yml` publishes
> every push to `main` automatically — including the `/3d/` folder. Both experiences are
> plain static bundles, so they also run from any static host (Netlify, Vercel, Cloudflare
> Pages, `python3 -m http.server`) with no configuration at all.
>
> Creating the Pages site is an *administration* operation: the repository's API token
> gets `403 Resource not accessible by integration` for it, and so does the workflow's
> own `GITHUB_TOKEN` — verified by running the request from inside CI and capturing the
> response. Until an admin toggles the setting, the **jsDelivr mirror** above serves
> both pages straight from `main` and is a working public URL today.

> **Submitting:** each task's form asks for a *GitHub link* and a *Google Drive link to a
> short demo recording with viewer access enabled*. The 3D task accepts **either** one.
> Paste the repository URL above, plus the Drive link once you have recorded it.

---

# ▸ Task 2 — “Build in 3D”

## ✦ Enter the Core

A **single, persistent 3D scene** that the page never leaves. Scrolling doesn't swap
sections — it *descends* through one machine, and the camera flies a continuous spline
between five keyframed stations while the DOM overlay re-cuts its commentary over the top.

| # | Chapter | What happens in the scene |
|---|---|---|
| 00 | **IGNITION** | The core spins up out of the grid floor; the loader handshake completes |
| 01 | **THE EIGHT** | Eight coloured **monoliths** deploy in a ring around the core — one per competition domain — each with a projected DOM label you can click |
| 02 | **THE ARENA** | The monoliths dissolve and the camera drops into a **city of light columns**: the festival floor as a data skyline |
| 03 | **THE CROWN** | A golden **prize crown** rises on its dais at the end of the corridor — the ₹40L pool, paid on stage |
| 04 | **UPLINK** | The camera returns home, the core re-ignites over the grid plane, and the call-to-action fires |

## ✦ Interactions

- **Scroll = camera.** Scroll position maps to a normalised `0 → 1` progress value that
  drives a Catmull-Rom camera curve; five keyframes sit along it.
- **Eight clickable monoliths.** Hover for a highlight and a cursor change, click for a
  shockwave ripple, and open the domain panel — each with its own event count, prize pool
  and judging blurb.
- **Drag to orbit.** The camera yields to the pointer with a damped return to the
  scripted path, so the scene is explorable without ever losing the narrative.
- **Projected labels.** 3D anchors are projected to screen space every frame and driven
  as real DOM buttons (focusable, labelled, keyboard-reachable) — not canvas text.
- **A live core CTA.** The finale projects a button onto the core itself; clicking it
  scrolls to registration.
- **Chapter rail.** A fixed dot-nav jumps between the five chapters, with the current
  one highlighted and a live percentage readout in the HUD.

## ✦ Tech stack

| Layer | Choice | Why |
|---|---|---|
| Renderer | **Three.js r186** (WebGL 2) | Mature, tiny, and the only thing that could carry this |
| Post-processing | `EffectComposer` + `UnrealBloomPass` | The core's glow is a real bloom pass, not a CSS filter |
| Build | **esbuild** → one ESM bundle | Three ships no minified ESM build; esbuild bundles + minifies it into a single committed file |
| Runtime requests | **0 third-party** | Three is bundled locally — no CDN, no import map, no network dependency |
| Fonts | Self-hosted WOFF2 | Shared with the landing page via `../../assets/fonts/` |
| Textures | Procedural | Glow sprites, star fields and the grid floor are generated in code — no image payload |

The shipped bundle is `3d/js/core-site.js` — **608 KB minified**, everything included.

## ✦ Accessibility & resilience

- The 3D scene is an **enhancement, not the content**. Every domain, speaker, schedule
  slot and the whole registration form exist as real DOM below the canvas, so the page is
  fully usable with the WebGL context unavailable.
- **No-WebGL fallback** — the 3D layer is an enhancement, never the content: with the
  canvas unavailable the page still builds every domain, schedule slot, speaker and the
  registration form as ordinary DOM.
- `prefers-reduced-motion` disables camera drift, grain, bloom pulses and all transitions.
- Exactly one `<h1>`, which is re-homed into `<main>` when the intro splash is dismissed
  so the document always keeps a single accessible top-level heading.
- Semantic landmarks, labelled icon buttons, `alt` text on every image, and an
  arrow-key-navigable tab pattern.
- The render loop **pauses when the tab is hidden**, and device pixel ratio is capped at 2
  (1.5 on small screens).

## ✦ Project structure (3D)

```
3d/
├── index.html            # page shell: canvas, HUD, panel, chapter rail, content bands
├── css/
│   └── site.css          # tokens → layout → components → responsive → reduced-motion
├── src/                  # authoring source (ES modules)
│   ├── main.js           # renderer, composer, scroll, pointer, label projection, RAF loop
│   ├── world.js          # core, 8 monoliths, arena city, prize crown, dust, starfield, picking
│   ├── content.js        # the content model + the five chapter camera keyframes
│   ├── textures.js       # procedural glow/star sprites, grid-floor shader, halo
│   └── ui.js             # labels, chapter rail, domain panel, schedule tabs, form, countdown
└── js/
    └── core-site.js      # esbuild output — the only file the browser loads
```

Rebuild the bundle after editing anything in `3d/src/`:

```bash
npm run build:3d
```

---

# ▸ Task 1 — Cyborg-Themed Landing Page

## ✦ What it is

A single-page landing experience for Techfest 3.0, designed so the **cyborg theme is the
interface itself** rather than decoration on top of a template:

- a **boot sequence** that types out a system handshake before the page unlocks
- a **HUD-style hero** — corner brackets, rotating orbital rings, a live scan sweep and
  floating telemetry chips framing the cybernetic portrait
- **glitch typography** that fires in bursts on every section heading
- a **custom cursor** with a trailing ring that reacts to interactive elements
- a **particle mesh canvas** wired into the hero background
- a live **countdown** to the festival and **counters** that roll when scrolled into view
- **3D tilt** on cards and **magnetic pull** on buttons, both pointer-aware
- a **NIGHT ⇄ DAY** interface mode toggle that repaints the whole design system
- an accessible **tabbed schedule**, **accordion FAQ** and a validating **registration form**

## ✦ Feature tour

| Section | Highlights |
|---|---|
| **Hero** | Boot sequence, glitch headline, particle mesh, HUD portrait, countdown, animated stat band, 3D-experience CTA |
| **The Protocol** | Four pillars with 3D tilt and a cursor-tracking radial glow |
| **Domains** | Eight competition tracks in a hairline grid with hover flood-fill |
| **Telemetry** | Animated progress bars over the neural-core artwork |
| **Run of Show** | Accessible tab component (arrow-key navigable) across four festival days |
| **Speakers** | Four speaker cards with holographic scan sweep on hover |
| **Showcase** | Full-bleed event imagery with gradient captions |
| **Signal Log** | Participant testimonials set as quote panels |
| **FAQ** | Native `<details>` accordion with animated chevrons |
| **Registration** | Client-side validation, error states and a terminal-style success receipt |
| **Footer** | Oversized wordmark, link columns, social row, link into the 3D experience |

## ✦ Tech stack

**Zero runtime dependencies. No build step. No framework.**

| Layer | Choice | Why |
|---|---|---|
| Markup | Semantic HTML5 | `<details>`, `<dialog>`-free a11y, native tab semantics |
| Styling | Hand-written CSS + custom properties | A single token file drives both themes |
| Motion | Vanilla JS + CSS | GPU-friendly `transform`/`opacity` only |
| Fonts | Self-hosted WOFF2 | Orbitron, Space Grotesk, JetBrains Mono — no third-party requests |
| Artwork | AI-generated, optimised to WebP | 19 MB of source art → **822 KB** shipped |
| Icons | Inline SVG | No icon-font or sprite request |

The page ships **zero third-party requests** — no CDN, no analytics, no web fonts, no icon
library. It works fully offline once cached.

## ✦ Design system

All theming runs through CSS custom properties, which is what makes the NIGHT ⇄ DAY toggle
a one-line change rather than a second stylesheet.

```css
:root {
  --bg: #04060a;        --cyan: #00f0ff;      --magenta: #ff2d95;
  --text: #d9e7f3;      --line: rgba(0,240,255,.16);
}
[data-theme="day"] { /* the entire palette is re-declared */ }
```

| Token | Value | Role |
|---|---|---|
| `--cyan` | `#00f0ff` | Primary accent, links, focus rings |
| `--magenta` | `#ff2d95` | Secondary accent, tags, warnings |
| `--violet` | `#a06bff` | Gradient midpoint |
| `--lime` | `#b6ff3c` | Success states only |
| `--notch` | `18px` | Corner-cut geometry used by every panel |

Panels use a `clip-path` notch instead of rounded corners — the single strongest signal
that ties the whole page together.

## ✦ Accessibility

- Semantic landmarks (`header`/`nav`/`main`/`section`/`footer`), one `<h1>`, ordered headings
- Full keyboard support: skip link, visible focus rings, arrow-key tab navigation, `Esc` closes the mobile menu
- Tabs follow the WAI-ARIA tabs pattern (`aria-selected`, `aria-controls`, roving `tabindex`)
- All decorative layers (`canvas`, rings, grain, scanlines, HUD chrome) are `aria-hidden`
- Every `<img>` has descriptive `alt` text; every icon-only button has an `aria-label`
- `prefers-reduced-motion` disables the particle canvas, grain, glitch bursts, reveals and all transitions
- Without JavaScript the page still renders completely — the boot overlay is dismissed and all
  content is revealed by a failsafe in `<head>`
- Colour contrast checked in both NIGHT and DAY modes

## ✦ Performance

| Metric | Value |
|---|---|
| Total page weight | **~900 KB** (incl. all imagery and fonts) |
| CSS | 1 file, ~28 KB |
| JS | 1 file, ~19 KB, no dependencies |
| 3D bundle | 1 file, **608 KB** minified (Three.js + post-processing included) |
| Fonts | 4 WOFF2 files, 92 KB total |
| Third-party requests | **0** |
| Layout-shifting images | 0 — every image ships explicit `width`/`height` |

Images are `loading="lazy"` below the fold, the hero portrait is `fetchpriority="high"`,
and the particle canvas pauses itself when the hero scrolls out of view or the tab is hidden.

---

## ✦ Project structure

```
.
├── index.html              # the entire Task 1 page
├── css/
│   └── style.css           # design tokens → layout → components → responsive
├── js/
│   └── main.js             # 15 self-contained modules, one IIFE
├── assets/
│   ├── fonts/              # self-hosted WOFF2 (Orbitron, Space Grotesk, JetBrains Mono)
│   └── img/                # optimised WebP artwork
│       └── _src/           # raw PNG sources (git-ignored)
├── 3d/                     # the "Build in 3D" experience — see the Task 2 section
│   ├── index.html
│   ├── css/site.css
│   ├── src/                # authoring source (ES modules)
│   └── js/core-site.js     # the esbuild bundle the browser actually loads
├── tools/
│   ├── optimize-images.sh  # resize + WebP pipeline for regenerated artwork
│   ├── setup-chromium.sh   # bootstrap the headless Chromium the QA harnesses need
│   ├── shoot.js            # Task 1 visual QA: screenshots at 4 breakpoints
│   ├── interact.js         # Task 1 interaction QA: 44 automated assertions
│   ├── shoot3d.js          # Task 2 visual QA: one screenshot per chapter + bands + mobile
│   └── interact3d.js       # Task 2 interaction QA: 60 automated assertions
└── .github/workflows/
    └── pages.yml           # auto-deploy to GitHub Pages (root + /3d/)
```

---

## ✦ Running it locally

Both experiences are fully static — any HTTP server works.

```bash
# Python
python3 -m http.server 4173

# or Node
npx serve -l 4173
```

Then open <http://localhost:4173> for the landing page and
<http://localhost:4173/3d/> for the 3D experience.

### Rebuilding the 3D bundle

```bash
npm install
npm run build:3d      # esbuild 3d/src/main.js → 3d/js/core-site.js
```

### Regenerating the artwork

Raw source images live in `assets/img/_src/` (git-ignored, ~19 MB). After replacing any of
them, re-run the optimiser:

```bash
./tools/optimize-images.sh
```

### Running the QA suites

```bash
npm install                                    # playwright + esbuild + three
./tools/setup-chromium.sh                      # headless Chromium (WebGL-capable)

node tools/interact.js                         # Task 1 — 44 interaction assertions
node tools/shoot.js                            # Task 1 — screenshots to .shots/

node tools/interact3d.js                       # Task 2 — 60 interaction assertions
node tools/shoot3d.js                          # Task 2 — screenshots to .shots3d/
```

`tools/setup-chromium.sh` unpacks the `@sparticuz/chromium` build into the places
Chromium expects: the binary at `/tmp/chromium`, SwiftShader **flat in `/tmp`** next to
it (otherwise WebGL fails to start and the page silently falls back to its no-WebGL
layout), the fontconfig tree at `/tmp/fonts` and the shared libraries at
`/tmp/al2023/lib`.

`tools/interact.js` exercises the tabs, accordion, form validation, submission, theme
toggle, scroll spy, anchor scrolling and mobile menu, then sweeps eleven viewport widths
from 320 px to 1920 px to prove there is no horizontal overflow and that every image,
label and heading is correct.

`tools/interact3d.js` boots the WebGL scene, walks all five chapters by scroll, checks
that the progress readout tracks the scroll position, jumps between chapters from the
rail, clicks a projected 3D label to open the domain panel, drives the schedule tabs by
keyboard, validates the registration form, sweeps six viewport widths for overflow, and
re-runs the whole page with WebGL disabled to prove the fallback still carries every
domain, schedule slot, speaker and the form — while asserting that **zero console errors,
page errors or failed requests** occur.

---

## ✦ Credits

Designed and built by the Techfest 3.0 web team, IIT Bombay.

- **Theme & copy** — Techfest 3.0 design team
- **Typography** — Orbitron, Space Grotesk, JetBrains Mono (SIL Open Font License)
- **Artwork** — original AI-generated illustrations, retouched and optimised for the web
- **3D engine** — Three.js r186 (MIT), bundled locally
