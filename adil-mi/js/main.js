import { createLesson, PALETTE, THREE } from '../../js/shell.js';
import { TinyNet } from '../../js/mlp.js';
import { Board } from '../../js/board.js';
import { Network3D } from '../../js/network.js';
import { CHEFS, MINUTES, TOLERANCE, idealMinutes, makeChefDataset, makeTestSet, perChef } from './data.js';
import { STEPS, QUIZ, GUESSES } from './steps.js';

const FOCUS = {
  overview: { target: new THREE.Vector3(0.8, 0.45, -0.3), dist: 12.0, az: 0.18, el: 0.98, bidik: [0.7, 2.4] },
  train: { target: new THREE.Vector3(-1.1, 0.2, 0.2), dist: 6.9, az: 0.12, el: 1.0, bidik: [0.95, 2.05] },
  test: { target: new THREE.Vector3(2.8, 0.2, 0.2), dist: 6.6, az: 0.1, el: 1.0, bidik: [4.3, -0.7] },
  network: { target: new THREE.Vector3(1.05, 1.15, -2.6), dist: 6.9, az: 0.18, el: 1.2, bidik: [2.6, -2.7] },
  bidik: { target: new THREE.Vector3(1.2, 0.75, 2.3), dist: 5.4, az: 0.2, el: 1.2, bidik: [1.2, 2.3] },
};

// Fixed seeds: the numbers quoted in the chapter texts were verified with these.
const SEED = 95528;
const PER_CHEF_TRAIN = 24;
const PER_CHEF_TEST = 16;

const EXAMPLES = [
  {
    say: 'Yüz tanıyan programlar koyu tenli kadınları çok daha sık yanlış bildi.',
    html: '<span class="big">Yüzler</span>2018, Gender Shades araştırması: açık tenli erkeklerde hata en fazla %0,8; koyu tenli kadınlarda %34,7\'ye kadar. Programların öğrendiği fotoğraf yığınında koyu tenli kadın çok azdı.',
  },
  {
    say: 'Sesli asistan bazı aksanları zor anlıyor. Az dinlemiş!',
    html: '<span class="big">Sesler</span>Sesli asistanlar, az ses kaydı dinledikleri aksanları daha zor anlar. Çözüm: o aksanla konuşan insanlardan daha çok kayıt toplamak.',
  },
  {
    say: 'Çözüm: herkesin verisi masada olsun, puan herkes için ayrı sayılsın!',
    html: '<span class="big">Çözüm</span>Eksik grubun verisini topla, başarıyı her grup için ayrı ölç. Tıpkı Deniz Usta\'nın mantılarını masaya koymamız gibi.',
  },
];

/** Coloured rings under the dishes of a board, one colour per chef. */
function makeChefRings(board) {
  const mesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.118, 0.012, 8, 32), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 96);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  board.add(mesh);
  const colors = CHEFS.map((ch) => new THREE.Color(ch.color));
  const d = new THREE.Object3D();
  mesh.sync = () => {
    let n = 0;
    for (const dish of board.dishes) {
      if (dish.scale < 0.01) continue;
      d.position.copy(board.toLocal(dish.x[0], dish.x[1], 0.032));
      d.rotation.set(-Math.PI / 2, 0, 0);
      d.scale.setScalar(dish.scale);
      d.updateMatrix();
      mesh.setMatrixAt(n, d.matrix);
      mesh.setColorAt(n, colors[dish.chef] || colors[0]);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  return mesh;
}

/** The true band's two edges drawn on a board as dark tubes. */
function makeRuleCurves(board) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.75 });
  for (const sign of [-1, 1]) {
    const pts = [];
    for (let s = 0.03; s <= 0.97; s += 0.02) {
      const t = Math.min(0.98, Math.max(0.02, (idealMinutes(s) + sign * TOLERANCE) / MINUTES));
      pts.push(board.toLocal(s, t, 0.05));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.014, 6, false), mat));
  }
  g.visible = false;
  board.add(g);
  return g;
}

