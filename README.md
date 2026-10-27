<div align="center">

# TECHFEST 3.0 — Cyborg-Themed Landing Page

**Task 1 · Web Development domain · 50 points**
Techfest, IIT Bombay · 19–22 February 2027

`UNLEASH YOUR INNER CYBORG` — a responsive, interactive landing page built around a
cyberpunk HUD aesthetic.

</div>

---

## ✦ Live preview

| | |
|---|---|
| **Source** | <https://github.com/mitramistry-arch/techfest30-> |
| **Pull request** | <https://github.com/mitramistry-arch/techfest30-/pull/1> |
| **Live site** | <https://mitramistry-arch.github.io/techfest30-/> &nbsp;_(see note below)_ |
| **Demo recording** | _add your Google Drive link here (viewer access enabled)_ |

> **Note on the live site.** GitHub Pages has to be switched on for this repository before
> the first deploy can succeed: **Settings → Pages → Source → *GitHub Actions***.
> A repo admin needs to flip that once; after that `.github/workflows/pages.yml` publishes
> every push to `main` automatically. The site is a plain static bundle, so it also runs
> from any static host (Netlify, Vercel, Cloudflare Pages, `python3 -m http.server`) with
> no configuration at all.

> **Submitting this task:** the form on the Techfest portal asks for a *GitHub link* and a
> *Google Drive link to a short demo recording with viewer access enabled*. Paste the two
> URLs above into the submission form.

---

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

---

## ✦ Feature tour

| Section | Highlights |
|---|---|
| **Hero** | Boot sequence, glitch headline, particle mesh, HUD portrait, countdown, animated stat band |
| **The Protocol** | Four pillars with 3D tilt and a cursor-tracking radial glow |
| **Domains** | Eight competition tracks in a hairline grid with hover flood-fill |
| **Telemetry** | Animated progress bars over the neural-core artwork |
| **Run of Show** | Accessible tab component (arrow-key navigable) across four festival days |
| **Speakers** | Four speaker cards with holographic scan sweep on hover |
| **Showcase** | Full-bleed event imagery with gradient captions |
| **Signal Log** | Participant testimonials set as quote panels |
| **FAQ** | Native `<details>` accordion with animated chevrons |
| **Registration** | Client-side validation, error states and a terminal-style success receipt |
| **Footer** | Oversized wordmark, link columns, social row |

---

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

---

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

---

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

---

## ✦ Performance

| Metric | Value |
|---|---|
| Total page weight | **~900 KB** (incl. all imagery and fonts) |
| CSS | 1 file, ~28 KB |
| JS | 1 file, ~19 KB, no dependencies |
| Fonts | 4 WOFF2 files, 92 KB total |
| Third-party requests | **0** |
| Layout-shifting images | 0 — every image ships explicit `width`/`height` |

Images are `loading="lazy"` below the fold, the hero portrait is `fetchpriority="high"`,
and the particle canvas pauses itself when the hero scrolls out of view or the tab is hidden.

---

## ✦ Project structure

```
.
├── index.html              # the entire page
├── css/
│   └── style.css           # design tokens → layout → components → responsive
├── js/
│   └── main.js             # 15 self-contained modules, one IIFE
├── assets/
│   ├── fonts/              # self-hosted WOFF2 (Orbitron, Space Grotesk, JetBrains Mono)
│   └── img/                # optimised WebP artwork
│       └── _src/           # raw PNG sources (git-ignored)
├── tools/
│   ├── optimize-images.sh  # resize + WebP pipeline for regenerated artwork
│   ├── shoot.js            # visual QA: screenshots at 4 breakpoints
│   └── interact.js         # interaction QA: 40 automated assertions
└── .github/workflows/
    └── pages.yml           # auto-deploy to GitHub Pages
```

---

## ✦ Running it locally

The site is fully static — any HTTP server works.

```bash
# Python
python3 -m http.server 4173

# or Node
npx serve -l 4173
```

Then open <http://localhost:4173>.

### Regenerating the artwork

Raw source images live in `assets/img/_src/` (git-ignored, ~19 MB). After replacing any of
them, re-run the optimiser:

```bash
./tools/optimize-images.sh
```

### Running the QA suites

```bash
npm install                                    # playwright
npx playwright install chromium
node tools/interact.js                        # 40 interaction assertions
node tools/shoot.js                            # screenshots to .shots/
```

`tools/interact.js` exercises the tabs, accordion, form validation, submission, theme
toggle, scroll spy, anchor scrolling and mobile menu, then sweeps eleven viewport widths
from 320 px to 1920 px to prove there is no horizontal overflow and that every image,
label and heading is correct.

---

## ✦ Credits

Designed and built by the Techfest 3.0 web team, IIT Bombay.

- **Theme & copy** — Techfest 3.0 design team
- **Typography** — Orbitron, Space Grotesk, JetBrains Mono (SIL Open Font License)
- **Artwork** — original AI-generated illustrations, retouched and optimised for the web
