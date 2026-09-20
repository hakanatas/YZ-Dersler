/**
 * Lesson chapters for middle school (ages 10–14). Bıdık, the apprentice
 * robot chef, learns how long to cook a dumpling. Every chapter: one idea,
 * one thing to do, and a teacher note with the real terms.
 */
const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;

export const STEPS = [
  {
    id: 'veri',
    label: 'Mantılar',
    title: 'Bıdık\'a kural değil, örnek veriyoruz',
    body: `
      <p>Bıdık'ın derdi şu: mantıları bazen çiğ kalıyor, bazen lapa oluyor. Büyük mantı daha uzun pişer, tamam da tam olarak ne kadar? Bunu ona kural olarak söylemeyeceğiz. Masaya bir sürü pişmiş mantı dizeceğiz, Bıdık kendi çözecek.</p>
      <p>Masada sağa gittikçe mantılar büyüyor, yukarı çıktıkça daha uzun pişmişler. <span class="sweet">Pembeler tam kıvamında</span>, <span class="salty">sarılar olmamış</span>: ya çiğ kalmış ya da fazla pişmiş. Masaya dikkatli bak: bir desen görüyor musun?</p>
      ${teacher('<p>Bu masa <b>eğitim verisi</b>dir. Her mantı bir <b>örnek</b>: iki <b>özellik</b> (boy: 0–1, pişme süresi: 0–10 dakika) ve bir <b>etiket</b> (tam kıvamında = 1, olmamış = 0). Masada <span data-count="dishes">64</span> örnek var. Masanın gizli kuralı: ideal süre 3 + 6·boy dakika, ±1,5 dakika tolerans. Bu yüzden "kıvamında" bölgesi çapraz bir şerittir. Şerit tek bir düz çizgiyle ayrılamaz; yani doğrusal olmayan bir kuraldır ve gizli katmanı olmayan bir model bunu öğrenemez.</p>')}`,
    focus: 'board',
    say: 'Ooo, bu kadar mantı mı? Hangisi kıvamında, hangisi olmamış, bakayım!',
    mood: 'curious',
    enter(c) {
      c.board.tintTarget = 0;
      c.network.setWeightsVisible(false);
      c.tokens.visible = false;
      c.board.hideAll();
      c.board.dishes.forEach((_, i) => c.later(0.15 + i * 0.045, () => c.board.revealDish(i)));
      c.later(0.4, () => c.sound.play('refill', { volume: 0.5 }));
    },
  },
  {
    id: 'model',
    label: 'Kafası',
    title: 'Bıdık\'ın kafasının içine bakalım',
    body: `
      <p>Hazır mısın? Bıdık'ın kafasının içi işte böyle. Mantının boyu ve pişme süresi soldan giriyor. Ortadaki sekiz <b>yardımcı</b> bu iki sayıyı dinleyip kendi aralarında fısıldaşıyor. En sağdaki yardımcı da son sözü söylüyor: <i>tam kıvamında mı?</i></p>
      <p>Yardımcıları bağlayan <b>ipleri</b> gördün mü? Her ip bir fısıltı taşıyor. Kalın ip, güçlü fısıltı demek. <span class="salty2">Kiremit rengi ip</span> fısıltıyı olduğu gibi iletiyor: "artır!" <span class="slate">Mavi ip</span> ise tersine çeviriyor: "azalt!" Şu anda ipler rastgele ayarlanmış; Bıdık daha hiçbir şey bilmiyor. Ama merak etme, az sonra öğrenecek.</p>
      ${teacher('<p>Bu bir <b>yapay sinir ağı</b>: 2 giriş, 8 düğümlü bir gizli katman, 1 çıkış. İpler <b>ağırlık</b>tır (2·8 + 8 = 24 tane); ayrıca gizli ve çıkış düğümlerinin her birinde bir <b>sapma</b> (bias) değeri vardır (9 tane). Toplam 33 <b>parametre</b>. İpin kalınlığı ağırlığın büyüklüğünü, rengi işaretini gösterir: kiremit = pozitif, mavi = negatif. Başlangıçta hepsi rastgeledir.</p>')}`,
    focus: 'network',
    say: 'İplerim dolaşmış! Kafam karıştı, ne yapacağım şimdi?',
    mood: 'worried',
    action: 'İpleri karıştır!',
    enter(c) {
      c.board.revealAll();
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.later(0.5, () => c.sound.play('pick'));
    },
    act(c) {
      c.shuffleWeights();
    },
  },
  {
    id: 'ileri',
    label: 'Oyun',
    title: 'Hadi bir oyun: önce sen, sonra Bıdık',
    body: `
      <p>Masadan bir mantı seçtim. Boyuna ve kaç dakika piştiğine bak. Sence tam kıvamında mı, yoksa olmamış mı? Korkma, yanlış cevap sorun değil; sadece tahmin!</p>
      <p>Sen söyleyince sıra Bıdık'a geçiyor. Sayılar iplerden akıp yardımcılara ulaşıyor; parlayan yardımcılar en çok heyecanlananlar. En sondaki yardımcı bir yüzde söylüyor: "%80 kıvamında" gibi. %50'yi geçerse Bıdık "tam kıvamında!" diyor, geçmezse "olmamış!" diyor.</p>
      ${teacher('<p>Bu bir <b>ileri geçiş</b>tir: her düğüm girdilerini ağırlıklarla çarpıp toplar, sapmayı ekler, sonra bir <b>aktivasyon fonksiyonu</b>ndan (burada tanh) geçirir. Çıkış düğümü sigmoid fonksiyonuyla 0–1 arasında bir olasılık üretir; eşik 0,5. Eğitilmemiş bir model rastgele ağırlıklarla çalıştığı için çoğunlukla yanılır.</p>')}`,
    focus: 'network',
    say: 'Bir mantı seçtim. Önce sen söyle, sonra ben deneyeyim!',
    mood: 'curious',
    guess: true,
    action: 'Başka bir mantı seç',
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.later(0.5, () => c.newGuessRound());
    },
    act(c) {
      c.newGuessRound();
    },
  },
  {
    id: 'hata',
    label: 'Düzelt',
    title: 'Yanılmak sorun değil, düzeltmek önemli',
    body: `
      <p>Bıdık yanılınca ne oluyor biliyor musun? Üzülmüyor, öğreniyor! Önce "ne kadar yanıldım?" diye bakıyor; buna <b>hata puanı</b> diyoruz. Sonra her ipi, hatayı azaltacak yöne doğru <i>azıcık</i> oynatıyor: kimini kalınlaştırıyor, kimini inceltiyor.</p>
      <p>Mavi ışıkları izle: geriye doğru gidiyorlar. Bu, "hangi ip hataya ne kadar sebep oldu?" sorusunun cevabı. Ardından ipler biraz değişiyor ve hata puanı düşüyor. İşte öğrenmek dediğimiz şey tam olarak bu. Düğmeye bas, kendin gör!</p>
      ${teacher('<p>Modelin tahmini ile gerçek etiket arasındaki uyumsuzluk bir sayıyla ölçülür: <b>kayıp</b> (loss). Burada ikili çapraz entropi kullanılıyor ve ekrandaki "hata puanı" masadaki tüm mantılar için kaybın ortalamasıdır. <b>Geri yayılım</b> her ağırlığın kaybı ne yöne, ne kadar değiştirdiğini (türevini) hesaplar; <b>gradyan inişi</b> ağırlıkları o yönün tersine küçük bir adım oynatır. Her düğmeye basış, masadaki tüm mantılara bakan bir adımdır.</p>')}`,
    focus: 'network',
    say: 'Yanıldım galiba. Olsun! Bakalım hangi ip suçlu?',
    mood: 'thinking',
    action: 'Hadi düzelt!',
    stats: true,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.updateStats();
    },
    act(c) {
      c.learnStep();
    },
  },
  {
    id: 'egitim',
    label: 'Antrenman',
    title: 'Tekrar, tekrar, tekrar!',
    body: `
      <p>Bir düzeltme yetmez tabii. Bıdık masadaki mantılara yüzlerce kez bakıp her seferinde ipleri azıcık düzeltiyor. Buna <b>antrenman</b> diyoruz. Bisiklete binmeyi öğrenmek gibi: düşe kalka ama sonunda oluyor.</p>
      <p>Antrenman sırasında masa örtüsüne bak. <span class="sweet">Pembe</span> şerit Bıdık'ın "burada tam kıvamında" dediği yer, <span class="salty">sarı</span> bölgeler "burada olmamış" dediği yerler. Kimse ona "büyük mantı uzun pişer" demedi. Örneklere baka baka kendi buldu. Süper, değil mi?</p>
      ${teacher('<p><b>Eğitim</b>: tam yığın gradyan inişi, öğrenme hızı 1,2, 600 adım; her adımda masadaki mantıların hepsi kullanılır. Kayıp düşerken doğruluk yükselir. Örtüdeki renk, modelin her (boy, süre) noktası için tahminidir; pembe ile sarının kesiştiği çizgi <b>karar sınırı</b>dır. Çapraz şerit yalnızca gizli katman sayesinde öğrenilebilir.</p>')}`,
    focus: 'overview',
    say: 'Hadi antrenman! Düşe kalka öğrenirim, göreceksin.',
    mood: 'happy',
    action: 'Antrenman başlasın!',
    secondary: 'Her şeyi unut',
    stats: true,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.board.tintTarget = c.net.steps > 0 ? 1 : 0;
      c.board.paint((s, t) => c.net.predict([s, t]));
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
    id: 'test',
    label: 'Sınav',
    title: 'Sınav zamanı: yepyeni bir mantı!',
    body: `
      <p>Bıdık çalıştı, şimdi sınav! Masaya hiç görmediği bir mantı koy: örtüye tıkla ya da kaydırıcılarla boyunu ve süresini ayarla. Sonra yine önce sen tahmin et, ardından Bıdık.</p>
      <p>Şeridin kenarına yakın mantılarda Bıdık biraz kararsız kalabilir: "%55 kıvamında" gibi. Hiç dert değil; biz de bazen "hmm, bir dakika daha mı pişseydi?" demez miyiz? Önemli olan şu: Bıdık hiç görmediği bir mantı için de fikir yürütebiliyor.</p>
      ${teacher('<p>Görülmemiş örneklerde doğru tahmin yapabilmeye <b>genelleme</b> denir. Bu bölümdeki mantı eğitim verisinde yoktur; doğru cevap, tahminden sonra masanın gizli kuralına göre gösterilir. Model az eğitildiyse bir önceki bölümde antrenmanı çalıştırın.</p>')}`,
    focus: 'board',
    say: 'Yeni mantı mı? Heyecanlandım! Bakalım bilebilecek miyim.',
    mood: 'curious',
    sliders: true,
    guess: true,
    enter(c) {
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.board.tintTarget = c.net.steps > 0 ? 1 : 0;
      c.board.paint((s, t) => c.net.predict([s, t]));
      c.setProbe(0.62, 0.45, true);
    },
    exit(c) {
      c.board.probe.visible = false;
    },
  },
  {
    id: 'llm',
    label: 'Sohbet',
    title: 'Sohbet robotları da tıpkı Bıdık gibi',
    body: `
      <p>ChatGPT gibi sohbet robotlarını duydun mu? Onlar da Bıdık'la aynı yöntemle öğrendi: tahmin et, yanıl, düzelt, tekrar. Sadece oyunları farklı: "kıvamında mı?" yerine <b>"sıradaki kelime ne?"</b> oyunu oynuyorlar.</p>
      <p>Milyonlarca kitap ve yazı okudular. Her seferinde sıradaki kelimeyi tahmin ettiler, yanılınca iplerini düzelttiler. Bıdık'ın 33 ipi var; onların milyarlarca ipi var. Şimdi sen de oyna: en olası kelimeyi seç, cümle büyüsün!</p>
      ${teacher('<p><b>Büyük dil modelleri</b> metni <b>token</b> denen parçalara (kelime ya da kelime parçası) böler ve bir sonraki token için olasılık dağılımı üretir. Aynı döngüyle eğitilir: tahmin et → kaybı ölç → ağırlıkları düzelt; fark, milyarlarca (en büyüklerinde trilyonlarca) parametre ve çok daha büyük veridir. Sohbet edebilmeleri için bu ön eğitimin üstüne insan geri bildirimiyle ek bir eğitim de yapılır. Buradaki kelimeler ve yüzdeler gerçek bir dil modelinden gelmiyor; fikri göstermek için elle yazıldı (tarayıcıda çalışan gerçek bir sayma modeli Ders 04\'te var). Burada hep en olası kelime seçiliyor; gerçek modeller genellikle olasılıklardan rastgele örnekleme yapar (sıcaklık ayarı).</p>')}`,
    focus: 'tokens',
    say: 'Bu oyunu ben de biliyorum: sıradaki kelime ne?',
    mood: 'happy',
    action: 'Sıradaki kelimeyi seç!',
    enter(c) {
      c.board.tintTarget = 0;
      c.board.hideAll();
      c.network.setWeightsVisible(false);
      c.network.visible = false;
      c.tokens.visible = true;
      c.tokens.build(0, true);
      c.updateTokenReadout();
    },
    act(c) {
      c.tokens.next();
      c.sound.play('pick');
      c.updateTokenReadout();
    },
    exit(c) {
      c.tokens.visible = false;
      c.network.visible = true;
      c.board.revealAll();
      c.network.setWeightsVisible(true);
    },
  },
  {
    id: 'ozet',
    label: 'Bilgi testi',
    title: 'Bilgi testi: şimdi sıra sende!',
    body: `
      <p>Bıdık öğrendi, peki ya sen? Altı kısa soru soruyorum. Her soruda tek bir doğru cevap var, hadi bakalım:</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Özet: (1) Model kural ezberlemez, örneklerden öğrenir. (2) Model, ağırlıklarla dolu bir tahmin makinesidir. (3) Eğitim: tahmin et, kaybı ölç, ağırlıkları azıcık düzelt; bunu çok kez tekrarla. (4) Genelleme: görülmemiş örneklerde de doğru tahmin. (5) Dil modelleri aynı döngüyü "sıradaki token" görevinde uygular.</p>')}`,
    focus: 'overview',
    say: 'Artık mantıyı tam kıvamında pişirebiliyorum! Peki ya sen?',
    mood: 'proud',
    quiz: true,
    enter(c) {
      c.board.revealAll();
      c.board.tintTarget = c.net.steps > 0 ? 1 : 0;
      c.board.paint((s, t) => c.net.predict([s, t]));
      c.network.setWeightsVisible(true);
      c.tokens.visible = false;
      c.startAmbientPulses();
      c.buildQuiz();
    },
    exit(c) {
      c.stopAmbientPulses();
    },
  },
];