createLesson({
  steps: STEPS,
  quiz: QUIZ,
  focus: FOCUS,
  finishLine: 'Artık biliyorsun: yapay zeka verisinde kim varsa onu öğrenir; herkes masada olmalı.',
  keys: {
    e: (c) => {
      if (![2, 4].includes(c.state.step)) c.go(2);
      c.toggleTraining();
    },
    r: (c) => c.resetNet(),
  },
  setup(c) {
    const { scene, mouths, softDot, sound, bidik } = c;
    const net = new TinyNet(8, 3);
    const pools = CHEFS.map((_, i) => makeChefDataset(i, PER_CHEF_TRAIN, SEED + 1 + i));
    const test = makeTestSet(PER_CHEF_TEST, [SEED + 11, SEED + 12, SEED + 13]);

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

    const trainRings = makeChefRings(train);
    const testRings = makeChefRings(testBoard);
    const rule = makeRuleCurves(testBoard);

    // red rings under wrongly predicted test dishes
    const marks = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.165, 0.016, 8, 40);
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
    CHEFS.forEach((ch, i) => {
      const mid = (ch.range[0] + ch.range[1]) / 2;
      const t = c.addTag(ch.short, () => testBoard.localToWorld(new THREE.Vector3((mid - 0.5) * testBoard.size, 0.02, testBoard.size / 2 + 0.28)), on, 'tag--axis');
      t.el.style.color = ch.color;
    });
    c.addTag('yardımcılar', () => network.localToWorld(new THREE.Vector3(network.columns[1], 2.28, 0)), () => network.weightsShown > 0.5 && on());

    const pct = (p) => `%${Math.round(p.acc * 100)}`;
    const dot = (col) => `<i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};margin-right:4px"></i>`;

    // returned fields are copied onto ctx, so methods read state through `c`
    const ext = {
      net,
      pools,
      test,
      train,
      testBoard,
      network,
      trainRings,
      testRings,
      rule,
      denizCount: 0,
      subset: [],
      training: false,
      budget: 0,
      paintTimer: 0,
      guess: -1,
      chefTour: -1,
      exampleIdx: -1,
      ruleShown: false,
      /** Training table = Ayşe's 24 + Kemal's 24 + the first n of Deniz's 24. */
      setDeniz(n, instant = false) {
        c.denizCount = n;
        c.subset = [...pools[0], ...pools[1], ...pools[2].slice(0, n)];
        train.setDishes(c.subset);
        if (instant) train.revealAll();
        else c.subset.forEach((_, i) => c.later(0.05 + i * 0.02, () => train.revealDish(i)));
      },
      showTest(show) {
        if (show) testBoard.revealAll();
        else testBoard.hideAll();
      },
      showRule(onOff) {
        c.ruleShown = onOff;
        rule.visible = onOff;
      },
      paint() {
        train.paint((s, t) => net.predict([s, t]));
        testBoard.paint((s, t) => net.predict([s, t]));
        const tint = net.steps > 0 ? 1 : 0;
        train.tintTarget = tint;
        testBoard.tintTarget = tint;
      },
      updateStats() {
        if (STEPS[c.state.step]?.stats) {
          const per = perChef(net, test);
          c.setStats(
            [...CHEFS.map((ch, i) => [`${dot(ch.color)}${ch.short}`, net.steps ? pct(per[i]) : '–']), ['Kaç kez baktı', String(net.steps)]],
            net.history
          );
        }
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
        c.clearMarks();
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
      /** After a training run: per-chef readout, marks and Bıdık's verdict. */
      finishReport() {
        const per = perChef(net, test);
        const p = per.map((q) => Math.round(q.acc * 100));
        const gap = Math.min(p[0], p[1]) - p[2];
        const line = CHEFS.map((ch, i) => `${dot(ch.color)}${ch.short} %${p[i]}`).join(' · ');
        let verdict;
        if (gap >= 20) verdict = `<span class="bad">Deniz Usta'da çuvalladı!</span> Bıdık hiç görmediği büyük mantılarda yanılıyor.`;
        else if (p.every((v) => v >= 90)) verdict = 'Üç ustada da yüksek puan: Bıdık bu sefer herkesin mantısını öğrendi.';
        else verdict = 'Puanlar henüz eşitlenmedi; masaya daha çok mantı koyup tekrar dene.';
        let guessNote = '';
        if (c.state.step === 2 && c.guess >= 0) {
          const right = per[2].acc >= 1 ? 0 : per[2].acc <= 0 ? 2 : 1;
          guessNote = c.guess === right ? ` Tahminin "${GUESSES[c.guess]}" tuttu!` : ` Tahminin "${GUESSES[c.guess]}" tutmadı; sonuç: ${GUESSES[right].toLowerCase()}.`;
        }
        c.readout(`<span class="big">${line}</span>${verdict}${guessNote}`);
        c.toast(`Antrenman bitti! Ayşe %${p[0]}, Kemal %${p[1]}, Deniz %${p[2]}.`);
        c.say(gap >= 20 ? 'Ayşe ve Kemal Usta tamam da… Deniz Usta\'nın mantılarını hiç tanıyamadım!' : p.every((v) => v >= 90) ? 'Üç ustanın mantısını da bildim! Herkes masadaydı.' : 'Hmm, bir şeyler hâlâ eksik.', 5);
        bidik.react(gap >= 20 ? 'worried' : p.every((v) => v >= 90) ? 'bliss' : 'thinking', 3);
        bidik.doHop(1);
        sound.play('refill', { volume: 0.5 });
        c.markWrong();
      },
      markWrong() {
        test.forEach((d, i) => {
          const bad = (net.predict(d.x) > 0.5 ? 1 : 0) !== d.y;
          const m = marks.children[i];
          m.visible = bad && net.steps > 0;
          m.position.copy(testBoard.toLocal(d.x[0], d.x[1], 0.035));
        });
        if (net.steps === 0) {
          c.readout('<span class="big">Önce antrenman lazım</span>Antrenman bölümüne dönüp "Antrenman başlasın!" düğmesine bas.');
          return;
        }
        if (c.state.step === 3) {
          const per = perChef(net, test);
          const wrong = per.map((q) => q.n - q.correct);
          c.readout(`<span class="big">Yanlışlar: ${CHEFS.map((ch, i) => `${dot(ch.color)}${ch.short} ${wrong[i]}`).join(' · ')}</span>Kırmızı halkalı mantılar Bıdık'ın yanlış bildikleri; toplam ${wrong.reduce((a, b) => a + b, 0)} tane.`);
        }
      },
      clearMarks() {
        for (const m of marks.children) m.visible = false;
      },
      nextChef() {
        c.chefTour = (c.chefTour + 1) % CHEFS.length;
        const ch = CHEFS[c.chefTour];
        const n = test.filter((d) => d.chef === c.chefTour).length;
        c.readout(`<span class="big" style="color:${ch.color}">${ch.name}</span>${ch.label.charAt(0).toUpperCase() + ch.label.slice(1)} mantılar (boy ${ch.range[0].toFixed(2).replace('.', ',')}–${ch.range[1].toFixed(2).replace('.', ',')}); sınav masasında ${n} tanesi var. Halkalarının rengi: ${dot(ch.color)}`);
        c.say(['Ayşe Usta\'nın mantıları minicik, bir lokmalık!', 'Kemal Usta\'nınkiler orta boy, tam benim ölçüm.', 'Deniz Usta\'nınkiler kocaman! Bunlar ne kadar pişer ki?'][c.chefTour], 4);
        bidik.react(['happy', 'calm', 'surprised'][c.chefTour], 2);
        sound.play('pick', { volume: 0.5 });
      },
      nextExample() {
        c.exampleIdx = (c.exampleIdx + 1) % EXAMPLES.length;
        const ex = EXAMPLES[c.exampleIdx];
        c.readout(ex.html);
        c.say(ex.say, 5);
        bidik.react(c.exampleIdx === 2 ? 'joy' : 'thinking', 2);
        if (c.exampleIdx === 2) bidik.doHop(0.7);
        sound.play('pick', { volume: 0.5 });
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
        c.updateStats();
        c.finishReport();
      }
    }
    c.train.update(dt);
    c.testBoard.update(dt);
    c.trainRings.sync();
    c.testRings.sync();
    c.network.update(dt);
  },
  restart(c) {
    c.guess = -1;
    c.setDeniz(0, true);
    c.resetNet(true);
  },
});
