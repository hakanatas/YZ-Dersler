import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Tweens, Ease, rand, pick, clamp } from './tween.js';
import { SoundKit } from './audio.js';
import { makeSoftDotTexture, makeMouthTextures } from './textures.js';
import { Bidik } from './bidik.js';
import { Confetti } from './confetti.js';

/**
 * The shared lesson runtime for the YZ Dersler series: renderer, lights,
 * camera presets, Bıdık, floating labels, the lesson panel, chapter
 * navigation, quiz, keyboard and pointer handling. A lesson supplies its
 * chapters, its quiz, its camera presets and the objects on the table.
 *
 *   createLesson({
 *     steps, quiz, focus,
 *     setup(shell) { ...add objects to shell.scene; return extra ctx fields },
 *     update(dt, ctx) { ...per frame },
 *     keys: { e: (ctx) => ... },
 *     onPick(ctx, point) { ...a click on the table (world point, y ≈ 0) },
 *   })
 *
 * Chapter fields: id, label, title, body (HTML), focus, say, mood, action,
 * secondary, stats, controls (HTML injected under the text), quiz,
 * enter(ctx), exit(ctx), act(ctx), act2(ctx), onPick(ctx, point).
 */

export const PALETTE = {
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
  green: '#3f8a5b',
};

export { THREE, Ease, rand, pick, clamp };

