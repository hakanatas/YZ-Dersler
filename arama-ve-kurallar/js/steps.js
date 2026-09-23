/**
 * Ek ders · Öğrenmeyen yapay zeka: kurallar, arama, karar ağacı.
 * Bıdık this time does not learn from examples: a person writes the rules,
 * a search finds the shortest way to the steamer, and a decision tree asks
 * questions. Middle school (10–14): one idea and one hands-on thing per
 * chapter, and a teacher note with the real terms. All numbers in the text
 * are checked by test/maze.test.mjs against the code.
 */
import { FEATURES, CHEFS } from './tree.js';

const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;

/** Chapter 1: the master's recipe rules. Base time 5 minutes; rules apply in order, independently. */
export const BASE_MINUTES = 5;
export const RULES = [
  { key: 'big', text: 'Mantı büyükse → 2 dakika ekle', add: 2 },
  { key: 'meat', text: 'İçi etliyse → 1 dakika ekle', add: 1 },
  { key: 'frozen', text: 'Donmuşsa → 3 dakika ekle', add: 3 },
];
export const EXAMPLES = [
  { name: 'Büyük, etli, taze mantı', big: 1, meat: 1, frozen: 0 },
  { name: 'Küçük, patatesli, donmuş mantı', big: 0, meat: 0, frozen: 1 },
  { name: 'Büyük, patatesli, donmuş mantı', big: 1, meat: 0, frozen: 1 },
  { name: 'Küçük, etli, taze mantı', big: 0, meat: 1, frozen: 0 },
];
export const ruleMinutes = (ex) => BASE_MINUTES + RULES.reduce((sum, r) => sum + (ex[r.key] ? r.add : 0), 0);

/** Chapter 6: which method fits which situation. 0 = Kural, 1 = Arama, 2 = Öğrenme. */
export const METHODS = ['Kural', 'Arama', 'Öğrenme'];
export const SITUATIONS = [
  { text: 'Bir şehirden diğerine en kısa yolu bulmak', answer: 1, why: 'Arama: yollar ve kavşaklar belli, hedef belli. Navigasyon uygulamaları tıpkı Bıdık gibi seçenekleri tarayıp en kısa yolu bulur.' },
  { text: 'Fotoğrafta kedi var mı, yok mu?', answer: 2, why: 'Öğrenme: "kedi" için kural yazamayız; binlerce fotoğraftan öğrenmek gerekir. Ders 05\'teki gibi.' },
  { text: 'Fırın 200 dereceyi geçince ısıtıcıyı kapat', answer: 0, why: 'Kural: koşul apaçık ve ölçülebilir. "Eğer sıcaklık 200\'ü geçerse kapat." Tek satır yeter.' },
  { text: 'Satrançta bir sonraki hamleyi seçmek', answer: 1, why: 'Arama: olası hamleleri ve karşı hamleleri sırayla denemek. En güçlü programlar tahtayı puanlamak için öğrenmeyi de kullanır, ama omurga aramadır.' },
  { text: 'Sesli komutu anlamak', answer: 2, why: 'Öğrenme: herkesin sesi, aksanı, hızı farklı. Kural yazmak imkânsız; milyonlarca ses kaydından öğrenilir.' },
  { text: 'Kütüphanede kitabı raf numarasıyla bulmak', answer: 0, why: 'Kural: raf numarası tam olarak nereye gideceğini söyler. Ne aramaya ne öğrenmeye gerek var.' },
];

const chefSpan = (id) => {
  const ch = CHEFS.find((c) => c.id === id);
  return `<span style="color:${ch.color};font-weight:600">${ch.short}</span>`;
};

