import * as THREE from 'three';
import { SIZE, PIXELS } from './shapes.js';

/**
 * An 8×8 tray of little tiles on the table: the picture Bıdık is looking at.
 * A lit pixel (1) rises and turns ink-dark; an empty pixel (0) lies flat and
 * white. Row 0 is the far edge, column 0 the left edge, so the tray reads
 * like the grid in the lesson panel.
 */
export class PixelBoard extends THREE.Group {
  constructor({ size = 2.4, palette }) {
    super();
    this.name = 'pixelboard';
    this.size = size;
    this.cell = size / SIZE;
    this.values = new Float32Array(PIXELS); // target 0/1
    this.shown = new Float32Array(PIXELS); // animated
    this.off = new THREE.Color('#fffdf8');
    this.on = new THREE.Color(palette.ink);
    this.time = 0;

    const cell = this.cell;
    const geo = new THREE.BoxGeometry(cell * 0.86, 1, cell * 0.86);
    geo.translate(0, 0.5, 0); // grow upward from the tray
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 });
    this.tiles = new THREE.InstancedMesh(geo, mat, PIXELS);
    this.tiles.castShadow = true;
    this.tiles.receiveShadow = true;
    this.dummy = new THREE.Object3D();
    for (let i = 0; i < PIXELS; i++) this.tiles.setColorAt(i, this.off);
    this.add(this.tiles);

    // tray
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(size + 0.22, 0.05, size + 0.22),
      new THREE.MeshStandardMaterial({ color: palette.terracottaSoft, roughness: 0.9 })
    );
    tray.position.y = 0.025;
    tray.receiveShadow = true;
    tray.castShadow = true;
    this.add(tray);
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(size + 0.34, 0.03, size + 0.34),
      new THREE.MeshStandardMaterial({ color: palette.bamboo, roughness: 0.75 })
    );
    lip.position.y = 0.015;
    lip.receiveShadow = true;
    this.add(lip);

    this.layout(true);
  }

  /** Local centre of pixel `i` on the tray surface. */
  cellCenter(i, y = 0.05) {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    return new THREE.Vector3((c + 0.5) * this.cell - this.size / 2, y, (r + 0.5) * this.cell - this.size / 2);
  }

  /** Show a picture: an array of 64 numbers (0/1). */
  setImage(px, instant = false) {
    for (let i = 0; i < PIXELS; i++) this.values[i] = px[i] ? 1 : 0;
    if (instant) this.shown.set(this.values);
    this.layout(true);
  }

  layout(force = false) {
    let changed = force;
    const d = this.dummy;
    const col = new THREE.Color();
    for (let i = 0; i < PIXELS; i++) {
      const v = this.shown[i];
      const p = this.cellCenter(i, 0.05);
      d.position.copy(p);
      d.scale.set(1, 0.02 + v * 0.16, 1);
      d.updateMatrix();
      this.tiles.setMatrixAt(i, d.matrix);
      col.copy(this.off).lerp(this.on, v);
      this.tiles.setColorAt(i, col);
      changed = true;
    }
    if (changed) {
      this.tiles.instanceMatrix.needsUpdate = true;
      if (this.tiles.instanceColor) this.tiles.instanceColor.needsUpdate = true;
    }
  }

  update(dt) {
    this.time += dt;
    let moving = false;
    const k = Math.min(1, dt * 9);
    for (let i = 0; i < PIXELS; i++) {
      const diff = this.values[i] - this.shown[i];
      if (Math.abs(diff) < 0.002) {
        if (this.shown[i] !== this.values[i]) {
          this.shown[i] = this.values[i];
          moving = true;
        }
        continue;
      }
      this.shown[i] += diff * k;
      moving = true;
    }
    if (moving) this.layout();
  }
}
