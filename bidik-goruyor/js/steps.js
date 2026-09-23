/**
 * Lesson 05 · Bıdık görüyor. A picture is nothing but numbers: an 8×8
 * black-and-white grid is 64 zeros and ones, and a small network learns to
 * tell mantı from börek from those 64 numbers. Middle school, one idea per
 * chapter, one thing to do per chapter, a teacher note under each.
 */
const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;

const GRID = `<div class="pixels" id="pixgrid" style="grid-template-columns: repeat(8, 1fr)" aria-label="8 × 8 piksel resim"></div>`;
const CHIPS = `<div class="chips" id="chips">
  <button type="button" class="btn" data-preset="kare">Kare</button>
  <button type="button" class="btn" data-preset="nokta">Tek nokta</button>
  <button type="button" class="btn" data-preset="harf">T harfi</button>
  <button type="button" class="btn" data-preset="dik">Dik börek</button>
  <button type="button" class="btn" data-preset="kose">Köşede mantı</button>
  <button type="button" class="btn" data-preset="bos">Bomboş</button>
</div>`;

export const STEPS = [
  {
    id: 'sayilar',
    label: 'Sayılar',
    title: 'Bir resim, sayılardan ibaret',
    body: `
      <p>Bıdık'ın gözü yok ama görmeyi öğrenecek. Nasıl mı? Bilgisayar için bir resim, minicik karelerden oluşan bir tablodur. Her kareye <b>piksel</b> denir. Tepsideki resim 8 kare eninde, 8 kare boyunda: toplam <b>64 piksel</b>.</p>
      <p>Her piksel bir sayı taşıyor: dolu kare <b>1</b>, boş kare <b>0</b>. <b>"Sayıları göster"</b> düğmesine bas, resmin altındaki sayıları gör. Bıdık'a "resim" diye verdiğimiz şey, işte bu 64 sayı.</p>
      ${teacher('<p>Dijital bir görüntü, piksellerden oluşan bir sayı dizisidir. Bu derste her piksel 0 ya da 1 (siyah-beyaz, 8×8 = 64 sayı). Gerçek fotoğraflarda her piksel gri tonu için 0–255 arası bir sayı, renkli fotoğrafta ise üç sayı (kırmızı, yeşil, mavi; RGB) taşır: 1000×1000 piksellik renkli bir fotoğraf 1 milyon piksel × 3 = 3 milyon sayıdır. Model bu sayıları alır; "resmi" görmez.</p>')}`,
    focus: 'board',
    say: 'Tepside ne var? Ben sadece sayılar görüyorum!',
    mood: 'curious',
    action: 'Sayıları göster',
    controls: GRID,
    enter(c) {
      c.numbersShown = false;
      c.setAction('Sayıları göster');
      c.network.setWeightsVisible(true);
      const ex = c.train[0];
      c.showImage(ex.x, ex.y, ex.kind, true);
      c.buildGrid(false);
      c.setOutput(null);
    },
    act(c) {
      c.toggleNumbers();
    },
    exit(c) {
      c.numbersShown = false;
    },
  },
  {
    id: 'gozler',
    label: '64 göz',
    title: '64 göz, 8 yardımcı, 1 cevap',
    body: `
      <p>Bıdık'ın kafasının içi yine ipler ve yardımcılarla dolu. Bu sefer soldan giren iki sayı değil, <b>64 sayı</b>: her piksel için bir "göz". Ortada <b>8 yardımcı</b> bu 64 sayıyı dinliyor. En sağdaki yardımcı son sözü söylüyor: <i>"Yüzde kaç mantı?"</i></p>
      <p><b>"Bıdık'a göster"</b> düğmesine bas: dolu piksellerden ışıklar çıkıp iplerden yardımcılara akıyor. Bıdık daha antrenman yapmadı, ipleri rastgele; o yüzden cevabı şimdilik yazı tura gibi. Merak etme, birazdan öğrenecek.</p>
      ${teacher('<p>Model: 64 giriş → 8 düğümlü gizli katman (tanh) → 1 sigmoid çıkış. Ağırlıklar 64·8 + 8 = 520, sapmalar 8 + 1 = 9; toplam <b>529 parametre</b>. Çıkış, "mantı" olasılığıdır; eşik 0,5. Tabloda yalnızca değeri 1 olan pikseller ışık gönderir, çünkü 0 çarpı ağırlık her zaman 0\'dır. Eğitilmemiş ağın doğruluğu bu veri setinde yazı tura düzeyindedir: rastgele başlangıca göre %38–78 arasında (13 farklı tohumla ölçüldü).</p>')}`,
    focus: 'network',
    say: 'Altmış dört gözüm var! Ama daha ne gördüğümü bilmiyorum.',
    mood: 'thinking',
    action: 'Bıdık\'a göster',
    controls: GRID,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.buildGrid(false);
      c.showImage(c.current, c.currentLabel, c.currentKind, true);
    },
    act(c) {
      c.askBidik();
    },
    exit(c) {
      c.network.clearGlow();
      c.setOutput(null);
    },
  },
  {
    id: 'ornekler',
    label: 'Örnekler',
    title: 'Öğrenmek için örnek gerek: 120 resim',
    body: `
      <p>Geçen derslerdeki gibi Bıdık'a kural söylemeyeceğiz. "Mantı yuvarlaktır, böreğin ucu uzundur" demek yok! Onun yerine bir sürü resim ve etiketi: bu <span class="sweet">mantı</span> (1), bu <span class="salty">börek</span> (0).</p>
      <p><b>"Başka örnek"</b> düğmesine basıp örnekleri gez. Dikkat: mantılar bazen büyük bazen küçük, bazen sağa bazen sola kaymış. Börekler bazen düz, bazen hafif eğik. Üstelik resimlerde arada bir yanlış piksel var, fotoğraftaki kum taneleri gibi. Bıdık bu farklılıklara rağmen şekli yakalamalı.</p>
      ${teacher('<p><b>Eğitim kümesi</b>: 60 mantı + 60 börek = 120 resim; <b>sınav (test) kümesi</b>: 30 + 30 = 60 ayrı resim. Her resim aynı tarifle ama farklı rastgelelikle üretilir: konum ±1 piksel kayar, mantının yarıçapı 2,2–2,8 piksel (tepesinde 1 piksellik büzük), börek 6–7 piksel eninde, 2–3 piksel boyunda, yaklaşık ±25°\'ye kadar eğik; ayrıca 0–3 rastgele piksel ters çevrilir (gürültü). Bu çeşitlilik, modelin tek bir resmi ezberlemek yerine şekli öğrenmesini sağlar (<b>veri çoğaltma</b> fikri).</p>')}`,
    focus: 'board',
    say: 'Bunların hepsi mantı mı? Kimi kocaman, kimi minicik…',
    mood: 'curious',
    action: 'Başka örnek',
    controls: GRID,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.buildGrid(false);
      c.nextExample(false);
    },
    act(c) {
      c.nextExample(true);
    },
  },
  {
    id: 'antrenman',
    label: 'Antrenman',
    title: 'Antrenman: 120 resme 300 kez bak',
    body: `
      <p>Şimdi Bıdık 120 resmin hepsine bakacak, her seferinde "kaçını yanlış bildim?" diye ölçüp iplerini azıcık düzeltecek. Bunu 300 kez tekrarlayacak. Tıpkı önceki derslerdeki gibi: tahmin et, yanıl, düzelt.</p>
      <p>İki puana bak: <b>Antrenman doğru</b> baktığı resimlerde, <b>Sınav doğru</b> ise hiç görmediği 60 resimde kaçını bildiği. Antrenman bitince Bıdık'ın sınavda yanlış bildiği bir resim tepsiye gelecek. Ona iyi bak: sence neden şaşırdı?</p>
      ${teacher('<p>Eğitim: tam yığın gradyan inişi, ikili çapraz entropi kaybı, öğrenme hızı 0,5, 300 adım (her adımda 120 resmin hepsi). Node ile doğrulandı: bu tohumla eğitim doğruluğu %100, sınav doğruluğu %98 (60 resimden 59); 13 farklı rastgele başlangıçta da sınav doğruluğu %98–100. İlk 20 adımda sınav doğruluğu %90\'ı geçer; sonrası ince ayardır. Yanlış bilinen sınav resmi genellikle gürültü pikseli tam tepesine denk gelen bir börektir: mantının büzük tepesine benzer.</p>')}`,
    focus: 'overview',
    say: 'Hadi antrenman! Bu sefer 120 resim var, uzun sürer mi ki?',
    mood: 'happy',
    action: 'Antrenman başlasın!',
    secondary: 'Her şeyi unut',
    stats: true,
    controls: GRID,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.buildGrid(false);
      c.showImage(c.current, c.currentLabel, c.currentKind, true);
      c.updateStats();
    },
    act(c) {
      c.toggleTraining();
    },
    act2(c) {
      c.resetNet();
    },
    exit(c) {
      c.stopTraining();
    },
  },
  {
    id: 'ciz',
    label: 'Sen çiz',
    title: 'Sen çiz, Bıdık tanısın',
    body: `
      <p>Sıra sende! Aşağıdaki karelere tıkla ya da parmağını sürükleyerek boya. Bıdık her değişiklikte resmine bakıp cevabını söylüyor: yüzde kaç mantı?</p>
      <p>Dene bakalım: ortaya yuvarlak bir mantı çiz, tepesine bir nokta koy. Sonra temizle, kocaman yassı bir börek çiz. Bir de hafif eğik börek. Bıdık'ı en çok ne şaşırtıyor?</p>
      ${teacher('<p>Model artık <b>hiç görmediği</b> girdilerde çalışıyor (genelleme). Her piksel ayrı bir giriştir: model "aynı şekil biraz kayınca aynı kalır" bilgisine sahip değildir, bunu ancak eğitimdeki ±1 piksellik kaymalardan öğrendiği kadar bilir. Bu yüzden köşeye çizilen ya da çok küçük bir mantı yanlış tanınabilir. Antrenman yapılmadıysa bu bölüme girince model 300 adım sessizce eğitilir.</p>')}`,
    focus: 'overview',
    say: 'Çiz çiz! Ben hazırım, 64 gözüm açık.',
    mood: 'curious',
    action: 'Bıdık\'a sor',
    secondary: 'Temizle',
    controls: GRID,
    enter(c) {
      c.network.setWeightsVisible(true);
      if (c.net.steps === 0) {
        c.trainSilently(300);
        c.toast('Bıdık arka planda 300 adım antrenman yaptı.');
      }
      c.buildGrid(true);
      c.showImage(c.drawing, null, null, true);
      c.setOutput(null);
      c.readout('<span class="big">Bir şey çiz</span>Karelere tıkla ya da sürükle. Bıdık hemen bakacak.');
    },
    act(c) {
      c.predictDrawing();
    },
    act2(c) {
      c.clearDrawing();
    },
    exit(c) {
      c.editable = false;
      c.painting = null;
      c.predictDirty = false;
      c.network.clearGlow();
    },
  },
  {
    id: 'kandir',
    label: 'Kandır',
    title: 'Bıdık\'ı kandır: bu ne, mantı mı börek mi?',
    body: `
      <p>Bıdık yalnızca iki şey biliyor: mantı ve börek. Ona bir kare, tek bir nokta ya da bir harf gösterirsen ne olur? "Bu ne ki?" demez; <i>mutlaka</i> ikisinden birini seçer. <b>"Sıradaki tuzak"</b> düğmesine bas ya da kendin çiz.</p>
      <p>Yüzdeye dikkat: <b>%50</b> civarı "emin değilim" demek. Ama Bıdık bazen alakasız bir şeye "%99 mantı" da diyebilir. Yani çok emin olması, doğru olması demek değil! Gerçek sistemlerde bir de "hiçbiri" cevabı ya da "emin değilsen söyleme" kuralı olur.</p>
      ${teacher('<p>Model iki sınıflı bir sınıflandırıcıdır: çıkışı her girdi için 0–1 arasında bir sayıdır ve eğitim verisine hiç benzemeyen girdiler (<b>dağılım dışı</b> örnekler) için de bir cevap üretir. <b>Güven (olasılık) ≠ doğruluk</b>: model, hiç görmediği türden bir şekle yüksek güvenle yanlış etiket verebilir. Gerçek sistemler bunun için bir eşik ("%80\'in altındaysa cevap verme"), bir "diğer/hiçbiri" sınıfı ya da ayrı bir belirsizlik ölçümü kullanır.</p>')}`,
    focus: 'overview',
    say: 'Kare mi? Nokta mı? Ben mantı ve börek biliyorum, başka bir şey bilmem!',
    mood: 'worried',
    action: 'Sıradaki tuzak',
    secondary: 'Temizle',
    controls: GRID + CHIPS,
    enter(c) {
      c.network.setWeightsVisible(true);
      if (c.net.steps === 0) c.trainSilently(300);
      c.buildGrid(true);
      c.trickIndex = -1;
      c.showImage(c.drawing, null, null, true);
      c.setOutput(null);
      c.readout('<span class="big">Bir tuzak seç</span>Ya da kendin bir şey çiz: kare, harf, çizgi…');
      const chips = c.$('#chips');
      chips.querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', () => {
          c.loadPreset(b.dataset.preset);
          chips.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        });
      });
    },
    act(c) {
      const chips = c.$('#chips');
      const buttons = chips ? Array.from(chips.querySelectorAll('button')) : [];
      if (!buttons.length) return;
      c.trickIndex = ((c.trickIndex ?? -1) + 1) % buttons.length;
      buttons[c.trickIndex].click();
    },
    act2(c) {
      c.clearDrawing();
      c.$('#chips')?.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    },
    exit(c) {
      c.editable = false;
      c.painting = null;
      c.predictDirty = false;
      c.network.clearGlow();
    },
  },
  {
    id: 'ozet',
    label: 'Bilgi testi',
    title: 'Bilgi testi: Bıdık görüyor mu?',
    body: `
      <p>Bıdık artık mantıyla böreği ayırt ediyor. Peki sen neler öğrendin? Altı kısa soru, her birinde tek doğru cevap:</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Özet: (1) Görüntü, piksel değerlerinden oluşan bir sayı dizisidir. (2) Her piksel ağa ayrı bir giriş olarak verilir (burada 64). (3) Eğitim yalnızca ağırlıkları değiştirir; örneklerden şekli öğrenir. (4) Piksel-giriş modeli konum kaymasına duyarlıdır. (5) Çıkıştaki olasılık modelin güvenidir, doğruluk garantisi değildir. (6) Gerçek görüntü tanıma: çok daha büyük görüntüler, milyonlarca örnek ve komşu piksellere birlikte bakan <b>evrişimli</b> (konvolüsyon) katmanlar.</p>')}`,
    focus: 'overview',
    say: 'Artık görüyorum! En azından mantıyla böreği…',
    mood: 'proud',
    quiz: true,
    enter(c) {
      c.network.setWeightsVisible(true);
      if (c.net.steps === 0) c.trainSilently(300);
      const ex = c.train[0];
      c.showImage(ex.x, ex.y, ex.kind, true);
      c.forward(ex.x, true);
    },
    exit(c) {
      c.network.clearGlow();
      c.setOutput(null);
    },
  },
];