export const STEPS = [
  {
    id: 'kural',
    label: 'Kural',
    title: 'En eski yapay zeka: kuralı insan yazar',
    body: `
      <p>Önceki derslerde Bıdık hep örneklere bakarak öğrendi. Ama yapay zekanın en eski yolu bambaşka: kuralları bir <b>insan</b> yazar, bilgisayar sadece uygular. "Eğer şöyleyse, böyle yap." Tıpkı bir tarif gibi.</p>
      <p>Ustanın defterinden üç kural aldık. Sıradaki mantıya bak, kuralları sırayla uygula: koşul tutuyorsa dakika eklenir, tutmuyorsa kural atlanır. Temel süre 5 dakika. Sonunda kaç dakika pişeceğini bulacaksın.</p>
      ${teacher('<p>Bu bir <b>kural tabanlı sistem</b>dir (uzman sistem). Tarihî örnek: 1970\'lerde Stanford\'da geliştirilen MYCIN, yaklaşık 600 elle yazılmış kuralla enfeksiyonlar için antibiyotik öneriyordu. Güçlü yanı <b>şeffaflık</b>: her karar hangi kural yüzünden verildi, bellidir. Zayıf yanı: her kuralı bir insan yazmalıdır ve defterde olmayan bir durumda sistem çaresiz kalır (<b>kırılganlık</b>). Burada kurallar sırayla ve birbirinden bağımsız uygulanır: süre = 5 + tutan kuralların dakikaları.</p>')}`,
    focus: 'bidik',
    say: 'Bu sefer öğrenmiyorum, ustamın kurallarını uyguluyorum. Ne kolay!',
    mood: 'happy',
    action: 'Sıradaki kuralı uygula',
    secondary: 'Başka mantı',
    controls: `<p class="rule-ex" id="rule-ex"></p><div class="rules-list" id="rules-list"></div>`,
    enter(c) {
      c.showPlate(true);
      c.setupRules();
    },
    act(c) {
      c.applyNextRule();
    },
    act2(c) {
      c.nextExample();
    },
    exit(c) {
      c.showPlate(false);
    },
  },
  {
    id: 'labirent',
    label: 'Labirent',
    title: 'Mutfak labirenti: tencereye nasıl gidilir?',
    body: `
      <p>Mutfağın zemini karelere bölündü. Koyu kareler <b>dolaplar</b>; oradan geçilmez. Bıdık solda, buharlı tencere sağda. Her adımda yalnızca yan kareye geçebilir: sağ, sol, ileri, geri.</p>
      <p>Önce en kolay yöntemi deneyelim: Bıdık hiç düşünmeden her adımda rastgele bir yön seçsin. <b>60 adım</b> hakkı var. Sence tencereye ulaşır mı? <b>"Bıdık rastgele yürüsün"</b> düğmesine bas, birlikte sayalım. Birkaç kez dene.</p>
      ${teacher('<p>Zemin 9×7 = 63 kare; 22\'si dolap, 41\'i açık. <b>Rastgele yürüyüş</b>: her adımda geçilebilir komşulardan biri eşit olasılıkla seçilir. Bilgisayarda 10.000 kez denendi: 60 adımlık hakla tencereye ulaşma oranı yaklaşık %14; ulaşanlar da ortalama 43 adım harcadı. Oysa en kısa yol 10 adımdır. Bu bölümün amacı "akıllı bir yöntem lazım" hissini vermektir.</p>')}`,
    focus: 'grid',
    say: 'Tencere şurada, ben buradayım. Rastgele yürüsem bulurum herhalde?',
    mood: 'curious',
    action: 'Bıdık rastgele yürüsün',
    stats: true,
    enter(c) {
      c.resetMaze();
      c.setStats([
        ['Adım', '0'],
        ['Sonuç', '–'],
      ]);
    },
    act(c) {
      c.randomWalkRun();
    },
    exit(c) {
      c.stopWalk();
    },
  },
  {
    id: 'arama',
    label: 'Arama',
    title: 'Arama: her yolu sırayla dene',
    body: `
      <p>Rastgele yürümek yerine Bıdık şöyle düşünsün: "Bir adımda gidebildiğim kareler hangileri? Peki iki adımda? Üç adımda?" Halka halka dışa doğru bakar; tencereyi bulunca da ona nasıl geldiğini geriye doğru sayar. Buna <b>arama</b> diyoruz.</p>
      <p><b>"Aramayı başlat"</b> düğmesine bas: kareler yakından uzağa doğru renkleniyor, <span class="salty">sarı</span> yakın, <span class="sweet">pembe</span> uzak. Tencere bulununca en kısa yol çiziliyor ve Bıdık yürüyor. Kaç kareye baktı, yol kaç adım? Sayılara dikkat et.</p>
      ${teacher('<p><b>Genişlik öncelikli arama</b> (breadth-first search, BFS): kareler başlangıca uzaklık sırasına göre keşfedilir; hedef bulunduğunda çizilen yol, adım sayısı bakımından <b>en kısa yoldur</b>; bu bir garantidir. Bedeli, bakılan kare sayısıdır. Bu labirentte Bıdık 41 açık karenin 36\'sına bakar ve 10 adımlık yolu bulur (hedefin bulunduğu halka tamamlanınca durur). Navigasyon uygulamaları aynı fikri kullanır; yollar eşit uzunlukta olmadığı için adım yerine süre ya da mesafe toplayan sürümleri vardır (Dijkstra, A*). Burada öğrenme yoktur: labirent değişse de yöntem aynı şekilde çalışır.</p>')}`,
    focus: 'grid',
    say: 'Önce yakın kareler, sonra biraz daha uzaktakiler… Halka halka!',
    mood: 'thinking',
    action: 'Aramayı başlat',
    stats: true,
    enter(c) {
      c.resetMaze();
      c.setStats([
        ['Bakılan kare', '–'],
        ['Yol', '–'],
      ]);
    },
    act(c) {
      c.searchRun(false);
    },
    exit(c) {
      c.stopWalk();
    },
  },
  {
    id: 'duvar',
    label: 'Dolap ekle',
    title: 'Sen dolap koy, Bıdık yeniden arasın',
    body: `
      <p>Şimdi sıra sende. Zemindeki bir kareye tıkla: boş kareye <b>dolap</b> koyarsın, dolaba tıklarsan kalkar. Sonra "Yolu ara" düğmesine bas; Bıdık en kısa yolu yeniden bulur. Kısa yolu kapatırsan uzun yoldan gider; her yolu kapatırsan "yol yok" der.</p>
      <p>Dene: Bıdık'ın hemen yanındaki, tencere tarafındaki kareye dolap koy ve ara. Yol kaç adım oldu? Sonra Bıdık'ın sana yakın tarafındaki komşu kareye de koy. Şimdi ne oluyor?</p>
      ${teacher('<p>Harita değişince arama baştan çalıştırılır; ezber ya da eğitim yoktur. Hedefe götüren komşu kalmadığında kuyruk boşalır ve algoritma "yol yok" diye biter; bu da doğru bir cevaptır. Bu haritada Bıdık\'ın tencere tarafındaki komşusu kapatılınca en kısa yol alt koridordan 14 adım olur; izleyiciye yakın komşusu da kapatılınca yol kalmaz. Arama, elindeki haritaya bağımlıdır: haritada olmayan bir dolap gerçek mutfakta engel olur.</p>')}`,
    focus: 'grid',
    say: 'Dolapları istediğin yere koy. Ben yolu yine bulurum!',
    mood: 'proud',
    action: 'Yolu ara',
    secondary: 'Dolapları eski haline getir',
    stats: true,
    enter(c) {
      c.resetMaze();
      c.setStats([
        ['Bakılan kare', '–'],
        ['Yol', '–'],
      ]);
      c.readout('<span class="big">Zemine tıkla</span>Boş kareye dolap koy, sonra "Yolu ara" de.');
    },
    onPick(c, point) {
      c.pickWall(point);
    },
    act(c) {
      c.searchRun(true);
    },
    act2(c) {
      c.resetMaze();
      c.readout('<span class="big">Dolaplar eski yerinde</span>Yeniden dene: tıkla, sonra "Yolu ara".');
    },
    exit(c) {
      c.stopWalk();
      c.resetMaze();
    },
  },
  {
    id: 'agac',
    label: 'Karar ağacı',
    title: 'Karar ağacı: sorarak bul',
    body: `
      <p>Mutfakta üç usta var: ${chefSpan('ayse')}, ${chefSpan('kemal')}, ${chefSpan('deniz')}. Aşağıdaki tabloda sekiz mantı ve her biri için üç evet/hayır bilgisi var. Bıdık tablodan <b>gizli bir mantı</b> seçti. Hangi ustanın yaptığını bulmak senin işin.</p>
      <p>Bir soru seç; Bıdık evet ya da hayır der, tabloda uymayan mantılar silikleşir. Tek usta kalınca bildin! Kaç soruda buldun? En az kaç soru yeterdi? Sonra "Ağacı göster" ile Bıdık'ın soru ağacına bak.</p>
      ${teacher('<p><b>Karar ağacı</b>: düğümleri sorular, yaprakları cevaplar olan bir modeldir. Bu ağacı tablodan elle çıkardık: "Hamuru kalın mı?" tek başına Ayşe\'yi ayırır (ince hamur yalnızca Ayşe\'de); kalın hamurlular için "İçi etli mi?" Kemal ile Deniz\'i ayırır. "Üstü katlı mı?" sorusu hiçbir ustayı diğerinden ayırmaz, ağaçta yer almaz. Ağacı elle yazmak yerine <b>veriden öğrenmek</b> de mümkündür: ID3, CART gibi algoritmalar her adımda ustaları en iyi ayıran soruyu seçer. Yani ağaç da bir modeldir; Ders 01–06\'da başka tür bir model (sinir ağı) veriden öğrenildi. Ağaçlar <b>açıklanabilir</b>: "neden?" sorusunun cevabı sorular zinciridir; sinir ağında böyle okunabilir bir cevap yoktur.</p>')}`,
    focus: 'bidik',
    say: 'Gizli mantımı seçtim. Sor bakalım, evet ya da hayır diyeceğim!',
    mood: 'curious',
    action: 'Yeni gizli mantı',
    secondary: 'Ağacı göster',
    controls: `<div class="chips" id="tree-q"></div><table class="dtable" id="dtable"></table><div class="tree" id="tree" hidden></div>`,
    enter(c) {
      c.setupTreeGame();
    },
    act(c) {
      c.newSecret();
    },
    act2(c) {
      c.showTree();
    },
  },
  {
    id: 'hangisi',
    label: 'Hangisi?',
    title: 'Kural mı, arama mı, öğrenme mi?',
    body: `
      <p>Üç yöntem gördün. <b>Kural</b>: insan yazar, bilgisayar uygular. <b>Arama</b>: bilgisayar seçenekleri sırayla dener, en iyisini bulur. <b>Öğrenme</b>: örneklerden kendisi çıkarır (Ders 01–06). Altı durum var; her biri için en uygun yöntemi seç.</p>
      <div id="compare-host"></div>
      ${teacher('<p>Kaba kural: koşul net ve ölçülebilirse <b>kural</b>; seçenekler ve hedef belliyse, en iyisini bulmak gerekiyorsa <b>arama</b>; kuralı yazmak imkânsız ama örnek çoksa (görüntü, ses, dil) <b>öğrenme</b>. Gerçek sistemler karışımdır: satranç programları arama yapar ama tahtayı puanlamak için öğrenilmiş bir model kullanabilir; navigasyon arama yapar ama trafik süresini öğrenmeyle tahmin eder. Sohbet robotları bile bazen bir arama ya da hesap makinesi aracı çağırır.</p>')}`,
    focus: 'overview',
    say: 'Her iş için ayrı bir yöntem. Bakalım hangisini nerede kullanacaksın?',
    mood: 'happy',
    enter(c) {
      c.hideScore();
      c.buildCompare();
    },
    exit(c) {
      c.hideScore();
    },
  },
  {
    id: 'ozet',
    label: 'Bilgi testi',
    title: 'Bilgi testi: öğrenmeyen yapay zeka',
    body: `
      <p>Kural, arama, karar ağacı. Altı kısa soru; her soruda tek bir doğru cevap var:</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Özet: (1) Kural tabanlı sistemler: insan yazar, şeffaf ama kırılgan. (2) Arama: seçenekleri düzenli tarar; BFS adım sayısına göre en kısa yolu garanti eder, yol yoksa bunu da söyler. (3) Karar ağacı: sorulardan oluşan model; elle yazılabilir ya da veriden öğrenilebilir; kararı açıklanabilir. (4) Yöntem seçimi işe bağlıdır; gerçek sistemler çoğu zaman karışımdır.</p>')}`,
    focus: 'overview',
    say: 'Öğrenmeden de akıllı olunur; yeter ki doğru yöntemi seç!',
    mood: 'proud',
    quiz: true,
    enter(c) {
      c.resetMaze();
    },
  },
];

