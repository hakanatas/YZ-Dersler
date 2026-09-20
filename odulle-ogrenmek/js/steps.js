/**
 * Lesson 06 · Bıdık ödülle öğreniyor. No labels this time: the customer
 * claps or stays silent, and Bıdık has to work out the cooking time from
 * that alone. Reinforcement learning for middle school: one idea per
 * chapter, one thing to do, a teacher note with the real terms.
 */
const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;
const fmtEps = (e) => e.toFixed(2).replace('.', ',');

function renderRuns4(c) {
  if (!c.runs4.length) return;
  const best = Math.max(...c.runs4.map((r) => r.claps));
  const rows = c.runs4
    .map((r) => `<span>ε = ${fmtEps(r.eps)} → <b>${r.claps} alkış</b> · en sevdiği ${r.best ? r.best + ' dk' : '–'}${r.tried6 ? '' : ' · <span class="warn">6 dk\'yı hiç denemedi</span>'}${r.claps === best && c.runs4.length > 1 ? ' ★' : ''}</span>`)
    .join('');
  c.readout(`<span class="big">Koşular (300 mantı)</span><span class="row">${rows}</span>`);
}

function renderRuns5(c) {
  const r = c.runs5;
  const parts = [];
  if (r.boy != null) parts.push(`<span>İki defter → <b>${r.boy} alkış</b></span>`);
  if (r.boyTek != null) parts.push(`<span>Tek defter → <b>${r.boyTek} alkış</b></span>`);
  if (!parts.length) return;
  const tail = r.boy != null && r.boyTek != null ? (r.boy > r.boyTek ? 'İki defter kazandı: boya bakmak işe yarıyor.' : 'Bu sefer fark çıkmadı; bir daha dene.') : 'Şimdi öbür düğmeyi de dene ve karşılaştır.';
  c.readout(`<span class="big">300 mantıda alkış</span><span class="row">${parts.join('')}</span>${tail}`);
}

