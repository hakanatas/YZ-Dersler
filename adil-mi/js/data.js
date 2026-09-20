/**
 * Lesson 03 · data for the three chefs. Each chef makes dumplings in her own
 * size range, but every dumpling obeys the same hidden kitchen rule.
 *
 * This lesson's rule is curved: ideal time = 3 + 6·size² minutes (±1.5 min),
 * i.e. a big dumpling's centre takes disproportionately longer to cook. With
 * the straight rule of lessons 01–02 (3 + 6·size) the network extrapolates
 * the band correctly and nothing goes wrong for the unseen chef; with the
 * curved rule the missing coverage really shows (verified numerically).
 */
import { MINUTES } from '../../js/mlp.js';

export { MINUTES };

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const TOLERANCE = 1.5;
export function idealMinutes(size) {
  return 3 + 6 * size * size;
}
export function trueLabel(size, time) {
  return Math.abs(time * MINUTES - idealMinutes(size)) < TOLERANCE ? 1 : 0;
}

export const CHEFS = [
  { id: 'ayse', name: 'Ayşe Usta', short: 'Ayşe', range: [0.05, 0.35], color: '#3f8a5b', label: 'küçük' },
  { id: 'kemal', name: 'Kemal Usta', short: 'Kemal', range: [0.35, 0.65], color: '#5b7c99', label: 'orta' },
  { id: 'deniz', name: 'Deniz Usta', short: 'Deniz', range: [0.65, 0.95], color: '#8a5bb0', label: 'büyük' },
];

/**
 * A chef's dumplings: `count` examples with size inside the chef's range.
 * Like makeDataset in js/mlp.js: half the dishes are sampled near the ideal
 * time so both labels show up, and a ±0.45 min gap around the boundary
 * keeps it learnable. Each example carries `chef` (index into CHEFS).
 */
export function makeChefDataset(chef, count, seed) {
  const [lo, hi] = CHEFS[chef].range;
  const r = seeded(seed);
  const data = [];
  let guard = 0;
  while (data.length < count && guard++ < 20000) {
    const size = lo + 0.02 + r() * (hi - lo - 0.04);
    const time = data.length % 2 === 0 ? 0.05 + r() * 0.9 : Math.min(0.95, Math.max(0.05, (idealMinutes(size) + (r() * 2 - 1) * 2.6) / MINUTES));
    const dist = Math.abs(time * MINUTES - idealMinutes(size));
    if (Math.abs(dist - TOLERANCE) < 0.45) continue;
    data.push({ x: [size, time], y: trueLabel(size, time), chef });
  }
  return data;
}

/** Test table: `per` dumplings from every chef, one seed per chef. */
export function makeTestSet(per, seeds) {
  return CHEFS.flatMap((_, i) => makeChefDataset(i, per, seeds[i]));
}

/** Accuracy of `net` on `data`, split per chef: [{ chef, n, correct, acc }]. */
export function perChef(net, data) {
  return CHEFS.map((_, chef) => {
    const rows = data.filter((d) => d.chef === chef);
    let correct = 0;
    for (const d of rows) if ((net.predict(d.x) > 0.5 ? 1 : 0) === d.y) correct++;
    return { chef, n: rows.length, correct, acc: rows.length ? correct / rows.length : 0 };
  });
}
