import { createLesson, PALETTE, THREE } from '../../js/shell.js';
import { TinyNet, makeDataset } from '../../js/mlp.js';
import { Board } from '../../js/board.js';
import { Network3D } from '../../js/network.js';
import { TokenDemo } from '../../js/tokens.js';
import { STEPS, QUIZ, MATCH, CAN } from './steps.js';

const FOCUS = {
  overview: { target: new THREE.Vector3(1.4, 0.5, 0.0), dist: 11.5, az: 0.22, el: 0.98, bidik: [2.1, 2.0] },
  board: { target: new THREE.Vector3(-0.95, 0.2, 0.25), dist: 6.9, az: 0.12, el: 1.0, bidik: [1.55, 2.0] },
  network: { target: new THREE.Vector3(3.3, 1.15, 0), dist: 6.9, az: 0.18, el: 1.2, bidik: [4.7, -0.25] },
  tokens: { target: new THREE.Vector3(1.4, 0.6, 2.6), dist: 7.6, az: 0.05, el: 1.05, bidik: [-0.9, 3.4] },
  bidik: { target: new THREE.Vector3(2.4, 0.75, 1.9), dist: 5.4, az: 0.2, el: 1.2, bidik: [2.4, 1.9] },
};

const RECALL = [
  ['board', 'Ders 01: Kural değil örnek. Tahmin ettim, yanıldım, iplerimi düzelttim. Yüzlerce kez!'],
  ['board', 'Ders 02: Altı mantıyla ezberledim, altmış dörtle öğrendim. Sınav masası yalan söylemez.'],
  ['board', 'Ders 03: Deniz Usta masada yoktu, onun mantılarını bilemedim. Veride kim yoksa onu öğrenemem.'],
  ['tokens', 'Ders 04: Kitabımdaki kelimeleri saydım. Bilmediğimde bile akıcı konuşurum; kaynağa bak!'],
  ['network', 'Ders 05: Resim dediğin altmış dört sayı. Pikselleri yardımcılarıma akıttım, mantıyı tanıdım.'],
  ['network', 'Ders 06: Kimse etiket vermedi, alkış verdi. Alkışı sayarak öğrendim; hıza alkışlayınca çiğ mantı verdim!'],
];

const RULES = [
  'Bir: kaynağını iste. Akıcı konuşmam doğru konuştuğum anlamına gelmez.',
  'İki: verisini sor. Ben gördüğüm örnekler kadar bilirim; kim eksikse onu bilemem.',
  'Üç: sınavını yap. Antrenman puanıma kanma, hiç görmediğim mantıyla dene.',
  'Dört: ödülümü düşün. Neye alkışlarsan onu öğrenirim, ne demek istediğini değil.',
];

