/**
 * Lesson 06 · the learner. A multi-armed bandit: ten arms = cooking times
 * 1…10 minutes. No labels anywhere; after every dumpling the customer either
 * claps (reward 1) or stays silent (reward 0). Value estimate per arm =
 * running average of its rewards; action choice = epsilon-greedy.
 *
 * Dependency free apart from the shared kitchen rule (js/mlp.js:
 * ideal time = 3 + 6·size minutes, tasty if within ±1.5 minutes), so it can
 * be simulated in node.
 */
import { idealMinutes } from '../../js/mlp.js';

export const ARMS = 10; // arm a ↔ (a + 1) minutes
export const TOLERANCE = 1.5;
/** Base sizes; every dumpling is hand made, so it varies by ±JITTER. */
export const SIZES = { kucuk: 0.2, orta: 0.5, buyuk: 0.8 };
export const JITTER = 0.2;
export const SIZE_NAMES = { kucuk: 'küçük', orta: 'orta', buyuk: 'büyük' };

export function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function sampleSize(base, rng) {
  return Math.min(1, Math.max(0, base + (rng() * 2 - 1) * JITTER));
}

/** 'raw' | 'good' | 'over' according to the kitchen rule. */
export function doneness(size, minutes) {
  const d = minutes - idealMinutes(size);
  if (Math.abs(d) < TOLERANCE) return 'good';
  return d < 0 ? 'raw' : 'over';
}

/** Reward functions: customer claps (1) or not (0). */
export const REWARDS = {
  /** claps when the dumpling is tasty */
  tat: (size, minutes) => (doneness(size, minutes) === 'good' ? 1 : 0),
  /** claps for fast service (≤ 3 minutes), whatever the taste */
  hiz: (size, minutes) => (minutes <= 3 ? 1 : 0),
};

/** Exact clap probability of each arm for a base size (uniform jitter). */
export function armProbabilities(base, reward = REWARDS.tat, samples = 2000) {
  const p = new Array(ARMS).fill(0);
  for (let i = 0; i < samples; i++) {
    const size = Math.min(1, Math.max(0, base + ((i + 0.5) / samples - 0.5) * 2 * JITTER));
    for (let a = 0; a < ARMS; a++) p[a] += reward(size, a + 1) / samples;
  }
  return p;
}

export class Bandit {
  constructor({ epsilon = 0.1, tables = 1, seed = 1 } = {}) {
    this.epsilon = epsilon;
    this.tables = tables;
    this.seed = seed;
    this.reset(seed);
  }

  reset(seed = this.seed) {
    this.seed = seed;
    this.rng = seeded(seed);
    this.Q = Array.from({ length: this.tables }, () => new Float64Array(ARMS));
    this.N = Array.from({ length: this.tables }, () => new Uint32Array(ARMS));
    this.trials = 0;
    this.claps = 0;
    this.explored = false; // was the last choice a random one?
  }

  /** Arms with the highest value on table t (ties kept). */
  bestArms(t = 0) {
    const Q = this.Q[t];
    let max = -Infinity;
    const best = [];
    for (let a = 0; a < ARMS; a++) {
      if (Q[a] > max + 1e-12) {
        max = Q[a];
        best.length = 0;
        best.push(a);
      } else if (Math.abs(Q[a] - max) <= 1e-12) best.push(a);
    }
    return best;
  }

  /** The single arm Bıdık currently believes in, or -1 before any clap. */
  best(t = 0) {
    const b = this.bestArms(t);
    return this.Q[t][b[0]] > 0 ? b[0] : -1;
  }

  /** Epsilon-greedy: with probability ε a random arm, otherwise the best (ties broken at random). */
  choose(t = 0) {
    const r = this.rng();
    if (r < this.epsilon) {
      this.explored = true;
      return Math.floor(this.rng() * ARMS);
    }
    this.explored = false;
    const best = this.bestArms(t);
    return best[Math.floor(this.rng() * best.length)];
  }

