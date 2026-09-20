import * as THREE from 'three';
import { createDumplingGeometry } from '../../js/dumpling-shape.js';
import { ARMS } from './bandit.js';

/**
 * Lesson 06 scene pieces: a little stove with a minute dial and a pot, the
 * dumpling being cooked, and Bıdık's "notebook": one terracotta value bar per
 * cooking time (height = average reward so far), optionally in two rows (one
 * per dumpling size). Same bar recipe as js/tokens.js.
 */

function textTexture(text, { color = '#2b211b', size = 88, w = 256, h = 128, weight = 600 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${weight} ${size}px Fraunces, Georgia, serif`;
  g.fillText(text, w / 2, h / 2 + size * 0.06);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { canvas: c, texture: t };
}

const DOUGH = {
  none: '#f3ebe0',
  cooking: '#f6efe4',
  raw: '#dedbe6',
  good: '#ffe6c2',
  over: '#c9a273',
};

export class Stove extends THREE.Group {
  constructor({ palette, softDot }) {
    super();
    this.name = 'stove';
    this.palette = palette;
    this.minutes = 6;
    this.dialAngle = 0;
    this.dialTarget = 0;
    this.cookT = 0;
    this.time = 0;

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.1), new THREE.MeshStandardMaterial({ color: '#f7f0e5', roughness: 0.5 }));
    body.position.y = 0.275;
    body.castShadow = true;
    body.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.1), new THREE.MeshStandardMaterial({ color: '#3a322f', roughness: 0.6, metalness: 0.2 }));
    top.position.y = 0.57;
    top.receiveShadow = true;
    const feet = new THREE.Group();
    for (const [x, z] of [[-0.62, -0.42], [0.62, -0.42], [-0.62, 0.42], [0.62, 0.42]]) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 12), new THREE.MeshStandardMaterial({ color: palette.bambooDark, roughness: 0.8 }));
      f.position.set(x, 0.03, z);
      feet.add(f);
    }
    this.add(body, top, feet);

    // burner ring + glow, pot on a trivet
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 10, 40), new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.5, metalness: 0.4 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0.15, 0.6, 0);
    this.flame = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.31, 40), new THREE.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, opacity: 0, side: THREE.DoubleSide }));
    this.flame.rotation.x = -Math.PI / 2;
    this.flame.position.set(0.15, 0.595, 0);
    const potMat = new THREE.MeshStandardMaterial({ color: palette.slate, roughness: 0.35, metalness: 0.45, side: THREE.DoubleSide });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.3, 40, 1, true), potMat);
    pot.position.set(0.15, 0.81, 0);
    pot.castShadow = true;
    const potBottom = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), potMat);
    potBottom.rotation.x = -Math.PI / 2;
    potBottom.position.set(0.15, 0.665, 0);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.4, 40), new THREE.MeshStandardMaterial({ color: '#d7e6ee', roughness: 0.15, transparent: true, opacity: 0.85 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0.15, 0.88, 0);
    for (const [x, z] of [[-0.2, 0.2], [0.5, 0.2], [0.15, -0.28]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8), ring.material);
      leg.position.set(x, 0.63, z);
      this.add(leg);
    }
    const handleMat = new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.6 });
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 20, Math.PI), handleMat);
      h.position.set(0.15 + s * 0.44, 0.9, 0);
      h.rotation.y = s * Math.PI / 2;
      this.add(h);
    }
    this.add(ring, this.flame, pot, potBottom, water);
    this.potTop = new THREE.Vector3(0.15, 0.96, 0);

    // the dumpling in the pot
    const geo = createDumplingGeometry(THREE, { around: 64, down: 40 });
    geo.deleteAttribute('color');
    this.dumpMat = new THREE.MeshPhysicalMaterial({ color: DOUGH.none, roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color('#ffd7b3') });
    this.dumpling = new THREE.Mesh(geo, this.dumpMat);
    this.dumpling.castShadow = true;
    this.dumpling.position.set(0.15, 0.8, 0);
    this.dumpScale = 0.17;
    this.dumpScaleTarget = 0.17;
    this.squash = 1;
    this.squashTarget = 1;
    this.doughTarget = new THREE.Color(DOUGH.none);
    this.dumpling.scale.setScalar(this.dumpScale);
    this.add(this.dumpling);

    // the minute dial on the front
    const dial = new THREE.Group();
    dial.position.set(-0.42, 0.3, 0.55);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 40), new THREE.MeshStandardMaterial({ color: '#fffaf1', roughness: 0.4 }));
    face.rotation.x = Math.PI / 2;
    dial.add(face);
    const tickMat = new THREE.MeshStandardMaterial({ color: '#2b211b', roughness: 0.6 });
    for (let m = 1; m <= ARMS; m++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.01), tickMat);
      const a = this.angleFor(m);
      t.position.set(-Math.sin(a) * 0.12, Math.cos(a) * 0.12, 0.03);
      t.rotation.z = a;
      dial.add(t);
    }
    this.pointer = new THREE.Group();
    this.pointer.position.z = 0.035;
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.12, 0.018), new THREE.MeshStandardMaterial({ color: palette.terracotta, roughness: 0.5 }));
    needle.position.y = 0.055;
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 20), needle.material);
    knob.rotation.x = Math.PI / 2;
    this.pointer.add(needle, knob);
    dial.add(this.pointer);
    this.dial = dial;
    this.add(dial);
    this.dialPos = new THREE.Vector3(-0.42, 0.3, 0.55);

    // steam
    this.steam = [];
    const sm = new THREE.SpriteMaterial({ map: softDot, color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(sm.clone());
      s.scale.setScalar(0.22);
      s.userData = { t: i / 6, x: (Math.random() - 0.5) * 0.4, z: (Math.random() - 0.5) * 0.4, s: 0.18 + Math.random() * 0.12 };
      s.visible = false;
      this.add(s);
      this.steam.push(s);
    }
    this.setMinutes(6, true);
  }

  angleFor(m) {
    return THREE.MathUtils.degToRad(125 - ((m - 1) / (ARMS - 1)) * 250);
  }

  setMinutes(m, instant = false) {
    this.minutes = m;
    this.dialTarget = this.angleFor(m);
    if (instant) this.dialAngle = this.dialTarget;
  }

  /** state: none | cooking | raw | good | over */
  setDumpling(size, state = 'none', instant = false) {
    this.dumpScaleTarget = 0.11 + size * 0.12;
    this.squashTarget = state === 'over' ? 0.72 : 1;
    this.doughTarget.set(DOUGH[state] || DOUGH.none);
    if (instant) {
      this.dumpScale = this.dumpScaleTarget;
      this.squash = this.squashTarget;
      this.dumpMat.color.copy(this.doughTarget);
    }
  }

  startCooking(seconds) {
    this.cookT = seconds;
  }

  stopCooking() {
    this.cookT = 0;
  }

  update(dt) {
    this.time += dt;
    this.dialAngle += (this.dialTarget - this.dialAngle) * Math.min(1, dt * 7);
    this.pointer.rotation.z = this.dialAngle;
    this.dumpScale += (this.dumpScaleTarget - this.dumpScale) * Math.min(1, dt * 8);
    this.squash += (this.squashTarget - this.squash) * Math.min(1, dt * 6);
    this.dumpMat.color.lerp(this.doughTarget, Math.min(1, dt * 6));
    const bob = this.cookT > 0 ? Math.sin(this.time * 9) * 0.012 : 0;
    this.dumpling.scale.set(this.dumpScale, this.dumpScale * this.squash, this.dumpScale);
    this.dumpling.position.y = 0.8 + bob;
    const cooking = this.cookT > 0;
    if (cooking) this.cookT -= dt;
    const glow = cooking ? 0.55 + Math.sin(this.time * 14) * 0.2 : 0;
    this.flame.material.opacity += (glow - this.flame.material.opacity) * Math.min(1, dt * 8);
    for (const s of this.steam) {
      const u = s.userData;
      if (cooking) {
        s.visible = true;
        u.t += dt * 0.55;
        if (u.t > 1) u.t -= 1;
      } else if (s.visible) {
        u.t += dt * 0.9;
        if (u.t > 1) {
          s.visible = false;
          u.t = 0;
        }
      }
      const k = u.t;
      s.position.set(0.15 + u.x * (0.4 + k), 0.98 + k * 0.7, u.z * (0.4 + k));
      s.material.opacity = Math.sin(k * Math.PI) * 0.5;
      s.scale.setScalar(u.s * (0.6 + k));
    }
  }
}

export class ValueBars extends THREE.Group {
  constructor({ palette, rows = 2 }) {
    super();
    this.name = 'bars';
    this.palette = palette;
    this.spacing = 0.34;
    this.maxH = 1.5;
    this.rowGap = 1.0;
    this.rowsShown = 1;
    this.rows = [];
    const slotColor = new THREE.Color('#f3e2cf');
    for (let r = 0; r < rows; r++) {
      const row = new THREE.Group();
      row.position.z = -r * this.rowGap;
      const items = [];
      for (let a = 0; a < ARMS; a++) {
        const g = new THREE.Group();
        g.position.x = a * this.spacing - ((ARMS - 1) * this.spacing) / 2;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.32), new THREE.MeshStandardMaterial({ color: '#e8d9c5', roughness: 0.9 }));
        slab.position.y = 0.015;
        slab.receiveShadow = true;
        const mat = new THREE.MeshStandardMaterial({ color: slotColor, roughness: 0.55, emissive: '#000000' });
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1, 0.26), mat);
        bar.position.y = 0.5;
        bar.castShadow = true;
        bar.scale.y = 0.02;
        const minute = textTexture(String(a + 1), { size: 92 });
        const label = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: minute.texture, transparent: true }));
        label.rotation.x = -Math.PI / 2.4;
        label.position.set(0, 0.04, 0.32);
        const pctTex = textTexture('·', { size: 64, color: palette.terracotta });
        const pct = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), new THREE.MeshBasicMaterial({ map: pctTex.texture, transparent: true, depthWrite: false }));
        pct.rotation.x = -Math.PI / 3.2;
        pct.position.set(0, 0.2, -0.04);
        g.add(slab, bar, label, pct);
        row.add(g);
        items.push({ group: g, bar, mat, pct, pctTex, cur: 0.02, h: 0.02, text: '·', pulse: 0, pulseColor: new THREE.Color(palette.terracotta), color: slotColor.clone() });
      }
      this.add(row);
      this.rows.push({ group: row, items });
    }
    this.setRows(1);
  }

  setRows(n) {
    this.rowsShown = n;
    this.rows.forEach((r, i) => (r.group.visible = i < n));
  }

  /** Row r: values Q (0..1), counts N, and the arms Bıdık currently rates best. */
  setValues(r, Q, N, best = [], instant = false) {
    const row = this.rows[r];
    if (!row) return;
    const hot = new THREE.Color(this.palette.terracotta);
    const soft = new THREE.Color(this.palette.terracottaSoft);
    const empty = new THREE.Color('#f3e2cf');
    row.items.forEach((it, a) => {
      it.h = Math.max(0.02, Q[a] * this.maxH);
      const text = N[a] ? `%${Math.round(Q[a] * 100)}` : '·';
      if (text !== it.text) {
        it.text = text;
        const g = it.pctTex.canvas.getContext('2d');
        g.clearRect(0, 0, 256, 128);
        g.fillStyle = N[a] ? this.palette.ink : '#b8a48f';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = '600 64px Fraunces, Georgia, serif';
        g.fillText(text, 128, 68);
        it.pctTex.texture.needsUpdate = true;
      }
      it.color.copy(!N[a] ? empty : best.includes(a) && Q[a] > 0 ? hot : soft);
      if (instant) {
        it.cur = it.h;
        it.mat.color.copy(it.color);
      }
    });
  }

  /** Light up the bar that was just used: terracotta for a clap, grey for silence. */
  flash(r, a, reward) {
    const it = this.rows[r]?.items[a];
    if (!it) return;
    it.pulse = 1;
    it.pulseColor.set(reward ? '#ff9a6a' : '#8a8078');
  }

  /** World position above bar a of row r (for labels). */
  topOf(r, a) {
    const it = this.rows[r].items[a];
    return this.localToWorld(new THREE.Vector3(it.group.position.x, it.cur + 0.4, this.rows[r].group.position.z));
  }

  update(dt) {
    for (const row of this.rows) {
      if (!row.group.visible) continue;
      for (const it of row.items) {
        it.cur += (it.h - it.cur) * Math.min(1, dt * 6);
        it.bar.scale.y = Math.max(0.02, it.cur);
        it.pct.position.y = it.cur + 0.2;
        it.mat.color.lerp(it.color, Math.min(1, dt * 6));
        if (it.pulse > 0) {
          it.pulse = Math.max(0, it.pulse - dt * 3);
          it.mat.emissive.copy(it.pulseColor).multiplyScalar(it.pulse * 0.6);
        }
      }
    }
  }
}
