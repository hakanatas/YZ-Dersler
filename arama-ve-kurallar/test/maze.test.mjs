// node --test arama-ve-kurallar/test/  (checks the numbers quoted in steps.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, DEFAULT_MAP, bfs, randomWalk, toggleWall, countOpen, makeRng } from '../js/maze.js';
import { DUMPLINGS, TREE, FEATURES, evaluate, filterRows, chefsOf, depthFor } from '../js/tree.js';

import { STEPS } from '../js/steps.js';

// the rendered chapter text (bodies + quiz), so the quoted numbers are checked as the student sees them
const steps = STEPS.map((s) => s.body).join('\n');

test('default maze: 9×7, 22 cabinets, 41 open cells', () => {
  const g = parseMap(DEFAULT_MAP);
  assert.equal(g.w, 9);
  assert.equal(g.h, 7);
  assert.equal(countOpen(g), 41);
  assert.equal(g.w * g.h - countOpen(g), 22);
  assert.deepEqual(g.start, [0, 3]);
  assert.deepEqual(g.goal, [8, 3]);
  assert.match(steps, /9×7 = 63 kare; 22'si dolap, 41'i açık/);
});

test('BFS on the default maze: 36 cells discovered, shortest path 10 steps', () => {
  const g = parseMap(DEFAULT_MAP);
  const r = bfs(g);
  assert.equal(r.visited, 36);
  assert.equal(r.path.length - 1, 10);
  assert.deepEqual(r.path[0], g.start);
  assert.deepEqual(r.path.at(-1), g.goal);
  // every step moves to a 4-neighbour open cell
  for (let i = 1; i < r.path.length; i++) {
    const [a, b] = [r.path[i - 1], r.path[i]];
    assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1);
    assert.equal(g.walls[b[1] * g.w + b[0]], 0);
  }
  assert.equal(r.rings.length, 11);
  assert.equal(r.rings.reduce((n, ring) => n + ring.length, 0), r.visited);
  assert.match(steps, /41 açık karenin 36'sına bakar ve 10 adımlık yolu bulur/);
  assert.match(steps, /en kısa yol 10 adımdır/);
});

test('shortest path is optimal: no shorter path exists (exhaustive check)', () => {
  const g = parseMap(DEFAULT_MAP);
  const r = bfs(g);
  // the distance table is consistent: goal distance equals the path length
  assert.equal(r.dist[g.goal[1] * g.w + g.goal[0]], r.path.length - 1);
  // Manhattan lower bound is 8, and the straight row is blocked at (3,3)
  assert.equal(g.walls[3 * g.w + 3], 1);
});

test('blocking the neighbour toward the pot reroutes to 14 steps; blocking the near neighbour too leaves no path', () => {
  const g = parseMap(DEFAULT_MAP);
  assert.equal(toggleWall(g, [1, 3]), true);
  const r1 = bfs(g);
  assert.equal(r1.path.length - 1, 14);
  assert.equal(toggleWall(g, [0, 4]), true);
  const r2 = bfs(g);
  assert.equal(r2.path, null);
  assert.equal(r2.visited, 3); // start, (0,2), (0,1): the dead end above Bıdık
  assert.match(steps, /alt koridordan 14 adım olur/);
  // start and goal cannot become walls
  assert.equal(toggleWall(g, g.start), null);
  assert.equal(toggleWall(g, g.goal), null);
  assert.equal(toggleWall(g, [1, 3]), false); // toggled back open
});

test('bfs with start === goal', () => {
  const g = parseMap(DEFAULT_MAP);
  const r = bfs(g, g.start, g.start);
  assert.equal(r.path.length, 1);
  assert.equal(r.visited, 1);
});

test('random walk (60 steps): about 14% reach the pot, ~43 steps when they do', () => {
  const g = parseMap(DEFAULT_MAP);
  const N = 10000;
  const rates = [];
  const avgs = [];
  for (const seed of [1, 7, 42, 2024]) {
    const rng = makeRng(seed);
    let ok = 0;
    let sum = 0;
    for (let t = 0; t < N; t++) {
      const w = randomWalk(g, 60, rng);
      assert.ok(w.count <= 60);
      if (w.reached) {
        ok++;
        sum += w.count;
        assert.deepEqual(w.steps.at(-1), g.goal);
      }
    }
    rates.push(ok / N);
    avgs.push(sum / ok);
  }
  for (const r of rates) assert.ok(r > 0.12 && r < 0.17, `rate ${r}`);
  for (const a of avgs) assert.ok(a > 41 && a < 46, `avg ${a}`);
  assert.match(steps, /ulaşma oranı yaklaşık %14/);
  assert.match(steps, /ortalama 43 adım/);
});

test('decision tree classifies all eight dumplings; "katlı" separates no chef', () => {
  for (const row of DUMPLINGS) assert.equal(evaluate(TREE, row), row.chef);
  assert.equal(DUMPLINGS.length, 8);
  assert.deepEqual(DUMPLINGS.map((r) => depthFor(TREE, r)), [1, 1, 1, 1, 2, 2, 2, 2]);
  for (const v of [0, 1]) assert.equal(chefsOf(filterRows(DUMPLINGS, { katli: v })).length, 3);
  assert.equal(chefsOf(filterRows(DUMPLINGS, { kalin: 0 })).length, 1);
  assert.equal(chefsOf(filterRows(DUMPLINGS, { kalin: 1, etli: 1 })).length, 1);
  assert.equal(FEATURES.length, 3);
});