export const STEPS = [
  {
    id: 'alkis',
    label: 'Alkış',
    title: 'Etiket yok, alkış var',
    body: `
      <p>Önceki derslerde mantıların üstünde etiket vardı: "kıvamında", "olmamış". Bu sefer kimse etiket yapıştırmıyor. Bıdık bir süre seçiyor, mantıyı pişiriyor, müşteriye veriyor. Müşteri ya <b>alkışlıyor</b> ya da <b>sessiz kalıyor</b>. Hepsi bu.</p>
      <p>Alkış "aferin" demek, sessizlik "olmadı" demek. Ama müşteri neden alkışlamadığını söylemiyor: çiğ mi kaldı, fazla mı pişti? Bıdık bunu kendi çözmek zorunda. Düğmeye bas: Bıdık rastgele bir süre seçip bir mantı pişirsin. Ocaktaki düğmeye ve tencereye bak.</p>
      ${teacher('<p>Bu <b>pekiştirmeli öğrenme</b>dir (reinforcement learning). Öğrenen <b>ajan</b> (Bıdık) bir <b>eylem</b> seçer (pişirme süresi: 1–10 dakika) ve ortamdan bir <b>ödül</b> alır (alkış = 1, sessizlik = 0). Denetimli öğrenmeden farkı: doğru cevap hiç söylenmez, yalnızca eylemin sonucu puanlanır. Mutfağın gizli kuralı önceki derslerle aynı: ideal süre 3 + 6·boy dakika, ±1,5 dakika tolerans. Mantılar elde yapıldığı için boy her seferinde biraz değişir (orta boy: 0,5 ± 0,2); bu yüzden aynı süre bazen alkış alır, bazen almaz. Bu bölümde Bıdık süreyi tamamen rastgele seçer (ε = 1).</p>')}`,
    focus: 'stove',
    say: 'Etiket yok mu? Peki ben neye bakacağım? Müşteriye mi?',
    mood: 'curious',
    action: 'Bıdık bir mantı pişirsin',
    enter(c) {
      c.bars.visible = false;
      c.setMode('orta', 1, 1);
      c.afterCook = (t) => c.say(t.r ? 'Alkış! Ama neden, bilmiyorum. Süreyi not edeyim.' : 'Sessizlik… Çiğ mi kaldı, lapa mı oldu? Kimse söylemiyor.', 4);
    },
    act(c) {
      const a = c.kitchen.bandit.choose(0);
      c.say(`Rastgele seçiyorum: ${a + 1} dakika!`, 2);
      c.cookOne(a + 1, 'rastgele');
    },
    exit(c) {
      c.stopAll();
      c.afterCook = null;
    },
  },
  {
    id: 'sen',
    label: 'Sen dene',
    title: 'Sen dene: kaç dakika?',
    body: `
      <p>Şimdi sıra sende. Orta boy bir mantı var. Bir süre seç, müşteriyi izle. Sonra başka süreler de dene: 3 dakikada ne oluyor, 9 dakikada ne oluyor?</p>
      <p>Arkadaki <b>çubuklar</b> Bıdık'ın not defteri. Her süre için "kaç denemede alkış geldi?" oranını tutuyor. Çubuk ne kadar uzunsa o süre o kadar çok alkış almış. Aynı süreyi birkaç kez dene; çünkü her mantı birazcık farklı ve tek deneme yanıltabilir.</p>
      ${teacher('<p>Her çubuk bir eylemin <b>değer tahmini</b>dir: o süreyle yapılan denemelerdeki ortalama ödül, Q(a) = alkış sayısı / deneme sayısı. Kod bunu her denemede artımlı olarak günceller: Q[a] += (r − Q[a]) / n[a]. Orta boy mantının boyu 0,3–0,7 arasında değiştiği için alkış olasılıkları süreye göre şöyledir: 4 dk %29, 5 dk %71, <b>6 dk %100</b>, 7 dk %71, 8 dk %29; 1–3 dakika ile 9–10 dakika hiç alkış almaz. Deneme sayısı arttıkça çubuklar bu olasılıklara yaklaşır.</p>')}`,
    focus: 'overview',
    say: 'Sen seç, ben pişireyim. Defterime de yazarım!',
    mood: 'happy',
    action: 'Seçili süreyle pişir',
    secondary: 'Defteri sil',
    controls: `<div class="chips" id="chips"></div>`,
    enter(c) {
      c.bars.visible = true;
      c.selected = 6;
      c.setMode('orta', 0.1, 2);
      c.bindChips();
      c.score(0, 0, ['Alkış', 'Deneme']);
      c.afterCook = () => c.score(c.kitchen.bandit.claps, c.kitchen.count, ['Alkış', 'Deneme']);
    },
    act(c) {
      c.cookOne(c.selected);
    },
    act2(c) {
      c.resetLearner();
      c.score(0, 0, ['Alkış', 'Deneme']);
    },
    exit(c) {
      c.stopAll();
      c.afterCook = null;
      c.hideScore();
    },
  },
  {
    id: 'kendi',
    label: 'Kendi',
    title: 'Bıdık kendi deniyor',
    body: `
      <p>Şimdi Bıdık'ı yalnız bırakalım: 300 mantı pişirecek. Her seferinde defterine bakıp "en çok alkış alan süre hangisi?" diye seçecek. Ama arada bir (her 10 denemede yaklaşık 1) defteri kapatıp <b>rastgele</b> bir süre deneyecek. Belki daha iyisi vardır, kim bilir?</p>
      <p>Düğmeye bas ve çubukları izle. Başta hepsi kısa; sonra 5, 6 ve 7 dakika yükseliyor ve 6 en tepeye çıkıyor. Kimse ona "orta boy mantı 6 dakika pişer" demedi. Alkışları saya saya kendi buldu.</p>
      ${teacher('<p><b>ε-açgözlü</b> (epsilon-greedy) strateji: ε = 0,1 olasılıkla rastgele bir eylem (<b>keşif</b>), aksi halde en yüksek Q değerli eylem (<b>kullanım</b>); eşitlikte rastgele seçilir. 1000 farklı rastgele tohumla yapılan 300 denemelik koşuların %97\'sinde en yüksek çubuk 6 dakikaya oturur; ortalama alkış 300 denemede 257\'dir. Bu bölümdeki koşu sabit bir tohumla üretilir, dolayısıyla boş defterden başlayan bir koşu her seferinde aynı sonucu verir: 259 alkış. Grafik, her 10 denemedeki alkış oranıdır.</p>')}`,
    focus: 'overview',
    say: 'Defterime bakarım, ama arada bir de rastgele denerim!',
    mood: 'thinking',
    action: '300 mantı pişirsin!',
    secondary: 'Her şeyi unut',
    stats: true,
    enter(c) {
      c.bars.visible = true;
      c.setMode('orta', 0.1, 3);
      c.afterRun = () => {
        const k = c.kitchen;
        const b = k.bestMinutes(0);
        c.readout(`<span class="big">${k.count} denemede ${k.bandit.claps} alkış</span>En çok alkış alan süre: <b>${b ? b + ' dk' : '–'}</b>. Kimse söylemedi, Bıdık kendi buldu.`);
        c.say(b === 6 ? 'Buldum! Orta boy mantı 6 dakika. Kimse söylemedi, alkıştan çıkardım!' : `Şimdilik ${b} dakikada karar kıldım. Biraz daha denesem mi?`, 5);
        c.bidik.react('proud', 3);
        c.bidik.doHop(1);
      };
    },
    act(c) {
      c.toggleRun(300, '300 mantı pişirsin!');
    },
    act2(c) {
      c.resetLearner();
    },
    exit(c) {
      c.stopAll();
      c.afterRun = null;
    },
  },
  {
    id: 'kesif',
    label: 'Keşif',
    title: 'Keşfet mi, kullan mı?',
    body: `
      <p>O "arada bir rastgele dene" payına <b>ε</b> (epsilon) diyoruz. Kaydırıcıyla ayarla, 300 mantı pişirt ve alkışları karşılaştır:</p>
      <ul>
        <li><b>ε = 0:</b> Bıdık hiç keşfetmez. İlk alkış aldığı süreye yapışır; 6 dakikayı belki de hiç denemez.</li>
        <li><b>ε = 0,1 civarı:</b> Arada bir dener, en iyiyi bulur, sonra hep onu kullanır.</li>
        <li><b>ε = 0,5:</b> Denemelerin yarısı rastgele. En iyiyi bilse bile zamanının yarısını boşa harcar.</li>
      </ul>
      <p>Her koşu boş defterle başlar; alkış sayıları aşağıda listelenir. Hangi ε en çok alkışı topluyor?</p>
      ${teacher('<p><b>Keşif–kullanım ikilemi</b> (exploration–exploitation). Bu bölümde her koşu aynı rastgele tohumla başlar; böylece yalnızca ε\'nin etkisi görülür. ε = 0 ile Bıdık ilk alkış aldığı 5 dakikada takılır: 300 denemede 209 alkış, 6 dakikayı hiç denemez (defterde 5 dk %71, ötekiler 0; sıfırı geçen tek çubuk hep kazanır). ε = 0,05 → 283; ε = 0,1 → 276; ε = 0,2 → 259; ε = 0,3 → 227; ε = 0,5 → 197 alkış. 1000 tohum üzerinden ortalamalar aynı sırayı verir: ε = 0 → 221 (koşuların yalnızca %34\'ünde 6 dakikayı bulur), ε = 0,1 → 257, ε = 0,5 → 190. Gerçek sistemlerde ε çoğunlukla zamanla küçültülür: önce çok keşif, sonra çok kullanım.</p>')}`,
    focus: 'bars',
    say: 'Hiç keşfetmezsem ne olur? Hep keşfedersem ne olur?',
    mood: 'curious',
    action: '300 mantı pişirsin',
    secondary: 'Listeyi temizle',
    stats: true,
    controls: `<div class="sliders"><label>ε (keşif) <input type="range" id="sl-eps" min="0" max="0.5" step="0.05" value="0" /><output id="out-eps">0,00</output></label></div>`,
    enter(c) {
      c.bars.visible = true;
      c.runs4 = [];
      c.setMode('orta', 0, 15);
      const sl = c.$('#sl-eps');
      const out = c.$('#out-eps');
      sl.addEventListener('input', () => {
        const e = Number(sl.value);
        out.textContent = fmtEps(e);
        c.kitchen.epsilon = e;
      });
      c.afterRun = () => {
        const k = c.kitchen;
        c.runs4.push({ eps: k.epsilon, claps: k.bandit.claps, best: k.bestMinutes(0), tried6: k.bandit.N[0][5] > 0 });
        renderRuns4(c);
        const last = c.runs4[c.runs4.length - 1];
        c.say(
          last.eps === 0
            ? `Hiç keşfetmedim, ${last.best} dakikada takılıp kaldım. 6'yı denemedim bile!`
            : last.eps >= 0.4
              ? 'Çok keşfettim! En iyiyi biliyorum ama yarı zamanım rastgele gitti.'
              : `${last.claps} alkış! Arada keşfetmek işe yarıyor.`,
          5
        );
        c.bidik.react(last.claps >= 240 ? 'proud' : 'thinking', 3);
      };
    },
    act(c) {
      if (c.running) c.stopRun(false);
      else c.freshRun(300, '300 mantı pişirsin');
    },
    act2(c) {
      c.runs4 = [];
      c.resetLearner();
    },
    exit(c) {
      c.stopAll();
      c.afterRun = null;
    },
  },
  {
    id: 'boy',
    label: 'Boy',
    title: 'Boy değişince: her boya bir defter',
    body: `
      <p>Şimdi siparişler sırayla bir küçük, bir büyük mantı geliyor. Küçük mantı kısa, büyük mantı uzun pişer. Tek defterle bu iş olmaz: 4 dakika küçüğe iyi, büyüğe çiğ; 8 dakika büyüğe iyi, küçüğe lapa.</p>
      <p>Çözüm basit: <b>iki defter</b>. Bıdık önce mantıya bakıyor: küçükse küçük defterine, büyükse büyük defterine yazıyor. Önce iki defterle, sonra tek defterle 300 mantı pişirt ve alkışları karşılaştır.</p>
      ${teacher('<p>Mantının boyu burada <b>durum</b> (state) ya da <b>bağlam</b>dır (context); her durum için ayrı bir değer tablosu tutulur (bağlamsal bandit). Boylar: küçük 0,2 ± 0,2 → ideal 4,2 dk; büyük 0,8 ± 0,2 → ideal 7,8 dk. Alkış olasılıkları: küçükte 3 dk %62, <b>4 dk %100</b>, 5 dk %79, 6 dk %38; büyükte 6 dk %38, 7 dk %79, <b>8 dk %100</b>, 9 dk %62, 10 dk %21. İki defterle (ε = 0,1, 300 deneme, 1000 tohum) ortalama 244 alkış toplanır ve koşuların %72\'sinde tam olarak 4 / 8 dakika bulunur. Tek defterle hiçbir süre %50\'den fazla alkış alamaz; ortalama 128. Bu bölümdeki sabit tohumlu koşular 254 ve 120 alkış verir. Duruma göre eylem seçmeyi öğrenmek, oyun oynayan yapay zekaların (satranç, Go, Atari oyunları) temelidir: ekrandaki görüntü durum, hamle eylem, skor ödüldür.</p>')}`,
    focus: 'overview',
    say: 'Küçük mü, büyük mü? Önce bakayım, sonra doğru deftere yazayım.',
    mood: 'thinking',
    action: 'İki defterle 300 mantı',
    secondary: 'Tek defterle 300 mantı',
    stats: true,
    enter(c) {
      c.bars.visible = true;
      c.runs5 = {};
      c.setMode('boy', 0.1, 8);
      c.afterRun = () => {
        const k = c.kitchen;
        c.runs5[k.mode] = k.bandit.claps;
        renderRuns5(c);
        if (k.mode === 'boy') {
          c.say(`Küçüğe ${k.bestMinutes(0)} dakika, büyüğe ${k.bestMinutes(1)} dakika. İki defter, iki cevap!`, 5);
          c.bidik.react('proud', 3);
        } else {
          c.say('Tek defterle kafam karıştı: bir küçük, bir büyük… Hangisine göre yazayım?', 5);
          c.bidik.react('worried', 3);
        }
      };
    },
    act(c) {
      if (c.running) return c.stopRun(false);
      c.setMode('boy', 0.1, 8);
      c.startRun(300, 'İki defterle 300 mantı');
    },
    act2(c) {
      c.setMode('boyTek', 0.1, 8);
      c.startRun(300, 'İki defterle 300 mantı');
    },
    exit(c) {
      c.stopAll();
      c.afterRun = null;
    },
  },
  {
    id: 'hile',
    label: 'Yanlış alkış',
    title: 'Yanlış alkış: müşteri hıza alkışlarsa',
    body: `
      <p>Bu sefer müşteri değişti. Yeni müşteri tada değil <b>hıza</b> alkışlıyor: mantı 3 dakikada ya da daha kısa sürede gelirse alkış, yoksa sessizlik. Bıdık'ın kuralı aynı: alkışı say, en çok alkış alan süreyi seç.</p>
      <p>Ne olacağını tahmin et, sonra düğmeye bas. Bıdık 1–3 dakikayı öğreniyor ve <b>çiğ mantı</b> servis ediyor; müşteri de alkışlıyor! Bıdık yaramazlık yapmıyor: tam olarak ne için alkışlandıysa onu öğrendi. Yapay zeka "ne demek istediğimizi" değil, "neyi ödüllendirdiğimizi" öğrenir. Ödülü doğru tasarlamak işin en zor kısmı.</p>
      ${teacher('<p><b>Ödül hilesi</b> (reward hacking) ya da <b>spesifikasyon oyunu</b> (specification gaming): ajan, tasarımcının niyetini değil, yazılı ödül fonksiyonunu en üst düzeye çıkarır. Burada ödül = (süre ≤ 3 dk); 1, 2 ve 3 dakika her zaman alkış alır, orta boy mantı (ideal 6 dk) bu sürelerde hep çiğ kalır. Sabit tohumlu koşu: 200 denemede 187 alkış, gerçekten kıvamında yalnızca 7 mantı (hepsi keşif sırasında rastgele denenen 4–7 dakikalar). Gerçek bir örnek: 2016\'da OpenAI, CoastRunners adlı tekne yarışı oyununda oyun puanını ödül olarak kullanan bir ajanın yarışı bitirmek yerine küçük bir koyda daireler çizip yeniden beliren hedefleri toplayarak insan oyunculardan daha yüksek puan aldığını bildirdi. Bu yüzden ödül tasarımı ve insan geri bildirimi, yapay zeka güvenliğinin ana konularındandır.</p>')}`,
    focus: 'stove',
    say: 'Yeni müşteri hıza mı alkışlıyor? O zaman hızlı olurum!',
    mood: 'curious',
    action: 'Hız müşterisiyle 200 mantı',
    secondary: 'Her şeyi unut',
    stats: true,
    enter(c) {
      c.bars.visible = true;
      c.showTasty = true;
      c.setMode('hiz', 0.1, 1);
      c.afterRun = () => {
        const k = c.kitchen;
        c.readout(`<span class="big">${k.count} denemede ${k.bandit.claps} alkış</span>Ama gerçekten kıvamında olan mantı: <span class="bad">${k.tasty}</span>. Bıdık ${k.bestMinutes(0)} dakikayı seçti; mantılar çiğ, müşteri mutlu.`);
        c.say('Bir sürü alkış aldım! Ama… bu mantılar çiğ değil mi? Alkışlanan buysa, ben de bunu öğrendim.', 6);
        c.bidik.react('surprised', 3);
      };
    },
    act(c) {
      if (c.running) c.stopRun(false);
      else c.freshRun(200, 'Hız müşterisiyle 200 mantı');
    },
    act2(c) {
      c.resetLearner();
    },
    exit(c) {
      c.stopAll();
      c.showTasty = false;
      c.afterRun = null;
    },
  },
  {
    id: 'ozet',
    label: 'Bilgi testi',
    title: 'Bilgi testi: alkışla öğrenmek',
    body: `
      <p>Bıdık etiketsiz öğrendi. Şimdi altı kısa soru; her soruda tek bir doğru cevap var:</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Özet: (1) Pekiştirmeli öğrenmede etiket yoktur; ajan eylem seçer, ödül alır. (2) Her eylemin değeri, aldığı ödüllerin ortalamasıyla tahmin edilir. (3) Keşif ile kullanım dengelenmelidir: ε = 0 takılır, ε çok büyük olursa israf eder. (4) Duruma (bağlama) göre ayrı değerler tutmak, farklı durumlarda farklı doğru eylemleri öğretir. (5) Ajan yazılı ödülü öğrenir, niyeti değil; ödül tasarımı kritiktir.</p>')}`,
    focus: 'overview',
    say: 'Alkışla öğrendim! Peki sen neler öğrendin?',
    mood: 'proud',
    quiz: true,
    enter(c) {
      c.bars.visible = true;
      c.setMode('orta', 0.1, 3);
      for (let i = 0; i < 300; i++) c.kitchen.step();
      c.syncBars(true);
      c.stove.setDumpling(c.kitchen.last.size, c.kitchen.last.done, true);
      c.stove.setMinutes(c.kitchen.last.minutes, true);
    },
  },
];

