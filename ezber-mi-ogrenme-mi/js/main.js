import { createLesson, PALETTE, THREE } from '../../js/shell.js';
import { TinyNet, makeDataset } from '../../js/mlp.js';
import { Board } from '../../js/board.js';
import { Network3D } from '../../js/network.js';
import { STEPS, QUIZ } from './steps.js';

const FOCUS = {
  overview: { target: new THREE.Vector3(0.8, 0.45, -0.3), dist: 12.0, az: 0.18, el: 0.98, bidik: [0.7, 2.4] },
  train: { target: new THREE.Vector3(-1.1, 0.2, 0.2), dist: 6.9, az: 0.12, el: 1.0, bidik: [0.95, 2.05] },
  test: { target: new THREE.Vector3(2.5, 0.2, 0.2), dist: 6.2, az: 0.1, el: 1.0, bidik: [0.6, 2.0] },
  network: { target: new THREE.Vector3(1.05, 1.15, -2.6), dist: 6.9, az: 0.18, el: 1.2, bidik: [2.6, -2.7] },
  bidik: { target: new THREE.Vector3(1.2, 0.75, 2.3), dist: 5.4, az: 0.2, el: 1.2, bidik: [1.2, 2.3] },
};

/** Deterministic label flips for the "dalgın usta" experiment. */
function flipLabels(data, fraction, seed) {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
  return data.map((d) => (r() < fraction ? { x: d.x, y: 1 - d.y, flipped: true } : { x: d.x, y: d.y }));
}