createLesson({
  steps: STEPS,
  quiz: QUIZ,
  focus: FOCUS,
  finishNext: 'Kartıma geç →',
  finishText(correct, n) {
    window.__finalScore = { correct, n };
    return correct === n
      ? `${n} soruda ${n} doğru! Seriyi tamamladın; tamamlama kartın bir sonraki bölümde.`
      : `${n} soruda ${correct} doğru. Seriyi tamamladın! Tamamlama kartın bir sonraki bölümde; istersen yanlışlarına bir daha bakabilirsin.`;
  },
  setup(c) {
    const { scene, mouths, softDot, sound, bidik } = c;
    const net = new TinyNet(8, 3);
    const data = makeDataset(64, 11);
    for (let i = 0; i < 600; i++) net.trainStep(data, 1.2);
    const board = new Board({ size: 3.0, tiles: 26, palette: PALETTE, mouths });
    board.position.set(-0.35, 0, 0.25);
    board.setDishes(data);
    board.revealAll();
    board.paint((s, t) => net.predict([s, t]));
    board.tintTarget = 1;
    scene.add(board);
    const network = new Network3D({ net, palette: PALETTE, softDot, mouths });
    scene.add(network);
    network.setWeightsVisible(true);
    const tokens = new TokenDemo({ palette: PALETTE });
    tokens.position.set(1.4, 0, 2.7);
    tokens.scale.setScalar(0.7);
    tokens.visible = true;
    scene.add(tokens);

    const on = () => !c.state.uiHidden;
    c.addTag('Ders 01–03 · mantılar', () => board.localToWorld(new THREE.Vector3(0, 0.05, -board.size / 2 - 0.35)), on, 'tag--big');
    c.addTag('Ders 01, 05 · yardımcılar', () => new THREE.Vector3(network.columns[1], 2.28, 0), on, 'tag--big');
    c.addTag('Ders 04 · kelimeler', () => tokens.localToWorld(new THREE.Vector3(0, 2.3, -0.4)), on, 'tag--big');

    let pulseTimer = 0;
    return {
      net,
      data,
      board,
      network,
      tokens,
      recallIndex: 0,
      ruleIndex: 0,
      pulseTimer,
      recall() {
        const [where, line] = RECALL[c.recallIndex % RECALL.length];
        c.recallIndex++;
        c.focus(where);
        c.say(line, 6);
        bidik.react(c.recallIndex % 2 ? 'happy' : 'proud', 2);
        bidik.doHop(0.6);
        sound.play('pick', { volume: 0.6 });
        if (where === 'board') c.showForward();
        if (where === 'tokens') tokens.next();
        c.setAction(c.recallIndex >= RECALL.length ? 'Bir daha hatırla' : `Sıradaki ders (${(c.recallIndex % RECALL.length) + 1})`);
      },
      showForward() {
        const ex = data[Math.floor(Math.random() * data.length)];
        const { h, p } = net.forward(ex.x);
        network.clearGlow();
        network.setGlow('input', 0, ex.x[0]);
        network.setGlow('input', 1, ex.x[1]);
        board.setProbe(ex.x[0], ex.x[1], ex.y);
        network.emitPulses(1, ex.x);
        c.later(0.7, () => {
          h.forEach((v, i) => network.setGlow('hidden', i, Math.abs(v)));
          network.emitPulses(2, h);
        });
        c.later(1.4, () => network.setGlow('output', 0, p));
        c.later(4, () => {
          network.clearGlow();
          board.probe.visible = false;
        });
      },
      sayRule() {
        const i = c.ruleIndex % RULES.length;
        c.say(RULES[i], 6);
        c.$('#rules')?.querySelectorAll('li').forEach((li, k) => li.classList.toggle('is-said', k <= i));
        bidik.react(['thinking', 'curious', 'proud', 'surprised'][i], 2);
        bidik.doHop(0.5);
        sound.play('pick', { volume: 0.6 });
        c.ruleIndex++;
        c.setAction(c.ruleIndex >= RULES.length ? 'Baştan söyle' : `Sıradaki kural (${c.ruleIndex + 1})`);
      },
      buildMatch() {
        const host = c.$('#match-host');
        if (!host) return;
        buildGame(host, MATCH.map((m) => ({ text: m.text, options: [1, 2, 3, 4, 5, 6].map((n) => `Ders ${n}`), answer: m.lesson - 1, why: m.why })), 'Altı örnekten');
      },
      buildCan() {
        const host = c.$('#can-host');
        if (!host) return;
        buildGame(host, CAN.map((m) => ({ text: m.text, options: ['Yapabilir', 'Yapamaz', 'Duruma göre'], answer: m.answer, why: m.why })), 'Altı sorudan');
      },
      makeCard() {
        const name = (c.$('#in-name')?.value || '').trim();
        if (!name) {
          c.readout('<span class="big">Önce adını yaz</span>Kartın üstünde adın olsun istemez misin?');
          c.$('#in-name')?.focus();
          return;
        }
        const score = window.__finalScore;
        const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        const line = score ? `Final testi: ${score.n} soruda ${score.correct} doğru` : 'Final testi henüz yapılmadı';
        c.readout(
          `<span class="card-out"><span class="big">YZ Dersler · Tamamlama Kartı</span><span class="name">${escapeHtml(name)}</span>Bıdık'la yedi dersi tamamladı: yapay zeka tahmin ederek öğrenir, veri kadar bilir, kaynağı sorulur, ödülü tasarlanır.<br />${line} · ${date}<br /><a class="btn btn--accent" href="../" style="margin-top: 12px">Tüm derslere dön</a> <a class="btn" href="../arama-ve-kurallar/" style="margin-top: 12px">Ek ders: Her yapay zeka öğrenir mi?</a></span>`
        );
        c.celebrate();
        c.say(`Tebrikler ${escapeHtml(name)}! Artık sen de biliyorsun.`, 6);
      },
    };

    function buildGame(host, items, label) {
      host.innerHTML = '';
      let correct = 0;
      let answered = 0;
      items.forEach((it, qi) => {
        const item = document.createElement('div');
        item.className = 'game__item';
        item.innerHTML = `<p class="game__text">${qi + 1}. ${it.text}</p><div class="chips"></div><p class="game__why" hidden></p>`;
        const chips = item.querySelector('.chips');
        const why = item.querySelector('.game__why');
        it.options.forEach((label2, oi) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn';
          b.textContent = label2;
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
            if (answered === items.length) {
              c.readout(`<span class="big">${label} ${correct} doğru</span>${correct === items.length ? 'Hepsini bildin! Bıdık gururlu.' : 'Yanlışların açıklamalarını bir daha oku; sonra devam.'}`);
              if (correct === items.length) c.celebrate();
            }
          });
          chips.appendChild(b);
        });
        host.appendChild(item);
      });
    }
  },
  update(dt, c) {
    c.board.update(dt);
    c.network.update(dt);
    c.tokens.update(dt);
    c.pulseTimer -= dt;
    if (c.state.step === 0 && !c.reducedMotion && c.pulseTimer <= 0) {
      c.pulseTimer = 6;
    }
  },
  restart(c) {
    c.hideScore();
    window.__finalScore = null;
  },
});

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
