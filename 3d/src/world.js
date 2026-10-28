import * as THREE from 'three';
import { CHAPTERS, DOMAINS } from './content.js';
import { makeGlowTexture, makeStarTexture, makeGridFloor, makeHalo } from './textures.js';

const CYAN = 0x00f0ff;
const MAGENTA = 0xff2d95;
const VIOLET = 0xa06bff;

const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.time = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03050a);
    this.scene.fog = new THREE.FogExp2(0x03050a, 0.021);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
    this.camera.position.set(0, 1.6, 17);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-10, -10);
    this.pointerActive = false;

    this.deploy = 0;          // 0 = monoliths collapsed, 1 = fully deployed
    this.deployTarget = 0;
    this.hovered = null;
    this.drag = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, active: false };
    this.lookTarget = new THREE.Vector3();
    this.shockwaves = [];
    this.pulse = 0;

    this._buildLights();
    this._buildStarfield();
    this._buildFloor();
    this._buildCore();
    this._buildMonoliths();
    this._buildCity();
    this._buildPrize();
    this._buildDust();
    this._buildCameraCurves();
  }

  /* ───────────────────────── lighting ───────────────────────── */
  _buildLights() {
    this.scene.add(new THREE.AmbientLight(0x1a2740, 1.1));
    const key = new THREE.DirectionalLight(0x9fd8ff, 1.4);
    key.position.set(6, 10, 8);
    this.scene.add(key);
    const rim = new THREE.PointLight(MAGENTA, 90, 60, 2);
    rim.position.set(-8, 4, -6);
    this.scene.add(rim);
    this.coreLight = new THREE.PointLight(CYAN, 95, 40, 2);
    this.coreLight.position.set(0, 0.4, 0);
    this.scene.add(this.coreLight);
  }

  /* ───────────────────────── starfield ─────────────────────── */
  _buildStarfield() {
    const count = 2600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 130;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.55;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const pick = Math.random();
      c.setHex(pick > 0.88 ? MAGENTA : pick > 0.7 ? VIOLET : 0xbfe8ff);
      c.multiplyScalar(0.35 + Math.random() * 0.75);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.55,
      map: makeStarTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  /* ───────────────────────── floor ─────────────────────────── */
  _buildFloor() {
    this.floor = makeGridFloor(300, 60);
    this.scene.add(this.floor);
  }

  /* ───────────────────────── the core ──────────────────────── */
  _buildCore() {
    const g = new THREE.Group();
    g.position.set(0, 0.4, 0);

    // molten inner sphere
    this.plasma = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.98, 3),
      new THREE.MeshStandardMaterial({
        color: 0x0a2a38,
        metalness: 0.2,
        roughness: 0.45,
        emissive: new THREE.Color(0x38d8ef),
        emissiveIntensity: 1.35,
        flatShading: true
      })
    );
    g.add(this.plasma);

    // faceted shell
    this.coreShell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.55, 1),
      new THREE.MeshStandardMaterial({
        color: 0x0b1626,
        metalness: 0.95,
        roughness: 0.22,
        emissive: new THREE.Color(CYAN),
        emissiveIntensity: 0.55,
        flatShading: true
      })
    );
    g.add(this.coreShell);

    // magenta wireframe cage
    this.coreCage = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.86, 1)),
      new THREE.LineBasicMaterial({ color: MAGENTA, transparent: true, opacity: 0.55 })
    );
    g.add(this.coreCage);

    // orbital rings
    this.rings = [];
    const ringSpecs = [
      { r: 2.5, t: 0.035, color: CYAN, rot: [Math.PI / 2, 0, 0], speed: 0.22 },
      { r: 3.15, t: 0.028, color: MAGENTA, rot: [0.5, 0.8, 0], speed: -0.15 },
      { r: 3.8, t: 0.022, color: VIOLET, rot: [1.1, -0.4, 0.3], speed: 0.1 }
    ];
    for (const s of ringSpecs) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(s.r, s.t, 10, 128),
        new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.85 })
      );
      ring.rotation.set(...s.rot);
      ring.userData.speed = s.speed;
      this.rings.push(ring);
      g.add(ring);
    }

    // orbiting particles
    const pCount = 420;
    const pPos = new Float32Array(pCount * 3);
    const pCol = new Float32Array(pCount * 3);
    this.orbiters = [];
    const c = new THREE.Color();
    for (let i = 0; i < pCount; i++) {
      const o = {
        radius: 2.1 + Math.random() * 2.4,
        angle: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.6,
        y: (Math.random() - 0.5) * 2.4,
        size: 0.5 + Math.random() * 1.6
      };
      this.orbiters.push(o);
      c.setHex(Math.random() > 0.75 ? MAGENTA : CYAN).multiplyScalar(0.5 + Math.random() * 0.6);
      pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    this.orbitPoints = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.14,
        map: makeStarTexture(),
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    g.add(this.orbitPoints);

    // halos
    this.coreHalo = makeHalo(CYAN, 5.4, 0.16);
    this.coreHalo2 = makeHalo(MAGENTA, 4.0, 0.12);
    g.add(this.coreHalo, this.coreHalo2);

    this.core = g;
    this.scene.add(g);
  }

  /* ───────────────────────── the eight ─────────────────────── */
  _buildMonoliths() {
    this.monoliths = [];
    this.interactables = [];
    const radius = 5.6;
    const glow = makeGlowTexture();

    DOMAINS.forEach((d, i) => {
      const angle = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2;
      const group = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 1.55, 0.98),
        new THREE.MeshStandardMaterial({
          color: 0x070d17,
          metalness: 0.92,
          roughness: 0.3,
          emissive: new THREE.Color(d.color),
          emissiveIntensity: 0.14
        })
      );
      body.userData.domain = d;
      body.userData.index = i;
      group.add(body);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.0, 1.57, 1.0)),
        new THREE.LineBasicMaterial({ color: d.color, transparent: true, opacity: 0.9 })
      );
      group.add(edges);

      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3, 0),
        new THREE.MeshBasicMaterial({ color: d.color })
      );
      gem.position.y = 0.12;
      group.add(gem);

      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glow,
        color: new THREE.Color(d.color),
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      halo.scale.set(3.2, 3.2, 1);
      group.add(halo);

      // a floating label plate above each monolith
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.1),
        new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.55 })
      );
      plate.position.y = 1.0;
      group.add(plate);

      const target = new THREE.Vector3(
        Math.cos(angle) * radius,
        -1.45 + Math.sin(i * 1.7) * 0.3,
        Math.sin(angle) * radius
      );
      group.position.copy(target).multiplyScalar(0.08); // start collapsed at the core
      group.lookAt(0, group.position.y, 0);

      const record = {
        group, body, edges, gem, halo, plate,
        domain: d,
        index: i,
        target,
        home: target.clone(),
        hover: 0,
        hoverTarget: 0,
        phase: Math.random() * Math.PI * 2
      };
      body.userData.record = record;
      this.interactables.push(body);
      this.monoliths.push(record);
      this.scene.add(group);
    });
  }

  /* ───────────────────────── the arena ─────────────────────── */
  _buildCity() {
    const count = 760;
    const geo = new THREE.BoxGeometry(0.46, 1, 0.46);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x060c16,
      metalness: 0.85,
      roughness: 0.35,
      emissive: 0xffffff,
      emissiveIntensity: 0.42
    });

    const uTime = { value: 0 };
    this.cityTime = uTime;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uTime;\nvarying float vSeed;`)
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec3 ipos = vec3(0.0);
           #ifdef USE_INSTANCING
             ipos = instanceMatrix[3].xyz;
           #endif
           float wave = sin(ipos.x * 0.34 + uTime * 1.25) * 0.5
                      + sin(ipos.z * 0.27 - uTime * 0.85) * 0.5;
           transformed.y += wave * 0.28;
           vSeed = fract(sin(ipos.x * 12.9898 + ipos.z * 78.233) * 43758.5453);`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vSeed;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           vec3 warm = vec3(1.0, 0.18, 0.58);
           vec3 cool = vec3(0.0, 0.94, 1.0);
           totalEmissiveRadiance *= mix(cool, warm, step(0.78, vSeed));
           totalEmissiveRadiance *= 0.22 + vSeed * 0.62;`
        );
    };

    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    let i = 0;
    const cols = 28;
    const rows = 28;
    for (let x = 0; x < cols && i < count; x++) {
      for (let z = 0; z < rows && i < count; z++) {
        const px = (x - cols / 2) * 1.35;
        const pz = (z - rows / 2) * 1.35 - 16;
        // leave a corridor for the camera to fly through
        if (Math.abs(px) < 2.6 && pz > -30 && pz < -4) { continue; }
        // and a clear plaza around the prize dais
        if (Math.hypot(px, pz + 26) < 7.5) { continue; }
        const h = 0.7 + Math.pow(Math.random(), 2.1) * 7.5;
        p.set(px, -3.2 + h / 2, pz);
        s.set(1, h, 1);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
        c.setHex(0xffffff).multiplyScalar(0.4 + Math.random() * 0.6);
        mesh.setColorAt(i, c);
        i++;
      }
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.city = mesh;
    this.scene.add(mesh);
  }

  /* ───────────────────────── the crown ─────────────────────── */
  _buildPrize() {
    const g = new THREE.Group();
    g.position.set(0, -3.2, -26);

    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 2.35, 0.32, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a1220, metalness: 0.9, roughness: 0.35, emissive: 0x123f52, emissiveIntensity: 0.85 })
    );
    dais.position.y = 0.17;
    g.add(dais);

    const dais2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.5, 0.28, 48),
      new THREE.MeshStandardMaterial({ color: 0x0d1a2a, metalness: 0.9, roughness: 0.3, emissive: 0x1a5470, emissiveIntensity: 1.0 })
    );
    dais2.position.y = 0.48;
    g.add(dais2);

    /* The crown: a banded circlet with eight points, alternating tall
       and short, each tipped with a cut gem. Built from primitives so
       it stays one draw call per material. */
    const gold = new THREE.MeshStandardMaterial({
      color: 0x3a2708,
      metalness: 1,
      roughness: 0.17,
      emissive: new THREE.Color(0xffc86b),
      emissiveIntensity: 0.62,
      flatShading: true
    });
    const goldDark = new THREE.MeshStandardMaterial({
      color: 0x241804,
      metalness: 1,
      roughness: 0.28,
      emissive: new THREE.Color(0xd8a03c),
      emissiveIntensity: 0.4,
      flatShading: true
    });
    const gemMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0 });

    const crown = new THREE.Group();

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.99, 0.44, 8, 1, true),
      gold
    );
    crown.add(band);

    for (const y of [0.22, -0.22]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.055, 4, 8), goldDark);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y;
      crown.add(rim);
    }

    const points = 8;
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2;
      const tall = i % 2 === 0;
      const h = tall ? 1.0 : 0.58;
      const px = Math.cos(a) * 0.84;
      const pz = Math.sin(a) * 0.84;

      const spike = new THREE.Mesh(new THREE.ConeGeometry(tall ? 0.27 : 0.21, h, 4), gold);
      spike.position.set(px, 0.22 + h / 2, pz);
      spike.rotation.y = -a;
      // splay the points outwards, like a real circlet
      spike.rotation.z = -Math.cos(a) * 0.2;
      spike.rotation.x = Math.sin(a) * 0.2;
      crown.add(spike);

      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(tall ? 0.13 : 0.1, 0), gemMat);
      gem.position.set(px * 1.1, 0.22 + h + 0.02, pz * 1.1);
      crown.add(gem);
    }

    crown.position.y = 1.62;
    g.add(crown);
    this.crown = crown;

    /* Containment rings — two counter-rotating hoops that frame the
       crown like a hologram display case. */
    this.crownCage = new THREE.Group();
    const hoopMat = new THREE.LineBasicMaterial({ color: 0xffd79a, transparent: true, opacity: 0.5 });
    for (const rot of [[0, 0, 0], [Math.PI / 2, 0, 0.4]]) {
      const pts = [];
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * 1.62, Math.sin(a) * 1.62, 0));
      }
      const hoop = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), hoopMat);
      hoop.rotation.set(...rot);
      this.crownCage.add(hoop);
    }
    this.crownCage.position.y = 1.62;
    g.add(this.crownCage);

    const halo = makeHalo(0xffc86b, 3.6, 0.18);
    halo.position.y = 1.62;
    g.add(halo);
    this.crownHalo = halo;

    // floating shard ring
    this.shards = new THREE.Group();
    this.shards.position.y = 1.62;
    for (let i = 0; i < 14; i++) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.13, 0),
        new THREE.MeshBasicMaterial({ color: 0xd8a860, transparent: true, opacity: 0.7 })
      );
      const a = (i / 14) * Math.PI * 2;
      shard.position.set(Math.cos(a) * 1.7, (Math.random() - 0.5) * 0.8, Math.sin(a) * 1.7);
      shard.userData.a = a;
      shard.userData.r = 1.7;
      this.shards.add(shard);
    }
    g.add(this.shards);

    this.prize = g;
    this.scene.add(g);
  }

  /* ───────────────────────── dust ─────────────────────────── */
  _buildDust() {
    const count = 900;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 90 - 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.09,
        map: makeStarTexture(),
        color: 0x7fd8ff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    this.scene.add(this.dust);
  }

  /* ───────────────────────── camera curves ─────────────────── */
  _buildCameraCurves() {
    this.posCurve = new THREE.CatmullRomCurve3(
      CHAPTERS.map((c) => new THREE.Vector3(...c.camera.pos)),
      false,
      'catmullrom',
      0.5
    );
    this.lookCurve = new THREE.CatmullRomCurve3(
      CHAPTERS.map((c) => new THREE.Vector3(...c.camera.look)),
      false,
      'catmullrom',
      0.5
    );
    this._tmpPos = new THREE.Vector3();
    this._tmpLook = new THREE.Vector3();
  }

  /* ───────────────────────── interaction ───────────────────── */

  setPointer(clientX, clientY, w, h) {
    this.pointer.x = (clientX / w) * 2 - 1;
    this.pointer.y = -(clientY / h) * 2 + 1;
    this.pointerActive = true;
  }

  clearPointer() {
    this.pointerActive = false;
    this.pointer.set(-10, -10);
  }

  setDrag(dYaw, dPitch) {
    this.drag.tYaw = dYaw;
    this.drag.tPitch = dPitch;
  }

  releaseDrag() {
    this.drag.tYaw = 0;
    this.drag.tPitch = 0;
  }

  /** Returns the domain record that was hit, or null. */
  pick() {
    if (!this.pointerActive) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    if (hits.length) return hits[0].object.userData.record;
    return null;
  }

  /** The core itself is clickable — hit-tested against a proxy sphere. */
  pickCore() {
    if (!this.pointerActive) return false;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObject(this.coreShell, false).length > 0;
  }

  emitShockwave(position) {
    const geo = new THREE.RingGeometry(0.6, 0.78, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(position);
    ring.lookAt(this.camera.position);
    this.scene.add(ring);
    this.shockwaves.push({ mesh: ring, life: 0 });

    this.pulse = 1;
  }

  setDeploy(v) {
    this.deployTarget = v;
  }

  /* ───────────────────────── frame ─────────────────────────── */

  update(progress, activeChapter) {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.time += dt;
    const t = this.time;

    /* camera ---------------------------------------------------- */
    const n = CHAPTERS.length;
    const seg = THREE.MathUtils.clamp(progress, 0, 1) * (n - 1);
    const i = Math.min(Math.floor(seg), n - 2);
    const local = seg - i;
    const e = smootherstep(local);
    const u = (i + e) / (n - 1);

    this.posCurve.getPoint(u, this._tmpPos);
    this.lookCurve.getPoint(u, this._tmpLook);

    /* Portrait framing — a 16:9 composition cannot survive a phone held
       upright, so narrow viewports pull the camera back toward the
       centre line and open the lens a little. */
    const narrow = THREE.MathUtils.clamp((1.05 - this.camera.aspect) / 0.6, 0, 1);
    if (narrow > 0) {
      this._tmpPos.x = THREE.MathUtils.lerp(this._tmpPos.x, this._tmpLook.x, narrow * 0.74);
    }

    // drag orbit around the look target
    this.drag.yaw += (this.drag.tYaw - this.drag.yaw) * 0.09;
    this.drag.pitch += (this.drag.tPitch - this.drag.pitch) * 0.09;
    const offset = this._tmpPos.clone().sub(this._tmpLook);
    const radius = offset.length();
    const yaw = this.drag.yaw;
    const pitch = THREE.MathUtils.clamp(this.drag.pitch, -0.5, 0.5);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const right = new THREE.Vector3().crossVectors(offset, new THREE.Vector3(0, 1, 0)).normalize();
    offset.applyAxisAngle(right, pitch);
    offset.setLength(radius);

    // gentle idle drift so the frame is never perfectly still
    const drift = new THREE.Vector3(
      Math.sin(t * 0.22) * 0.35,
      Math.sin(t * 0.31 + 1.2) * 0.22,
      Math.cos(t * 0.18) * 0.28
    );

    this.camera.position.copy(this._tmpLook).add(offset).add(drift);
    this.lookTarget.copy(this._tmpLook);
    this.camera.lookAt(this.lookTarget);

    const fovA = CHAPTERS[i].camera.fov;
    const fovB = CHAPTERS[i + 1].camera.fov;
    this.camera.fov = lerp(fovA, fovB, e) * (1 + narrow * 0.12);
    this.camera.updateProjectionMatrix();

    /* core ------------------------------------------------------ */
    // Deploy is driven directly by scroll progress (frame-rate independent),
    // with a small critically-damped follow so it still feels mechanical.
    this.deploy += (this.deployTarget - this.deploy) * (1 - Math.exp(-dt * 5));
    const dp = smootherstep(THREE.MathUtils.clamp(this.deploy, 0, 1));

    this.core.rotation.y = t * 0.12;
    this.core.rotation.x = Math.sin(t * 0.17) * 0.12;
    this.coreCage.rotation.y = -t * 0.2;
    this.coreCage.rotation.z = t * 0.09;
    this.plasma.rotation.y = t * 0.4;
    this.plasma.rotation.x = -t * 0.25;

    this.pulse *= 0.94;
    const beat = 1 + Math.sin(t * 2.1) * 0.035 + this.pulse * 0.28;
    this.plasma.scale.setScalar(beat);
    this.coreShell.scale.setScalar(1 + Math.sin(t * 1.4) * 0.02 + this.pulse * 0.12);
    this.coreShell.material.emissiveIntensity = 0.5 + Math.sin(t * 1.8) * 0.14 + this.pulse * 0.7;
    this.coreLight.intensity = 92 + Math.sin(t * 1.8) * 20 + this.pulse * 240;
    this.coreHalo.material.opacity = 0.15 + Math.sin(t * 1.5) * 0.04 + this.pulse * 0.26;
    this.coreHalo2.material.opacity = 0.11 + Math.cos(t * 1.2) * 0.04;
    this.plasma.material.emissiveIntensity = 1.25 + Math.sin(t * 2.1) * 0.2 + this.pulse * 1.6;

    for (const r of this.rings) r.rotation.z += r.userData.speed * dt * 1.6;

    // orbiting particles
    const op = this.orbitPoints.geometry.attributes.position;
    for (let k = 0; k < this.orbiters.length; k++) {
      const o = this.orbiters[k];
      o.angle += o.speed * dt;
      op.array[k * 3] = Math.cos(o.angle) * o.radius;
      op.array[k * 3 + 1] = o.y + Math.sin(t * 0.8 + o.angle) * 0.35;
      op.array[k * 3 + 2] = Math.sin(o.angle) * o.radius;
    }
    op.needsUpdate = true;

    /* monoliths ------------------------------------------------- */
    // They dim and shrink away once the camera leaves the "eight" chapter,
    // so the flight path to the arena never clips through them.
    const fadeOut = 1 - THREE.MathUtils.clamp((progress - 0.36) / 0.10, 0, 1);
    const fadeBack = THREE.MathUtils.clamp((progress - 0.80) / 0.12, 0, 1);
    this.monoFade = Math.max(fadeOut, fadeBack);
    const fade = this.monoFade;

    for (const m of this.monoliths) {
      const isHover = this.hovered === m;
      m.hover += ((isHover ? 1 : 0) - m.hover) * 0.14;

      const spread = 0.06 + dp * 0.94;
      const tx = m.home.x * spread;
      const tz = m.home.z * spread;
      const ty = m.home.y * spread + m.hover * 0.55 + Math.sin(t * 0.9 + m.phase) * 0.09;

      m.group.position.lerp(new THREE.Vector3(tx, ty, tz), 0.12);
      m.group.rotation.y += ((Math.atan2(-m.group.position.x, -m.group.position.z)) - m.group.rotation.y) * 0.06;
      m.group.rotation.y += t * 0.12 * (1 - dp * 0.6);
      m.group.scale.setScalar(0.001 + fade * 0.999);

      m.gem.rotation.y = t * 1.1 + m.phase;
      m.gem.rotation.x = t * 0.7;
      m.gem.position.y = 0.12 + Math.sin(t * 1.6 + m.phase) * 0.09;

      const glow = (0.2 + m.hover * 1.35) * fade;
      m.body.material.emissiveIntensity = glow;
      m.edges.material.opacity = (0.72 + m.hover * 0.28) * fade;
      m.halo.material.opacity = (0.26 + m.hover * 0.5) * fade;
      m.halo.scale.setScalar(3.0 + m.hover * 1.4);
      m.plate.material.opacity = (0.32 + m.hover * 0.5) * fade;
      m.plate.position.y = 1.0 + Math.sin(t * 1.2 + m.phase) * 0.07;
    }

    /* arena ----------------------------------------------------- */
    this.cityTime.value = t;
    this.city.visible = progress > 0.30 && progress < 0.88;
    this.prize.visible = progress > 0.55 && progress < 0.97;
    if (this.prize.visible) {
      this.crown.rotation.y = t * 0.45;
      this.crownCage.rotation.y = -t * 0.3;
      this.crownCage.rotation.z = t * 0.2;
      this.crown.position.y = 1.62 + Math.sin(t * 1.1) * 0.14;
      this.crownCage.position.y = this.crown.position.y;
      this.crownHalo.position.y = this.crown.position.y;
      this.crownHalo.material.opacity = 0.17 + Math.sin(t * 1.4) * 0.05;
      for (const s of this.shards.children) {
        s.userData.a += dt * 0.35;
        s.position.x = Math.cos(s.userData.a) * s.userData.r;
        s.position.z = Math.sin(s.userData.a) * s.userData.r;
        s.rotation.y += dt * 1.4;
        s.rotation.x += dt * 0.9;
      }
      this.shards.position.y = this.crown.position.y;
    }

    /* ambience -------------------------------------------------- */
    this.stars.rotation.y = t * 0.006;
    this.dust.rotation.y = -t * 0.012;
    this.dust.position.y = Math.sin(t * 0.2) * 0.6;
    this.floor.material.uniforms.uTime.value = t;
    this.floor.material.uniforms.uScroll.value = t * 1.6;
    this.floor.position.z = -((progress * 46) % 46);

    /* shockwaves ------------------------------------------------ */
    for (let k = this.shockwaves.length - 1; k >= 0; k--) {
      const s = this.shockwaves[k];
      s.life += dt * 1.1;
      const sc = 1 + s.life * 16;
      s.mesh.scale.setScalar(sc);
      s.mesh.material.opacity = Math.max(0, 0.9 - s.life * 0.8);
      if (s.life > 1.1) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.shockwaves.splice(k, 1);
      }
    }
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