  /** Running average: Q[a] += (r − Q[a]) / n[a]. */
  learn(t, a, r) {
    const n = ++this.N[t][a];
    this.Q[t][a] += (r - this.Q[t][a]) / n;
    this.trials++;
    this.claps += r;
  }
}

/**
 * Experiment modes. `sizes` alternate dumpling by dumpling; `tables` is the
 * number of value tables (1 = Bıdık ignores the size, 2 = one table per size).
 */
export const MODES = {
  orta: { sizes: ['orta'], tables: 1, reward: 'tat' },
  boy: { sizes: ['kucuk', 'buyuk'], tables: 2, reward: 'tat' },
  boyTek: { sizes: ['kucuk', 'buyuk'], tables: 1, reward: 'tat' },
  hiz: { sizes: ['orta'], tables: 1, reward: 'hiz' },
};

/** A kitchen: dumplings come in, Bıdık (or the student) picks a time, the customer reacts. */
export class Kitchen {
  constructor({ mode = 'orta', epsilon = 0.1, seed = 1 } = {}) {
    this.setMode(mode, epsilon, seed);
  }

  setMode(mode, epsilon = this.bandit?.epsilon ?? 0.1, seed = this.bandit?.seed ?? 1) {
    this.mode = mode;
    this.def = MODES[mode];
    this.bandit = new Bandit({ epsilon, tables: this.def.tables, seed });
    this.reset(seed);
  }

  reset(seed = this.bandit.seed) {
    this.bandit.reset(seed);
    this.count = 0;
    this.tasty = 0; // how many were really tasty (the truth, which the learner never sees)
    this.history = []; // clap rate of every 10 trials
    this.window = 0;
    this.last = null;
    this.pending = this.nextDumpling();
  }

  get epsilon() {
    return this.bandit.epsilon;
  }
  set epsilon(v) {
    this.bandit.epsilon = v;
  }

  /** The dumpling waiting on the counter: its kind, actual size and value table. */
  nextDumpling() {
    const kind = this.def.sizes[this.count % this.def.sizes.length];
    const size = sampleSize(SIZES[kind], this.bandit.rng);
    const table = this.def.tables > 1 ? this.count % this.def.sizes.length : 0;
    return { kind, size, table };
  }

  /** Cook the pending dumpling for `minutes`; returns the trial record. */
  cook(minutes, explored = false) {
    const d = this.pending;
    const r = REWARDS[this.def.reward](d.size, minutes);
    const done = doneness(d.size, minutes);
    this.bandit.learn(d.table, minutes - 1, r);
    this.count++;
    this.window += r;
    if (this.count % 10 === 0) {
      this.history.push(this.window / 10);
      this.window = 0;
    }
    if (done === 'good') this.tasty++;
    this.last = { ...d, minutes, r, done, explored, n: this.count };
    this.pending = this.nextDumpling();
    return this.last;
  }

  /** Bıdık picks the time himself. */
  step() {
    const a = this.bandit.choose(this.pending.table);
    return this.cook(a + 1, this.bandit.explored);
  }

  /** Bıdık's current favourite time on table t, in minutes (0 = none yet). */
  bestMinutes(t = 0) {
    const b = this.bandit.best(t);
    return b < 0 ? 0 : b + 1;
  }
}

/** Run `trials` automatic trials and summarise (for node checks and tests). */
export function simulate({ mode = 'orta', epsilon = 0.1, seed = 1, trials = 200 } = {}) {
  const k = new Kitchen({ mode, epsilon, seed });
  const armCounts = new Array(ARMS).fill(0);
  for (let i = 0; i < trials; i++) armCounts[k.step().minutes - 1]++;
  return {
    claps: k.bandit.claps,
    tasty: k.tasty,
    best: k.bandit.Q.map((_, t) => k.bestMinutes(t)),
    Q: k.bandit.Q.map((q) => Array.from(q, (v) => Math.round(v * 100) / 100)),
    armCounts,
  };
}