export const QUIZ = [
  {
    q: '"Mantı büyükse 2 dakika ekle" cümlesi hangi yöntemin parçası?',
    options: ['Kural: bir insan yazdı', 'Öğrenme: örneklerden çıktı', 'Rastgele yürüyüş'],
    answer: 0,
    why: 'Doğru! Bu bir kural: ustanın defterinden geldi, Bıdık sadece uyguladı.',
    nope: 'Hayır. Bu cümleyi Bıdık öğrenmedi; usta yazdı, Bıdık uyguladı. Yani bir kural.',
  },
  {
    q: 'Bıdık labirentte rastgele yürüyünce genellikle ne oldu?',
    options: ['Her seferinde 10 adımda ulaştı', 'Çoğunlukla 60 adımda ulaşamadı', 'Dolapların üstünden atladı'],
    answer: 1,
    why: 'Aynen! Rastgele yürüyüş çoğu zaman 60 adımda bile tencereye varamadı.',
    nope: 'Tekrar düşün: rastgele adımlarla Bıdık çoğu zaman 60 adımda bile tencereye varamadı.',
  },
  {
    q: 'Arama halka halka ilerleyip tencereyi bulunca çizdiği yol nasıldır?',
    options: ['Rastgele bir yol', 'En uzun yol', 'En kısa yol'],
    answer: 2,
    why: 'Bildin! Yakından uzağa bakınca tencereye ilk ulaşan yol en kısa yoldur.',
    nope: 'Hayır. Halka halka bakınca tencereye ilk ulaşan yol en kısa yoldur; arama bunu garanti eder.',
  },
  {
    q: 'Bütün yollar dolapla kapanırsa arama ne yapar?',
    options: ['Sonsuza kadar arar', '"Yol yok" der ve durur', 'Bir dolabı kaldırır'],
    answer: 1,
    why: 'Evet! Bakacak kare kalmayınca arama durur ve "yol yok" der. Bu da doğru bir cevap.',
    nope: 'Hayır. Bakacak kare kalmayınca arama durur ve dürüstçe "yol yok" der.',
  },
  {
    q: 'Karar ağacındaki düğümler nedir?',
    options: ['Evet/hayır soruları', 'Rastgele sayılar', 'Mantıların fotoğrafları'],
    answer: 0,
    why: 'Doğru! Her düğüm bir soru: "Hamuru kalın mı?" gibi. Cevaba göre dala ayrılır.',
    nope: 'Hayır. Ağacın düğümleri evet/hayır sorularıdır; yapraklarda cevaplar (ustalar) durur.',
  },
  {
    q: '"Bu kararı neden verdin?" sorusuna en kolay cevap veren hangisi?',
    options: ['Karar ağacı', 'Milyarlarca ipli sinir ağı', 'İkisi de cevap veremez'],
    answer: 0,
    why: 'Aynen! Ağaç sorularını sırayla gösterir: "Kalındı, etliydi, o yüzden Kemal." Sinir ağında böyle bir cevap yok.',
    nope: 'Tam tersi. Karar ağacı sorduğu soruları sırayla gösterebilir; sinir ağının milyarlarca ipi bunu söylemez.',
  },
];
