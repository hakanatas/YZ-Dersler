import { createLesson, PALETTE, THREE } from '../../js/shell.js';
import { TinyNet } from '../../js/mlp.js';
import { Network3D } from '../../js/network.js';
import { PixelBoard } from './pixelboard.js';
import { makeTrainSet, makeTestSet, blank, PIXELS, SIZE } from './shapes.js';
import { STEPS, QUIZ } from './steps.js';

/** Verified in node (see the teacher notes): lr 0.5, 300 full-batch steps → train 100 %, test 98 % (59/60). */
export const LR = 0.5;
export const TRAIN_STEPS = 300;
export const NET_SEED = 3;

const FOCUS = {
  overview: { target: new THREE.Vector3(1.1, 0.7, -0.8), dist: 12.6, az: 0.14, el: 1.0, bidik: [3.6, 0.6] },
  board: { target: new THREE.Vector3(0.3, 0.2, 0.5), dist: 6.6, az: 0.08, el: 0.92, bidik: [3.4, 1.7] },
  network: { target: new THREE.Vector3(1.35, 1.15, -2.4), dist: 7.0, az: 0.18, el: 1.2, bidik: [3.3, -1.6] },
  bidik: { target: new THREE.Vector3(1.2, 0.75, 2.3), dist: 5.4, az: 0.2, el: 1.2, bidik: [1.2, 2.3] },
};

/** A few "trick" pictures for chapter 6, drawn by hand. */
function preset(name) {
  const px = blank();
  const set = (r, c) => {
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) px[r * SIZE + c] = 1;
  };
  const rect = (r0, r1, c0, c1) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(r, c);
  };
  switch (name) {
    case 'kare':
      rect(2, 5, 2, 5);
      break;
    case 'nokta':
      set(3, 4);
      break;
    case 'harf':
      rect(1, 1, 1, 6);
      rect(2, 6, 3, 4);
      break;
    case 'dik':
      rect(0, 6, 3, 4);
      break;
    case 'kose':
      rect(5, 7, 0, 2);
      set(4, 1);
      break;
    case 'bos':
    default:
      break;
  }
  return px;
}
export const PRESETS = [
  { id: 'kare', name: 'Kare' },
  { id: 'nokta', name: 'Tek nokta' },
  { id: 'harf', name: 'T harfi' },
  { id: 'dik', name: 'Dik börek' },
  { id: 'kose', name: 'Köşede mantı' },
  { id: 'bos', name: 'Bomboş' },
];

