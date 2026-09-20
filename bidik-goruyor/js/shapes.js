/**
 * Lesson 05 · the picture dataset. Every picture is an 8×8 black-and-white
 * grid: 64 numbers, each 0 (empty) or 1 (filled). Two kinds of food:
 *   mantı (label 1): a roundish blob with a small pinched top,
 *   börek (label 0): a long rolled shape, flat or slightly tilted.
 * Position, size, tilt and a few flipped pixels vary from picture to
 * picture, so the network has to learn the shape, not one fixed drawing.
 * No THREE here: the same module runs in node for verification.
 */

export const SIZE = 8;
export const PIXELS = SIZE * SIZE;

export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const idx = (row, col) => row * SIZE + col;

/** A filled ellipse (semi-axes a, b) rotated by `angle`, centred at (cx, cy). Row = y, col = x. */
function fillEllipse(px, cx, cy, a, b, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const dx = c - cx;
      const dy = r - cy;
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      if ((u * u) / (a * a) + (v * v) / (b * b) <= 1) px[idx(r, c)] = 1;
    }
  }
}

/** Mantı: a round blob (radius ≈ 2.2–2.8) with a one-pixel bump on top. */
export function drawManti(rng) {
  const px = new Array(PIXELS).fill(0);
  const cx = 3.5 + (rng() * 2 - 1);
  const cy = 3.8 + (rng() * 2 - 1);
  const r = 2.2 + rng() * 0.6;
  fillEllipse(px, cx, cy, r, r * (0.9 + rng() * 0.2), 0);
  // the bump sits right on top of the blob, in its middle column
  const topCol = Math.min(SIZE - 1, Math.max(0, Math.round(cx)));
  let topRow = 0;
  while (topRow < SIZE && !px[idx(topRow, topCol)]) topRow++;
  if (topRow > 0 && topRow < SIZE) px[idx(topRow - 1, topCol)] = 1;
  return px;
}

/** Börek: a long roll, 6–7 wide and 2–3 tall, flat or tilted up to ±25°. */
export function drawBorek(rng) {
  const px = new Array(PIXELS).fill(0);
  const cx = 3.5 + (rng() * 2 - 1);
  const cy = 3.5 + (rng() * 2 - 1);
  const a = 3.0 + rng() * 0.5;
  const b = 1.0 + rng() * 0.5;
  const tilt = rng() < 0.5 ? 0 : (rng() * 2 - 1) * 0.45;
  fillEllipse(px, cx, cy, a, b, tilt);
  return px;
}

/** Flip `n` random pixels: a little camera noise. */
export function addNoise(px, rng, n) {
  for (let k = 0; k < n; k++) {
    const i = Math.floor(rng() * PIXELS);
    px[i] = px[i] ? 0 : 1;
  }
  return px;
}

/** `perClass` mantı + `perClass` börek pictures, alternating; labels mantı = 1, börek = 0. */
export function makeShapeDataset(perClass, seed, noise = 3) {
  const rng = seeded(seed);
  const data = [];
  for (let i = 0; i < perClass; i++) {
    const m = addNoise(drawManti(rng), rng, Math.floor(rng() * (noise + 1)));
    data.push({ x: m, y: 1, kind: 'manti' });
    const b = addNoise(drawBorek(rng), rng, Math.floor(rng() * (noise + 1)));
    data.push({ x: b, y: 0, kind: 'borek' });
  }
  return data;
}

export const TRAIN_PER_CLASS = 60;
export const TEST_PER_CLASS = 30;
export const TRAIN_SEED = 21;
export const TEST_SEED = 8;

export function makeTrainSet() {
  return makeShapeDataset(TRAIN_PER_CLASS, TRAIN_SEED);
}
export function makeTestSet() {
  return makeShapeDataset(TEST_PER_CLASS, TEST_SEED);
}

/** The 64 numbers as 8 rows of 8 digits (for the "show the numbers" view). */
export function toRows(px) {
  const rows = [];
  for (let r = 0; r < SIZE; r++) rows.push(px.slice(r * SIZE, r * SIZE + SIZE).join(' '));
  return rows;
}

/** An empty 8×8 picture. */
export function blank() {
  return new Array(PIXELS).fill(0);
}
