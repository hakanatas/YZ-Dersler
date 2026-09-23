/**
 * Lesson 07 · Closing: what the six lessons add up to, where AI shows up in
 * daily life, what it can and cannot do, a ten-question final and a
 * completion card. Middle school.
 */
const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;

/** "Bu hangi ders?" matching game: everyday example → lesson number (1–6). */
export const MATCH = [
  { text: 'Video uygulaması sana hep izlediklerine benzer videolar öneriyor.', lesson: 1, why: 'Öneri sistemi de tahmin ederek öğrenir: "bunu izler mi?" sorusuna geçmiş izlemelerden cevap arar.' },
  { text: 'Bir sohbet robotu, hiç var olmayan bir kitabın adını kendinden emin söylüyor.', lesson: 4, why: 'Halüsinasyon: model bilmediğinde de akıcı devam üretir. Kaynağa bakmak gerekir.' },
  { text: 'Telefonun fotoğraflarda kedi olanları kendiliğinden buluyor.', lesson: 5, why: 'Görüntü tanıma: resim sayılardan ibaret, model piksellerden öğrenir.' },
  { text: 'Sesli asistan bazı aksanları diğerlerinden daha zor anlıyor.', lesson: 3, why: 'Eksik veri: o aksanla konuşan insanlardan az kayıt dinlemiş. Veride kim yoksa onu öğrenemez.' },
  { text: 'Bir oyun yapay zekası milyonlarca deneme oynayarak şampiyonu yeniyor.', lesson: 6, why: 'Ödülle öğrenme: etiket yok, kazanınca ödül var; deneme yanılma.' },
  { text: 'Sadece 10 fotoğrafla eğitilen bir program yeni fotoğraflarda sürekli yanılıyor.', lesson: 2, why: 'Az örnek ezberletir: antrenmanda tam puan, sınavda düşük puan.' },
];

/** "Yapabilir mi?" game. answer: 0 = yapabilir, 1 = yapamaz, 2 = duruma göre. */
export const CAN = [
  { text: 'Binlerce röntgen filminden öğrenip yeni bir filmde şüpheli bölgeyi işaretlemek', answer: 0, why: 'Yapabilir. Görüntü tanımanın gerçek bir kullanımı; yine de son kararı hekim verir ve modelin hangi verilerle eğitildiği önemlidir.' },
  { text: 'Hiç görmediği bir konuda kesin doğru bilgi vermek', answer: 1, why: 'Yapamaz. Verisinde olmayan şeyi bilemez; bilmediğinde de akıcı cümle üretebilir (Ders 04). Bu yüzden kaynak istenir.' },
  { text: 'Bir metni başka bir dile çevirmek', answer: 0, why: 'Yapabilir. Çeviri de "sıradaki kelime" oyununun bir çeşididir ve milyonlarca çeviri örneğiyle öğrenilir. Hata yapabilir, önemli metinlerde kontrol gerekir.' },
  { text: 'Kendi kendine doğruyu yanlıştan ayırmak', answer: 1, why: 'Yapamaz. Model, örneklerinde ve ödülünde ne varsa onu öğrenir; neyin doğru olduğunu ona veri ve ödülle biz söyleriz (Ders 03 ve 06).' },
  { text: 'Sınıftaki herkesin fotoğrafını tanımak', answer: 2, why: 'Duruma göre. Herkesten yeterli ve çeşitli fotoğraf varsa evet; kimden az fotoğraf varsa onda yanılır (Ders 03). Ayrıca yüz tanıma, izin ve gizlilik gerektirir.' },
  { text: 'Ne için ödüllendirildiyse onu öğrenmek, "ne demek istediğimizi" değil', answer: 0, why: 'Yapabilir; hatta tam olarak bunu yapar. Hıza alkışlayan müşteri çiğ mantı aldı (Ders 06). Ödülü tasarlamak bizim işimiz.' },
];