createLesson({
  steps: STEPS,
  quiz: QUIZ,
  focus: FOCUS,
  finishLine: 'Artık biliyorsun: bilgisayar için bir resim, sayılardan ibaret.',
  keys: {
    e: (c) => {
      if (c.state.step !== 3) c.go(3);
      c.toggleTraining();
    },
    r: (c) => c.resetNet(),
    c: (c) => c.clearDrawing(),
  },
  setup(c) {
    const { scene, softDot, mouths, sound, bidik } = c;
    const net = new TinyNet(8, NET_SEED, PIXELS);
    const train = makeTrainSet();
    const test = makeTestSet();

    const board = new PixelBoard({ size: 2.4, palette: PALETTE });
    board.position.set(0.5, 0, 0.5);
    scene.add(board);
    const network = new Network3D({ net, palette: PALETTE, softDot, mouths });
    network.position.set(-1.2, 0, -2.4);
    scene.add(network);

    // the drag-paint ends anywhere on the page (registered once)
    const stopPainting = () => {
      c.painting = null;
    };
    window.addEventListener('pointerup', stopPainting);
    window.addEventListener('pointercancel', stopPainting);

    const on = () => !c.state.uiHidden;
    c.addTag('Resim: 8 × 8 = 64 piksel', () => board.localToWorld(new THREE.Vector3(0, 0.05, -board.size / 2 - 0.35)), on, 'tag--big');
    c.addTag('64 göz', () => network.localToWorld(new THREE.Vector3(network.columns[0], 2.6, 0)), () => network.weightsShown > 0.5 && on(), 'tag--axis');
    c.addTag('8 yardımcı', () => network.localToWorld(new THREE.Vector3(network.columns[1], 2.32, 0)), () => network.weightsShown > 0.5 && on(), 'tag--axis');
    const outTag = c.addTag('', () => network.localToWorld(new THREE.Vector3(network.columns[2], 1.75, 0)), () => !!outTag.text && on());

    const ext = {
      net,
      train,
      test,
      board,
      network,
      outTag,
      current: train[0].x.slice(), // the picture on the tray
      currentLabel: train[0].y,
      currentKind: train[0].kind,
      exampleIndex: 0,
      numbersShown: false,
      drawing: blank(), // the student's picture
      editable: false,
      painting: null, // 0/1 while the pointer drags
      predictTimer: 0,
      predictDirty: false,
      training: false,
      budget: 0,
      paintTimer: 0,
      lastP: null,

      // ---------------------------------------------------------- pictures
      /** Put a picture on the tray (and in the panel grid). */
      showImage(px, label = null, kind = null, instant = false) {
        c.current = px.slice();
        c.currentLabel = label;
        c.currentKind = kind;
        board.setImage(px, instant);
        px.forEach((v, i) => network.setGlow('input', i, v));
        c.syncGrid();
      },
      /** The next training example, alternating mantı / börek. */
      nextExample(talk = true) {
        c.exampleIndex = (c.exampleIndex + 1) % train.length;
        const ex = train[c.exampleIndex];
        c.showImage(ex.x, ex.y, ex.kind);
        c.setOutput(null);
        sound.play('pick', { volume: 0.5 });
        const lit = ex.x.reduce((a, b) => a + b, 0);
        c.readout(
          `<span class="big">Örnek ${c.exampleIndex + 1} / ${train.length}: ${ex.y ? '<span class="sweet">mantı</span>' : '<span class="salty">börek</span>'}</span>Etiketi <b>${ex.y}</b>. Bu resimde ${lit} tane 1, ${PIXELS - lit} tane 0 var.`
        );
        if (talk) {
          bidik.react(ex.y ? 'yum' : 'curious', 1.5);
          if (c.exampleIndex % 6 === 1) c.say(ex.y ? 'Yuvarlak ve tepesi büzük: mantı!' : 'Uzun ve yassı: börek!', 3);
        }
      },
      /** Show or hide the 64 numbers over the grid. */
      toggleNumbers() {
        c.numbersShown = !c.numbersShown;
        c.setAction(c.numbersShown ? 'Sayıları gizle' : 'Sayıları göster');
        c.syncGrid();
        const px = c.current;
        const lit = px.reduce((a, b) => a + b, 0);
        if (c.numbersShown) {
          c.readout(`<span class="big">İşte resmin kendisi: 64 sayı</span>Koyu kare = <b>1</b>, boş kare = <b>0</b>. Bu resimde ${lit} tane 1 ve ${PIXELS - lit} tane 0 var. Bıdık resme bakmıyor; bu sayılara bakıyor.`);
          sound.play('pick', { volume: 0.5 });
          bidik.react('surprised', 1.8);
          c.say('Resim mi? Ben sadece 64 sayı görüyorum!', 3.5);
        } else {
          c.readout('');
          sound.play('click', { volume: 0.5 });
        }
      },

      // ---------------------------------------------------------- panel grid
      /** Build the 8×8 button grid inside `#pixgrid` (if the chapter has one). */
      buildGrid(editable) {
        c.editable = editable;
        const host = c.$('#pixgrid');
        if (!host) return;
        host.innerHTML = '';
        host.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
        for (let i = 0; i < PIXELS; i++) {
          const b = document.createElement('button');
          b.type = 'button';
          b.dataset.i = String(i);
          b.setAttribute('aria-label', `piksel ${Math.floor(i / SIZE) + 1}. satır ${(i % SIZE) + 1}. sütun`);
          b.tabIndex = editable ? 0 : -1;
          b.style.fontSize = '12px';
          b.style.fontWeight = '700';
          b.style.cursor = editable ? 'crosshair' : 'default';
          host.appendChild(b);
        }
        if (editable) {
          const cellAt = (e) => {
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (!el || !host.contains(el) || !(el instanceof HTMLButtonElement)) return -1;
            return Number(el.dataset.i);
          };
          host.addEventListener('pointerdown', (e) => {
            const i = cellAt(e);
            if (i < 0) return;
            e.preventDefault();
            c.painting = c.drawing[i] ? 0 : 1;
            c.paintPixel(i, c.painting);
            sound.unlock();
          });
          host.addEventListener('pointermove', (e) => {
            if (c.painting === null) return;
            const i = cellAt(e);
            if (i >= 0) c.paintPixel(i, c.painting);
          });
          // keyboard: space / enter toggles the focused pixel
          host.addEventListener('keydown', (e) => {
            if (e.key !== ' ' && e.key !== 'Enter') return;
            const b = e.target;
            if (!(b instanceof HTMLButtonElement) || !b.dataset.i) return;
            e.preventDefault();
            const i = Number(b.dataset.i);
            c.paintPixel(i, c.drawing[i] ? 0 : 1);
          });
        }
        c.syncGrid();
      },
      paintPixel(i, v) {
        if (c.drawing[i] === v) return;
        c.drawing[i] = v;
        board.values[i] = v;
        c.current[i] = v;
        network.setGlow('input', i, v);
        c.syncGrid();
        c.predictDirty = true;
        c.predictTimer = 0;
      },
      /** Repaint the grid buttons from the current picture. */
      syncGrid() {
        const host = c.$('#pixgrid');
        if (!host) return;
        const px = c.editable ? c.drawing : c.current;
        const buttons = host.children;
        for (let i = 0; i < buttons.length; i++) {
          const b = buttons[i];
          const v = px[i] ? 1 : 0;
          b.classList.toggle('is-on', v === 1);
          b.textContent = c.numbersShown ? String(v) : '';
          b.style.color = v ? '#fff' : PALETTE.ink;
        }
      },
      clearDrawing(quiet = false) {
        c.drawing = blank();
        if (c.editable) {
          c.showImage(c.drawing);
          c.setOutput(null);
          c.readout('');
          if (!quiet) {
            sound.play('refill', { volume: 0.4 });
            c.say('Tertemiz. Hadi yeni bir şey çiz!', 2.5);
          }
        }
      },
      loadPreset(id) {
        c.drawing = preset(id);
        c.showImage(c.drawing);
        c.predictDirty = true;
        c.predictTimer = 0.05;
        sound.play('pick', { volume: 0.5 });
      },

      // ---------------------------------------------------------- forward pass
      /** Run the network on a picture with pulses; updates the tag and returns p. */
      forward(px, withPulses = true) {
        const { h, p } = net.forward(px);
        c.lastP = p;
        network.clearGlow();
        px.forEach((v, i) => network.setGlow('input', i, v));
        if (withPulses) {
          network.emitPulses(1, px);
          sound.play('drip', { volume: 0.4 });
          c.later(0.7, () => {
            h.forEach((v, i) => network.setGlow('hidden', i, Math.abs(v)));
            network.emitPulses(2, h);
            sound.play('drip', { volume: 0.4 });
          });
          c.later(1.4, () => {
            network.setGlow('output', 0, p);
            c.setOutput(p);
          });
        } else {
          h.forEach((v, i) => network.setGlow('hidden', i, Math.abs(v)));
          network.setGlow('output', 0, p);
          c.setOutput(p);
        }
        return p;
      },
      setOutput(p) {
        if (p === null) {
          outTag.text = '';
          outTag.el.textContent = '';
          return;
        }
        outTag.text = `%${Math.round(p * 100)} mantı`;
        outTag.el.textContent = outTag.text;
      },
      /** Bıdık's words for a probability. */
      verdict(p) {
        const pct = Math.round(p * 100);
        if (pct >= 85) return { text: `%${pct} mantı`, sub: 'Bıdık gayet emin: "Mantı!"', mood: 'yum' };
        if (pct <= 15) return { text: `%${pct} mantı, yani %${100 - pct} börek`, sub: 'Bıdık gayet emin: "Börek!"', mood: 'happy' };
        if (pct >= 40 && pct <= 60) return { text: `%${pct} mantı`, sub: 'Yazı tura gibi. Bıdık: "Emin değilim…"', mood: 'thinking' };
        return { text: `%${pct} mantı`, sub: pct > 50 ? 'Bıdık "galiba mantı" diyor ama pek emin değil.' : 'Bıdık "galiba börek" diyor ama pek emin değil.', mood: 'curious' };
      },
      /** Chapter 2: show the current picture to the network. */
      askBidik() {
        const p = c.forward(c.current, true);
        bidik.react('thinking', 1.6);
        sound.play('pick', { volume: 0.5 });
        c.later(1.5, () => {
          const v = c.verdict(p);
          const truth = c.currentLabel === null ? '' : ` Doğru cevap: <b>${c.currentLabel ? 'mantı' : 'börek'}</b>.`;
          const trained = net.steps > 0;
          c.readout(`<span class="big">${v.text}</span>${v.sub}${truth}${trained ? '' : ' Henüz antrenman yapmadı; ipleri rastgele, cevabı da öyle.'}`);
          bidik.react(v.mood, 2);
          c.say(trained ? (p > 0.5 ? 'Bence mantı!' : 'Bence börek!') : 'Şey… ipleri karışık, sallıyorum!', 3);
        });
      },
      /** Chapters 5–6: the live prediction on the drawing (debounced from update). */
      predictDrawing() {
        const lit = c.drawing.reduce((a, b) => a + b, 0);
        const p = c.forward(c.drawing, true);
        c.later(1.45, () => {
          const v = c.verdict(p);
          const hint = lit === 0 ? ' Bomboş resme bile bir cevap verdi. Çünkü elinde sadece iki seçenek var.' : '';
          c.readout(`<span class="big">${v.text}</span>${v.sub}${hint}`);
          bidik.react(v.mood, 2);
        });
      },

      // ---------------------------------------------------------- training
      updateStats() {
        const a = net.evaluate(train);
        const b = net.evaluate(test);
        c.setStats(
          [
            ['Kaç kez baktı', String(net.steps)],
            ['Antrenman doğru', net.steps ? `%${Math.round(a.acc * 100)}` : '–'],
            ['Sınav doğru', net.steps ? `%${Math.round(b.acc * 100)}` : '–'],
          ],
          net.history
        );
        network.syncWeights(false);
      },
      toggleTraining() {
        if (c.training) c.stopTraining();
        else c.startTraining();
      },
      startTraining() {
        c.training = true;
        c.state.busy = true;
        c.budget = TRAIN_STEPS;
        c.setAction('Dur biraz', true);
        c.setOutput(null);
        network.clearGlow();
        bidik.setMood('curious');
        c.say('120 resme bakıyorum, ipleri düzeltiyorum, bir daha bakıyorum…', 5);
        sound.play('click');
      },
      stopTraining() {
        if (!c.training) return;
        c.training = false;
        c.state.busy = false;
        c.setAction('Antrenman başlasın!', false);
        bidik.setMood('happy');
      },
      trainSilently(n) {
        for (let i = 0; i < n; i++) net.trainStep(train, LR);
        network.syncWeights(true);
      },
      resetNet(quiet = false) {
        c.stopTraining();
        net.reset();
        network.syncWeights(true);
        network.clearGlow();
        c.current.forEach((v, i) => network.setGlow('input', i, v));
        c.setOutput(null);
        if (c.state.step === 3) c.updateStats();
        if (!quiet) {
          sound.play('refill', { volume: 0.5 });
          bidik.react('sleepy', 2);
          c.say('Hop, her şeyi unuttum! Baştan başlıyoruz.', 3);
        }
      },
      /** After training: the test result, and the first picture it got wrong on the tray. */
      showTestResult() {
        const wrong = test.filter((d) => (net.predict(d.x) > 0.5 ? 1 : 0) !== d.y);
        const right = test.length - wrong.length;
        const a = Math.round(net.evaluate(train).acc * 100);
        const pb = Math.round((right / test.length) * 100);
        let html = `<span class="big">Antrenman %${a} · Sınav %${pb}</span>Hiç görmediği ${test.length} sınav resminin <b>${right}</b> tanesini bildi`;
        if (wrong.length) {
          const w = wrong[0];
          c.showImage(w.x, w.y, w.kind);
          html += `, <span class="bad">${wrong.length} tanesini bilemedi</span>. Tepside yanlış bildiği bir ${w.y ? 'mantı' : 'börek'} var: Bıdık ona %${Math.round(net.predict(w.x) * 100)} mantı dedi. Sence neden şaşırdı?`;
        } else html += '. Hepsini bildi!';
        c.readout(html);
        c.toast(`Antrenman bitti! Sınavda ${test.length} resimden ${right} doğru.`);
        c.say(pb >= 90 ? 'Hiç görmediğim resimleri de bildim! Öğrendim galiba!' : 'Hmm, sınavda biraz zorlandım.', 5);
        bidik.react(pb >= 90 ? 'bliss' : 'worried', 3);
        bidik.doHop(1);
        sound.play('refill', { volume: 0.5 });
      },
    };
    return ext;
  },
  update(dt, c) {
    if (c.training) {
      const perFrame = c.reducedMotion ? 6 : 2;
      for (let k = 0; k < perFrame && c.budget > 0; k++) {
        c.net.trainStep(c.train, LR);
        c.budget--;
      }
      c.paintTimer += dt;
      if (c.paintTimer > 0.08) {
        c.paintTimer = 0;
        c.updateStats();
        if (c.net.steps % 6 === 0) c.sound.play('hop', { volume: 0.25 });
        if (c.net.steps % 30 === 0) c.bidik.doHop(0.4);
      }
      if (c.budget <= 0) {
        c.stopTraining();
        c.updateStats();
        c.showTestResult();
      }
    }
    if (c.predictDirty && c.editable) {
      c.predictTimer += dt;
      if (c.predictTimer > 0.35 && c.painting === null) {
        c.predictDirty = false;
        c.predictDrawing();
      }
    }
    c.board.update(dt);
    c.network.update(dt);
  },
  restart(c) {
    c.resetNet(true);
    c.drawing = blank();
    c.numbersShown = false;
  },
});
