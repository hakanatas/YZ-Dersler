import { createLesson, PALETTE, THREE, Ease } from '../../js/shell.js';
import { createDumplingGeometry } from '../../js/dumpling-shape.js';
import { parseMap, DEFAULT_MAP, bfs, randomWalk, toggleWall, same } from './maze.js';
import { MazeFloor } from './floor.js';
import { STEPS, QUIZ, RULES, EXAMPLES, BASE_MINUTES, METHODS, SITUATIONS } from './steps.js';

const CELL = 0.8;
const grid = parseMap(DEFAULT_MAP);
const defaultWalls = Uint8Array.from(grid.walls);
const RANDOM_STEPS = 60;
// world position of the start cell (the grid sits at the origin)
const HOME = [(grid.start[0] - (grid.w - 1) / 2) * CELL, (grid.start[1] - (grid.h - 1) / 2) * CELL];

const FOCUS = {
  overview: { target: new THREE.Vector3(0, 0.3, 0), dist: 11.5, az: 0.2, el: 1.0, bidik: HOME },
  grid: { target: new THREE.Vector3(0, 0.1, 0.35), dist: 11.2, az: 0.0, el: 0.62, bidik: HOME },
  bidik: { target: new THREE.Vector3(HOME[0] - 0.4, 0.7, 0.3), dist: 5.6, az: 0.3, el: 1.15, bidik: HOME },
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

createLesson({
  steps: STEPS,
  quiz: QUIZ,
  focus: FOCUS,
  finishLine: 'Kural, arama, öğrenme: her iş için doğru yöntemi seç.',
  setup(c) {
    const { scene, sound, bidik, tweens } = c;
    bidik.scale.setScalar(0.85);

    const floor = new MazeFloor({ grid, cell: CELL, palette: PALETTE });
    scene.add(floor);

    // the example dumpling on a plate, for the rules chapter
    const plate = new THREE.Group();
    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.25, 0.04, 28),
      new THREE.MeshPhysicalMaterial({ color: PALETTE.porcelain, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 })
    );
    dish.position.y = 0.02;
    dish.castShadow = true;
    const geo = createDumplingGeometry(THREE, { around: 56, down: 32 });
    geo.deleteAttribute('color');
    const dumpling = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color('#ffd7b3') }));
    dumpling.position.y = 0.05;
    dumpling.castShadow = true;
    plate.add(dish, dumpling);
    plate.position.set(HOME[0] - 1.1, 0, HOME[1] + 0.55);
    plate.visible = false;
    scene.add(plate);

    const on = () => !c.state.uiHidden;
    c.addTag('Buharlı tencere', () => floor.cellToWorld(grid.goal, 0.95), on, 'tag--big');
    c.addTag('Başlangıç', () => floor.cellToWorld(grid.start, 0.02).add(new THREE.Vector3(0, 0, 0.62)), () => on() && c.state.step >= 1 && c.state.step <= 2, 'tag--axis');

    const sweet = new THREE.Color(PALETTE.sweet);
    const salty = new THREE.Color(PALETTE.salty);
    const pathColor = new THREE.Color(PALETTE.terracotta);
    const trailColor = new THREE.Color(PALETTE.slate).lerp(new THREE.Color('#ffffff'), 0.55);
    const cloth = new THREE.Color('#efe4d3');
    const ringColor = (t) => new THREE.Color().lerpColors(salty, sweet, t).lerp(cloth, 0.28);

    // returned fields are copied onto ctx, so methods read state through `c`
    const ext = {
      floor,
      plate,
      dumpling,
      walkCtx: null,
      exIndex: 0,
      ruleStep: 0,
      minutes: BASE_MINUTES,

      // ------------------------------------------------------------ maze
      resetMaze() {
        c.stopWalk();
        grid.walls.set(defaultWalls);
        floor.refreshWalls();
        floor.clearTints();
      },
      stopWalk() {
        if (c.walkCtx) c.walkCtx.cancelled = true;
        c.walkCtx = null;
        c.state.busy = false;
      },
      /** Move Bıdık to a cell (a tween in the given cancel context). */
      async stepTo(cell, sec, ctx) {
        const from = bidik.position.clone();
        const to = floor.cellToWorld(cell, 0);
        bidik.doHop(0.45);
        await tweens.run(ctx, sec, (t) => bidik.position.lerpVectors(from, to, t), Ease.inOutQuad);
      },
      async goHome(ctx) {
        const home = floor.cellToWorld(grid.start, 0);
        if (bidik.position.distanceTo(home) < 0.02) return;
        const from = bidik.position.clone();
        await tweens.run(ctx, 0.6, (t) => bidik.position.lerpVectors(from, home, t), Ease.inOutCubic);
      },
      async randomWalkRun() {
        if (c.state.busy) return;
        const ctx = { cancelled: false };
        c.walkCtx = ctx;
        c.state.busy = true;
        c.setAction('Yürüyor…', true);
        floor.clearTints();
        c.readout('');
        const walk = randomWalk(grid, RANDOM_STEPS, Math.random);
        bidik.setMood('curious');
        c.say('Sağ mı, sol mu? Hiç fikrim yok, rastgele!', 3);
        try {
          await c.goHome(ctx);
          for (let i = 0; i < walk.steps.length; i++) {
            const cell = walk.steps[i];
            await c.stepTo(cell, 0.15, ctx);
            if (i % 2 === 0) sound.play('hop', { volume: 0.2 });
            if (!same(cell, grid.goal)) floor.setTint(cell, trailColor);
            c.setStats([
              ['Adım', String(i + 1)],
              ['Sonuç', '–'],
            ]);
          }
        } catch {
          return;
        }
        if (ctx.cancelled) return;
        c.walkCtx = null;
        c.state.busy = false;
        c.setAction('Bir daha yürüsün');
        if (walk.reached) {
          c.setStats([
            ['Adım', String(walk.count)],
            ['Sonuç', 'Ulaştı'],
          ]);
          c.readout(`<span class="big">${walk.count} adımda ulaştı!</span>Şans işte. En kısa yol 10 adım; bir daha dene, çoğu zaman olmuyor. Sonra <b>Aramayla bul</b> düğmesine bas.`);
          c.say('Buldum! Ama biraz dolandım galiba…', 4);
          c.celebrate();
        } else {
          c.setStats([
            ['Adım', String(walk.count)],
            ['Sonuç', 'Ulaşamadı'],
          ]);
          c.readout(`<span class="big"><span class="bad">${RANDOM_STEPS} adımda ulaşamadı</span></span>Açık renkli kareler Bıdık'ın dolaştığı yerler. Daha akıllı bir yol lazım: <b>Aramayla bul</b> düğmesine bas.`);
          c.say('Of, bacaklarım yoruldu ve tencere hâlâ uzakta!', 4);
          bidik.react('worried', 2.5);
          sound.play('grab', { volume: 0.5 });
        }
      },
      /** primary: the search sits on the main button (else on the second one, next to the random walk). */
      async searchRun(fast = false, primary = true) {
        if (c.state.busy) return;
        const ctx = { cancelled: false };
        c.walkCtx = ctx;
        c.state.busy = true;
        const label = (text, running = false) => {
          if (primary) c.setAction(text, running);
          else c.dom.action2.textContent = text;
        };
        label('Arıyor…', true);
        floor.clearTints();
        c.readout('');
        const r = bfs(grid);
        const last = r.rings.length - 1;
        bidik.setMood('thinking');
        try {
          await c.goHome(ctx);
          let seen = 0;
          for (let d = 0; d < r.rings.length; d++) {
            const col = ringColor(last ? d / last : 0);
            for (const cell of r.rings[d]) {
              seen++;
              if (!same(cell, grid.goal)) floor.setTint(cell, col);
            }
            c.setStats([
              ['Bakılan kare', String(seen)],
              ['Yol', '–'],
            ]);
            sound.play('pick', { volume: 0.18 });
            await tweens.wait(ctx, fast ? 0.12 : 0.26);
          }
          if (!r.path) {
            c.setStats([
              ['Bakılan kare', String(r.visited)],
              ['Yol', 'yok'],
            ]);
            c.readout(`<span class="big"><span class="bad">Yol yok!</span></span>${r.visited} kareye baktı, tencereye giden hiçbir yol kalmamış. Bir dolabı kaldırıp yeniden dene.`);
            c.say('Her yere baktım, tencereye yol yok. Dolapları biraz açsan?', 5);
            bidik.react('worried', 3);
            sound.play('grab', { volume: 0.5 });
            c.walkCtx = null;
            c.state.busy = false;
            label('Yolu ara');
            return;
          }
          const len = r.path.length - 1;
          for (const cell of r.path) {
            if (!same(cell, grid.goal)) floor.setTint(cell, pathColor);
            await tweens.wait(ctx, 0.05);
          }
          c.setStats([
            ['Bakılan kare', String(r.visited)],
            ['Yol', `${len} adım`],
          ]);
          c.readout(`<span class="big">${r.visited} kareye baktı, ${len} adımlık yolu buldu</span>Bu, adım sayısına göre en kısa yol. Bıdık şimdi yürüyor.`);
          c.say(`Buldum! ${len} adım. Daha kısası yok.`, 4);
          bidik.setMood('happy');
          for (let i = 1; i < r.path.length; i++) {
            await c.stepTo(r.path[i], 0.24, ctx);
            sound.play('hop', { volume: 0.2 });
          }
        } catch {
          return;
        }
        if (ctx.cancelled) return;
        c.walkCtx = null;
        c.state.busy = false;
        label(fast ? 'Yolu ara' : 'Bir daha ara');
        c.celebrate();
        c.say('Mantılar tencereye! Tek bir gereksiz adım bile atmadım.', 4);
      },
      pickWall(point) {
        if (c.state.busy) return;
        const cell = floor.worldToCell(point);
        if (!cell) return;
        if (same(cell, grid.start) || same(cell, grid.goal)) {
          c.toast(same(cell, grid.start) ? 'Burası Bıdık\'ın yeri, dolap koyamayız.' : 'Tencerenin üstüne dolap olmaz!');
          return;
        }
        const now = toggleWall(grid, cell);
        floor.refreshWalls();
        floor.clearTints();
        const walls = grid.walls.reduce((n, v) => n + v, 0);
        c.setStats([
          ['Bakılan kare', '–'],
          ['Yol', '–'],
        ]);
        c.readout(`<span class="big">Dolap ${now ? 'kondu' : 'kalktı'}</span>Zeminde ${walls} dolap var. Şimdi "Yolu ara" düğmesine bas.`);
        sound.play(now ? 'grab' : 'lift', { volume: 0.5 });
        bidik.react(now ? 'surprised' : 'happy', 1.5);
      },

      // ------------------------------------------------------------ rules
      showPlate(show) {
        plate.visible = show;
      },
      setupRules() {
        c.exIndex = 0;
        c.renderRules();
      },
      renderRules() {
        const ex = EXAMPLES[c.exIndex];
        c.ruleStep = 0;
        c.minutes = BASE_MINUTES;
        const exEl = c.$('#rule-ex');
        const list = c.$('#rules-list');
        if (!exEl || !list) return;
        exEl.innerHTML = `Sıradaki mantı: <b>${ex.name}</b> · temel süre ${BASE_MINUTES} dk`;
        list.innerHTML = RULES.map((r, i) => `<div class="rule" data-i="${i}"><span class="rule__n">${i + 1}</span><span class="rule__t">${r.text}</span><span class="rule__r"></span></div>`).join('');
        c.readout(`<span class="big">${BASE_MINUTES} dakika</span>Henüz hiçbir kural uygulanmadı.`);
        dumpling.scale.setScalar(ex.big ? 0.36 : 0.24);
        dumpling.material.color.set(ex.frozen ? '#dbe7f3' : '#fff5e8');
      },
      applyNextRule() {
        if (c.ruleStep >= RULES.length) {
          c.nextExample();
          return;
        }
        const ex = EXAMPLES[c.exIndex];
        const r = RULES[c.ruleStep];
        const hit = !!ex[r.key];
        const row = c.$(`.rule[data-i="${c.ruleStep}"]`);
        if (row) {
          row.classList.add(hit ? 'is-hit' : 'is-miss');
          row.querySelector('.rule__r').textContent = hit ? `+${r.add} dk` : 'tutmadı';
        }
        if (hit) c.minutes += r.add;
        c.ruleStep++;
        const done = c.ruleStep >= RULES.length;
        c.readout(
          `<span class="big">${c.minutes} dakika</span>${hit ? `Kural ${c.ruleStep} tuttu: +${r.add} dakika.` : `Kural ${c.ruleStep} tutmadı, atlandı.`}${done ? ` <b>Sonuç: ${c.minutes} dakika.</b> Defter ne derse o!` : ''}`
        );
        sound.play(hit ? 'yum' : 'click', { volume: 0.5 });
        bidik.react(hit ? 'happy' : 'thinking', 1.5);
        bidik.doHop(0.5);
        if (done) {
          c.say(`${c.minutes} dakika! Düşünmedim bile, kuralları uyguladım.`, 4);
          c.setAction('Başka mantı');
        }
      },
      nextExample() {
        c.exIndex = (c.exIndex + 1) % EXAMPLES.length;
        c.renderRules();
        c.setAction('Sıradaki kuralı uygula');
        sound.play('refill', { volume: 0.4 });
        c.say('Yeni mantı geldi. Kurallar aynı, sırayla bakalım.', 3);
      },

      // ------------------------------------------------------------ compare
      buildCompare() {
        const host = c.$('#compare-host');
        if (!host) return;
        host.innerHTML = '';
        let correct = 0;
        let answered = 0;
        SITUATIONS.forEach((it, qi) => {
          const item = document.createElement('div');
          item.className = 'game__item';
          item.innerHTML = `<p class="game__text">${qi + 1}. ${escapeHtml(it.text)}</p><div class="chips"></div><p class="game__why" hidden></p>`;
          const chips = item.querySelector('.chips');
          const why = item.querySelector('.game__why');
          METHODS.forEach((label, oi) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn';
            b.textContent = label;
            b.addEventListener('click', () => {
              if (item.classList.contains('is-done')) return;
              item.classList.add('is-done');
              answered++;
              const ok = oi === it.answer;
              if (ok) correct++;
              b.classList.add(ok ? 'is-right' : 'is-wrong');
              if (!ok) chips.children[it.answer].classList.add('is-right');
              why.hidden = false;
              why.textContent = it.why;
              sound.play(ok ? 'yum' : 'grab', { volume: 0.6 });
              if (ok) {
                bidik.react('joy', 1.5);
                bidik.doHop(0.6);
              } else bidik.react('worried', 1.5);
              c.score(correct, answered - correct, ['Doğru', 'Yanlış']);
              if (answered === SITUATIONS.length) {
                c.readout(`<span class="big">Altı durumdan ${correct} doğru</span>${correct === SITUATIONS.length ? 'Hepsini bildin! Bıdık gururlu.' : 'Yanlışların açıklamalarını bir daha oku; sonra teste geç.'}`);
                if (correct === SITUATIONS.length) c.celebrate();
              }
            });
            chips.appendChild(b);
          });
          host.appendChild(item);
        });
      },
    };
    return ext;
  },
  update(dt, c) {
    c.floor.update(dt);
    if (c.plate.visible) c.dumpling.rotation.y += dt * 0.6;
  },
  restart(c) {
    c.resetMaze();
    c.hideScore();
  },
});

// exported for the console / tests
export { grid };