export const STEPS = [
  {
    id: 'ozet',
    label: 'Özet',
    title: 'Altı ders, tek fikir: tahmin et, yanıl, düzelt',
    body: `
      <p>Hatırlıyor musun? Her şey bir soruyla başladı: <i>mantı kaç dakika pişer?</i> Bıdık'a kural söylemedik, örnek gösterdik. Tahmin etti, yanıldı, iplerini azıcık düzeltti; yüzlerce kez. Bu döngü altı dersin hepsinin altında yatıyor.</p>
      <p>Masaya bak: mantılar, ipler ve kelime karoları hepsi aynı mutfaktan. <b>"Bıdık hatırlasın"</b> düğmesine bas, Bıdık altı dersi tek tek hatırlasın.</p>
      ${teacher('<p>Serinin omurgası: (1) Öğrenme = örneklerden parametre ayarlama (Ders 01). (2) Genelleme, ezber ve veri kalitesi (Ders 02). (3) Verinin kapsamı ve adalet (Ders 03). (4) Dil modelleri olası devamı üretir, doğruyu değil (Ders 04). (5) Algı: resim sayılardır (Ders 05). (6) Ödülle öğrenme ve ödül tasarımı (Ders 06). Bu ders yeni model eğitmez; masadaki örtü Ders 01\'in eğitilmiş modeliyle boyanır.</p>')}`,
    focus: 'overview',
    say: 'Altı ders! Hepsini hatırlıyorum, bak anlatayım.',
    mood: 'proud',
    action: 'Bıdık hatırlasın',
    enter(c) {
      c.recallIndex = 0;
      c.board.revealAll();
      c.board.tintTarget = 1;
      c.network.setWeightsVisible(true);
      c.tokens.visible = true;
    },
    act(c) {
      c.recall();
    },
  },
  {
    id: 'nerede',
    label: 'Nerede?',
    title: 'Yapay zeka nerede karşımıza çıkar?',
    body: `
      <p>Bıdık'ın mutfağından çıkalım. Aşağıdaki olayların her biri günlük hayattan. Hangisi hangi dersin konusu? Örneği oku, ders numarasını seç. Yanlış olursa Bıdık neden olduğunu söyler.</p>
      <div id="match-host"></div>
      ${teacher('<p>Transfer etkinliği: öğrenci, mutfak benzetmesini gerçek sistemlere (öneri, sohbet, fotoğraf, ses, oyun) eşler. Her örnek tek bir dersin ana fikrine bağlanacak biçimde yazılmıştır; tartışmada birden fazla dersle ilişkilendirilmesi de değerlidir (örneğin öneri sistemleri hem öğrenme hem veri kapsamı konusudur).</p>')}`,
    focus: 'bidik',
    say: 'Bunlar hep benim başıma gelenler gibi. Sen hangisi hangisi bul!',
    mood: 'curious',
    enter(c) {
      c.buildMatch();
    },
  },
  {
    id: 'yapabilir',
    label: 'Yapabilir mi?',
    title: 'Ne yapabilir, ne yapamaz?',
    body: `
      <p>Yapay zeka sihir değil, kural ezberleyen bir makine de değil. Örneklerden ve ödülden öğrenen bir tahmin makinesi. Bu bilgiyle karar ver: aşağıdakileri yapabilir mi, yapamaz mı, yoksa duruma göre mi?</p>
      <div id="can-host"></div>
      ${teacher('<p>Amaç, öğrencinin iki uç yanılgıdan kurtulması: "her şeyi bilir" ve "hiçbir işe yaramaz". Doğru çerçeve: yeterli ve çeşitli veri olan, ödülü iyi tanımlanmış görevlerde güçlüdür; veri dışında, kaynak gerektiren ya da değer yargısı isteyen yerlerde insana bağlıdır. "Duruma göre" seçeneği tartışma için bilinçli olarak eklenmiştir.</p>')}`,
    focus: 'network',
    say: 'Ben de her şeyi bilmiyorum. Bildiğim, gördüğüm örnekler kadar.',
    mood: 'thinking',
    enter(c) {
      c.buildCan();
    },
  },
  {
    id: 'kurallar',
    label: 'Dört kural',
    title: 'Yapay zekayla çalışırken dört kural',
    body: `
      <p>Bıdık'ın altı dersten çıkardığı dört kural var. Her biri bir derse dayanıyor. <b>"Bıdık söylesin"</b> düğmesine bas, Bıdık sırayla söylesin.</p>
      <ol id="rules" class="rules">
        <li><b>Kaynağını iste.</b> Akıcı cümle doğru cümle demek değil. (Ders 04)</li>
        <li><b>Verisini sor.</b> Kimin verisiyle öğrendi? Kim eksik? (Ders 02, 03)</li>
        <li><b>Sınavını yap.</b> Hiç görmediği örnekte dene; antrenman puanına kanma. (Ders 02)</li>
        <li><b>Ödülünü düşün.</b> Neyi ödüllendirdiysen onu öğrenir. (Ders 06)</li>
      </ol>
      ${teacher('<p>Bu dört kural, ortaokul düzeyinde "yapay zeka okuryazarlığı"nın özüdür: doğrulama, veri farkındalığı, değerlendirme ve hedef tasarımı. Sınıfta her kural için bir günlük hayat örneği istenebilir; örneğin bir ödev asistanının verdiği kaynağı gerçekten açıp bakmak.</p>')}`,
    focus: 'bidik',
    say: 'Dört kural. Dördü de başıma gelenlerden çıktı!',
    mood: 'happy',
    action: 'Bıdık söylesin',
    enter(c) {
      c.ruleIndex = 0;
      c.hideScore();
    },
    act(c) {
      c.sayRule();
    },
  },
  {
    id: 'final',
    label: 'Final testi',
    title: 'Final testi: altı dersten on soru',
    body: `
      <p>Serinin son testi. On soru, her birinde tek doğru cevap. Soruların her dersten geldiğine dikkat et:</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Sorular ders sırasına göre değil, karışık verilmiştir; her dersten en az bir soru vardır. Puan, bir sonraki bölümdeki tamamlama kartına yazılır. Test tarayıcıda çalışır ve hiçbir yere gönderilmez; sınıfta kullanılacaksa sonuç öğrenciden sözlü ya da ekran görüntüsüyle alınır.</p>')}`,
    focus: 'overview',
    say: 'Son test! Ben altı derste çok çalıştım, sen de çalıştın. Hadi!',
    mood: 'curious',
    quiz: true,
    enter(c) {
      c.hideScore();
    },
  },
  {
    id: 'kart',
    label: 'Tamamlama',
    title: 'Tamamladın! İşte kartın',
    body: `
      <p>Yedi ders, altı bilgi testi ve bir final. Adını yaz, Bıdık sana tamamlama kartını hazırlasın. Kartı ekran görüntüsüyle saklayabilir ya da öğretmenine gösterebilirsin.</p>
      ${teacher('<p>Kart yalnızca tarayıcıda oluşturulur; isim ve puan hiçbir yere gönderilmez, sayfa yenilenince silinir. Final puanı bir önceki bölümden gelir; test yapılmadıysa kartta "final yapılmadı" yazar.</p>')}`,
    focus: 'bidik',
    say: 'Adını yaz, kartını hazırlayayım!',
    mood: 'joy',
    controls: `<div class="sliders"><label>Adın <input type="text" id="in-name" maxlength="40" placeholder="Adın Soyadın" autocomplete="off" style="grid-column: 2 / 4; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; font: inherit;" /></label></div>`,
    action: 'Kartımı hazırla',
    enter(c) {
      c.hideScore();
      c.$('#in-name')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') c.makeCard();
      });
    },
    act(c) {
      c.makeCard();
    },
  },
];