export function createLesson(lesson) {
  const STEPS = lesson.steps;
  const QUIZ = lesson.quiz || [];
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
    spark: $('#spark'),
    extra: $('#lesson-extra'),
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
  const state = { step: -1, autoplay: false, sound: false, uiHidden: false, autoTimer: 0, busy: false, score: { you: 0, bidik: 0 }, quizDone: false, quizNext: null };

  let toastTimer = 0;
  function toast(msg, ms = 2600) {
    dom.toast.textContent = msg;
    dom.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove('is-on'), ms);
  }

  // ---------------------------------------------------------------- scene
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

  const bidik = new Bidik({ mouths, palette: PALETTE });
  bidik.position.set(1.9, 0, 1.7);
  scene.add(bidik);
  const confetti = new Confetti([PALETTE.terracotta, PALETTE.sweet, PALETTE.salty, PALETTE.slate, '#ffffff']);
  scene.add(confetti);

  // ---------------------------------------------------------------- labels
  const tags = [];
  function makeTag(text, cls = '') {
    const el = document.createElement('div');
    el.className = `tag ${cls}`;
    el.textContent = text;
    dom.tags.appendChild(el);
    return el;
  }
  /** A floating label anchored to a world position while `on()` is true. */
  function addTag(text, get, on, cls = '') {
    const t = { el: makeTag(text, cls), get, on, text };
    tags.push(t);
    return t;
  }
  const bubble = { el: makeTag('', 'tag--bubble'), get: () => bidik.position.clone().add(new THREE.Vector3(0, 1.95, 0)), on: () => bubble.text && !state.uiHidden, text: '', timer: 0 };
  tags.push(bubble);

  // ---------------------------------------------------------------- camera
  const FOCUS = lesson.focus;
  let focusCtx = null;
  function focus(name, instant = false) {
    const f = FOCUS[name] || FOCUS.overview;
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
    const c = { cancelled: false };
    focusCtx = c;
    tweens
      .run(
        c,
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

  // ---------------------------------------------------------------- context
  const timers = [];
  const ctx = {
    THREE,
    scene,
    camera,
    palette: PALETTE,
    mouths,
    softDot,
    sound,
    tweens,
    bidik,
    confetti,
    state,
    dom,
    reducedMotion,
    isMobile,
    addTag,
    toast,
    focus,
    go: (i) => go(i),
    $: (s) => dom.lesson.querySelector(s),
    later(sec, fn) {
      const c = { cancelled: false };
      timers.push(c);
      tweens.wait(c, sec).then(fn).catch(() => {});
    },
    wait: (sec) => tweens.wait(null, sec),
    say(text, hold = 4) {
      bubble.text = text;
      bubble.el.textContent = text;
      bubble.timer = hold;
    },
    readout(html) {
      dom.readout.hidden = !html;
      dom.readout.innerHTML = html || '';
      // a new result is only useful if it can be seen: bring it into the panel's view
      // only for results the student asked for: a chapter that shows a result as it opens
      // must keep its title and text in view (the panel starts at the top)
      const asked = (state.actedAt || 0) > (state.enteredAt || 0);
      if (html && asked && window.innerWidth > 900 && !dom.lesson.classList.contains('is-collapsed')) {
        requestAnimationFrame(() => dom.readout.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' }));
      }
    },
    /** rows: [[label, value], ...]; history: numbers for the sparkline (optional). */
    setStats(rows, history) {
      dom.stats.hidden = false;
      let host = dom.stats.querySelector('.stat-rows');
      if (!host) {
        host = document.createElement('div');
        host.className = 'stat-rows';
        dom.stats.prepend(host);
      }
      host.innerHTML = rows.map(([l, v]) => `<div class="stat"><span class="stat__label">${l}</span><span class="stat__value">${v}</span></div>`).join('');
      dom.spark.hidden = !history;
      if (history) drawSpark(history);
    },
    score(you, bidikScore, labels = ['Sen', 'Bıdık']) {
      dom.score.hidden = false;
      dom.score.innerHTML = `${labels[0]} <b>${you}</b> · ${labels[1]} <b>${bidikScore}</b>`;
    },
    hideScore() {
      dom.score.hidden = true;
    },
    setAction(text, running = false) {
      dom.action.textContent = text;
      dom.action.classList.toggle('is-running', running);
    },
    celebrate(at) {
      bidik.celebrate();
      confetti.burst((at || bidik.position.clone()).clone().add(new THREE.Vector3(0, 1.4, 0)), 120);
      sound.play('refill', { volume: 0.7 });
    },
    buildQuiz,
    finishLesson,
  };

  function drawSpark(hist) {
    const c = dom.spark;
    const g = c.getContext('2d');
    const w = c.width;
    const h = c.height;
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(43,33,27,0.12)';
    g.beginPath();
    g.moveTo(0, h - 1);
    g.lineTo(w, h - 1);
    g.stroke();
    if (!hist || hist.length < 2) return;
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

  // ---------------------------------------------------------------- quiz
  function buildQuiz() {
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
          if (answered === QUIZ.length) finishLesson(correct);
        });
        opts.appendChild(b);
      });
      host.appendChild(item);
    });
  }
  function finishLesson(correct) {
    state.quizDone = true;
    const n = QUIZ.length;
    const msg = lesson.finishText
      ? lesson.finishText(correct, n)
      : correct === n
        ? `${n} soruda ${n} doğru! ${lesson.finishLine || 'Harikasın.'}`
        : `${n} soruda ${correct} doğru, ${n - correct} yanlış. Hiç dert değil; Bıdık da ilk seferde bilememişti. İstersen bölümlere bir daha bakalım.`;
    dom.finishText.textContent = msg;
    // a quiz that is not the last chapter hands over to the next one
    state.quizNext = state.step < STEPS.length - 1 ? state.step + 1 : null;
    dom.again.textContent = state.quizNext !== null ? lesson.finishNext || 'Devam →' : 'Bir daha oynayalım';
    setTimeout(() => {
      dom.finish.hidden = false;
      ctx.celebrate();
      focus('bidik');
    }, 900);
  }

  // ---------------------------------------------------------------- steps
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
    state.enteredAt = performance.now();
    const s = STEPS[i];
    dom.count.textContent = `Bölüm ${i + 1} / ${STEPS.length}`;
    dom.title.textContent = s.title;
    dom.text.innerHTML = s.body;
    dom.stats.hidden = !s.stats;
    dom.extra.innerHTML = s.controls || '';
    dom.extra.hidden = !s.controls;
    dom.readout.hidden = true;
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
    canvas.classList.toggle('is-probing', !!s.onPick || !!lesson.onPick);
    bidik.calmDown();
    if (s.mood) bidik.setMood(s.mood);
    focus(s.focus || 'overview', instant);
    s.enter?.(ctx);
    if (s.quiz) buildQuiz();
    if (s.say) ctx.later(instant ? 0.3 : 1.0, () => ctx.say(s.say, 5));
    sound.play('click', { volume: 0.6 });
  }

  // anything the student presses inside the panel (buttons, chips, sliders, quiz) counts as asking
  dom.lesson.addEventListener('pointerdown', () => (state.actedAt = performance.now()));
  dom.lesson.addEventListener('keydown', () => (state.actedAt = performance.now()));
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
  dom.collapse.addEventListener('click', () => {
    const collapsed = dom.lesson.classList.toggle('is-collapsed');
    dom.collapse.setAttribute('aria-expanded', String(!collapsed));
    dom.collapse.textContent = collapsed ? 'Yazıyı aç' : 'Küçült';
  });
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
    if (state.quizNext !== null && state.quizNext !== undefined) {
      const next = state.quizNext;
      state.quizNext = null;
      go(next);
      return;
    }
    state.score = { you: 0, bidik: 0 };
    dom.score.hidden = true;
    lesson.restart?.(ctx);
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
    const custom = lesson.keys?.[e.key.toLowerCase()];
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
        if (custom && !onControl) custom(ctx);
        else return;
    }
  });

  // clicks on the table: a world point on the y = 0.03 plane
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.03);
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
    const s = STEPS[state.step];
    const handler = s?.onPick || lesson.onPick;
    if (!handler) return;
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(tablePlane, hit)) return;
    handler(ctx, hit, raycaster);
  });
  ctx.raycaster = raycaster;

  // ---------------------------------------------------------------- loop
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
    else if (state.step >= 0) focus(STEPS[state.step].focus || 'overview', true);
  });
  resize();

  const clock = new THREE.Clock();
  let time = 0;
  const tmp = new THREE.Vector3();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    time += dt;
    tweens.update(dt);
    lesson.update?.(dt, ctx);
    if (state.autoplay && !state.busy && dom.intro.hidden) {
      state.autoTimer += dt;
      if (state.autoTimer > 15) go(state.step === STEPS.length - 1 ? 0 : state.step + 1);
    }
    if (bubble.timer > 0) {
      bubble.timer -= dt;
      if (bubble.timer <= 0) bubble.text = '';
    }
    bidik.faceToward(camera.position);
    bidik.update(dt);
    confetti.update(dt);
    controls.update();

    const r = canvas.getBoundingClientRect();
    // the lesson panel: labels behind it are faded out, and when it sits beside
    // the scene (wide screens) Bıdık's speech bubble stays to its right
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
    // a label under the speech bubble or behind the panel is not readable; fade it
    // (on phones the bubble is pinned under the top bar by CSS, so measure it)
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
    Object.assign(ctx, lesson.setup?.(ctx) || {});
    dom.loadingBar.style.width = '80%';
    document.body.classList.add('is-intro');
    bidik.setMood('happy');
    focus('bidik', true);
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    dom.loadingBar.style.width = '100%';
    frame();
    window.__lesson = { state, go, ctx, camera, controls, bidik, get time() { return time; } };
    requestAnimationFrame(() => {
      dom.loading.classList.add('is-done');
      setTimeout(() => bidik.doHop(1), 400);
    });
  }
  boot().catch((err) => {
    console.error(err);
    dom.loadingText.textContent = 'Ay, bir şeyler ters gitti. Sayfayı yenilemeyi dener misin?';
  });
  return ctx;
}
