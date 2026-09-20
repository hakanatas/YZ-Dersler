import * as THREE from 'three';

/**
 * Lesson 04 scene: the words so far as tiles on the table, an empty slot for
 * the next word, and terracotta bars for the candidates. Unlike js/tokens.js
 * (canned STORY), this one is rebuilt from whatever the n-gram model says:
 *
 *   words.build({ prompt: ['mantı', 'en'], candidates: [['güzel', 0.44], ...], highlight: 'güzel' })
 *
 * Bar height is proportional to the probability (100 % = 1.9 units).
 */

function textTexture(text, palette, opts = {}) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = opts.bg || '#fffaf1';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = opts.ink || palette.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = opts.size || 110;
  const font = (s) => `${opts.weight || 600} ${s}px Fraunces, Georgia, serif`;
  g.font = font(size);
  while (g.measureText(text).width > 460 && size > 36) {
    size -= 6;
    g.font = font(size);
  }
  g.fillText(text, 256, 134);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class WordScene extends THREE.Group {
  constructor({ palette }) {
    super();
    this.name = 'words';
    this.palette = palette;
    this.tiles = [];
    this.bars = [];
    this.time = 0;
    this.maxTiles = 6;
    this.barMat = new THREE.MeshStandardMaterial({ color: palette.terracotta, roughness: 0.55 });
    this.barMatSoft = new THREE.MeshStandardMaterial({ color: palette.terracottaSoft, roughness: 0.7 });
    this.barMatPick = new THREE.MeshStandardMaterial({ color: palette.green, roughness: 0.55 });
    this.slotMat = new THREE.MeshStandardMaterial({ color: '#f3e2cf', roughness: 0.9 });
    this.tileMat = new THREE.MeshPhysicalMaterial({ color: '#fffaf1', roughness: 0.35, clearcoat: 0.8 });
    this.dotsMat = new THREE.MeshPhysicalMaterial({ color: '#efe4d3', roughness: 0.5 });
    // a soft round mat under everything, so the "table" reads as a table
    const mat = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshStandardMaterial({ color: palette.creamDeep, roughness: 0.95 }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(0, 0.004, 0.35);
    mat.receiveShadow = true;
    this.add(mat);
    this.build({ prompt: [], candidates: [] }, false);
  }

  clear() {
    for (const t of this.tiles) this.remove(t);
    for (const b of this.bars) this.remove(b.group);
    this.tiles = [];
    this.bars = [];
  }

  /** data: { prompt: string[], candidates: [word, p][], highlight?: string } */
  build(data, animate = true) {
    this.clear();
    this.data = data;
    const many = data.prompt.length > this.maxTiles;
    const shown = many ? ['…', ...data.prompt.slice(-this.maxTiles + 1)] : data.prompt.slice();
    const W = shown.length > 4 ? 0.66 : 0.78;
    const gap = 0.1;
    const total = (shown.length + 1) * (W + gap) - gap;
    const x0 = -total / 2 + W / 2;
    shown.forEach((word, i) => {
      const tile = new THREE.Group();
      const isDots = many && i === 0;
      const base = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, 0.42), isDots ? this.dotsMat : this.tileMat);
      base.castShadow = true;
      base.receiveShadow = true;
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(W * 0.94, 0.4 * 0.94),
        new THREE.MeshBasicMaterial({ map: textTexture(word, this.palette, isDots ? { bg: '#efe4d3' } : {}), transparent: true })
      );
      face.rotation.x = -Math.PI / 2;
      face.position.y = 0.062;
      tile.add(base, face);
      tile.position.set(x0 + i * (W + gap), 0.06, 1.1);
      const isNew = animate && i === shown.length - 1 && data.animateLast !== false;
      tile.userData.scale = isNew ? 0 : 1;
      tile.userData.delay = 0;
      tile.scale.setScalar(isNew ? 0.001 : 1);
      this.add(tile);
      this.tiles.push(tile);
    });
    // the empty slot for the next word
    const slot = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, 0.42), this.slotMat);
    slot.position.set(x0 + shown.length * (W + gap), 0.03, 1.1);
    slot.receiveShadow = true;
    slot.userData.scale = 1;
    slot.userData.delay = 0;
    this.add(slot);
    this.tiles.push(slot);
    this.slot = slot;

    // probability bars behind the tiles
    const n = data.candidates.length;
    const spacing = n > 5 ? 0.62 : 0.72;
    const bx0 = -((n - 1) * spacing) / 2;
    data.candidates.forEach(([word, p], i) => {
      const group = new THREE.Group();
      const h = Math.max(0.05, p * 1.9);
      const picked = data.highlight != null && word === data.highlight;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1, 0.42), picked ? this.barMatPick : i === 0 ? this.barMat : this.barMatSoft);
      bar.castShadow = true;
      bar.position.y = 0.5;
      group.add(bar);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.33), new THREE.MeshBasicMaterial({ map: textTexture(word, this.palette), transparent: true }));
      label.rotation.x = -Math.PI / 2.6;
      label.position.set(0, 0.2, 0.42);
      group.add(label);
      const pct = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: textTexture(`%${Math.round(p * 100)}`, this.palette), transparent: true }));
      pct.rotation.x = -Math.PI / 2;
      group.add(pct);
      group.userData.pct = pct;
      group.position.set(bx0 + i * spacing, 0, -0.4);
      group.userData.h = h;
      group.userData.cur = animate ? 0.001 : h;
      group.userData.delay = animate ? 0.25 + i * 0.07 : 0;
      bar.scale.y = group.userData.cur;
      this.add(group);
      this.bars.push({ group, bar, p, word });
    });
    this.time = 0;
  }

  /** Recolour one bar (the sampled word) without rebuilding. */
  highlight(word) {
    for (const b of this.bars) b.bar.material = b.word === word ? this.barMatPick : b === this.bars[0] ? this.barMat : this.barMatSoft;
  }

  /** World position above the bars, for a floating tag. */
  barTop() {
    return this.localToWorld(new THREE.Vector3(0, 2.3, -0.4));
  }

  update(dt) {
    this.time += dt;
    for (const t of this.tiles) {
      const u = t.userData;
      if (this.time < u.delay) continue;
      u.scale += (1 - u.scale) * Math.min(1, dt * 8);
      t.scale.setScalar(Math.max(0.001, u.scale));
    }
    for (const b of this.bars) {
      const u = b.group.userData;
      if (this.time < u.delay) continue;
      u.cur += (u.h - u.cur) * Math.min(1, dt * 5);
      b.bar.scale.y = Math.max(0.001, u.cur);
      u.pct.position.y = u.cur + 0.02;
    }
  }
}

/** A small closed book: Bıdık's recipe book, i.e. the corpus. */
export class Book extends THREE.Group {
  constructor({ palette, title = 'Bıdık’ın kitabı' }) {
    super();
    this.name = 'book';
    const cover = new THREE.MeshStandardMaterial({ color: palette.slate, roughness: 0.6 });
    const pages = new THREE.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.9 });
    const w = 1.1;
    const d = 1.45;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), cover);
    back.position.y = 0.02;
    const block = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.22, d - 0.08), pages);
    block.position.set(0.03, 0.15, 0);
    const front = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), cover);
    front.position.y = 0.28;
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, d), cover);
    spine.position.set(-w / 2 + 0.01, 0.15, 0);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.4),
      new THREE.MeshBasicMaterial({ map: textTexture(title, palette, { bg: '#fbf8f2', size: 64 }), transparent: true })
    );
    label.rotation.x = -Math.PI / 2;
    label.position.set(0.05, 0.302, 0.05);
    for (const m of [back, block, front, spine]) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    this.add(back, block, front, spine, label);
    this.rotation.y = 0.35;
  }
}
