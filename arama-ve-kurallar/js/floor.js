import * as THREE from 'three';
import { idx, cellOf } from './maze.js';

/**
 * The kitchen floor as a tiled grid on the table: floor tiles (InstancedMesh),
 * cabinets (raised dark tiles, InstancedMesh), a start mark under Bıdık and the
 * steamer pot at the goal. Cells are [col, row]; row 0 is the far edge.
 */
export class MazeFloor extends THREE.Group {
  constructor({ grid, cell = 0.8, palette }) {
    super();
    this.name = 'maze-floor';
    this.grid = grid;
    this.cell = cell;
    this.palette = palette;
    const n = grid.w * grid.h;
    this.dummy = new THREE.Object3D();

    // floor tiles
    const tileGeo = new THREE.BoxGeometry(cell * 0.94, 0.04, cell * 0.94);
    const tileMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
    this.tiles = new THREE.InstancedMesh(tileGeo, tileMat, n);
    this.tiles.receiveShadow = true;
    this.baseA = new THREE.Color('#f4ebdc');
    this.baseB = new THREE.Color('#ebdfcb');
    this.startColor = new THREE.Color('#cfe5d3');
    this.tints = new Array(n).fill(null);
    for (let k = 0; k < n; k++) {
      const [i, j] = cellOf(grid, k);
      this.dummy.position.copy(this.cellToLocal([i, j], 0.02));
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.tiles.setMatrixAt(k, this.dummy.matrix);
      this.tiles.setColorAt(k, this.baseColor(k));
    }
    this.add(this.tiles);

    // border cloth
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(grid.w * cell + 0.24, 0.012, grid.h * cell + 0.24),
      new THREE.MeshStandardMaterial({ color: palette.terracottaSoft, roughness: 0.9 })
    );
    border.position.y = 0.006;
    border.receiveShadow = true;
    this.add(border);

    // cabinets
    this.wallHeight = 0.4;
    const wallGeo = new THREE.BoxGeometry(cell * 0.96, this.wallHeight, cell * 0.96);
    const wallMat = new THREE.MeshStandardMaterial({ color: palette.bambooDark, roughness: 0.7 });
    this.walls = new THREE.InstancedMesh(wallGeo, wallMat, n);
    this.walls.castShadow = true;
    this.walls.receiveShadow = true;
    this.walls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.add(this.walls);
    // little handles so the cabinets read as cabinets
    const handleGeo = new THREE.SphereGeometry(0.035, 10, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: '#f5e6c8', roughness: 0.4, metalness: 0.3 });
    this.handles = new THREE.InstancedMesh(handleGeo, handleMat, n);
    this.handles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.add(this.handles);
    this.refreshWalls();

    // steamer pot at the goal
    const pot = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: '#d9d4cc', roughness: 0.35, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.3, 32), steel);
    body.position.y = 0.15;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 32), steel);
    lid.position.y = 0.33;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: palette.terracotta, roughness: 0.5 }));
    knob.position.y = 0.4;
    const handleL = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16, Math.PI), steel);
    handleL.position.set(-0.3, 0.22, 0);
    handleL.rotation.y = Math.PI / 2;
    const handleR = handleL.clone();
    handleR.position.x = 0.3;
    handleR.rotation.y = -Math.PI / 2;
    pot.add(body, lid, knob, handleL, handleR);
    pot.children.forEach((m) => (m.castShadow = true));
    pot.position.copy(this.cellToLocal(grid.goal, 0.04));
    this.add(pot);
    this.pot = pot;

    // steam puffs
    this.puffs = [];
    const puffMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), puffMat.clone());
      p.userData.t = i / 4;
      p.userData.dx = (i % 2 ? 1 : -1) * 0.06;
      pot.add(p);
      this.puffs.push(p);
    }
    this.time = 0;
  }

  /** Local position of a cell's centre. */
  cellToLocal([i, j], y = 0) {
    return new THREE.Vector3((i - (this.grid.w - 1) / 2) * this.cell, y, (j - (this.grid.h - 1) / 2) * this.cell);
  }

  cellToWorld(cell, y = 0) {
    return this.localToWorld(this.cellToLocal(cell, y));
  }

  /** The cell under a world point, or null when outside the grid. */
  worldToCell(point) {
    const p = this.worldToLocal(point.clone());
    const i = Math.round(p.x / this.cell + (this.grid.w - 1) / 2);
    const j = Math.round(p.z / this.cell + (this.grid.h - 1) / 2);
    if (i < 0 || j < 0 || i >= this.grid.w || j >= this.grid.h) return null;
    return [i, j];
  }

  baseColor(k) {
    const [i, j] = cellOf(this.grid, k);
    if (i === this.grid.start[0] && j === this.grid.start[1]) return this.startColor;
    return (i + j) % 2 ? this.baseB : this.baseA;
  }

  /** Tint one cell (THREE.Color or null to restore). */
  setTint(cell, color) {
    const k = idx(this.grid, cell);
    this.tints[k] = color ? color.clone() : null;
    this.tiles.setColorAt(k, color || this.baseColor(k));
    this.tiles.instanceColor.needsUpdate = true;
  }

  clearTints() {
    for (let k = 0; k < this.tints.length; k++) {
      if (!this.tints[k]) continue;
      this.tints[k] = null;
      this.tiles.setColorAt(k, this.baseColor(k));
    }
    this.tiles.instanceColor.needsUpdate = true;
  }

  /** Rebuild cabinet instances from grid.walls. */
  refreshWalls() {
    const g = this.grid;
    const d = this.dummy;
    for (let k = 0; k < g.w * g.h; k++) {
      const on = !!g.walls[k];
      const cell = cellOf(g, k);
      d.position.copy(this.cellToLocal(cell, this.wallHeight / 2 + 0.02));
      d.scale.setScalar(on ? 1 : 0.0001);
      d.updateMatrix();
      this.walls.setMatrixAt(k, d.matrix);
      d.position.copy(this.cellToLocal(cell, this.wallHeight * 0.55));
      d.position.z += this.cell * 0.48;
      d.updateMatrix();
      this.handles.setMatrixAt(k, d.matrix);
    }
    this.walls.instanceMatrix.needsUpdate = true;
    this.handles.instanceMatrix.needsUpdate = true;
    this.walls.computeBoundingSphere();
  }

  update(dt) {
    this.time += dt;
    for (const p of this.puffs) {
      p.userData.t = (p.userData.t + dt * 0.35) % 1;
      const t = p.userData.t;
      p.position.set(p.userData.dx + Math.sin(t * 6.3 + p.userData.dx * 40) * 0.05, 0.45 + t * 0.5, 0);
      const s = 0.6 + t * 1.1;
      p.scale.setScalar(s);
      p.material.opacity = 0.5 * (1 - t) * Math.min(1, t * 6);
    }
  }
}