export const QUIZ = [
  {
    q: 'Bıdık mantıyı kaç dakika pişireceğini nasıl öğrendi?',
    options: ['Kuralı ona söyledik', 'Örneklere bakıp iplerini azıcık düzelte düzelte', 'Yemek kitabından ezberledi'],
    answer: 1,
    why: 'Doğru! Tahmin et, yanıl, düzelt: altı dersin ortak fikri.',
    nope: 'Hayır. Kural söylemedik; Bıdık örneklere baka baka iplerini ayarladı.',
  },
  {
    q: 'Antrenmanda %100, sınavda %78 alan bir model için ne denir?',
    options: ['Çok iyi öğrenmiş', 'Ezberlemiş', 'Şanslı'],
    answer: 1,
    why: 'Evet! Bu açıklık ezberin, yani aşırı öğrenmenin işareti.',
    nope: 'Antrenmanda yüksek, sınavda düşük: masadakileri ezberlemiş, kuralı öğrenmemiş.',
  },
  {
    q: 'Sınav masasındaki mantıları antrenmanda göstermemenin sebebi ne?',
    options: ['Gerçekten öğrenip öğrenmediğini ölçmek', 'Masada yer olmaması', 'Bıdık\'ı şaşırtmak'],
    answer: 0,
    why: 'Bildin! Hiç görmediği örnekte başarılıysa gerçekten öğrenmiştir.',
    nope: 'Sınav mantıları saklanır ki ezber mi öğrenme mi anlaşılsın.',
  },
  {
    q: 'Deniz Usta\'nın kocaman mantılarında Bıdık neden çuvalladı?',
    options: ['Deniz Usta\'yı sevmediği için', 'Antrenman masasında hiç büyük mantı olmadığı için', 'Büyük mantılar bozuk olduğu için'],
    answer: 1,
    why: 'Aynen! Veride kim yoksa onu öğrenemez. Çözüm: herkesin verisi masaya.',
    nope: 'Kötü niyet değil, eksik veri: masada hiç büyük mantı yoktu.',
  },
  {
    q: 'Bir yapay zekanın başarısını neden gruplara ayrı ayrı ölçeriz?',
    options: ['Ortalama, bir grubun sorununu gizleyebilir', 'Daha çok sayı olsun diye', 'Bilgisayar öyle ister'],
    answer: 0,
    why: 'Doğru! Toplam %83 "fena değil" görünürken Deniz Usta %56\'daydı.',
    nope: 'Ortalama puan iyi görünse de bir grup çok kötü olabilir; o yüzden ayrı sayılır.',
  },
  {
    q: 'Sohbet robotu bilmediği bir soruya neden akıcı bir cevap verir?',
    options: ['Yalan söylemeyi sevdiği için', 'Sıradaki en olası kelimeyi üretmeye devam ettiği için', 'İnternette bulduğu için'],
    answer: 1,
    why: 'Bildin! Model doğruyu değil, olası devamı üretir. Buna halüsinasyon denir.',
    nope: 'Niyet yok: model sadece olası devamı üretir, bilmediğinde de durmaz.',
  },
  {
    q: 'Sıcaklık ayarı çok yüksekse dil modeli ne yapar?',
    options: ['Hep aynı cümleyi söyler', 'Sürpriz ve saçma kelimeler seçmeye başlar', 'Daha doğru konuşur'],
    answer: 1,
    why: 'Evet! Yüksek sıcaklık olasılıkları düzleştirir; seyrek kelimeler öne çıkar.',
    nope: 'Tam tersi: sıcaklık düşükken hep aynı cümle, yüksekken sürpriz ve saçma kelimeler.',
  },
  {
    q: 'Bilgisayar için 8×8 siyah-beyaz bir resim nedir?',
    options: ['64 tane sayı', 'Bir çizim', 'Bir kelime'],
    answer: 0,
    why: 'Doğru! Her piksel bir sayı; resim 64 sayıdan ibaret.',
    nope: 'Bilgisayar resmi görmez, sayıları görür: 8×8 = 64 sayı.',
  },
  {
    q: 'Bıdık bir çizime "%50 mantı" derse bu ne demek?',
    options: ['Kesinlikle mantı', 'Emin değil; iki sınıfın ortasında', 'Çizim bozuk'],
    answer: 1,
    why: 'Aynen! %50 "emin değilim" demek. Güven ile doğruluk aynı şey değil.',
    nope: '%50, ikisinin tam ortası: model kararsız. Kesinlik değil.',
  },
  {
    q: 'Müşteri hıza alkışlayınca Bıdık ne öğrendi?',
    options: ['Lezzetli mantı yapmayı', 'Çiğ ama hızlı mantı servis etmeyi', 'Hiçbir şey'],
    answer: 1,
    why: 'Bildin! Neyi ödüllendirirsen onu öğrenir. Ödülü tasarlamak bizim işimiz.',
    nope: 'Bıdık tam olarak alkışlanan şeyi öğrendi: hız. Mantılar çiğ kaldı.',
  },
];
