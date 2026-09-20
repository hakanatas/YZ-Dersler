/**
 * A tiny neural network (2 → hidden → 1) trained with plain gradient descent.
 * Deliberately small and readable: this is the thing the lesson visualises.
 */

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

/**
 * The kitchen's hidden rule: a dumpling is cooked just right when its
 * cooking time matches its size. size 0..1 (small → big), time 0..1
 * (0 → 10 minutes). Perfect window: 3 + 6·size minutes, ±1.5 minutes.
 */
export const MINUTES = 10;
export function idealMinutes(size) {
  return 3 + 6 * size;
}
export function trueLabel(size, time) {
  return Math.abs(time * MINUTES - idealMinutes(size)) < 1.5 ? 1 : 0;
}

export function makeDataset(count = 64, seed = 11) {
  const r = seeded(seed);
  const data = [];
  let guard = 0;
  let positives = 0;
  while (data.length < count && guard++ < 20000) {
    const size = 0.05 + r() * 0.9;
    // sample half the dishes near the ideal time so both classes are well represented
    const time = data.length % 2 === 0 ? 0.05 + r() * 0.9 : Math.min(0.95, Math.max(0.05, (idealMinutes(size) + (r() * 2 - 1) * 2.6) / MINUTES));
    const dist = Math.abs(time * MINUTES - idealMinutes(size));
    if (Math.abs(dist - 1.5) < 0.45) continue; // keep a little gap so the boundary is learnable
    const y = trueLabel(size, time);
    if (y) positives++;
    data.push({ x: [size, time], y });
  }
  return data;
}

export class TinyNet {
  /** `inputs` features → `hidden` tanh nodes → 1 sigmoid output. */
  constructor(hidden = 6, seed = 3, inputs = 2) {
    this.hidden = hidden;
    this.seed = seed;
    this.inputs = inputs;
    this.reset();
  }

  reset() {
    const r = seeded(this.seed);
    const scale = this.inputs > 4 ? 0.9 / Math.sqrt(this.inputs / 2) : 0.9;
    const rnd = () => (r() * 2 - 1) * scale;
    this.W1 = Array.from({ length: this.hidden }, () => Array.from({ length: this.inputs }, rnd));
    this.b1 = Array.from({ length: this.hidden }, () => rnd() * 0.3);
    this.W2 = Array.from({ length: this.hidden }, () => rnd());
    this.b2 = 0;
    this.steps = 0;
    this.history = [];
  }

  /** Forward pass, returning every intermediate so the scene can show them. */
  forward(x) {
    const z1 = this.W1.map((w, i) => {
      let z = this.b1[i];
      for (let j = 0; j < w.length; j++) z += w[j] * x[j];
      return z;
    });
    const h = z1.map(Math.tanh);
    const z2 = h.reduce((acc, v, i) => acc + v * this.W2[i], this.b2);
    const p = sigmoid(z2);
    return { z1, h, z2, p };
  }

  predict(x) {
    return this.forward(x).p;
  }

  /** One full-batch gradient step. Returns loss and accuracy before the update. */
  trainStep(data, lr = 0.6) {
    const n = data.length;
    const gW1 = this.W1.map((w) => new Array(w.length).fill(0));
    const gb1 = new Array(this.hidden).fill(0);
    const gW2 = new Array(this.hidden).fill(0);
    let gb2 = 0;
    let loss = 0;
    let correct = 0;
    for (const { x, y } of data) {
      const { h, p } = this.forward(x);
      const eps = 1e-7;
      loss += -(y * Math.log(p + eps) + (1 - y) * Math.log(1 - p + eps));
      if ((p > 0.5 ? 1 : 0) === y) correct++;
      const dz2 = p - y; // dLoss/dz2 for binary cross-entropy with a sigmoid
      for (let i = 0; i < this.hidden; i++) {
        gW2[i] += dz2 * h[i];
        const dh = dz2 * this.W2[i];
        const dz1 = dh * (1 - h[i] * h[i]);
        for (let j = 0; j < x.length; j++) gW1[i][j] += dz1 * x[j];
        gb1[i] += dz1;
      }
      gb2 += dz2;
    }
    for (let i = 0; i < this.hidden; i++) {
      for (let j = 0; j < this.inputs; j++) this.W1[i][j] -= (lr * gW1[i][j]) / n;
      this.b1[i] -= (lr * gb1[i]) / n;
      this.W2[i] -= (lr * gW2[i]) / n;
    }
    this.b2 -= (lr * gb2) / n;
    this.steps++;
    const out = { loss: loss / n, acc: correct / n };
    this.history.push(out.loss);
    if (this.history.length > 400) this.history.shift();
    return out;
  }

  evaluate(data) {
    let loss = 0;
    let correct = 0;
    for (const { x, y } of data) {
      const p = this.predict(x);
      loss += -(y * Math.log(p + 1e-7) + (1 - y) * Math.log(1 - p + 1e-7));
      if ((p > 0.5 ? 1 : 0) === y) correct++;
    }
    return { loss: loss / data.length, acc: correct / data.length };
  }

  /** Gradient direction of each weight for the "which screw to turn" animation. */
  gradients(data) {
    const gW1 = this.W1.map((w) => new Array(w.length).fill(0));
    const gW2 = new Array(this.hidden).fill(0);
    for (const { x, y } of data) {
      const { h, p } = this.forward(x);
      const dz2 = p - y;
      for (let i = 0; i < this.hidden; i++) {
        gW2[i] += dz2 * h[i];
        const dz1 = dz2 * this.W2[i] * (1 - h[i] * h[i]);
        for (let j = 0; j < x.length; j++) gW1[i][j] += dz1 * x[j];
      }
    }
    return { gW1, gW2 };
  }
}
