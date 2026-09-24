import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Tweens, Ease, rand, pick, clamp } from '../../js/tween.js';
import { SoundKit } from '../../js/audio.js';
import { makeSoftDotTexture, makeMouthTextures } from '../../js/textures.js';
import { TinyNet, makeDataset, trueLabel, MINUTES } from '../../js/mlp.js';
import { Board } from '../../js/board.js';
import { Network3D } from '../../js/network.js';
import { TokenDemo } from '../../js/tokens.js';
import { Bidik } from '../../js/bidik.js';
import { Confetti } from '../../js/confetti.js';
import { STEPS, QUIZ } from './steps.js';

const PALETTE = {
  cream: '#f5eee3',
  creamDeep: '#efe4d3',
  ink: '#2b211b',
  terracotta: '#c4623d',
  terracottaSoft: '#e9c1ad',
  porcelain: '#fbf8f2',
  bamboo: '#d2a76d',
  bambooDark: '#a37543',
  sweet: '#e2557e',
  salty: '#f0b41f',
  slate: '#5b7c99',
  cheek: '#f0908e',
};

const $ = (s) => document.querySelector(s);
const dom = {
  canvas: $('#stage'),
  loading: $('#loading'),
  loadingBar: $('#loading-bar'),
  loadingText: $('#loading-text'),
  tags: $('#tags'),
  intro: $('#intro'),
  start: $('#btn-start'),
  finish: $('#finish'),
  finishText: $('#finish-text'),
  again: $('#btn-again'),
  count: $('#lesson-count'),
  title: $('#lesson-title'),
  text: $('#lesson-text'),
  stats: $('#lesson-stats'),
  statSteps: $('#stat-steps'),
  statLoss: $('#stat-loss'),
  statAcc: $('#stat-acc'),
  spark: $('#spark'),
  sliders: $('#lesson-sliders'),
  slSugar: $('#sl-sugar'),
  slSalt: $('#sl-salt'),
  guess: $('#guess'),
  guessSweet: $('#guess-sweet'),
  guessSalty: $('#guess-salty'),
  readout: $('#readout'),
  score: $('#score'),
  action: $('#btn-action'),
  action2: $('#btn-action2'),
  prev: $('#btn-prev'),
  next: $('#btn-next'),
  dots: $('#dots'),
  hideUi: $('#btn-hide-ui'),
  showUi: $('#btn-show-ui'),
  collapse: $('#btn-collapse'),
  lesson: $('#lesson'),
  toast: $('#toast'),
};
const canvas = dom.canvas;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
const state = { step: -1, autoplay: false, sound: false, training: false, uiHidden: false, autoTimer: 0, score: { you: 0, bidik: 0 }, quizDone: false };

let toastTimer = 0;
function toast(msg, ms = 2600) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('is-on'), ms);
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.6 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.cream);
scene.fog = new THREE.Fog(PALETTE.cream, 18, 36);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.5;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.3;
controls.minDistance = 2.5;
controls.maxDistance = 45; // phones frame from further away
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };

const key = new THREE.DirectionalLight('#fff0dc', 2.3);
key.position.set(-3.5, 8, 5);
key.castShadow = true;
const sm = isMobile ? 1024 : 2048;
key.shadow.mapSize.set(sm, sm);
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 24 });
key.shadow.bias = -0.0003;
key.shadow.normalBias = 0.02;
if ('intensity' in key.shadow) key.shadow.intensity = 0.7;
key.target.position.set(1, 0, 0);
scene.add(key, key.target);
scene.add(new THREE.HemisphereLight('#fff9ef', '#e2c4a2', 0.55));
const rim = new THREE.DirectionalLight('#dde7ff', 0.7);
rim.position.set(5, 5, -6);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.96 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const tweens = new Tweens();
tweens.timeScale = reducedMotion ? 0.6 : 1;
const sound = new SoundKit();
const softDot = makeSoftDotTexture();
const mouths = makeMouthTextures();

// ---------------------------------------------------------------------------
// Lesson objects
// ---------------------------------------------------------------------------

const net = new TinyNet(8, 3);
const data = makeDataset(64, 11);
const board = new Board({ size: 3.0, tiles: 26, palette: PALETTE, mouths });
board.position.set(-0.35, 0, 0.25);
board.setDishes(data);
scene.add(board);
const network = new Network3D({ net, palette: PALETTE, softDot, mouths });
scene.add(network);
const tokens = new TokenDemo({ palette: PALETTE });
tokens.position.set(0.9, 0, 0.1);
scene.add(tokens);
const bidik = new Bidik({ mouths, palette: PALETTE });
bidik.position.set(1.9, 0, 1.7);
scene.add(bidik);
const confetti = new Confetti([PALETTE.terracotta, PALETTE.sweet, PALETTE.salty, PALETTE.slate, '#ffffff']);
scene.add(confetti);

