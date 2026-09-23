/**
 * Lesson 03 · Bıdık kimin mantısını tattı? Three chefs make dumplings of
 * three sizes; Bıdık trains on two of them and is graded per chef. Coverage
 * bias and fairness, for middle school: one idea and one hands-on thing per
 * chapter, and a teacher note with the real terms.
 */
import { CHEFS } from './data.js';

const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;
const dot = (col) => `<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${col};margin-right:5px"></i>`;
const chefSpan = (i, text) => `<span style="color:${CHEFS[i].color};font-weight:600">${text}</span>`;
const legend = () =>
  `<p style="margin:0;font-size:12.5px;color:var(--ink-soft)">${CHEFS.map((ch) => `<span style="white-space:nowrap;margin-right:10px">${dot(ch.color)}<b>${ch.name}</b> · ${ch.label}</span>`).join('')}</p>`;

export const GUESSES = ['Hepsini bilir', 'Bazılarını yanlış bilir', 'Hiçbirini bilemez'];

export const STEPS = [
  {
    id: 'ustalar',
    label: 'Üç usta',
    title: 'Üç usta, üç boy mantı',
    body: `
      <p>Bugün mutfakta üç usta var. <b>Ayşe Usta</b> minik mantılar yapıyor, <b>Kemal Usta</b> orta boy, <b>Deniz Usta</b> ise kocaman. Üçü de aynı kurala göre pişiriyor: büyük mantı daha uzun pişer. Sağdaki <b>sınav masası</b>nda her ustadan 16 mantı var, toplam 48.</p>
      <p>Her tabağın altındaki renkli halka mantının hangi ustadan geldiğini gösterir: ${chefSpan(0, 'yeşil Ayşe')}, ${chefSpan(1, 'mavi Kemal')}, ${chefSpan(2, 'mor Deniz')}. Mantının rengi ise yine sonuç: <span class="sweet">pembe tam kıvamında</span>, <span class="salty">sarı olmamış</span>. <b>"Sıradaki ustayı tanıt"</b> düğmesine basıp ustaları tek tek tanı.</p>
      ${teacher('<p>Sınav (test) kümesi: 48 örnek, her ustadan 16. Özellikler yine boy (0–1) ve pişme süresi (0–10 dakika); etiket "tam kıvamında" (1) ya da "olmamış" (0). Ustaların boy aralıkları: Ayşe 0,05–0,35, Kemal 0,35–0,65, Deniz 0,65–0,95. Bu dersin gizli mutfak kuralı önceki derslerden farklı olarak <b>eğri</b>dir: ideal süre 3 + 6·boy² dakika, ±1,5 dakika (kocaman mantının içi orantısız geç pişer); bu yüzden pembe şerit sağa doğru yukarı kıvrılır. Ders 01–02\'deki düz kuralla (3 + 6·boy) model şeridi hiç görmediği bölgeye de doğru uzatıyor ve bu dersin etkisi görünmüyordu; bu sayısal olarak denendi. Model öncekiyle aynı: 2 giriş, 8 gizli düğüm, 1 çıkış; 33 parametre.</p>')}`,
    focus: 'test',
    say: 'Üç usta, üç boy mantı. Hepsini tanıyorum… sanırım?',
    mood: 'curious',
    action: 'Sıradaki ustayı tanıt',
    controls: legend(),
    enter(c) {
      c.chefTour = -1;
      c.showRule(false);
      c.clearMarks();
      c.network.setWeightsVisible(true);
      c.showTest(true);
      c.paint();
      c.later(0.9, () => c.nextChef());
    },
    act(c) {
      c.nextChef();
    },
  },
  {
    id: 'masa',
    label: 'Masada kim var?',
    title: 'Antrenman masasında kim var?',
    body: `
      <p>Şimdi soldaki <b>antrenman masası</b>na bak. Ayşe Usta 24 mantı getirdi, Kemal Usta 24 mantı getirdi. Deniz Usta o gün çok meşguldü, hiç getiremedi. Masada 48 mantı var ama <b>hiç mor halka yok</b>.</p>
      <p>Bıdık az sonra sadece bu masadaki mantılarla çalışacak, sonra üç ustanın mantılarıyla sınava girecek. Sence Deniz Usta'nın kocaman mantılarında ne olur? Tahminini seç, sonra deneyelim.</p>
      ${teacher('<p>Eğitim kümesi 48 örnek: Ayşe 24, Kemal 24, Deniz 0. Etiketlerde hata yok; veri <b>yanlış</b> değil, <b>eksik</b>: boyu 0,65\'ten büyük tek bir örnek bile yok. Buna <b>kapsama yanlılığı</b> ya da <b>örnekleme yanlılığı</b> (sampling bias) denir: eğitim verisinin dağılımı, modelin kullanılacağı gerçek dağılımdan farklıdır. Öğrencinin tahmini kaydedilir ve antrenmandan sonra sonuçla karşılaştırılır.</p>')}`,
    focus: 'train',
    say: 'Deniz Usta gelmemiş. Olsun, mantı mantıdır, değil mi?',
    mood: 'happy',
    controls: `<div class="chips" id="guess">${GUESSES.map((g, i) => `<button type="button" class="btn" data-guess="${i}">${g}</button>`).join('')}</div>${legend()}`,
    enter(c) {
      c.showRule(false);
      c.clearMarks();
      c.setDeniz(0);
      c.resetNet(true);
      c.showTest(true);
      c.network.setWeightsVisible(true);
      c.paint();
      c.readout(`<span class="big">Masada 48 mantı</span>${chefSpan(0, 'Ayşe 24')} · ${chefSpan(1, 'Kemal 24')} · ${chefSpan(2, 'Deniz 0')}. Deniz Usta'nın mantılarında Bıdık ne yapar?`);
      const host = c.$('#guess');
      const mark = () => host.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.guess) === c.guess)));
      mark();
      host.querySelectorAll('button').forEach((b) =>
        b.addEventListener('click', () => {
          c.guess = Number(b.dataset.guess);
          mark();
          c.sound.play('pick', { volume: 0.5 });
          c.bidik.react('thinking', 1.5);
          c.say(`"${GUESSES[c.guess]}" diyorsun. Görelim bakalım!`, 3);
          c.readout(`<span class="big">Tahminin: ${GUESSES[c.guess].toLowerCase()}</span>Bir sonraki bölümde antrenmanı başlat, sonucu karşılaştıralım.`);
        })
      );
    },
  },
  {
    id: 'antrenman',
    label: 'Antrenman',
    title: 'Antrenman ve sınav: usta usta puan',
    body: `
      <p>Bıdık antrenman masasına 600 kez bakıp iplerini düzeltecek; tıpkı önceki derslerdeki gibi. Sonra sınav masasındaki 48 mantıyı tek tek tadacak. Puanı bu sefer <b>usta usta ayrı</b> sayacağız: Ayşe'nin mantılarında kaç doğru, Kemal'inkilerde kaç, Deniz'inkilerde kaç?</p>
      <p><b>"Antrenman başlasın!"</b> düğmesine bas. Antrenman bitince sınav masasında yanlış bilinen mantıların altında kırmızı halka belirecek. Kırmızı halkaların hangi renkli halkaların üstünde toplandığına dikkat et.</p>
      ${teacher('<p>Eğitim: tam yığın gradyan inişi, 600 adım, öğrenme hızı 1,2. Veri ve başlangıç ağırlıkları sabit tohumlu olduğu için sonuç her seferinde aynıdır. Eğitim doğruluğu %100. Sınav masasında usta başına doğruluk: Ayşe 16/16 (%100), Kemal 15/16 (%94), Deniz 9/16 (%56). Toplam doğruluk 40/48 (%83) "fena değil" görünür; sorun ancak gruplara ayrı bakınca ortaya çıkar. Bu yüzden adalet değerlendirmelerinde başarı <b>alt gruplar</b> için ayrı ayrı ölçülür.</p>')}`,
    focus: 'overview',
    say: 'Bakıyorum, düzeltiyorum, bakıyorum, düzeltiyorum…',
    mood: 'curious',
    action: 'Antrenman başlasın!',
    secondary: 'Her şeyi unut',
    stats: true,
    controls: legend(),
    enter(c) {
      c.showRule(false);
      const changed = c.denizCount !== 0;
      c.setDeniz(0, true);
      if (changed) c.resetNet(true);
      c.showTest(true);
      c.network.setWeightsVisible(true);
      c.updateStats();
      if (c.net.steps > 0) c.markWrong();
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
    id: 'neden',
    label: 'Neden?',
    title: 'Neden? Bıdık kötü niyetli değil',
    body: `
      <p>Kırmızı halkaların neredeyse hepsi ${chefSpan(2, 'mor')} halkaların üstünde: Deniz Usta'nın 16 mantısından 7'si yanlış, Kemal Usta'nın ise yalnızca 1'i, Ayşe Usta'nın hiçbiri. Bıdık, tam kıvamında pişmiş 5 büyük mantıya "olmamış" dedi; çiğ kalmış 2 tanesine "kıvamında" dedi. Peki Bıdık Deniz Usta'yı sevmiyor mu? Hayır! Bıdık büyük mantıyı <b>hiç görmedi</b> ki.</p>
      <p>Örtüye bak: Bıdık pembe şeridi küçük ve orta mantılardan öğrendi, sonra sağa doğru <b>dümdüz uzattı</b>. Oysa gerçek şerit büyük mantılarda yukarı kıvrılıyor: kocaman mantının içi geç pişer. <b>"Gerçek şeridi göster"</b> düğmesine basıp gerçek şeridi örtünün üstünde gör. Bıdık'ın kuralı basit: <b>veri kimi içeriyorsa onu öğrenir.</b></p>
      ${teacher('<p>Model, verinin olmadığı bölgede <b>dış değerleme</b> (ekstrapolasyon) yapar: gördüğü şeridi düz devam ettirir. Gerçek kural eğri (3 + 6·boy²) olduğu için büyük mantılarda modelin şeridi gerçeğin altında kalır. Sınav masasındaki yanlışlar: 3,9 ve 4,9 dakika pişmiş iki çiğ mantıya "kıvamında"; 6,5–7,4 dakika pişmiş, kıvamındaki beş mantıya "olmamış". Kemal Usta\'nın tek yanlışı da aralığının büyük ucunda (boy 0,56). Bu yanlılık modelin kötü olmasından değil, eğitim verisinin sınav dağılımını <b>kapsamamasından</b> kaynaklanır (dağılım kayması, "out-of-distribution"). Koyu çizgiler gerçek şeridin iki sınırıdır.</p>')}`,
    focus: 'test',
    say: 'Ama… büyük mantıyı hiç görmedim ki! Nereden bileyim?',
    mood: 'worried',
    action: 'Gerçek şeridi göster',
    controls: legend(),
    enter(c) {
      // reached from any chapter (the dots skip chapters): make sure the table is Ayşe + Kemal only
      if (c.denizCount !== 0 || !c.subset.length) {
        c.setDeniz(0, true);
        c.resetNet(true);
      }
      if (c.net.steps === 0) c.trainSilently(600);
      c.showTest(true);
      c.network.setWeightsVisible(true);
      c.updateStats();
      c.showRule(false);
      c.later(0.8, () => c.markWrong());
    },
    act(c) {
      const on = !c.ruleShown;
      c.showRule(on);
      c.setAction(on ? 'Gerçek şeridi gizle' : 'Gerçek şeridi göster');
      c.sound.play(on ? 'pick' : 'click', { volume: 0.5 });
      if (on) {
        c.bidik.react('surprised', 2);
        c.say('Aa, şerit yukarı kıvrılıyormuş! Ben dümdüz sanmıştım.', 4);
      }
    },
    exit(c) {
      c.showRule(false);
      c.clearMarks();
    },
  },
  {
    id: 'duzelt',
    label: 'Düzelt',
    title: 'Düzelt: Deniz Usta\'yı masaya çağır',
    body: `
      <p>Çözüm belli: Deniz Usta'nın mantılarını da antrenman masasına koyalım. 24 tanesini getirdik; mor halkalar artık masada. Bıdık her şeyi unutup baştan çalışacak: aynı 600 tekrar, aynı ipler. Tek fark, masada artık <b>herkes</b> var.</p>
      <p>Antrenmanı başlat ve üç puanı karşılaştır. Kaydırıcıyla Deniz Usta'nın kaç mantısını masaya koyacağını seçebilirsin. Kaç mantı yetiyor? Dene ve gör.</p>
      ${teacher('<p>Deniz Usta\'nın 24 mantısıyla (eğitim kümesi 72 örnek) sınav doğruluğu: Ayşe 16/16, Kemal 16/16, Deniz 16/16. Kaydırıcıyla: Deniz\'den 0–3 mantı → Deniz 9/16 (Kemal 15/16); 4–7 mantı → Deniz 14/16; 8 ve üzeri → 16/16 (Ayşe her durumda 16/16). Birkaç örnek bile çok şey değiştirir, çünkü model artık o bölgede kısıtlanır. Gerçek projelerde çözüm de budur: eksik grubun verisini toplamak ve başarıyı her grup için ayrı ölçmek.</p>')}`,
    focus: 'overview',
    say: 'Deniz Usta geldi! Şimdi kocaman mantıları da öğrenebilirim.',
    mood: 'happy',
    action: 'Antrenman başlasın!',
    secondary: 'Her şeyi unut',
    stats: true,
    controls: `<div class="sliders"><label>Deniz'in mantısı <input type="range" id="sl-deniz" min="0" max="24" value="24" step="1" /><output id="out-deniz">24</output></label></div>${legend()}`,
    enter(c) {
      c.showRule(false);
      c.clearMarks();
      c.setDeniz(24);
      c.resetNet(true);
      c.showTest(true);
      c.network.setWeightsVisible(true);
      c.updateStats();
      const sl = c.$('#sl-deniz');
      const out = c.$('#out-deniz');
      sl.addEventListener('input', () => {
        out.textContent = sl.value;
        c.stopTraining();
        c.clearMarks();
        c.setDeniz(Number(sl.value), true);
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
    id: 'hayat',
    label: 'Gerçek hayat',
    title: 'Gerçek hayatta: yüzler, sesler, adalet',
    body: `
      <p>Bu sadece mantı meselesi değil. 2018'de Joy Buolamwini ve Timnit Gebru adlı iki araştırmacı, fotoğraftaki yüze bakıp "kadın mı, erkek mi" diyen ticari programları test etti. Programlar açık tenli erkeklerde en fazla %0,8 hata yaparken koyu tenli kadınlarda hata %34,7'ye kadar çıkıyordu. Neden? Programların öğrendiği fotoğraf yığınlarında koyu tenli kadın çok azdı. Tıpkı masada Deniz Usta'nın mantısının olmaması gibi.</p>
      <p>Sesli asistanlar da bazı aksanları daha zor anlıyor; çünkü o aksanla konuşan insanlardan az ses kaydı dinlediler. Çözüm hep aynı: masaya <b>herkesin</b> verisini koymak ve puanı <b>her grup için ayrı</b> saymak.</p>
      <p>Bıdık'ın bildiği üç gerçek örnek daha var: konuşmayı yazıya çeviren programlar, iş başvurularını puanlayan bir program ve deri hastalıklarını tanıyan programlar. <b>"Örnekleri göster"</b> düğmesine bas; her basışta yeni bir örnek gelsin.</p>
      ${teacher('<p>Kaynak: "Gender Shades" (Buolamwini &amp; Gebru, 2018). Çalışma üç ticari yüz analiz sisteminin cinsiyet sınıflandırmasını, ten rengi ve cinsiyete göre dengelenmiş bir veri kümesinde ölçtü: açık tenli erkeklerde hata en fazla %0,8, koyu tenli kadınlarda %34,7\'ye kadar. Nedeni, kullanılan yüz veri kümelerinde koyu tenli kadınların çok az temsil edilmesiydi. Bu tür sorunlara <b>algoritmik yanlılık</b> denir; çözüm çeşitli veri toplamak, alt gruplarda ayrı test etmek ve sonuçları raporlamaktır. Düğmeyle gelen üç örneğin kaynakları: (1) Koenecke ve ark., "Racial disparities in automated speech recognition", PNAS, 2020: Amazon, Apple, Google, IBM ve Microsoft\'un sistemlerinde ortalama kelime hata oranı siyahi konuşmacılarda 0,35, beyaz konuşmacılarda 0,19; yazarlar en olası nedeni eğitim verisindeki ses kayıtlarının yetersizliği olarak gösterir. (2) Reuters, Ekim 2018: Amazon\'un deneysel işe alım aracı 10 yıllık, çoğunluğu erkeklerden gelen özgeçmişlerle eğitilmiş, "women\'s" kelimesini içeren özgeçmişlerin puanını düşürmüş; şirket projeyi bırakmıştır. Bu örnekte sorun eksik grup değil, geçmişteki dengesizliği taşıyan veridir. (3) Wen ve ark., "Characteristics of publicly available skin cancer image datasets", Lancet Digital Health, 2021 (çevrim içi) / 2022: 21 açık veri kümesi, ten tipi kayıtlı 2.436 görüntüden 10\'u kahverengi, 1\'i koyu kahverengi ya da siyah ten. Sınıfta tartışma: hangi örnek "eksik veri", hangisi "geçmişin dengesizliği"?</p>')}`,
    focus: 'bidik',
    say: 'Verimde kim yoksa onu tanıyamıyorum. İnsanların programları da öyle!',
    mood: 'thinking',
    action: 'Örnekleri göster',
    enter(c) {
      c.showRule(false);
      c.clearMarks();
      c.exampleIdx = -1;
    },
    act(c) {
      c.nextExample();
    },
  },
  {
    id: 'ozet',
    label: 'Bilgi testi',
    title: 'Bilgi testi: veri kimi içeriyorsa…',
    body: `
      <p>Üç usta, iki deney, bir ders: yapay zeka verisinde kim varsa onu öğrenir. Şimdi altı kısa soru; her soruda tek bir doğru cevap var:</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Özet: (1) Model, eğitim verisinin kapsamadığı grupta kötü çalışır; bu kötü niyet değil, eksik veridir. (2) Ortalama başarı bir grubun sorununu gizleyebilir; başarı gruplara ayrı ölçülür. (3) Çözüm eksik grubun verisini toplamak ve yeniden eğitmektir. (4) Aynı mekanizma yüz analizi, ses tanıma gibi gerçek sistemlerde de görülür.</p>')}`,
    focus: 'overview',
    say: 'Artık üç ustanın mantısını da tanıyorum. Ya sen?',
    mood: 'proud',
    quiz: true,
    enter(c) {
      c.showRule(false);
      c.clearMarks();
      if (c.denizCount !== 24) {
        c.setDeniz(24, true);
        c.resetNet(true);
      }
      if (c.net.steps === 0) c.trainSilently(600);
      c.showTest(true);
      c.network.setWeightsVisible(true);
      c.updateStats();
    },
  },
];

export const QUIZ = [
  {
    q: 'Bıdık Deniz Usta\'nın mantılarında neden çuvalladı?',
    options: ['Deniz Usta\'nın mantıları bozuktu', 'Antrenman masasında hiç büyük mantı yoktu', 'Bıdık büyük mantı sevmiyor'],
    answer: 1,
    why: 'Aynen! Hiç görmediği bir şeyi öğrenemezdi. Mantılar bozuk değildi, masa eksikti.',
    nope: 'Hayır. Mantılarda sorun yoktu ve Bıdık kimseyi ayırmaz; sadece antrenman masasında hiç büyük mantı yoktu.',
  },
  {
    q: 'Bir yapay zeka en iyi neyi öğrenir?',
    options: ['Verisinde bol bol olan şeyleri', 'Verisinde hiç olmayan şeyleri', 'Her şeyi aynı derecede'],
    answer: 0,
    why: 'Doğru! Veri kimi içeriyorsa onu öğrenir. Eksik olan, eksik kalır.',
    nope: 'Tekrar düşün: Bıdık küçük ve orta mantıları çok gördü, onları iyi öğrendi; büyükleri hiç görmedi, öğrenemedi.',
  },
  {
    q: 'Sınav puanını neden usta usta ayrı saydık?',
    options: ['Daha uzun sürsün diye', 'Ayşe Usta öyle istediği için', 'Ortalama iyi görünse de bir grupta sorun olabilir'],
    answer: 2,
    why: 'Bildin! Toplamda 48 mantının 40\'ı doğruydu, fena değil gibi; ama Deniz Usta\'da 16\'da 9. Ayrı saymasak fark etmezdik.',
    nope: 'Hayır. Ayrı saydık çünkü toplam puan iyi görünürken bir ustanın mantılarında büyük sorun olabilir.',
  },
  {
    q: 'Deniz Usta\'nın mantılarını antrenman masasına ekleyince ne oldu?',
    options: ['Ayşe Usta\'nın puanı düştü', 'Deniz Usta\'nın puanı yükseldi, diğerleri yüksek kaldı', 'Hiçbir şey değişmedi'],
    answer: 1,
    why: 'Evet! Üç ustada da 16\'da 16. Herkesin verisi masadaysa herkes için iyi öğreniyor.',
    nope: 'Hayır. Deniz Usta\'nın puanı 16\'da 9\'dan 16\'da 16\'ya çıktı; Ayşe ve Kemal\'in puanı yüksek kaldı.',
  },
  {
    q: 'Gender Shades araştırması yüz analiz programlarında ne buldu?',
    options: ['Herkeste aynı derecede iyiydiler', 'Koyu tenli kadınlarda hata çok daha yüksekti', 'Hiç kimseyi tanıyamıyorlardı'],
    answer: 1,
    why: 'Doğru! Açık tenli erkeklerde en fazla %0,8 hata, koyu tenli kadınlarda %34,7\'ye kadar. Çünkü fotoğraf yığınında onlar azdı.',
    nope: 'Hayır. Programlar açık tenli erkeklerde çok iyiydi ama koyu tenli kadınlarda hata %34,7\'ye kadar çıkıyordu.',
  },
  {
    q: 'Yanlı bir yapay zekayı düzeltmenin en iyi yolu hangisi?',
    options: ['Daha hızlı bir bilgisayar almak', 'Sınavı kaldırmak', 'Eksik gruptan veri toplayıp her grupta ayrı test etmek'],
    answer: 2,
    why: 'Aynen! Deniz Usta\'yı masaya çağırdık, puanı ayrı saydık; sorun çözüldü.',
    nope: 'Hızlı bilgisayar da sınavı kaldırmak da işe yaramaz. Çözüm: eksik grubun verisini toplamak ve her grubu ayrı test etmek.',
  },
];
