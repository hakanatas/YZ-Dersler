import { createLesson, PALETTE, THREE } from '../../js/shell.js';
import { Kitchen, MODES, SIZE_NAMES, ARMS } from './bandit.js';
import { Stove, ValueBars } from './stove.js';
import { STEPS, QUIZ } from './steps.js';

const FOCUS = {
  overview: { target: new THREE.Vector3(-0.35, 0.5, -0.5), dist: 11.5, az: 0.1, el: 1.0, bidik: [0.0, 2.5] },
  stove: { target: new THREE.Vector3(-1.4, 0.65, 0.4), dist: 5.2, az: -0.3, el: 1.1, bidik: [0.7, 1.9] },
  bars: { target: new THREE.Vector3(1.2, 0.6, -1.2), dist: 7.2, az: 0.1, el: 1.02, bidik: [-1.3, 1.5] },
  bidik: { target: new THREE.Vector3(1.2, 0.75, 2.3), dist: 5.4, az: 0.2, el: 1.2, bidik: [1.2, 2.3] },
};

createLesson({
  steps: STEPS,
  quiz: QUIZ,
  focus: FOCUS,
  finishLine: 'Artık biliyorsun: yapay zeka neyi alkışlarsan onu öğrenir.',
  keys: {
    r: (c) => c.resetLearner(),
  },
  setup(c) {
    const { scene, softDot, sound, bidik } = c;
    const stove = new Stove({ palette: PALETTE, softDot });
    stove.position.set(-1.4, 0, 0.4);
    scene.add(stove);
    const bars = new ValueBars({ palette: PALETTE, rows: 2 });
    bars.position.set(1.2, 0, -0.9);
    bars.visible = false;
    scene.add(bars);
    const kitchen = new Kitchen({ mode: 'orta', epsilon: 0.1, seed: 3 });

    const on = () => !c.state.uiHidden;
    const barsOn = () => bars.visible && on();
    c.addTag('Ocak', () => stove.localToWorld(new THREE.Vector3(-0.55, 0.95, -0.5)), on, 'tag--big');
    const minuteTag = c.addTag('', () => stove.localToWorld(stove.dialPos.clone().add(new THREE.Vector3(0, 0.36, 0.1))), () => on() && !!minuteTag.el.textContent);
    c.addTag('Alkış!', () => stove.localToWorld(stove.potTop.clone().add(new THREE.Vector3(0, 0.55, 0))), () => c.clapTimer > 0 && on(), 'tag--big');
    c.addTag('Sessizlik…', () => stove.localToWorld(stove.potTop.clone().add(new THREE.Vector3(0, 0.55, 0))), () => c.silentTimer > 0 && on());
    c.addTag('Bıdık\'ın defteri: kaç alkış?', () => bars.localToWorld(new THREE.Vector3(0, 2.0, -0.4)), barsOn, 'tag--big');
    c.addTag('pişirme süresi (dakika) →', () => bars.localToWorld(new THREE.Vector3(0.2, 0.02, 0.8)), barsOn, 'tag--axis');
    c.addTag('küçük mantı', () => bars.localToWorld(new THREE.Vector3(-2.05, 0.35, 0)), () => barsOn() && bars.rowsShown > 1, 'tag--axis');
    c.addTag('büyük mantı', () => bars.localToWorld(new THREE.Vector3(-2.05, 0.35, -bars.rowGap)), () => barsOn() && bars.rowsShown > 1, 'tag--axis');

    // returned fields are copied onto ctx, so methods read state through `c`
    const ext = {
      stove,
      bars,
      kitchen,
      minuteTag,
      running: false,
      budget: 0,
      acc: 0,
      rate: 60,
      clapTimer: 0,
      silentTimer: 0,
      soundTimer: 0,
      statTimer: 0,
      rewardCount: 0,
      runLabel: '',
      showTasty: false,
      afterRun: null,
      afterCook: null,
      selected: 6,
      /**
       * How the served dumpling looks in the pot. The student sees only what
       * Bıdık sees (clap or silence) until the speed-customer chapter, which
       * shows the truth next to the claps (showTasty).
       */
      look: (t) => (c.showTasty ? t.done : 'cooking'),
      /** Switch experiment (mode from bandit.js), epsilon and seed; the learner starts empty. */
      setMode(mode, epsilon, seed) {
        c.stopAll();
        c.kitchen.setMode(mode, epsilon, seed);
        c.bars.setRows(MODES[mode].tables);
        c.afterReset();
      },
      afterReset() {
        c.syncBars(true);
        c.stove.setDumpling(c.kitchen.pending.size, 'none');
        c.stove.setMinutes(6);
        c.minuteTag.el.textContent = '';
        c.clapTimer = 0;
        c.silentTimer = 0;
        c.rewardCount = 0;
        c.readout('');
        c.updateStats();
      },
      resetLearner(quiet = false) {
        c.stopAll();
        c.kitchen.reset();
        c.afterReset();
        if (!quiet) {
          sound.play('refill', { volume: 0.5 });
          bidik.react('sleepy', 2);
          c.say('Hop, defterimi sildim! Her şeye baştan başlıyorum.', 3);
        }
      },
      stopAll() {
        c.stopRun(false);
        c.stove.stopCooking();
        c.state.busy = false;
      },
      syncBars(instant = false) {
        const b = c.kitchen.bandit;
        for (let t = 0; t < b.tables; t++) c.bars.setValues(t, b.Q[t], b.N[t], b.bestArms(t), instant);
      },
      statsRows() {
        const k = c.kitchen;
        const rows = [
          ['Deneme', String(k.count)],
          ['Alkış', String(k.bandit.claps)],
        ];
        if (k.def.tables > 1) {
          rows.push(['Küçük için', k.bestMinutes(0) ? `${k.bestMinutes(0)} dk` : '–']);
          rows.push(['Büyük için', k.bestMinutes(1) ? `${k.bestMinutes(1)} dk` : '–']);
        } else rows.push(['En sevdiği süre', k.bestMinutes(0) ? `${k.bestMinutes(0)} dk` : '–']);
        if (c.showTasty) rows.push(['Gerçekten kıvamında', String(k.tasty)]);
        return rows;
      },
      updateStats() {
        if (!STEPS[c.state.step]?.stats) return;
        c.setStats(c.statsRows(), c.kitchen.history.length > 1 ? c.kitchen.history : null);
      },
      /** One animated trial with a chosen time (the student in chapter 2, Bıdık in chapter 1). */
      cookOne(minutes, who = 'sen') {
        if (c.state.busy) return;
        c.state.busy = true;
        const d = c.kitchen.pending;
        c.stove.setMinutes(minutes);
        c.minuteTag.el.textContent = `${minutes} dk`;
        c.stove.setDumpling(d.size, 'cooking');
        const dur = c.reducedMotion ? 0.3 : 0.4 + minutes * 0.1;
        c.stove.startCooking(dur);
        sound.play('drip', { volume: 0.5 });
        bidik.setMood('thinking');
        c.later(dur, () => {
          const t = c.kitchen.cook(minutes, who === 'rastgele');
          c.showTrial(t, true);
          c.state.busy = false;
          c.syncBars();
          c.updateStats();
          const size = SIZE_NAMES[t.kind];
          c.readout(
            t.r
              ? `<span class="big">${minutes} dk → <span class="ok">Alkış!</span></span>Müşteri alkışladı ama nedenini söylemedi. Bıdık'ın defterine yazıldı: ${minutes} dakika, bir alkış.`
              : `<span class="big">${minutes} dk → <span class="bad">sessizlik</span></span>Müşteri alkışlamadı. Çiğ mi kaldı, fazla mı pişti? Söylemiyor. Bıdık'ın defterine yazıldı: ${minutes} dakika, alkış yok.`
          );
          bidik.setMood('happy');
          c.afterCook?.(t, size);
        });
      },
      /** Show the outcome of a trial on the stove and in the notebook. */
      showTrial(t, animated) {
        c.stove.setMinutes(t.minutes);
        c.minuteTag.el.textContent = `${t.minutes} dk`;
        c.stove.setDumpling(t.size, c.look(t), !animated);
        c.bars.flash(t.table, t.minutes - 1, t.r);
        const hold = animated ? 1.6 : 0.25;
        if (t.r) {
          c.clapTimer = hold;
          c.silentTimer = 0;
          c.rewardCount++;
          if (animated || c.rewardCount % 6 === 0) c.confetti.burst(c.stove.localToWorld(c.stove.potTop.clone()).add(new THREE.Vector3(0, 0.4, 0)), animated ? 40 : 8);
          if (animated) {
            sound.play('yum', { volume: 0.7 });
            bidik.react('joy', 1.5);
            bidik.doHop(0.7);
          } else if (c.soundTimer <= 0) {
            sound.play('yum', { volume: 0.25 });
            c.soundTimer = 0.2;
          }
        } else {
          c.silentTimer = hold;
          c.clapTimer = 0;
          if (animated) {
            sound.play('grab', { volume: 0.5 });
            bidik.react('worried', 1.5);
          } else if (c.soundTimer <= 0) {
            sound.play('grab', { volume: 0.15 });
            c.soundTimer = 0.2;
          }
        }
        if (animated) c.stove.setDumpling(t.size, c.look(t));
      },
      /** Bıdık cooks `n` dumplings on his own, a few per frame. */
      startRun(n, label) {
        if (c.running) return;
        c.running = true;
        c.state.busy = true;
        c.budget = n;
        c.acc = 0;
        c.runLabel = label || c.dom.action.textContent;
        c.setAction('Dur', true);
        bidik.setMood('curious');
        sound.play('click');
      },
      stopRun(finished) {
        if (!c.running) return;
        c.running = false;
        c.state.busy = false;
        c.setAction(c.runLabel, false);
        bidik.setMood('happy');
        c.syncBars();
        c.updateStats();
        if (finished) {
          sound.play('refill', { volume: 0.5 });
          c.afterRun?.();
        }
      },
      toggleRun(n, label) {
        if (c.running) c.stopRun(false);
        else c.startRun(n, label);
      },
      /** Empty the notebook (same seed, so the run is reproducible) and start a run; keeps the readout. */
      freshRun(n, label) {
        c.stopAll();
        c.kitchen.reset();
        c.syncBars(true);
        c.stove.setDumpling(c.kitchen.pending.size, 'none');
        c.rewardCount = 0;
        c.updateStats();
        c.startRun(n, label);
      },
      /** Bind the chip buttons of chapter 2. */
      bindChips() {
        const host = c.$('#chips');
        if (!host) return;
        host.innerHTML = '';
        for (let m = 1; m <= ARMS; m++) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn';
          b.textContent = `${m} dk`;
          b.setAttribute('aria-pressed', String(m === c.selected));
          b.addEventListener('click', () => {
            c.selected = m;
            host.querySelectorAll('button').forEach((x, i) => x.setAttribute('aria-pressed', String(i + 1 === m)));
            c.cookOne(m);
          });
          host.appendChild(b);
        }
      },
    };
    return ext;
  },
  update(dt, c) {
    if (c.running) {
      c.acc += dt * (c.reducedMotion ? 150 : c.rate);
      let k = 0;
      while (c.acc >= 1 && c.budget > 0) {
        c.acc -= 1;
        c.budget--;
        c.showTrial(c.kitchen.step(), false);
        k++;
      }
      if (k) c.syncBars();
      c.statTimer += dt;
      if (c.statTimer > 0.12) {
        c.statTimer = 0;
        c.updateStats();
        if (c.kitchen.count % 40 < 3) c.bidik.doHop(0.3);
      }
      if (c.budget <= 0) c.stopRun(true);
    }
    c.clapTimer = Math.max(0, c.clapTimer - dt);
    c.silentTimer = Math.max(0, c.silentTimer - dt);
    c.soundTimer -= dt;
    c.stove.update(dt);
    c.bars.update(dt);
  },
  restart(c) {
    c.setMode('orta', 0.1, 3);
  },
});
