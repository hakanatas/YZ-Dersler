/**
 * A tiny, real language model for lesson 04: bigram + trigram counts over a
 * small Turkish corpus, counted in the browser. No neural network, no
 * canned numbers: every percentage on screen is count / total from CORPUS.
 *
 * Tokens: lowercase words (apostrophes kept inside a word) and "." as its
 * own token so that a sentence can end. Every sentence starts with the
 * hidden start token START, so "first word of a sentence" is counted too.
 *
 * Prediction with backoff: for a context (the words so far) we look at the
 * last two tokens; if that pair was seen in the corpus we use the trigram
 * counts. Otherwise the last token alone (bigram counts). Otherwise the
 * plain word frequencies (unigram).
 *
 * Sampling with temperature T: p_i^(1/T) renormalised. T → 0 is argmax,
 * T = 1 is the counted distribution, T > 1 flattens it.
 *
 * The temperature chapter uses a mixed prediction instead of backoff
 * (linear interpolation, Jelinek–Mercer): MIX.tri of the trigram
 * distribution + MIX.bi of the bigram one + MIX.uni of the word
 * frequencies. In a book this small most word pairs have exactly one
 * follower, so with backoff alone temperature would have nothing to choose
 * from; the mix gives every word a small chance, as in a large model.
 *
 * Importable in node (no THREE) so it can be unit-tested.
 */

export const START = '<s>';
export const END = '.';

/** Weights of the mixed prediction (temperature chapter). */
export const MIX = { tri: 0.85, bi: 0.145, uni: 0.005 };

export const CORPUS = [
  'Mantı en güzel yoğurtla yenir.',
  'Mantı en güzel sıcak yenir.',
  'Mantı en güzel tereyağıyla yenir.',
  'Sıcak mantı en güzel yoğurtla yenir.',
  'Mantı en çok kışın yenir.',
  'Mantı en çok yoğurtla sevilir.',
  'Mantı en küçük hamurdan yapılır.',
  'Mantı en lezzetli yemektir.',
  'Mantı en zor yemektir.',
  'Yoğurt mantının en iyi arkadaşıdır.',
  'Yoğurda sarımsak konur.',
  'Usta sarımsağı çok sever.',
  'Bıdık sarımsağı çok sever.',
  'Bıdık yoğurdu çok sever.',
  'Usta mantıyı küçük yapar.',
  'Bıdık mantıyı büyük yapar.',
  'Küçük mantı daha çabuk pişer.',
  'Büyük mantı daha uzun pişer.',
  'Mantı buharlı tencerede pişer.',
  'Buharlı tencere mutfakta durur.',
  'Buharlı tencere çok sıcak olur.',
  'Buharlı tencerede mantı pişer.',
  'Hamur un ve sudan yapılır.',
  'Hamur ince açılır.',
  'Hamurun içine kıyma konur.',
  'Kıymaya soğan ve tuz konur.',
  'Tereyağı mantının üstüne dökülür.',
  'Tereyağına pul biber konur.',
  'Usta sabah erken kalkar.',
  'Usta sabah hamur açar.',
  'Bıdık sabah tencereyi yıkar.',
  'Bıdık akşam masayı siler.',
  'Usta akşam çay içer.',
  'Bıdık ilk kez ustanın köyünde mantı gördü.',
  'Bıdık ilk kez ustanın köyünde yoğurt yedi.',
  "Usta ilk kez Kayseri'de mantı yedi.",
  'Bu yoğurt ustanın köyünde yapıldı.',
  'Bu tencere ustanın köyünde yapıldı.',
  "Bu tabak Kayseri'de yapıldı.",
  'Ustanın köyü çok küçüktür.',
  'Ustanın köyünde herkes mantı sever.',
  "Kayseri'de mantı çok küçük yapılır.",
  "Kayseri'de yoğurt çok sevilir.",
  "Usta Kayseri'de doğdu.",
  'Bıdık mutfakta yapıldı.',
  'Mutfak sabah çok sessizdir.',
  'Mutfak akşam çok sıcaktır.',
  'Bıdık mutfağı çok sever.',
  'Bıdık mantıyı çok sever.',
  'Usta mantıyı çok sever.',
  'Herkes mantıyı çok sever.',
  'Sıcak mantı çok güzel kokar.',
  'Sıcak yoğurt güzel olmaz.',
  'Yoğurt soğuk yenir.',
  'Mantı sıcak yenir.',
  'Bıdık tabakları masaya dizer.',
  'Usta tabakları sayar.',
  'Bıdık kaşıkları sayar.',
  'Bıdık her gün mantı sayar.',
  'Usta her gün hamur açar.',
  'Bıdık her gün öğrenir.',
  'Bıdık bazen yanılır.',
  'Bıdık yanılınca üzülmez.',
  'Bıdık yanılınca düzeltir.',
  'Nane mantının üstüne konur.',
  'Pul biber tereyağına konur.',
  'Sarımsak yoğurda konur.',
  'Sarımsak çok güzel kokar.',
  'Mantı pazar günü yapılır.',
  'Pazar günü herkes mutfağa gelir.',
  'Mantı kırk tane olunca usta mutlu olur.',
];

