/**
 * Lesson 02 · Ezber mi, öğrenme mi? Bıdık trains on a training table and is
 * graded on a separate test table. Few examples → memorising; many → learning;
 * wrong labels → confusion. Middle school, one idea per chapter.
 */
const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;

export const STEPS = [
  {
    id: 'masalar',
    label: 'İki masa',
    title: 'İki masa: antrenman ve sınav',
    body: `
      <p>Bu sefer mutfakta iki masa var. Soldaki <b>antrenman masası</b>: Bıdık öğrenirken yalnızca buradaki mantılara bakacak. Sağdaki <b>sınav masası</b>: buradaki mantıları antrenmanda <i>hiç</i> görmeyecek. Sınav bittikten sonra da bakabilecek.</p>
      <p>Neden iki masa? Çünkü "öğrendim" demek kolay. Gerçekten öğrenip öğrenmediğini ancak hiç görmediği mantılarda anlarız. Tıpkı senin sınavda kitaptakinin aynısı değil, benzer soruları çözmen gibi.</p>
      ${teacher('<p>Makine öğrenmesinde veri en az ikiye bölünür: <b>eğitim kümesi</b> (model bununla öğrenir) ve <b>test kümesi</b> (yalnızca ölçmek için, eğitimde asla kullanılmaz). Burada eğitim havuzunda 64, test masasında 32 mantı var; ikisi de aynı gizli kuraldan (ideal süre 3 + 6·boy dakika, ±1,5 dk) üretilmiştir ama farklı mantılardır. Gerçek projelerde üçüncü bir <b>doğrulama kümesi</b> de kullanılır.</p>')}`,
    focus: 'overview',
    say: 'Soldaki masada çalışacağım, sağdakinde sınav olacağım. Hile yok!',
    mood: 'curious',
    enter(c) {
      c.setCount(64, true);
      c.resetNet(true);
      c.network.setWeightsVisible(true);
      c.showTest(true);
    },
  },
  {
    id: 'az',
    label: 'Az örnek',
    title: 'Deney 1: Bıdık\'a sadece 6 mantı ver',
    body: `
      <p>Antrenman masasına yalnızca <b>6 mantı</b> koyduk. Bıdık bunlara yüzlerce kez bakıp iplerini düzeltecek. Sonra her iki masada da kaç mantıyı doğru bildiğine bakacağız.</p>
      <p>Tahmin et: antrenman masasında kaç puan alır? Peki sınav masasında? Düğmeye bas, birlikte görelim. Örtülerin renklerine de dikkat et: pembe şerit Bıdık'ın "kıvamında" dediği yer.</p>
      ${teacher('<p>Eğitim: tam yığın gradyan inişi, 600 adım, öğrenme hızı 1,2, yalnızca seçilen 6 örnekle. Model 33 parametreyle 6 noktayı kolayca ezberler (eğitim doğruluğu %100) ama öğrendiği karar sınırı gerçek şeride benzemez; test doğruluğu genellikle %75–80 civarında kalır. Eğitim ile test başarısı arasındaki bu açıklık <b>aşırı öğrenmenin</b> (overfitting) göstergesidir.</p>')}`,
    focus: 'overview',
    say: 'Altı mantı mı? Kolay! Hepsini aklımda tutarım.',
    mood: 'happy',
    action: 'Antrenman başlasın!',
    secondary: 'Her şeyi unut',
    stats: true,
    enter(c) {
      c.setNoise(false);
      c.setCount(6);
      c.resetNet(true);
      c.showTest(true);
      c.network.setWeightsVisible(true);
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
    id: 'ezber',
    label: 'Ezber',
    title: 'Antrenmanda tam puan, sınavda fiyasko',
    body: `
      <p>Gördün mü? Antrenman masasında <b>hepsini</b> bildi; sınav masasında bir sürü yanlış yaptı. Kırmızı halkalı mantılar yanlış bildikleri. Bıdık altı mantının yerini <b>ezberledi</b>, ama "büyük mantı daha uzun pişer" kuralını <b>öğrenmedi</b>.</p>
      <p>Örtüye bak: pembe bölge, gerçek çapraz şerit yerine tuhaf bir şekil aldı. Altı noktayı doğru bilen bir sürü farklı şekil çizilebilir; Bıdık bunlardan birini seçti, yanlış olanı. Az örnekle bu kaçınılmaz.</p>
      ${teacher('<p>Eğitim doğruluğu yüksek, test doğruluğu düşükse model <b>genelleme</b> yapamıyordur. Az veriyle model, veriye uyan pek çok hipotezden rastgele birini seçer; hangisinin gerçek kuralı yansıttığını veri belirleyemez. Kırmızı halkalar test kümesindeki yanlış tahminlerdir. Antrenman yapılmadıysa önceki bölüme dönüp çalıştırın.</p>')}`,
    focus: 'test',
    say: 'Ama… ama antrenmanda hepsini bilmiştim! Sınavda neden olmadı?',
    mood: 'worried',
    action: 'Yanlışları göster',
    stats: true,
    enter(c) {
      c.showTest(true);
      c.network.setWeightsVisible(true);
      c.updateStats();
      c.later(0.8, () => c.markWrong());
    },
    act(c) {
      c.markWrong(true);
    },
    exit(c) {
      c.clearMarks();
    },
  },
  {
    id: 'cok',
    label: 'Çok örnek',
    title: 'Deney 2: 64 mantıyla tekrar dene',
    body: `
      <p>Şimdi antrenman masasını dolduralım: <b>64 mantı</b>. Aynı Bıdık, aynı ipler, aynı sayıda tekrar. Tek fark, örnek sayısı. Antrenmanı başlat ve iki masayı karşılaştır.</p>
      <p>Kaydırıcıyla mantı sayısını değiştirip yeniden deneyebilirsin. Kaç mantıdan sonra sınav puanı antrenman puanına yaklaşıyor? Bunu bulmak senin deneyin.</p>
      ${teacher('<p>Örnek sayısı arttıkça veriye uyan hipotezlerin kümesi daralır ve model gerçek kurala yaklaşmak zorunda kalır: 64 örnekle test doğruluğu genellikle %95–100 olur. Genelleme için modelin kapasitesiyle veri miktarı dengeli olmalıdır; büyük dil modellerinin trilyonlarca kelimeyle eğitilmesinin nedeni de budur.</p>')}`,
    focus: 'overview',
    say: 'Bu sefer ezberleyemem, çok fazlalar. Öğrenmem lazım!',
    mood: 'thinking',
    action: 'Antrenman başlasın!',
    secondary: 'Her şeyi unut',
    stats: true,
    controls: `<div class="sliders"><label>Mantı sayısı <input type="range" id="sl-count" min="4" max="64" value="64" step="1" /><output id="out-count">64</output></label></div>`,
    enter(c) {
      c.setNoise(false);
      c.setCount(64);
      c.resetNet(true);
      c.showTest(true);
      c.network.setWeightsVisible(true);
      c.updateStats();
      const sl = c.$('#sl-count');
      const out = c.$('#out-count');
      sl.addEventListener('input', () => {
        out.textContent = sl.value;
        c.stopTraining();
        c.setCount(Number(sl.value));
        c.resetNet(true);
        c.updateStats();
      });
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
    id: 'yanlis',
    label: 'Yanlış etiket',
    title: 'Deney 3: Dalgın usta yanlış etiketlemiş',
    body: `
      <p>Bu sefer 64 mantı var ama bir sorun var: dalgın usta mantıların <b>dörtte birine yanlış etiket</b> yapıştırmış. Kıvamındakilere "olmamış", olmamışlara "kıvamında" demiş. Masaya bak: şeridin dışında pembe, içinde sarı mantılar var.</p>
      <p>Bıdık bunları da doğru sanıp öğrenmeye çalışacak. Sence ne olur? Antrenmanı başlat; iki masadaki puanları önceki deneyle karşılaştır.</p>
      ${teacher('<p><b>Etiket gürültüsü</b>: eğitim verisinin %25\'inde etiket ters çevrilmiştir (belirli tohumla, her seferinde aynı mantılar). Model çelişkili örnekleri uzlaştırmaya çalışır; hem eğitim hem test doğruluğu düşer, karar sınırı bozulur. Ders: modelin kalitesi verinin kalitesini geçemez ("çöp girer, çöp çıkar"). Gerçek projelerde veri temizliği ve etiket denetimi bu yüzden zaman alır.</p>')}`,
    focus: 'train',
    say: 'Şu pembe mantı şeridin çok dışında… Usta, emin misin?',
    mood: 'worried',
    action: 'Antrenman başlasın!',
    secondary: 'Etiketleri düzelt',
    stats: true,
    enter(c) {
      c.setCount(64);
      c.setNoise(true);
      c.resetNet(true);
      c.showTest(true);
      c.network.setWeightsVisible(true);
      c.updateStats();
    },
    act(c) {
      c.toggleTraining();
    },
    act2(c) {
      c.stopTraining();
      const now = !c.noisy;
      c.setNoise(now);
      c.resetNet(true);
      c.updateStats();
      c.setAction2(now ? 'Etiketleri düzelt' : 'Ustayı yine dalgınlaştır');
      c.say(now ? 'Etiketler yine karıştı!' : 'Oh, etiketler düzeldi. Şimdi tekrar deneyeyim!', 3);
    },
    exit(c) {
      c.stopTraining();
      c.setNoise(false);
    },
  },
  {
    id: 'ozet',
    label: 'Bilgi testi',
    title: 'Bilgi testi: ezber mi, öğrenme mi?',
    body: `
      <p>Üç deney yaptık. Şimdi altı kısa soru; her soruda tek bir doğru cevap var:</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Özet: (1) Eğitim ve test kümeleri ayrılır; test verisi eğitimde kullanılmaz. (2) Az veri + esnek model = aşırı öğrenme: eğitimde yüksek, testte düşük başarı. (3) Daha çok ve çeşitli veri genellemeyi iyileştirir. (4) Yanlış etiketler modeli bozar; veri kalitesi model kalitesini sınırlar.</p>')}`,
    focus: 'overview',
    say: 'Artık ezberle öğrenmeyi karıştırmıyorum. Ya sen?',
    mood: 'proud',
    quiz: true,
    enter(c) {
      c.setNoise(false);
      c.setCount(64);
      c.showTest(true);
      c.network.setWeightsVisible(true);
      // a clean, fully trained Bıdık behind the quiz (the noisy run stays in chapter 5)
      c.resetNet(true);
      c.trainSilently(600);
      c.updateStats();
    },
  },
];

export const QUIZ = [
  {
    q: 'Sınav masasındaki mantılar antrenmanda neden gösterilmedi?',
    options: ['Masada yer yoktu', 'Gerçekten öğrenip öğrenmediğini ölçmek için', 'Bıdık onları sevmiyor'],
    answer: 1,
    why: 'Doğru! Hiç görmediği mantılarda başarılıysa ezberlememiş, öğrenmiş demektir.',
    nope: 'Hayır. Sınav mantıları saklandı ki Bıdık\'ın gerçekten öğrenip öğrenmediğini anlayalım.',
  },
  {
    q: '6 mantıyla antrenman yapınca ne oldu?',
    options: ['Antrenmanda tam puan, sınavda düşük puan', 'İkisinde de tam puan', 'İkisinde de sıfır puan'],
    answer: 0,
    why: 'Aynen! Altı mantıyı ezberledi ama kuralı öğrenemedi; sınavda çuvalladı.',
    nope: 'Tekrar düşün: antrenman masasında hepsini bildi ama sınav masasında bir sürü yanlış yaptı.',
  },
  {
    q: 'Antrenmanda yüksek, sınavda düşük puan neyin işareti?',
    options: ['Öğrenmenin', 'Ezberlemenin', 'Şansın'],
    answer: 1,
    why: 'Bildin! Buna "aşırı öğrenme" ya da ezber diyoruz.',
    nope: 'Bu açıklık ezberin işareti: masadakileri biliyor, yenileri bilemiyor.',
  },
  {
    q: 'Ezberi azaltmanın en iyi yolu hangisi?',
    options: ['Daha az örnek vermek', 'Daha çok ve çeşitli örnek vermek', 'Sınav masasını kaldırmak'],
    answer: 1,
    why: 'Evet! 64 mantıyla sınav puanı antrenman puanına yaklaştı.',
    nope: 'Tam tersi. Örnek arttıkça ezberlemek zorlaşır, öğrenmek kolaylaşır.',
  },
  {
    q: 'Dalgın usta etiketlerin dörtte birini yanlış yazınca ne oldu?',
    options: ['Bıdık yine de her şeyi doğru öğrendi', 'Hem antrenman hem sınav puanı düştü', 'Sadece sınav masası etkilendi'],
    answer: 1,
    why: 'Doğru! Yanlış örnekler Bıdık\'ın kafasını karıştırdı; iki masada da puan düştü.',
    nope: 'Hayır. Yanlış etiketler Bıdık\'ı hem antrenmanda hem sınavda şaşırttı.',
  },
  {
    q: 'Bir yapay zekanın kalitesini en çok ne belirler?',
    options: ['Verinin miktarı ve doğruluğu', 'Robotun şapkasının rengi', 'Bilgisayarın markası'],
    answer: 0,
    why: 'Aynen! Çok ve doğru örnek olmadan en iyi model bile öğrenemez.',
    nope: 'Şapka değil! Modelin öğrenebileceği şey, verisinin miktarı ve doğruluğuyla sınırlı.',
  },
];