// floating labels
function makeTag(text, cls = '') {
  const el = document.createElement('div');
  el.className = `tag ${cls}`;
  el.textContent = text;
  dom.tags.appendChild(el);
  return el;
}
const netOn = () => network.weightsShown > 0.5 && !tokens.visible;
const tags = [
  { el: makeTag('boy'), get: () => network.pos.input[0].clone().add(new THREE.Vector3(-0.4, 0, 0)), on: netOn },
  { el: makeTag('süre'), get: () => network.pos.input[1].clone().add(new THREE.Vector3(-0.4, 0, 0)), on: netOn },
  { el: makeTag('kıvamında mı?', 'tag--big'), get: () => network.pos.output.clone().add(new THREE.Vector3(0.05, 0.42, 0)), on: netOn },
  { el: makeTag('yardımcılar'), get: () => new THREE.Vector3(network.columns[1], 2.28, 0), on: netOn },
  { el: makeTag('küçük → büyük', 'tag--axis'), get: () => board.localToWorld(new THREE.Vector3(0.7, 0.02, board.size / 2 + 0.3)), on: () => !tokens.visible && state.step !== 6 },
  { el: makeTag('↑ pişme süresi', 'tag--axis'), get: () => board.localToWorld(new THREE.Vector3(board.size / 2 + 0.55, 0.02, 0.1)), on: () => !tokens.visible && state.step !== 6 },
  { el: makeTag('sıradaki kelime?', 'tag--big'), get: () => tokens.localToWorld(new THREE.Vector3(0, 2.3, -0.4)), on: () => tokens.visible },
];
const outputTag = { el: makeTag('', 'tag--big'), get: () => network.pos.output.clone().add(new THREE.Vector3(0.05, -0.48, 0)), on: () => outputTag.text && netOn(), text: '' };
tags.push(outputTag);
const bubble = { el: makeTag('', 'tag--bubble'), get: () => bidik.position.clone().add(new THREE.Vector3(0, 1.95, 0)), on: () => bubble.text && !state.uiHidden, text: '', timer: 0 };
tags.push(bubble);

// ---------------------------------------------------------------------------
// Camera focus presets & Bıdık spots
// ---------------------------------------------------------------------------

const FOCUS = {
  overview: { target: new THREE.Vector3(1.7, 0.5, 0.1), dist: 11.0, az: 0.25, el: 0.98, bidik: [2.1, 1.9] },
  board: { target: new THREE.Vector3(-0.95, 0.2, 0.25), dist: 6.9, az: 0.12, el: 1.0, bidik: [1.55, 2.0] },
  network: { target: new THREE.Vector3(3.3, 1.15, 0), dist: 6.9, az: 0.18, el: 1.2, bidik: [4.7, -0.25] },
  // the guessing game: the table with the marked dumpling and the network side by side
  game: { target: new THREE.Vector3(1.05, 0.5, 0.15), dist: 10.2, az: 0.2, el: 1.02, bidik: [5.3, 0.9] },
  tokens: { target: new THREE.Vector3(0.25, 0.6, 0.4), dist: 10.8, az: 0.05, el: 1.05, bidik: [3.2, 0.0] },
  bidik: { target: new THREE.Vector3(2.4, 0.75, 1.7), dist: 5.4, az: 0.2, el: 1.2, bidik: [2.4, 1.7] },
};
let focusCtx = null;
function focus(name, instant = false) {
  const f = FOCUS[name];
  const aspect = camera.aspect;
  // phones: the panel covers the lower half, so the scene gets a smaller stage
    const fit = aspect < 1 && window.innerWidth <= 900 ? clamp((1.4 / aspect) * 0.85, 1, 3) : clamp(1.4 / aspect, 1, 2.4);
  const dist = f.dist * fit;
  const to = new THREE.Vector3(Math.sin(f.az) * Math.sin(f.el), Math.cos(f.el), Math.cos(f.az) * Math.sin(f.el)).multiplyScalar(dist).add(f.target);
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const fromB = bidik.position.clone();
  const toB = new THREE.Vector3(f.bidik[0], 0, f.bidik[1]);
  if (focusCtx) focusCtx.cancelled = true;
  if (instant) {
    camera.position.copy(to);
    controls.target.copy(f.target);
    bidik.position.copy(toB);
    controls.update();
    return;
  }
  const ctx = { cancelled: false };
  focusCtx = ctx;
  tweens
    .run(
      ctx,
      1.1,
      (t) => {
        camera.position.lerpVectors(fromPos, to, t);
        controls.target.lerpVectors(fromTarget, f.target, t);
        bidik.position.lerpVectors(fromB, toB, t);
        bidik.position.y = Math.sin(t * Math.PI * 3) ** 2 * 0.08;
      },
      Ease.inOutCubic
    )
    .catch(() => {});
}
canvas.addEventListener('pointerdown', () => {
  if (focusCtx) focusCtx.cancelled = true;
});

// ---------------------------------------------------------------------------
// Lesson context
// ---------------------------------------------------------------------------