export const QUIZ = [
  {
    q: 'Bilgisayar için bir resim nedir?',
    options: ['Bir sürü sayıdan oluşan bir tablo', 'Küçültülmüş bir fotoğraf', 'Renklerin adlarının listesi'],
    answer: 0,
    why: 'Aynen! Her piksel bir sayı; bizim resim 64 tane 0 ve 1\'den ibaretti.',
    nope: 'Hayır. Bilgisayar resmi karelere böler, her kareye bir sayı verir. Resim demek, o sayılar demek.',
  },
  {
    q: 'Bıdık\'ın bu derste kaç "gözü", yani girişi vardı?',
    options: ['2', '8', '64'],
    answer: 2,
    why: 'Doğru! 8 × 8 = 64 piksel, her biri için bir giriş.',
    nope: 'Tekrar say: resim 8 kare eninde, 8 kare boyunda. 8 × 8 = 64 giriş. 8 olan, ortadaki yardımcılar.',
  },
  {
    q: 'Antrenman sırasında ne değişti?',
    options: ['Tepsideki resimler', 'Yardımcılar arasındaki ipler', 'Piksellerin sayısı'],
    answer: 1,
    why: 'Bildin! Resimler aynı kaldı; Bıdık her seferinde iplerini azıcık düzeltti.',
    nope: 'Resimler ve pikseller hiç değişmedi. Değişen tek şey ipler, yani Bıdık\'ın ayarları.',
  },
  {
    q: 'Mantıyı tam köşeye çizince Bıdık neden şaşırabilir?',
    options: ['Köşeleri sevmediği için', 'Her piksel ayrı bir göz; antrenmanda mantıyı hep ortalarda gördü', 'Köşedeki pikseller daha küçük olduğu için'],
    answer: 1,
    why: 'Evet! Bıdık "aynı şekil kaydı" diye düşünmez; köşedeki pikselleri antrenmanda hiç dolu görmedi.',
    nope: 'Sebep şu: her piksel ayrı bir giriş. Antrenmanda mantılar hep ortalardaydı; köşedeki gözler mantı görmeye alışmadı.',
  },
  {
    q: 'Bıdık bir resme "%50 mantı" derse bu ne demek?',
    options: ['Resmin yarısı mantı', 'Emin değilim', 'Kesinlikle börek'],
    answer: 1,
    why: 'Doğru! %50 yazı tura demek: Bıdık ikisinden birini seçemiyor.',
    nope: 'Hayır. %50, "ikisi de olabilir, emin değilim" demek. Resmin yarısıyla ilgisi yok.',
  },
  {
    q: 'Gerçek fotoğrafları tanıyan sistemlerin Bıdık\'tan farkı ne?',
    options: ['Hiç antrenman yapmazlar', 'Çok daha büyük resimler, milyonlarca örnek ve komşu piksellere birlikte bakan katmanlar', 'Sadece siyah-beyaz görürler'],
    answer: 1,
    why: 'Aynen! Aynı fikir ama devasa: milyonlarca sayı, milyonlarca örnek ve yan yana pikselleri birlikte inceleyen katmanlar.',
    nope: 'Onlar da antrenman yapar ve renk görür. Fark: çok daha büyük resimler, milyonlarca örnek ve komşu piksellere birlikte bakan katmanlar.',
  },
];
