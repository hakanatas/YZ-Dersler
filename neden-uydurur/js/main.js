import { createLesson, PALETTE, THREE } from '../../js/shell.js';
import { NGram, START, END, pieces, tokenize } from './ngram.js';
import { WordScene, Book } from './words.js';
import { STEPS, QUIZ, CHECK, CHECK_LABELS } from './steps.js';

const FOCUS = {
  overview: { target: new THREE.Vector3(-0.4, 0.5, 0.3), dist: 10.5, az: 0.15, el: 1.0, bidik: [2.7, 1.7] },
  tokens: { target: new THREE.Vector3(0, 0.55, 0.3), dist: 7.4, az: 0.05, el: 1.05, bidik: [2.6, 1.3] },
  book: { target: new THREE.Vector3(-3.2, 0.35, 0.4), dist: 5.6, az: -0.15, el: 1.05, bidik: [-1.5, 1.7] },
  bidik: { target: new THREE.Vector3(2.6, 0.75, 1.6), dist: 5.4, az: 0.2, el: 1.2, bidik: [2.6, 1.6] },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = (p) => `%${Math.round(p * 100)}`;
const model = new NGram();
const quote = (words) => `“${esc(model.text(words))}${words.length && words[words.length - 1] !== END ? ' ___' : ''}”`;

createLesson({
  steps: STEPS,
  quiz: QUIZ,
  focus: FOCUS,
  finishLine: 'Artık biliyorsun: akıcı cümle, doğru cümle demek değil. Kaynağı sor!',
  setup(c) {
    const { scene, sound, bidik } = c;
    const words = new WordScene({ palette: PALETTE });
    words.position.set(0, 0, 0);
    scene.add(words);
    const book = new Book({ palette: PALETTE });
    book.position.set(-3.3, 0, 0.4);
    scene.add(book);

    const on = () => !c.state.uiHidden;
    c.addTag('sıradaki kelime?', () => words.barTop(), () => on() && words.bars.length > 0, 'tag--big');
    c.addTag('Bıdık\'ın kitabı', () => book.localToWorld(new THREE.Vector3(0, 0.9, 0)), on, 'tag--big');

    const ext = {
      model,
      words,
      book,
      prompt: ['mantı', 'en'],
      T: 1,
      startWord: 'Mantı',
      history: [],
      asked: [],
      playing: false,
      fmtT: (t) => t.toFixed(1).replace('.', ','),
      startTokens: () => tokenize(c.startWord),
      fillCounts() {
        document.querySelectorAll('[data-n="sentences"]').forEach((el) => (el.textContent = String(model.sentences.length)));
      },
      /** Replace the words so far and redraw the tiles (no bars yet). */
      setPrompt(p, animate = true) {
        c.prompt = p.slice();
        words.build({ prompt: c.prompt, candidates: [], animateLast: animate }, animate);
      },
      /**
       * Bars for the current prompt. T = null → raw counted probabilities;
       * otherwise temperature-scaled ones. Returns the model's answer.
       */
      showCandidates(highlight = null, T = null, quiet = false) {
        const r = model.next(c.prompt);
        const dist = T == null ? r.candidates.map((x) => ({ ...x, q: x.p })) : model.scaled(r.candidates, T);
        words.build({ prompt: c.prompt, candidates: dist.slice(0, 5).map((d) => [d.word, d.q]), highlight, animateLast: false }, true);
        if (!quiet) c.readout(c.candidateHtml(r, dist));
        return r;
      },
      candidateHtml(r, dist, T = null) {
        const ctxText = r.context.filter((w) => w !== START);
        let how;
        if (r.level === 'trigram' && r.context[0] === START) how = `Cümle başındaki <b>${esc(ctxText[0])}</b> kelimesine baktım: kitapta ${r.total} cümle böyle başlıyor.`;
        else if (r.level === 'trigram') how = `Son iki kelimeye baktım: <b>${esc(ctxText.join(' '))}</b>, kitapta ${r.total} kez yan yana geçiyor.`;
        else if (r.level === 'bigram' && ctxText.length) how = `Son iki kelime kitapta yan yana yok; sadece son kelimeye baktım: <b>${esc(ctxText[0])}</b>, kitapta ${r.total} kez geçiyor.`;
        else if (r.level === 'bigram') how = `Cümle başı: kitaptaki ${r.total} cümlenin ilk kelimelerini saydım.`;
        else how = `Bu kelimeyi kitapta hiç görmedim! Elimde bağlam yok; kitaptaki bütün kelimelerin sıklığına bakıyorum (${r.total} kelime).`;
        const list = dist
          .slice(0, 5)
          .map((d) => `<span><b>${esc(d.word)}</b> ${d.count} (${pct(d.q)})</span>`)
          .join('');
        const more = dist.length > 5 ? `<span>+${dist.length - 5} aday daha</span>` : '';
        return `<span class="big">${quote(c.prompt)}</span>${how}<span class="row">Sonra gelen: ${list}${more}</span>`;
      },
      /** Append the most likely word (chapter 1 & 2). */
      chooseTop(quiet = false) {
        if (c.prompt[c.prompt.length - 1] === END) {
          c.setPrompt(['mantı', 'en']);
          c.showCandidates(null, null, quiet);
          c.say('Baştan: mantı en…', 2.5);
          return;
        }
        const r = model.next(c.prompt);
        const word = r.candidates[0].word;
        c.prompt.push(word);
        sound.play('pick', { volume: 0.5 });
        const done = word === END;
        if (done) {
          const sentence = model.text(c.prompt);
          const inBook = model.has(sentence);
          words.build({ prompt: c.prompt, candidates: [], animateLast: true }, true);
          if (!quiet) c.readout(`<span class="big">${quote(c.prompt)}</span>Cümle bitti! ${inBook ? '<span class="ok">Bu cümle kitapta aynen var.</span>' : '<span class="warn">Bu cümle kitapta yok;</span> parçalardan dikildi.'} Bir daha basarsan baştan başlarız.`);
          bidik.react('joy', 1.5);
          bidik.doHop(0.7);
          c.say(inBook ? 'Kitaptaki cümleyi yeniden kurdum!' : 'Yeni bir cümle kurdum. Kitapta yok ama akıcı, değil mi?', 4);
        } else {
          c.showCandidates(null, null, quiet);
          c.say(`En uzun çubuk: ${word}. Onu seçtim!`, 2.5);
        }
      },
      /** Chapter 2: highlight the context in the book and list the counts. */
      explainCounts() {
        if (c.prompt[c.prompt.length - 1] === END) {
          const sentence = model.text(c.prompt);
          c.readout(`<span class="big">\u201c${esc(sentence)}\u201d</span>Nokta geldi, cümle bitti. ${model.has(sentence) ? '<span class="ok">Bu cümle kitapta aynen var.</span>' : '<span class="warn">Bu cümle kitapta yok;</span> parçalardan dikildi.'} Bir daha basarsan baştan başlarız.`);
          c.renderCorpus([]);
          return;
        }
        const r = model.next(c.prompt);
        const occ = r.context.length ? model.occurrences(r.context) : [];
        c.renderCorpus(occ);
        const dist = r.candidates.map((x) => ({ ...x, q: x.p }));
        words.build({ prompt: c.prompt, candidates: dist.slice(0, 5).map((d) => [d.word, d.q]), animateLast: false }, true);
        const ctxText = r.context.filter((w) => w !== START).join(' ');
        const counts = r.candidates.slice(0, 8).map((d) => `<span><b>${esc(d.word)}</b>: ${d.count}</span>`).join('') + (r.candidates.length > 8 ? `<span>+${r.candidates.length - 8} kelime daha</span>` : '');
        let head;
        if (r.level === 'trigram' && r.context[0] === START) head = `Kitapta ${r.total} cümle <mark>${esc(ctxText)}</mark> ile başlıyor (sarı yerler).`;
        else if (r.level === 'trigram') head = `Kitapta <mark>${esc(ctxText)}</mark> ${r.total} kez yan yana geçiyor (sarı yerler).`;
        else if (r.level === 'bigram' && ctxText) head = `<b>${esc(c.prompt.slice(-2).join(' '))}</b> kitapta hiç yan yana değil. O zaman sadece <mark>${esc(ctxText)}</mark>: ${r.total} kez geçiyor.`;
        else if (r.level === 'bigram') head = `Cümle başı: ${r.total} cümlenin ilk kelimesini sayıyorum.`;
        else head = `<b>${esc(c.prompt[c.prompt.length - 1])}</b> kitapta hiç yok. Elimde bağlam kalmadı: bütün kelimeleri sayıyorum (${r.total} kelime, ${r.candidates.length} farklı).`;
        c.readout(`<span class="big">${quote(c.prompt)}</span>${head}<span class="row">Sonra gelen kelime: ${counts}</span>${r.level === 'unigram' ? '<span class="row"><span>Masada ilk beşi var; en sık kelime kazanır.</span></span>' : ''}`);
      },
      /** Fill the .corpus box; occ = [{ sentence, start, len, next }] to highlight. */
      renderCorpus(occ = []) {
        const host = document.querySelector('#corpus');
        if (!host) return;
        const bySentence = new Map();
        for (const o of occ) {
          if (!bySentence.has(o.sentence)) bySentence.set(o.sentence, []);
          bySentence.get(o.sentence).push(o);
        }
        host.innerHTML = model.sentences
          .map((s, si) => {
            const ps = pieces(s);
            const hits = bySentence.get(si) || [];
            const cls = new Array(ps.length).fill('');
            for (const h of hits) {
              for (let k = 0; k < h.len; k++) cls[h.start + k] = 'ctx';
              if (h.start + h.len < ps.length) cls[h.start + h.len] = cls[h.start + h.len] || 'next';
            }
            const html = ps
              .map((p, i) => {
                const t = esc(p.text);
                const sp = i > 0 && p.text !== '.' ? ' ' : '';
                return sp + (cls[i] === 'ctx' ? `<mark>${t}</mark>` : cls[i] === 'next' ? `<b>${t}</b>` : t);
              })
              .join('');
            return `<div${hits.length ? ' class="is-hit"' : ''}>${html}</div>`;
          })
          .join('');
        const first = host.querySelector('mark');
        if (first) host.scrollTop = Math.max(0, first.offsetTop - host.offsetTop - 30);
        else host.scrollTop = 0;
      },
      /** Replay a generation trace on the table, one word at a time. */
      play(trace, T, done) {
        c.playing = true;
        c.state.busy = true;
        const dtStep = c.reducedMotion ? 0.25 : 0.55;
        trace.steps.forEach((s, i) => {
          c.later(i * dtStep, () => {
            words.build({ prompt: s.prompt, candidates: s.dist.slice(0, 5).map((d) => [d.word, d.q]), highlight: s.word, animateLast: i > 0 }, true);
            sound.play('pick', { volume: 0.3 });
          });
        });
        c.later(trace.steps.length * dtStep + 0.3, () => {
          c.prompt = trace.words.slice();
          words.build({ prompt: c.prompt, candidates: [], animateLast: true }, true);
          c.playing = false;
          c.state.busy = false;
          done?.();
        });
      },
      stopPlay() {
        c.playing = false;
        c.state.busy = false;
      },
      /** Chapter 3. */
      writeSentence() {
        if (c.playing) return;
        const T = c.T;
        const start = c.startTokens();
        const trace = model.generate(start, T, 14);
        const sentence = model.text(trace.words);
        c.setAction('Yazıyor…', true);
        bidik.setMood('thinking');
        c.play(trace, T, () => {
          c.setAction('Bir cümle yaz', false);
          const inBook = model.has(sentence);
          c.history.unshift({ text: sentence, T, inBook, ended: trace.ended });
          c.history = c.history.slice(0, 3);
          c.showHistory();
          const repeat = c.history.length > 1 && c.history[1].text === sentence;
          // React to what actually came out, not to the slider: a hot die can
          // still land on the likeliest words and rebuild a sentence from the book.
          let mood = 'happy';
          let line = sentence;
          if (repeat) {
            mood = 'sleepy';
            line = 'Yine aynı cümle. Sıcaklığı biraz artırsana!';
          } else if (!trace.ended) {
            mood = 'surprised';
            line = 'Ooo, cümleyi bitiremedim; 14 kelimede kestim!';
          } else if (!inBook) {
            mood = 'surprised';
            line = 'Ooo, bu cümle kitapta yok! Parçaları karıştırdım; anlamlı mı, sen karar ver.';
          } else if (T >= 1.2) {
            line = 'Sıcaklık yüksek ama bu cümle kitapta aynen var. Kitabımız küçük, çoğu yerde tek aday var. Bir daha dene!';
          }
          bidik.react(mood, 2);
          if (!repeat) bidik.doHop(0.5);
          c.say(line, 4);
        });
      },
      showHistory() {
        const rows = c.history
          .map((h, i) => `<span class="row"><span>${i === 0 ? '<b>Son:</b> ' : ''}“${esc(h.text)}” <small>(sıcaklık ${c.fmtT(h.T)}${h.ended ? '' : ', 14 kelimede kesildi'} · ${h.inBook ? '<span class="ok">kitapta var</span>' : '<span class="warn">kitapta yok</span>'})</small></span></span>`)
          .join('');
        c.readout(`<span class="big">Bıdık'ın cümleleri</span>${rows}`);
      },
      /** Chapter 4: the question whose answer is not in the book. */
      ask() {
        if (c.playing) return;
        const T = c.asked.length === 0 ? 0 : 0.8;
        const trace = model.generate(['mantı', 'ilk', 'kez'], T, 14);
        const sentence = model.text(trace.words);
        c.setAction('Cevaplıyor…', true);
        c.renderCorpus([]);
        c.play(trace, T, () => {
          c.setAction('Bir daha sor', false);
          c.asked.push({ text: sentence, T, inBook: model.has(sentence), ended: trace.ended });
          c.showAnswers();
          bidik.react('proud', 2);
          c.say(sentence, 4.5);
        });
      },
      showAnswers() {
        const rows = c.asked
          .slice(-4)
          .map((a, i, arr) => `<span class="row"><span>${arr.length - i}. “${esc(a.text)}” <small>(${a.T === 0 ? 'en olası kelimeler' : `sıcaklık ${c.fmtT(a.T)}`} · ${a.inBook ? '<span class="ok">kitapta var</span>' : '<span class="warn">kitapta yok</span>'})</small></span></span>`)
          .reverse()
          .join('');
        c.readout(`<span class="big">Bıdık'ın cevabı</span>${rows}<span class="row"><span>Kulağa doğru geliyor, değil mi? Ama "kitapta yok". Bıdık bunu okumadı, dikti.</span></span>`);
      },
      searchBook() {
        const occ = model.occurrences(['ilk', 'kez']);
        c.renderCorpus(occ);
        const lines = occ.map((o) => `“${esc(model.sentences[o.sentence])}”`).join(' · ');
        c.readout(`<span class="big">Kitapta "ilk kez" arıyorum…</span>"ilk kez" ${occ.length} cümlede geçiyor: ${lines}<span class="row"><span><span class="warn">Hiçbiri mantının ilk nerede yapıldığını söylemiyor.</span> Bıdık'ın cevabı bu parçalardan dikilmiş.</span></span>`);
        bidik.react('worried', 2);
        c.say('Hmm… kitapta böyle bir cümle yokmuş. Ben uydurmuşum!', 4);
        sound.play('grab', { volume: 0.5 });
      },
      /** Chapter 5: the verification game. */
      buildCheck() {
        const host = document.querySelector('#check');
        if (!host) return;
        host.innerHTML = '';
        let done = 0;
        let right = 0;
        CHECK.forEach((s, si) => {
          const item = document.createElement('div');
          item.className = 'quiz__item';
          item.innerHTML = `<p class="quiz__q">Bıdık: “${esc(s.text)}”</p><div class="chips"></div><p class="quiz__why" hidden></p>`;
          const chips = item.querySelector('.chips');
          const why = item.querySelector('.quiz__why');
          CHECK_LABELS.forEach((label, oi) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn';
            b.textContent = label;
            b.addEventListener('click', () => {
              if (item.classList.contains('is-done')) return;
              item.classList.add('is-done');
              const ok = oi === s.answer;
              b.classList.add(ok ? 'is-right' : 'is-wrong');
              why.hidden = false;
              why.textContent = ok ? s.why : s.nope;
              done++;
              if (ok) right++;
              c.score(right, done, ['Doğru', 'Cevaplanan']);
              sound.play(ok ? 'yum' : 'grab', { volume: 0.6 });
              if (ok) {
                bidik.react('joy', 1.5);
                bidik.doHop(0.6);
              } else bidik.react('worried', 1.5);
              // show the evidence in the book
              const key = si === 0 ? tokenize(s.text).slice(0, 2) : si === 1 ? ['usta', 'sarımsağı'] : ['ilk', 'kez'];
              c.renderCorpus(model.occurrences(key));
              if (done === CHECK.length) {
                c.readout(`<span class="big">${right} / ${CHECK.length} doğru</span>${right === CHECK.length ? 'Süper! Kitaba bakmadan inanmadın.' : 'Kural basit: önemliyse kaynağa bak, akıcılığa kanma.'}`);
                if (right === CHECK.length) c.celebrate();
              }
            });
            chips.appendChild(b);
          });
          host.appendChild(item);
        });
      },
      /** Chapter 6. */
      askSource() {
        bidik.react('thinking', 2);
        c.say('Kaynağım mı? Kitabımda böyle bir cümle yok. Emin değilim; birlikte güvenilir bir kaynağa bakalım mı?', 5);
        c.readout(`<span class="big">İyi soru: "Kaynağın ne?"</span>Bir sohbet robotuna bunu sormak her zaman serbest. Kontrol listesi:<span class="row"><span>1. Önemli mi? Önemliyse kontrol et.</span></span><span class="row"><span>2. Kaynak iste; kaynağı da aç ve oku.</span></span><span class="row"><span>3. İkinci bir yere bak: kitap, öğretmen, güvenilir site.</span></span><span class="row"><span>4. Sayılar, tarihler, isimler: en çok burada uydurur.</span></span>`);
        sound.play('click', { volume: 0.5 });
      },
    };
    return ext;
  },
  update(dt, c) {
    c.words.update(dt);
  },
  restart(c) {
    c.stopPlay();
    c.history = [];
    c.asked = [];
    c.T = 1;
    c.startWord = 'Mantı';
    c.hideScore();
  },
});