export const QUIZ = [
  {
    q: 'Bu derste Bıdık\'a öğrenmesi için ne verildi?',
    options: ['Etiketli mantılar', 'Sadece alkış ya da sessizlik', 'Bir yemek tarifi'],
    answer: 1,
    why: 'Doğru! Kimse etiket yapıştırmadı; tek ipucu müşterinin alkışıydı.',
    nope: 'Hayır. Bu sefer etiket de tarif de yoktu; Bıdık yalnızca alkıştan ve sessizlikten öğrendi.',
  },
  {
    q: 'Arkadaki çubuklar (Bıdık\'ın defteri) neyi gösteriyor?',
    options: ['Mantıların boyunu', 'Her sürenin denemelerinde alkış oranını', 'Saatin kaç olduğunu'],
    answer: 1,
    why: 'Aynen! Her çubuk "bu süreyle kaç denemede alkış geldi?" oranı.',
    nope: 'Çubuklar süre başına alkış oranını tutuyor: uzun çubuk, çok alkış almış süre demek.',
  },
  {
    q: 'ε = 0 olunca (hiç keşif yok) ne oldu?',
    options: ['İlk alkış aldığı süreye takıldı', 'Her seferinde rastgele denedi', 'Hiç mantı pişirmedi'],
    answer: 0,
    why: 'Bildin! Keşfetmeyince ilk alkışlanan süreye yapıştı; daha iyisini hiç denemedi.',
    nope: 'Tam tersi: ε = 0 demek hiç rastgele denememek. Bıdık ilk alkış aldığı süreye takılıp kaldı.',
  },
  {
    q: 'ε çok büyük olunca (0,5) ne oldu?',
    options: ['En çok alkışı topladı', 'Denemelerin yarısını rastgele sürelerde harcadı', 'Defteri kayboldu'],
    answer: 1,
    why: 'Evet! En iyiyi bilse bile yarı zamanını rastgele denemelere harcadı; alkış azaldı.',
    nope: 'Hayır. ε = 0,5 ile denemelerin yarısı rastgele gitti; bu yüzden alkış sayısı düştü.',
  },
  {
    q: 'Küçük ve büyük mantılar karışık gelince çözüm neydi?',
    options: ['Sadece büyükleri pişirmek', 'Her boy için ayrı bir defter tutmak', 'Hepsini 6 dakika pişirmek'],
    answer: 1,
    why: 'Doğru! Önce boya bak, sonra o boyun defterine yaz. İki defter, iki doğru süre.',
    nope: 'Tek süre ikisine birden uymaz. Çözüm, her boy için ayrı defter tutmaktı.',
  },
  {
    q: 'Müşteri hıza alkışlayınca Bıdık ne öğrendi?',
    options: ['Yine lezzetli pişirmeyi', 'Çiğ ama hızlı servis etmeyi', 'Hiçbir şey öğrenemedi'],
    answer: 1,
    why: 'Aynen! Yapay zeka ne demek istediğimizi değil, neyi alkışladığımızı öğrenir. Ödülü iyi tasarlamak şart.',
    nope: 'Hayır. Alkış hıza gelince Bıdık hızlı ama çiğ mantı servis etmeyi öğrendi; alkışlanan buydu.',
  },
];