const timers = [];
const ctx = {
  board,
  network,
  tokens,
  net,
  data,
  sound,
  bidik,
  later(sec, fn) {
    // each timer gets its own cancellation context so leaving the chapter
    // really stops it (a pending line must not land on the next chapter)
    const c = { cancelled: false };
    timers.push(c);
    tweens.wait(c, sec).then(fn).catch(() => {});
  },
  say(text, hold = 4) {
    bubble.text = text;
    bubble.el.textContent = text;
    bubble.timer = hold;
  },
  randomExample() {
    return pick(data);
  },
  /** Chapter 1: the table as Bıdık gets it, 64 rows of numbers instead of a picture. */
  toggleBidikView() {
    ctx.bidikView = !ctx.bidikView;
    if (ctx.bidikView) {
      board.hideAll();
      const rows = data
        .map((d, i) => `<div>${String(i + 1).padStart(2, '0')}. boy ${d.x[0].toFixed(2).replace('.', ',')} · süre ${(d.x[1] * MINUTES).toFixed(1).replace('.', ',')} dk → ${d.y}</div>`)
        .join('');
      dom.readout.hidden = false;
      dom.readout.innerHTML = `<span class="big">Bıdık'ın gördüğü: ${data.length} satır sayı</span>Örtü yok, renk yok. Her mantı iki sayı ve bir etiket (1 = kıvamında, 0 = olmamış). Desen burada görünüyor mu?<div class="corpus">${rows}</div>`;
      dom.action.textContent = 'Masaya dön';
      sound.play('pick', { volume: 0.5 });
      bidik.react('thinking', 2);
      ctx.say('Masa mı? Ben sadece sayılar görüyorum. Desen nerede?', 4);
    } else {
      board.revealAll();
      dom.readout.hidden = true;
      dom.action.textContent = 'Bıdık\'ın gözüyle bak';
      sound.play('refill', { volume: 0.4 });
      bidik.react('happy', 1.5);
      ctx.say('Sen deseni gördün; ben sayılardan öğrenmek zorundayım.', 4);
    }
  },
  shuffleWeights() {
    net.seed = Math.floor(Math.random() * 1e6);
    net.reset();
    network.syncWeights(false);
    board.paint((s, t) => net.predict([s, t]));
    sound.play('boing', { volume: 0.5 });
    bidik.react('surprised', 1.2);
    ctx.say('Hâlâ karman çorman! Öğrenmeden düzelmiyor bu ipler.', 3);
  },
  /** Run the network on an example with pulses; returns p. */
  async showForward(example, quiet = false) {
    if (ctx.forwardBusy) return null;
    ctx.forwardBusy = true;
    const { h, p } = net.forward(example.x);
    network.clearGlow();
    outputTag.text = '';
    network.setGlow('input', 0, example.x[0]);
    network.setGlow('input', 1, example.x[1]);
    board.setProbe(example.x[0], example.x[1], example.y);
    if (!quiet) bidik.react('thinking', 2.2);
    sound.play('pick', { volume: 0.6 });
    await tweens.wait(null, 0.25);
    network.emitPulses(1, example.x);
    sound.play('drip', { volume: 0.5 });
    await tweens.wait(null, 0.7);
    h.forEach((v, i) => network.setGlow('hidden', i, Math.abs(v)));
    network.emitPulses(2, h);
    sound.play('drip', { volume: 0.5 });
    await tweens.wait(null, 0.7);
    network.setGlow('output', 0, p);
    outputTag.text = `%${Math.round(p * 100)} kıvamında`;
    outputTag.el.textContent = outputTag.text;
    ctx.lastExample = example;
    ctx.forwardBusy = false;
    return p;
  },
  /** The guessing game: the visitor guesses first, then Bıdık. */
  newGuessRound() {
    if (ctx.forwardBusy) return;
    const ex = pick(data);
    ctx.round = { example: ex, you: null };
    network.clearGlow();
    outputTag.text = '';
    board.setProbe(ex.x[0], ex.x[1], 0.5);
    board.probeFace.setMood('curious');
    dom.guess.hidden = false;
    dom.guessSweet.disabled = false;
    dom.guessSalty.disabled = false;
    dom.readout.hidden = false;
    dom.readout.innerHTML = `<span class="big">${describe(ex.x)}</span>Sence bu mantı tam kıvamında mı, yoksa olmamış mı?`;
    ctx.say('Sen ne dersin? Tam kıvamında mı, olmamış mı?', 5);
    sound.play('click');
  },
  async answerGuess(youSayIsSweet) {
    const r = ctx.round;
    if (!r || r.you !== null || ctx.forwardBusy) return;
    r.you = youSayIsSweet ? 1 : 0;
    dom.guessSweet.disabled = true;
    dom.guessSalty.disabled = true;
    const truth = r.example.y;
    const youOk = r.you === truth;
    dom.readout.innerHTML = `<span class="big">Sen: <b>${youSayIsSweet ? 'kıvamında' : 'olmamış'}</b> ${youOk ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'}</span>Şimdi sıra Bıdık'ta…`;
    ctx.say('Tamam, şimdi ben deneyeyim!', 3);
    const p = await ctx.showForward(r.example);
    if (p === null) return;
    const bidikSays = p > 0.5 ? 1 : 0;
    const bidikOk = bidikSays === truth;
    if (youOk) state.score.you++;
    if (bidikOk) state.score.bidik++;
    updateScore();
    board.probeFace.setMood(truth ? 'joy' : 'yum');
    dom.readout.innerHTML =
      `<span class="big">Sen: <b>${youSayIsSweet ? 'kıvamında' : 'olmamış'}</b> ${youOk ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'} · Bıdık: <b>${bidikSays ? 'kıvamında' : 'olmamış'}</b> (%${Math.round(p * 100)}) ${bidikOk ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'}</span>` +
      `Doğru cevap: <b>${truth ? 'tam kıvamında' : 'olmamış'}</b>. ${bidikOk ? (net.steps > 0 ? 'Bıdık da bildi!' : 'Bıdık da bildi ama şans eseri; daha öğrenmedi.') : net.steps > 0 ? 'Bıdık bu sefer yanıldı; biraz daha antrenman iyi gelir.' : 'Bıdık daha öğrenmedi, ona kızma.'}`;
    if (bidikOk) {
      bidik.react('joy', 2);
      bidik.doHop(0.8);
      sound.play('yum', { volume: 0.7 });
      ctx.say(net.steps === 0 ? 'Bildim! Ama şans galiba, daha öğrenmedim ki.' : youOk ? 'İkimiz de bildik, çak bakalım!' : 'Bu sefer ben bildim! Bir dahakine sen de bilirsin.', 3.5);
    } else {
      bidik.react('worried', 2);
      sound.play('grab', { volume: 0.6 });
      ctx.say(net.steps > 0 ? 'Ah, yanıldım. Biraz daha çalışmam lazım.' : 'Yanıldım ama haklısın, daha öğrenmedim ki!', 3.5);
    }
  },
  async learnStep() {
    if (ctx.forwardBusy) return;
    const ex = ctx.lastExample || pick(data);
    const before = net.evaluate(data);
    const p = await ctx.showForward(ex);
    if (p === null) return;
    ctx.forwardBusy = true;
    const wrong = (p > 0.5 ? 1 : 0) !== ex.y;
    ctx.say(wrong ? 'Yanlış oldu! Hangi ip suçlu bakalım?' : 'Doğru bildim ama daha da emin olabilirim.', 2.5);
    await tweens.wait(null, 0.5);
    const { gW2 } = net.gradients(data);
    network.emitPulses(2, gW2.map((g) => g * 3), true, 1.0);
    sound.play('lift', { volume: 0.6 });
    await tweens.wait(null, 1.0);
    network.emitPulses(1, [1, 1], true, 1.0);
    await tweens.wait(null, 1.0);
    net.trainStep(data, 1.2);
    const after = net.evaluate(data);
    sound.play('boing', { volume: 0.5 });
    bidik.react('proud', 1.5);
    bidik.doHop(0.6);
    ctx.updateStats();
    board.paint((s, t) => net.predict([s, t]));
    dom.readout.hidden = false;
    dom.readout.innerHTML = `<span class="big">Hata puanı ${before.loss.toFixed(2)} → <b>${after.loss.toFixed(2)}</b></span>İpler azıcık değişti. Bir daha bas; her seferinde biraz daha iyi olur.`;
    ctx.say('İpleri azıcık düzelttim, oh be!', 3);
    ctx.forwardBusy = false;
  },
  toggleTraining() {
    if (state.training) ctx.stopTraining();
    else ctx.startTraining();
  },
  startTraining() {
    state.training = true;
    state.trainBudget = 600;
    state.trainTime = 0;
    state.trainDone = 0;
    state.trainNextSay = 0;
    state.trainPulse = 0.4;
    dom.action.textContent = 'Dur biraz';
    dom.action.classList.add('is-running');
    board.tintTarget = 1;
    bidik.setMood('curious');
    ctx.say('Bakıyorum, düzeltiyorum, bakıyorum, düzeltiyorum… Başım döndü!', 6);
    sound.play('click');
    // keep the counters in view while the student watches
    if (window.innerWidth > 900) dom.stats.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
  },
  stopTraining() {
    if (!state.training) return;
    state.training = false;
    dom.action.textContent = 'Antrenman başlasın!';
    dom.action.classList.remove('is-running');
    bidik.setMood('happy');
  },
  resetNet() {
    ctx.stopTraining();
    net.reset();
    network.syncWeights(true);
    board.paint((s, t) => net.predict([s, t]));
    board.tintTarget = 0;
    ctx.updateStats();
    dom.readout.hidden = true;
    sound.play('refill', { volume: 0.5 });
    bidik.react('sleepy', 2);
    ctx.say('Hop, her şeyi unuttum! Baştan başlıyoruz.', 3);
  },
  updateStats() {
    const e = net.evaluate(data);
    dom.statSteps.textContent = String(net.steps);
    dom.statLoss.textContent = e.loss.toFixed(2);
    dom.statAcc.textContent = `%${Math.round(e.acc * 100)}`;
    drawSpark();
  },
  setProbe(sugar, salt, fresh = false) {
    const p = net.predict([sugar, salt]);
    board.setProbe(sugar, salt, p);
    board.probeFace.setMood('curious');
    dom.slSugar.value = String(Math.round(sugar * 100));
    dom.slSalt.value = String(Math.round(salt * 100));
    ctx.round = { example: { x: [sugar, salt], y: trueLabel(sugar, salt) }, you: null };
    dom.guess.hidden = false;
    dom.guessSweet.disabled = false;
    dom.guessSalty.disabled = false;
    dom.readout.hidden = false;
    dom.readout.innerHTML = `<span class="big">Yeni mantı: ${describe([sugar, salt])}</span>Önce sen söyle: tam kıvamında mı, olmamış mı?`;
    network.clearGlow();
    outputTag.text = '';
    if (fresh) ctx.say('Yeni bir mantı geldi! Önce sen tahmin et.', 4);
  },
  updateTokenReadout() {
    const c = tokens.candidates;
    dom.readout.hidden = false;
    if (tokens.finished) {
      dom.readout.innerHTML = `<span class="big">"Mantı en güzel yoğurtla yenir."</span>Cümle bitti! Sıradaki en olası "kelime" nokta çıktı (%71), o yüzden cümle orada durdu. Bıdık her adımda en uzun çubuğu seçti; sen de aynı oyunu oynadın.`;
      dom.action.textContent = 'Baştan başla';
      ctx.say('Cümle tamam: Mantı en güzel yoğurtla yenir. Nokta da bir tahmindi!', 5);
      return;
    }
    dom.action.textContent = 'Sıradaki kelimeyi seç!';
    dom.readout.innerHTML =
      `<span class="big">"${promptText()} ___"</span>` +
      c.map(([w, p], i) => `${i === 0 ? '<b>' : ''}${w} %${Math.round(p * 100)}${i === 0 ? '</b>' : ''}`).join(' · ');
  },
  startAmbientPulses() {
    state.ambient = true;
  },
  stopAmbientPulses() {
    state.ambient = false;
    board.probe.visible = false;
    network.clearGlow();
  },
  buildQuiz() {
    const host = dom.text.querySelector('#quiz');
    if (!host) return;
    host.innerHTML = '';
    let correct = 0;
    let answered = 0;
    QUIZ.forEach((q, qi) => {
      const item = document.createElement('div');
      item.className = 'quiz__item';
      item.innerHTML = `<p class="quiz__q">${qi + 1}. ${q.q}</p><div class="quiz__opts"></div><p class="quiz__why" hidden></p>`;
      const opts = item.querySelector('.quiz__opts');
      const why = item.querySelector('.quiz__why');
      q.options.forEach((label, oi) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = label;
        b.addEventListener('click', () => {
          if (item.classList.contains('is-done')) return;
          item.classList.add('is-done');
          answered++;
          const ok = oi === q.answer;
          if (ok) correct++;
          b.classList.add(ok ? 'is-right' : 'is-wrong');
          why.hidden = false;
          why.textContent = ok ? q.why : q.nope;
          sound.play(ok ? 'yum' : 'grab', { volume: 0.6 });
          if (ok) {
            bidik.react('joy', 1.5);
            bidik.doHop(0.7);
          } else bidik.react('worried', 1.5);
          if (answered === QUIZ.length) ctx.finishLesson(correct);
        });
        opts.appendChild(b);
      });
      host.appendChild(item);
    });
  },
  finishLesson(correct) {
    state.quizDone = true;
    const msg =
      correct === QUIZ.length
        ? `${QUIZ.length} soruda ${QUIZ.length} doğru! Artık sen de biliyorsun: yapay zeka tahmin ederek öğrenir. Tıpkı Bıdık gibi, tıpkı senin gibi.`
        : `${QUIZ.length} soruda ${correct} doğru, ${QUIZ.length - correct} yanlış. Hiç dert değil; Bıdık da ilk seferde bilememişti. İstersen bölümlere bir daha bakalım.`;
    dom.finishText.textContent = msg;
    setTimeout(() => {
      dom.finish.hidden = false;
      bidik.celebrate();
      confetti.burst(bidik.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 120);
      sound.play('refill', { volume: 0.7 });
      focus('bidik');
    }, 900);
  },
};
function describe(x) {
  const sizeWords = ['minicik', 'küçük', 'orta boy', 'büyük', 'kocaman'];
  const size = sizeWords[Math.min(4, Math.floor(x[0] * 5))];
  const minutes = (x[1] * MINUTES).toFixed(1).replace('.0', '').replace('.', ',');
  return `<b>${size}</b> bir mantı, <b>${minutes} dakika</b> pişmiş`;
}
function promptText() {
  return ['Mantı en güzel', 'Mantı en güzel yoğurtla', 'Mantı en güzel yoğurtla yenir'][tokens.stage] || '';
}
function updateScore() {
  dom.score.hidden = false;
  dom.score.innerHTML = `Sen <b>${state.score.you}</b> · Bıdık <b>${state.score.bidik}</b>`;
}

