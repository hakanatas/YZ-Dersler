/**
 * The kitchen-floor maze: a small grid, breadth-first search and a random
 * walk. Pure data and algorithms (no THREE), so it can be imported and
 * tested from node: `node --test` or `node -e "import('./maze.js')"`.
 *
 * Map legend: `.` open floor, `#` cabinet (wall), `S` start (Bıdık), `G` goal
 * (the steamer). Row 0 is the far edge of the table.
 */

export const DEFAULT_MAP = [
  '###.....#',
  '.#..###.#',
  '.#....#.#',
  'S..#....G',
  '.#.#####.',
  '.###.....',
  '.........',
];

export const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Parse a map into { w, h, walls: Uint8Array, start, goal } (cells are [col, row]). */
export function parseMap(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const walls = new Uint8Array(w * h);
  let start = null;
  let goal = null;
  rows.forEach((line, j) => {
    if (line.length !== w) throw new Error(`row ${j} has length ${line.length}, expected ${w}`);
    for (let i = 0; i < w; i++) {
      const ch = line[i];
      if (ch === '#') walls[j * w + i] = 1;
      else if (ch === 'S') start = [i, j];
      else if (ch === 'G') goal = [i, j];
    }
  });
  if (!start || !goal) throw new Error('map needs S and G');
  return { w, h, walls, start, goal };
}

export const idx = (grid, [i, j]) => j * grid.w + i;
export const cellOf = (grid, k) => [k % grid.w, Math.floor(k / grid.w)];
export const same = (a, b) => a[0] === b[0] && a[1] === b[1];

export function inBounds(grid, [i, j]) {
  return i >= 0 && j >= 0 && i < grid.w && j < grid.h;
}

export function isOpen(grid, cell) {
  return inBounds(grid, cell) && !grid.walls[idx(grid, cell)];
}

/** Open neighbours of a cell (4-connected), in a fixed order. */
export function neighbors(grid, [i, j]) {
  const out = [];
  for (const [di, dj] of DIRS) {
    const n = [i + di, j + dj];
    if (isOpen(grid, n)) out.push(n);
  }
  return out;
}

/**
 * Breadth-first search from start to goal.
 * Returns { rings, visited, path, dist }:
 *   rings   – array of arrays; rings[d] holds the cells discovered at distance d
 *             (rings[0] = [start]). Search stops after the ring that contains the goal.
 *   visited – number of cells discovered (the start counts; the goal counts).
 *   path    – shortest path as a list of cells from start to goal, or null.
 *   dist    – Int16Array of distances (-1 = not reached).
 */
export function bfs(grid, start = grid.start, goal = grid.goal) {
  const dist = new Int16Array(grid.w * grid.h).fill(-1);
  const prev = new Int16Array(grid.w * grid.h).fill(-1);
  const rings = [[start]];
  dist[idx(grid, start)] = 0;
  let found = same(start, goal);
  let d = 0;
  while (!found && rings[d].length) {
    const next = [];
    for (const cell of rings[d]) {
      for (const n of neighbors(grid, cell)) {
        const k = idx(grid, n);
        if (dist[k] !== -1) continue;
        dist[k] = d + 1;
        prev[k] = idx(grid, cell);
        next.push(n);
        if (same(n, goal)) found = true;
      }
    }
    if (!next.length) break;
    rings.push(next);
    d++;
  }
  let path = null;
  if (found) {
    path = [];
    for (let k = idx(grid, goal); k !== -1; k = prev[k]) path.push(cellOf(grid, k));
    path.reverse();
  }
  const visited = rings.reduce((n, r) => n + r.length, 0);
  return { rings, visited, path, dist };
}

/** A tiny seeded generator (LCG) so tests are repeatable. */
export function makeRng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
}

/**
 * Random walk: at every step choose uniformly among the open neighbours.
 * Returns { steps: [cells after each step], reached, count }.
 */
export function randomWalk(grid, maxSteps = 60, rng = Math.random, start = grid.start, goal = grid.goal) {
  let cell = start;
  const steps = [];
  let reached = same(cell, goal);
  while (!reached && steps.length < maxSteps) {
    const ns = neighbors(grid, cell);
    if (!ns.length) break;
    cell = ns[Math.min(ns.length - 1, Math.floor(rng() * ns.length))];
    steps.push(cell);
    reached = same(cell, goal);
  }
  return { steps, reached, count: steps.length };
}

/** Toggle a wall; start and goal cells stay open. Returns the new state. */
export function toggleWall(grid, cell) {
  if (!inBounds(grid, cell) || same(cell, grid.start) || same(cell, grid.goal)) return null;
  const k = idx(grid, cell);
  grid.walls[k] = grid.walls[k] ? 0 : 1;
  return !!grid.walls[k];
}

export function countOpen(grid) {
  let n = 0;
  for (const v of grid.walls) if (!v) n++;
  return n;
}