createLesson({
  steps: STEPS,
  quiz: QUIZ,
  focus: FOCUS,
  finishLine: 'Artık biliyorsun: az örnek ezberletir, çok ve doğru örnek öğretir.',
  keys: {
    e: (c) => {
      if (![1, 3, 4].includes(c.state.step)) c.go(1);
      c.toggleTraining();
    },
    r: (c) => c.resetNet(),
  },
  setup(c) {
    const { scene, mouths, softDot, sound, bidik } = c;
    const net = new TinyNet(8, 3);
    const pool = makeDataset(64, 11);
    const test = makeDataset(32, 5);

    const train = new Board({ size: 3.0, tiles: 26, palette: PALETTE, mouths });
    train.position.set(-1.1, 0, 0.2);
    scene.add(train);
    const testBoard = new Board({ size: 2.4, tiles: 22, palette: PALETTE, mouths });
    testBoard.position.set(2.5, 0, 0.2);
    testBoard.setDishes(test);
    scene.add(testBoard);
    const network = new Network3D({ net, palette: PALETTE, softDot, mouths });
    network.position.set(-1.3, 0, -2.6);
    scene.add(network);

    // red rings under wrongly predicted test dishes
    const marks = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.13, 0.014, 8, 36);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#c8322b' });
    for (let i = 0; i < test.length; i++) {
      const m = new THREE.Mesh(ringGeo, ringMat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      marks.add(m);
    }
    testBoard.add(marks);

    const on = () => !c.state.uiHidden;
    c.addTag('Antrenman masası', () => train.localToWorld(new THREE.Vector3(0, 0.05, -train.size / 2 - 0.35)), on, 'tag--big');
    c.addTag('Sınav masası', () => testBoard.localToWorld(new THREE.Vector3(0, 0.05, -testBoard.size / 2 - 0.35)), on, 'tag--big');
    c.addTag('küçük → büyük', () => train.localToWorld(new THREE.Vector3(0.7, 0.02, train.size / 2 + 0.3)), on, 'tag--axis');
    c.addTag('↑ pişme süresi', () => train.localToWorld(new THREE.Vector3(-train.size / 2 - 0.65, 0.02, 0.1)), on, 'tag--axis');
    c.addTag('yardımcılar', () => network.localToWorld(new THREE.Vector3(network.columns[1], 2.28, 0)), () => network.weightsShown > 0.5 && on());

    // returned fields are copied onto ctx, so methods read state through `c`
    const ext = {
      net,
      pool,
      test,
      train,
      testBoard,
      network,
      count: 64,
      noisy: false,
      subset: pool.slice(),
      training: false,
      budget: 0,
      paintTimer: 0,
      setCount(n, instant = false) {
        c.count = n;
        c.rebuildSubset();
        train.setDishes(c.subset);
        if (instant) train.revealAll();
        else c.subset.forEach((_, i) => c.later(0.05 + i * 0.02, () => train.revealDish(i)));
      },
      setNoise(onOff) {
        c.noisy = onOff;
        c.rebuildSubset();
        train.setDishes(c.subset);
        train.revealAll();
      },
      rebuildSubset() {
        const base = pool.slice(0, c.count);
        c.subset = c.noisy ? flipLabels(base, 0.25, 7) : base;
      },
      showTest(show) {
        if (show) testBoard.revealAll();
        else testBoard.hideAll();
      },
      paint() {
        train.paint((s, t) => net.predict([s, t]));
        testBoard.paint((s, t) => net.predict([s, t]));
        const tint = net.steps > 0 ? 1 : 0;
        train.tintTarget = tint;
        testBoard.tintTarget = tint;
      },
      updateStats() {
        const a = net.evaluate(c.subset);
        const b = net.evaluate(test);
        c.setStats(
          [
            ['Antrenman masası', net.steps ? `%${Math.round(a.acc * 100)}` : '–'],
            ['Sınav masası', net.steps ? `%${Math.round(b.acc * 100)}` : '–'],
            ['Kaç kez baktı', String(net.steps)],
          ],
          net.history
        );
        c.paint();
        network.syncWeights(false);
      },
      toggleTraining() {
        if (c.training) c.stopTraining();
        else c.startTraining();
      },
      startTraining() {
        c.training = true;
        c.state.busy = true;
        c.budget = 600;
        c.setAction('Dur biraz', true);
        bidik.setMood('curious');
        c.say('Bakıyorum, düzeltiyorum, bakıyorum, düzeltiyorum…', 5);
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
        for (let i = 0; i < n; i++) net.trainStep(c.subset, 1.2);
      },
      resetNet(quiet = false) {
        c.stopTraining();
        net.reset();
        network.syncWeights(true);
        c.clearMarks();
        c.paint();
        c.updateStats();
        if (!quiet) {
          sound.play('refill', { volume: 0.5 });
          bidik.react('sleepy', 2);
          c.say('Hop, her şeyi unuttum! Baştan başlıyoruz.', 3);
        }
      },
      markWrong(talk = false) {
        let wrong = 0;
        test.forEach((d, i) => {
          const bad = (net.predict(d.x) > 0.5 ? 1 : 0) !== d.y;
          const m = marks.children[i];
          m.visible = bad && net.steps > 0;
          if (bad) wrong++;
          m.position.copy(testBoard.toLocal(d.x[0], d.x[1], 0.035));
        });
        if (net.steps === 0) {
          c.readout('<span class="big">Önce antrenman lazım</span>Bir önceki bölüme dönüp "Antrenman başlasın!" düğmesine bas.');
          return;
        }
        c.readout(`<span class="big">Sınav masası: ${test.length - wrong} doğru, <span class="bad">${wrong} yanlış</span></span>Kırmızı halkalı mantılar Bıdık'ın yanlış bildikleri.`);
        if (talk) {
          sound.play('grab', { volume: 0.5 });
          bidik.react(wrong > 3 ? 'worried' : 'happy', 2);
          c.say(wrong > 3 ? 'Of, bu kadar yanlış mı? Ezberlemişim gerçekten.' : 'Bu sefer çoğunu bildim!', 3.5);
        }
      },
      clearMarks() {
        for (const m of marks.children) m.visible = false;
      },
      setAction2(text) {
        c.dom.action2.textContent = text;
      },
    };
    return ext;
  },
  update(dt, c) {
    if (c.training) {
      const perFrame = c.reducedMotion ? 8 : 4;
      for (let k = 0; k < perFrame && c.budget > 0; k++) {
        c.net.trainStep(c.subset, 1.2);
        c.budget--;
      }
      c.paintTimer += dt;
      if (c.paintTimer > 0.08) {
        c.paintTimer = 0;
        c.updateStats();
        if (c.net.steps % 12 === 0) c.sound.play('hop', { volume: 0.25 });
        if (c.net.steps % 40 === 0) c.bidik.doHop(0.4);
      }
      if (c.budget <= 0) {
        c.stopTraining();
        const a = c.net.evaluate(c.subset);
        const b = c.net.evaluate(c.test);
        const pa = Math.round(a.acc * 100);
        const pb = Math.round(b.acc * 100);
        const flipped = c.subset.filter((d) => d.flipped);
        if (c.noisy && flipped.length) {
          // the training table is graded against the chef's wrong labels, the test table against the true ones
          const n = c.subset.length;
          const cap = Math.floor(((n - flipped.length) / n) * 100);
          const copied = flipped.filter((d) => (c.net.predict(d.x) > 0.5 ? 1 : 0) === d.y).length;
          c.readout(
            `<span class="big">Antrenman masası %${pa} · Sınav masası %${pb}</span>` +
              `<b>${pb > pa ? 'Sınav neden daha yüksek?' : 'İki puan neden böyle?'}</b> Antrenman masası ustanın yanlış etiketleriyle puanlanıyor: ${n} mantının ${flipped.length} tanesinin etiketi yanlış, o yüzden orada en fazla %${cap} alınabilir. Sınav masasının etiketleri doğru. ` +
              `Temiz etiketlerle ikisi de %100'dü; yanlış etiketler Bıdık'ı iki masada da geriletti. Üstelik Bıdık ${flipped.length} yanlış etiketin <span class="warn">${copied} tanesini</span> olduğu gibi ezberledi.`
          );
        } else {
          c.readout(`<span class="big">Antrenman masası %${pa} · Sınav masası %${pb}</span>${pa - pb >= 12 ? '<span class="warn">Büyük fark!</span> Bıdık masayı ezberlemiş, kuralı öğrenmemiş.' : pb >= 90 ? 'Fark küçük: Bıdık bu sefer gerçekten öğrendi.' : 'İkisi de düşük: Bıdık\'ın kafası karışmış.'}`);
        }
        c.toast(`Antrenman bitti! Antrenman masası %${pa}, sınav masası %${pb}.`);
        c.say(pa - pb >= 12 ? 'Antrenmanda süperim ama sınavda… hmm.' : pb >= 90 ? 'İki masada da bildim! Bu sefer öğrendim!' : 'Bir şeyler ters. Bu mantılar birbirini tutmuyor!', 5);
        c.bidik.react(pb >= 90 ? 'bliss' : 'worried', 3);
        c.bidik.doHop(1);
        c.sound.play('refill', { volume: 0.5 });
        if (c.state.step === 2) c.markWrong();
      }
    }
    c.train.update(dt);
    c.testBoard.update(dt);
    c.network.update(dt);
  },
  restart(c) {
    c.resetNet(true);
  },
});