const WORD_RE = /[a-zçğıöşü]+(?:'[a-zçğıöşü]+)?|\./g;

/** Turkish-aware lowercase (İ → i, I → ı); typographic apostrophes become '. */
export function lower(s) {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').replace(/[\u2019\u02BC]/g, "'").toLowerCase();
}

/** "Mantı en güzel yenir." → ['mantı', 'en', 'güzel', 'yenir', '.'] */
export function tokenize(text) {
  return lower(text).match(WORD_RE) || [];
}

/** Original-case pieces of a sentence, aligned 1:1 with tokenize(sentence). */
export function pieces(text) {
  const out = [];
  const re = new RegExp(WORD_RE.source, 'giu');
  let m;
  // scan the lowercased text so the indices line up with the original
  const low = lower(text);
  while ((m = re.exec(low))) out.push({ text: text.slice(m.index, m.index + m[0].length), start: m.index });
  return out;
}

function bump(map, key, word) {
  let m = map.get(key);
  if (!m) map.set(key, (m = new Map()));
  m.set(word, (m.get(word) || 0) + 1);
}

function lcg(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
}

export class NGram {
  constructor(sentences = CORPUS) {
    this.sentences = sentences;
    /** token sequences per sentence, each starting with START */
    this.seqs = sentences.map((s) => [START, ...tokenize(s)]);
    this.uni = new Map(); // word → count (START excluded)
    this.bi = new Map(); // w1 → Map(w2 → count)
    this.tri = new Map(); // "w1 w2" → Map(w3 → count)
    for (const seq of this.seqs) {
      for (let i = 0; i < seq.length; i++) {
        const w = seq[i];
        if (w !== START) this.uni.set(w, (this.uni.get(w) || 0) + 1);
        if (i + 1 < seq.length) bump(this.bi, w, seq[i + 1]);
        if (i + 2 < seq.length) bump(this.tri, `${w} ${seq[i + 1]}`, seq[i + 2]);
      }
    }
    this.random = Math.random;
    /** words written with a capital inside a sentence (proper nouns), lowercase → as written */
    this.proper = new Map();
    for (const sentence of sentences) {
      pieces(sentence).forEach((pc, i) => {
        if (i > 0 && /^[A-ZÇĞİÖŞÜ]/.test(pc.text)) this.proper.set(lower(pc.text), pc.text);
      });
    }
  }

  /** Tokens → readable sentence, restoring proper nouns as the corpus writes them. */
  text(words) {
    return detok(words.map((w) => this.proper.get(w) || w));
  }

  /** Deterministic randomness (for tests); seed(null) restores Math.random. */
  seed(n) {
    this.random = n == null ? Math.random : lcg(n);
  }

  get vocabulary() {
    return this.uni.size;
  }

  /** The tokens so far, always with the start symbol in front. */
  static seq(prompt) {
    const p = prompt.map((w) => lower(w));
    return p[0] === START ? p : [START, ...p];
  }

  /**
   * Candidates for the next token after `prompt` (array of words).
   * Returns { level, context, total, candidates: [{ word, count, p }] } sorted by count.
   */
  next(prompt) {
    const seq = NGram.seq(prompt);
    const n = seq.length;
    let level = 'unigram';
    let context = [];
    let table = null;
    if (n >= 2) {
      const key = `${seq[n - 2]} ${seq[n - 1]}`;
      if (this.tri.has(key)) {
        level = 'trigram';
        context = [seq[n - 2], seq[n - 1]];
        table = this.tri.get(key);
      }
    }
    if (!table && this.bi.has(seq[n - 1])) {
      level = 'bigram';
      context = [seq[n - 1]];
      table = this.bi.get(seq[n - 1]);
    }
    if (!table) table = this.uni;
    const total = [...table.values()].reduce((a, b) => a + b, 0);
    const candidates = [...table.entries()]
      .map(([word, count]) => ({ word, count, p: count / total }))
      .sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : 1));
    return { level, context, total, candidates };
  }

  /**
   * Mixed prediction: MIX.tri·trigram + MIX.bi·bigram + MIX.uni·unigram,
   * renormalised over the tables that exist for this context.
   * Same shape as next(); level is 'mix', count is the backoff count
   * (0 for words that never followed this context in the book).
   */
  nextMixed(prompt, mix = MIX) {
    const r = this.next(prompt);
    const seq = NGram.seq(prompt);
    const n = seq.length;
    const parts = [];
    if (n >= 2 && this.tri.has(`${seq[n - 2]} ${seq[n - 1]}`)) parts.push([this.tri.get(`${seq[n - 2]} ${seq[n - 1]}`), mix.tri]);
    if (this.bi.has(seq[n - 1])) parts.push([this.bi.get(seq[n - 1]), mix.bi]);
    parts.push([this.uni, mix.uni]);
    const wsum = parts.reduce((a, [, w]) => a + w, 0);
    const p = new Map();
    for (const [table, w] of parts) {
      const total = [...table.values()].reduce((a, b) => a + b, 0);
      for (const [word, count] of table) p.set(word, (p.get(word) || 0) + (w / wsum) * (count / total));
    }
    const counts = new Map(r.candidates.map((c) => [c.word, c.count]));
    const candidates = [...p.entries()]
      .map(([word, q]) => ({ word, count: counts.get(word) || 0, p: q }))
      .sort((a, b) => b.p - a.p || (a.word < b.word ? -1 : 1));
    return { level: 'mix', backoff: r.level, context: r.context, total: r.total, candidates };
  }

  /** The most likely next token (ties: alphabetical, as sorted by next()). */
  top(prompt) {
    return this.next(prompt).candidates[0].word;
  }

  /**
   * Probabilities after temperature scaling: q_i ∝ p_i^(1/T).
   * T ≤ 0.05 is treated as argmax (all mass on the top candidate).
   */
  scaled(candidates, T) {
    if (T <= 0.05) return candidates.map((c, i) => ({ ...c, q: i === 0 ? 1 : 0 }));
    const w = candidates.map((c) => Math.pow(c.p, 1 / T));
    const z = w.reduce((a, b) => a + b, 0);
    return candidates.map((c, i) => ({ ...c, q: w[i] / z }));
  }

  /** Draw one token from a temperature-scaled distribution (q fields). */
  draw(dist) {
    let u = this.random();
    let word = dist[dist.length - 1].word;
    for (const c of dist) {
      u -= c.q;
      if (u <= 0) {
        word = c.word;
        break;
      }
    }
    return word;
  }

  /** Draw one next token with temperature T (mixed: use nextMixed). Returns { word, level, context, total, dist }. */
  sample(prompt, T = 1, mixed = false) {
    const r = mixed ? this.nextMixed(prompt) : this.next(prompt);
    const dist = this.scaled(r.candidates, T);
    const word = T <= 0.05 ? dist[0].word : this.draw(dist);
    return { word, level: r.level, context: r.context, total: r.total, dist };
  }

  /**
   * Continue `prompt` until "." or maxWords new words. T ≤ 0.05 → argmax.
   * onStep(step) is called before each token is appended with
   * { prompt, word, level, context, total, dist } so a scene can replay it.
   * mixed: predict with nextMixed (temperature chapter) instead of backoff.
   * Returns { words: [...all tokens incl. prompt], added: n, ended: bool, steps }.
   */
  generate(prompt, T = 1, maxWords = 14, onStep, mixed = false) {
    const words = prompt.map((w) => lower(w));
    const steps = [];
    let added = 0;
    let ended = false;
    while (added < maxWords) {
      const s = this.sample(words, T, mixed);
      const step = { prompt: words.slice(), ...s };
      steps.push(step);
      onStep?.(step);
      words.push(s.word);
      added++;
      if (s.word === END) {
        ended = true;
        break;
      }
    }
    return { words, added, ended, steps };
  }

  /**
   * Where does `context` (1–2 tokens) occur in the corpus, and what follows?
   * Returns [{ sentence, start, len, next }], positions in token indices
   * of tokenize(sentence) (START not counted; a START-only context matches
   * every sentence at position 0 with len 0).
   */
  occurrences(context) {
    const ctx = context.map((w) => lower(w));
    const out = [];
    this.seqs.forEach((seq, si) => {
      for (let i = 0; i + ctx.length < seq.length; i++) {
        let ok = true;
        for (let k = 0; k < ctx.length; k++) if (seq[i + k] !== ctx[k]) ok = false;
        if (!ok) continue;
        const startsWithS = ctx[0] === START;
        out.push({ sentence: si, start: i - 1 + (startsWithS ? 1 : 0), len: ctx.length - (startsWithS ? 1 : 0), next: seq[i + ctx.length] });
      }
    });
    return out;
  }

  /** Does the corpus contain this exact sentence (token-wise)? */
  has(sentence) {
    const t = tokenize(sentence).join(' ');
    return this.seqs.some((s) => s.slice(1).join(' ') === t);
  }
}

/** Tokens → readable sentence: capital first letter, no space before ".". */
export function detok(words) {
  const s = words.filter((w) => w !== START).join(' ').replace(/\s+\./g, '.');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