export const QUIZ = [
  {
    q: 'Bıdık mantıyı ne kadar pişireceğini nasıl öğrendi?',
    options: ['Ona kuralı söyledik', 'Bir sürü örneğe baktı', 'Yemek kitabı okudu'],
    answer: 1,
    why: 'Aynen öyle! Kural falan söylemedik; Bıdık pişmiş mantılara baka baka deseni kendi buldu.',
    nope: 'Hmm, hayır. Ona hiç kural söylemedik, kitap da vermedik; sadece masadaki mantıları gösterdik.',
  },
  {
    q: 'Bıdık\'ın kafasındaki ipler ne işe yarıyor?',
    options: ['Süs olsun diye duruyorlar', 'Yardımcılar arasında fısıltı (sayı) taşıyorlar', 'Mantıları masaya bağlıyorlar'],
    answer: 1,
    why: 'Doğru! Her ip bir sayı taşıyor. Kalınlığı fısıltının gücünü, rengi ise "artır" mı "azalt" mı dediğini gösteriyor.',
    nope: 'Süs değil! İpler yardımcılar arasında sayıları taşıyor; öğrenmek demek bu ipleri ayarlamak demek.',
  },
  {
    q: 'Bıdık yanlış tahmin edince ne yaptı?',
    options: ['Pes etti', 'Bütün ipleri kopardı', 'İpleri azıcık düzeltti'],
    answer: 2,
    why: 'Evet! Her yanlış, ipleri biraz daha iyi ayarlamak için bir fırsat. Bıdık bunu çok iyi biliyor.',
    nope: 'Bıdık asla pes etmez, ipleri de koparmaz! Yanlış yapınca ipleri azıcık düzeltir, o kadar.',
  },
  {
    q: 'Antrenman sırasında "hata puanı" ne olmalı?',
    options: ['Gitgide düşmeli', 'Gitgide yükselmeli', 'Hiç değişmemeli'],
    answer: 0,
    why: 'Bildin! Hata puanı düştükçe Bıdık daha az yanılıyor demek. Antrenmanda grafiğin aşağı indiğini görmüştün.',
    nope: 'Tam tersi. Hata puanı "ne kadar yanıldım?" demek; öğrendikçe düşmesi gerekir.',
  },
  {
    q: 'Sınavda Bıdık\'a neden hiç görmediği bir mantı verdik?',
    options: ['Onu şaşırtmak için', 'Gerçekten öğrenip öğrenmediğini anlamak için', 'Masada yer kalmadığı için'],
    answer: 1,
    why: 'Aynen! Ezberlemek başka, öğrenmek başka. Yeni bir mantıyı da bilebiliyorsa gerçekten öğrenmiş demektir.',
    nope: 'Şaka değil, sınav! Yeni bir mantıyı da bilebiliyorsa ezberlememiş, gerçekten öğrenmiş demektir.',
  },
  {
    q: 'Sohbet robotları hangi oyunu oynayarak öğrendi?',
    options: ['Hava durumunu tahmin etme', 'Sıradaki kelimeyi tahmin etme', 'Mantı pişirme'],
    answer: 1,
    why: 'Bildin! Milyonlarca yazıda cümlenin sıradaki kelimesini tahmin ede ede öğrendiler.',
    nope: 'Hayır. Onların oyunu "sıradaki kelime ne?" oyunu; yanılınca onlar da iplerini düzeltti.',
  },
];