function drawSpark() {
  const c = dom.spark;
  const g = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  g.clearRect(0, 0, w, h);
  const hist = net.history;
  g.strokeStyle = 'rgba(43,33,27,0.12)';
  g.beginPath();
  g.moveTo(0, h - 1);
  g.lineTo(w, h - 1);
  g.stroke();
  if (hist.length < 2) return;
  const max = Math.max(0.7, ...hist);
  g.strokeStyle = PALETTE.terracotta;
  g.lineWidth = 2;
  g.beginPath();
  hist.forEach((v, i) => {
    const x = (i / (hist.length - 1)) * (w - 2) + 1;
    const y = h - 2 - (v / max) * (h - 6);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  });
  g.stroke();
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

STEPS.forEach((s, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span>${s.label}</span>`;
  b.title = s.title;
  b.addEventListener('click', () => go(i));
  li.appendChild(b);
  dom.dots.appendChild(li);
});

function go(i, instant = false) {
  i = clamp(i, 0, STEPS.length - 1);
  if (i === state.step) return;
  const prev = STEPS[state.step];
  prev?.exit?.(ctx);
  for (const t of timers) t.cancelled = true;
  timers.length = 0;
  state.step = i;
  state.autoTimer = 0;
  const s = STEPS[i];
  dom.count.textContent = `Bölüm ${i + 1} / ${STEPS.length}`;
  dom.title.textContent = s.title;
  dom.text.innerHTML = s.body;
  dom.stats.hidden = !s.stats;
  dom.sliders.hidden = !s.sliders;
  dom.guess.hidden = true;
  dom.readout.hidden = true;
  outputTag.text = '';
  outputTag.el.textContent = '';
  dom.action.hidden = !s.action;
  dom.action.textContent = s.action || '';
  dom.action.classList.remove('is-running');
  dom.action2.hidden = !s.secondary;
  dom.action2.textContent = s.secondary || '';
  dom.prev.disabled = i === 0;
  dom.next.textContent = i === STEPS.length - 1 ? (document.querySelector('#finish a.btn--accent') ? 'Sıradaki ders →' : 'Tüm dersler') : 'Devam →';
  dom.dots.querySelectorAll('button').forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
  dom.lesson.classList.remove('is-collapsed');
  dom.collapse.setAttribute('aria-expanded', 'true');
  dom.collapse.textContent = 'Küçült';
  dom.lesson.scrollTop = 0;
  dom.finish.hidden = true;
  canvas.classList.toggle('is-probing', !!s.sliders);
  board.probe.visible = false;
  network.clearGlow();
  bidik.calmDown();
  if (s.mood) bidik.setMood(s.mood);
  dom.text.querySelectorAll('[data-count="dishes"]').forEach((el) => (el.textContent = String(data.length)));
  focus(s.focus, instant);
  s.enter?.(ctx);
  if (s.say) ctx.later(instant ? 0.3 : 1.0, () => ctx.say(s.say, 5));
  sound.play('click', { volume: 0.6 });
}

dom.prev.addEventListener('click', () => go(state.step - 1));
// on the last chapter the dock leads on to the next lesson (or back to the list)
dom.next.addEventListener('click', () => {
  if (state.step < STEPS.length - 1) return go(state.step + 1);
  const nextLesson = document.querySelector('#finish a.btn--accent');
  window.location.href = nextLesson ? nextLesson.getAttribute('href') : '../';
});
dom.action.addEventListener('click', () => {
  sound.unlock();
  STEPS[state.step].act?.(ctx);
});
dom.action2.addEventListener('click', () => {
  sound.unlock();
  STEPS[state.step].act2?.(ctx);
});
dom.guessSweet.addEventListener('click', () => {
  sound.unlock();
  ctx.answerGuess(true);
});
dom.guessSalty.addEventListener('click', () => {
  sound.unlock();
  ctx.answerGuess(false);
});
dom.collapse.addEventListener('click', () => {
  const collapsed = dom.lesson.classList.toggle('is-collapsed');
  dom.collapse.setAttribute('aria-expanded', String(!collapsed));
  dom.collapse.textContent = collapsed ? 'Yazıyı aç' : 'Küçült';
});
for (const sl of [dom.slSugar, dom.slSalt]) {
  sl.addEventListener('input', () => ctx.setProbe(Number(dom.slSugar.value) / 100, Number(dom.slSalt.value) / 100));
}
dom.start.addEventListener('click', () => {
  sound.unlock();
  dom.intro.hidden = true;
  document.body.classList.remove('is-intro');
  bidik.react('joy', 1.5);
  bidik.doHop(1);
  go(0);
});
dom.again.addEventListener('click', () => {
  dom.finish.hidden = true;
  state.score = { you: 0, bidik: 0 };
  dom.score.hidden = true;
  ctx.resetNet();
  go(0);
});

function setToggle(name, on) {
  state[name] = on;
  document.querySelector(`[data-toggle="${name}"]`)?.setAttribute('aria-pressed', String(on));
  if (name === 'sound') {
    sound.unlock();
    sound.setEnabled(on);
    if (on) sound.play('click');
  }
  if (name === 'autoplay') {
    state.autoTimer = 0;
    if (on) toast('Tamam, bölümler kendi kendine ilerleyecek. Arkana yaslan.');
  }
}
document.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => setToggle(b.dataset.toggle, b.getAttribute('aria-pressed') !== 'true')));

function setUiHidden(hidden) {
  state.uiHidden = hidden;
  document.body.classList.toggle('ui-hidden', hidden);
  dom.showUi.hidden = !hidden;
}
dom.hideUi.addEventListener('click', () => setUiHidden(true));
dom.showUi.addEventListener('click', () => setUiHidden(false));

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!dom.intro.hidden) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dom.start.click();
    }
    return;
  }
  // typing in a text box (the name on the completion card): letters, space and
  // arrows belong to the box, not to the lesson shortcuts
  if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.matches('textarea, input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button])'))) return;
  const onControl = e.target instanceof HTMLElement && e.target.matches('button, a, input, select, textarea');
  switch (e.key) {
    case 'ArrowRight':
      if (onControl && e.target.type === 'range') return;
      e.preventDefault();
      go(state.step === STEPS.length - 1 ? 0 : state.step + 1);
      break;
    case 'ArrowLeft':
      if (onControl && e.target.type === 'range') return;
      e.preventDefault();
      go(state.step - 1);
      break;
    case ' ':
      if (onControl) return;
      e.preventDefault();
      STEPS[state.step].act?.(ctx);
      break;
    case 'e':
    case 'E':
      if (state.step !== 4) go(4);
      ctx.toggleTraining();
      break;
    case 'r':
    case 'R':
      ctx.resetNet();
      break;
    case 'h':
    case 'H':
      setUiHidden(!state.uiHidden);
      break;
    case 'm':
    case 'M':
      setToggle('sound', !state.sound);
      break;
    case 'Escape':
      if (state.uiHidden) setUiHidden(false);
      break;
    default:
      return;
  }
});

// board probing (chapter "Sınav")
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.03);
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
});
window.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7 || performance.now() - down.t > 600;
  down = null;
  if (moved || e.target !== canvas) return;
  sound.unlock();
  if (!STEPS[state.step]?.sliders) return;
  const r = canvas.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(boardPlane, hit)) return;
  const local = board.worldToLocal(hit.clone());
  const [sugar, salt] = board.fromLocal(local);
  if (sugar < -0.05 || sugar > 1.05 || salt < -0.05 || salt > 1.05) return;
  ctx.setProbe(clamp(sugar, 0, 1), clamp(salt, 0, 1));
  sound.play('pick', { volume: 0.6 });
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // keep the scene in the part of the screen the lesson panel leaves free:
  // wide screens → to the right of the panel; phones → above the panel
  if (w > 1180) camera.setViewOffset(w, h, -w * 0.13, -h * 0.02, w, h);
  else if (w > 900) camera.setViewOffset(w, h, -w * 0.2, -h * 0.02, w, h);
  else if (w / h < 1) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  else camera.clearViewOffset();
  // the phone framing sits further back; push the fog back with it
  const far = w <= 900 && w / h < 1;
  scene.fog.near = far ? 34 : 18;
  scene.fog.far = far ? 72 : 36;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => {
  resize();
  if (!dom.intro.hidden) focus('bidik', true);
  else if (state.step >= 0) focus(STEPS[state.step].focus, true);
});
resize();

const clock = new THREE.Clock();
let time = 0;
let ambientTimer = 0;
let paintTimer = 0;
const tmp = new THREE.Vector3();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  time += dt;
  tweens.update(dt);

  if (state.training) {
    // a watchable schedule: the first looks go one by one, then Bıdık speeds up
    // (0–6 s: 20 looks, 6–12 s: 100, 12–18 s: 300, 18–24 s: 600; reduced motion: 6 s in all)
    state.trainTime += dt;
    const T = state.trainTime * (reducedMotion ? 4 : 1);
    const keys = [[0, 0], [6, 20], [12, 100], [18, 300], [24, 600]];
    let target = 600;
    for (let k = 1; k < keys.length; k++) {
      if (T < keys[k][0]) {
        const [t0, s0] = keys[k - 1];
        const [t1, s1] = keys[k];
        target = Math.floor(s0 + ((T - t0) / (t1 - t0)) * (s1 - s0));
        break;
      }
    }
    let stepped = 0;
    while (state.trainDone < target && state.trainBudget > 0) {
      net.trainStep(data, 1.2);
      state.trainBudget--;
      state.trainDone++;
      stepped++;
    }
    if (stepped && state.trainDone <= 20) sound.play('drip', { volume: 0.3 });
    // Bıdık says how it is going at a few milestones
    const says = [
      [1, () => 'İlk bakış! Şimdilik tahminlerim yazı tura gibi.'],
      [20, (a) => `20 kez baktım: %${a} doğru. Örtüye bak, pembe şerit belirmeye başladı mı?`],
      [100, (a) => `100 kez baktım: %${a} doğru. İplerim kalınlaşıp inceliyor!`],
      [300, (a) => `300 kez baktım: %${a} doğru. Artık hızlanıyorum!`],
    ];
    const next = says[state.trainNextSay];
    if (next && state.trainDone >= next[0]) {
      state.trainNextSay++;
      ctx.say(next[1](Math.round(net.evaluate(data).acc * 100)), 5);
      bidik.doHop(0.5);
    }
    // show which dumpling it is looking at: a marked dish and pulses through the strings
    state.trainPulse -= dt;
    if (!reducedMotion && state.trainPulse <= 0 && !ctx.forwardBusy) {
      state.trainPulse = 1.2;
      ctx.showForward(pick(data), true);
    }
    paintTimer += dt;
    if (paintTimer > 0.08) {
      paintTimer = 0;
      board.paint((s, t) => net.predict([s, t]));
      ctx.updateStats();
      if (state.trainDone > 20 && net.steps % 12 === 0) sound.play('hop', { volume: 0.25 });
      if (net.steps % 40 === 0) bidik.doHop(0.4);
    }
    if (state.trainBudget <= 0) {
      ctx.stopTraining();
      const e = net.evaluate(data);
      toast(`Antrenman bitti! Bıdık ${net.steps} kez baktı, şimdi %${Math.round(e.acc * 100)} doğru biliyor.`);
      ctx.say(e.acc > 0.95 ? 'Öğrendim! Artık mantıyı tam kıvamında pişirebiliyorum. Yaşasın!' : 'Biraz daha antrenman lazım galiba.', 5);
      bidik.react('bliss', 3);
      bidik.doHop(1);
      sound.play('refill', { volume: 0.5 });
    }
  }
  if (state.ambient && !reducedMotion) {
    ambientTimer -= dt;
    if (ambientTimer <= 0) {
      ambientTimer = 2.6;
      ctx.showForward(pick(data), true);
    }
  }
  if (state.autoplay && !state.training && dom.intro.hidden) {
    state.autoTimer += dt;
    if (state.autoTimer > 15) go(state.step === STEPS.length - 1 ? 0 : state.step + 1);
  }
  if (bubble.timer > 0) {
    bubble.timer -= dt;
    if (bubble.timer <= 0) bubble.text = '';
  }

  board.update(dt);
  network.update(dt);
  tokens.update(dt);
  bidik.faceToward(camera.position);
  bidik.update(dt);
  confetti.update(dt);
  controls.update();

  const r = canvas.getBoundingClientRect();
  // same as js/shell.js: the bubble stays right of the lesson panel on wide
  // screens, and labels under the bubble or behind the panel fade out
  const panel = !state.uiHidden && !dom.lesson.hidden ? dom.lesson.getBoundingClientRect() : null;
  const side = panel && window.innerWidth > 900; // panel beside the scene, not under it
  const shown = [];
  for (const t of tags) {
    const on = t.on();
    t.el.classList.toggle('is-on', !!on);
    if (!on) {
      t.el.classList.remove('is-covered');
      continue;
    }
    tmp.copy(t.get()).project(camera);
    let x = r.left + ((tmp.x + 1) / 2) * r.width;
    let y = r.top + ((1 - tmp.y) / 2) * r.height;
    const hw = t.el.offsetWidth / 2;
    const hh = t.el.offsetHeight / 2;
    if (t === bubble) {
      const minX = side && panel.width ? Math.min(panel.right + hw + 16, r.width - hw - 8) : hw + 8;
      x = clamp(x, minX, r.width - hw - 8);
      y = clamp(y, hh + 68, r.height - hh - 8);
    }
    t.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    shown.push({ t, x0: x - hw, x1: x + hw, y0: y - hh, y1: y + hh });
  }
  const bub = bubble.text && !state.uiHidden ? bubble.el.getBoundingClientRect() : null;
  const hit = (a, b) => b && b.width && a.x0 < b.right + 6 && a.x1 > b.left - 6 && a.y0 < b.bottom + 6 && a.y1 > b.top - 6;
  // ...and so is one half under the top bar's buttons or under a label placed before it
  const bar = [...document.querySelectorAll('.topbar .brand, .topbar__right')].map((e) => e.getBoundingClientRect());
  const kept = [];
  for (const s of shown) {
    if (s.t === bubble) continue;
    const covered = hit(s, bub) || hit(s, panel) || bar.some((b) => hit(s, b)) || kept.some((k) => s.x0 < k.x1 && s.x1 > k.x0 && s.y0 < k.y1 && s.y1 > k.y0);
    s.t.el.classList.toggle('is-covered', covered);
    if (!covered) kept.push(s);
  }
  renderer.render(scene, camera);
}

async function boot() {
  dom.loadingBar.style.width = '40%';
  const fontsReady = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  await fontsReady;
  dom.loadingBar.style.width = '80%';
  document.body.classList.add('is-intro');
  board.revealAll();
  network.setWeightsVisible(true);
  bidik.setMood('happy');
  focus('bidik', true);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  dom.loadingBar.style.width = '100%';
  frame();
  window.__lesson = { state, go, ctx, net, data, camera, controls, bidik, get time() { return time; } };
  requestAnimationFrame(() => {
    dom.loading.classList.add('is-done');
    setTimeout(() => bidik.doHop(1), 400);
  });
}
boot().catch((err) => {
  console.error(err);
  dom.loadingText.textContent = 'Ay, bir şeyler ters gitti. Sayfayı yenilemeyi dener misin?';
});
