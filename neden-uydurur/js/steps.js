/**
 * Lesson 04 · Sohbet robotu neden uydurur? Bıdık reads a tiny recipe book
 * (71 sentences), counts which word follows which, and plays "next word".
 * The model is real (js/ngram.js: bigram + trigram counts with backoff);
 * every percentage on screen is a count from that book. Middle school:
 * one idea and one hands-on thing per chapter, a teacher note under each.
 */
import { START, END } from './ngram.js';

const teacher = (html) => `<details class="teacher"><summary>Öğretmen notu</summary>${html}</details>`;

const CORPUS_BOX = '<div class="corpus" id="corpus" aria-label="Bıdık\'ın kitabı"></div>';

/** Chapter 5: three sentences Bıdık says. 0 = kitapta var, 1 = kitaba ters, 2 = kitap söylemiyor. */
export const CHECK = [
  {
    text: 'Mantı en güzel yoğurtla yenir.',
    answer: 0,
    why: 'Doğru! Kitapta aynen bu cümle var.',
    nope: 'Kitaba bak: "Mantı en güzel yoğurtla yenir." cümlesi orada aynen yazıyor. Bu doğru.',
  },
  {
    text: 'Usta sarımsağı hiç sevmez.',
    answer: 1,
    why: 'Bildin! Kitap tam tersini söylüyor: "Usta sarımsağı çok sever."',
    nope: 'Kitapta "Usta sarımsağı çok sever." yazıyor. Bıdık\'ın cümlesi kitaba ters, yani uydurma.',
  },
  {
    text: 'Mantı ilk kez Kayseri\'de yapıldı.',
    answer: 2,
    why: 'Aynen! Kitapta mantının ilk nerede yapıldığına dair tek cümle bile yok. Bıdık bunu kitaptan bilemez; ansiklopedi, öğretmen ya da güvenilir bir siteye bakmak lazım.',
    nope: 'Kitapta Kayseri geçiyor ama mantının ilk nerede yapıldığını söyleyen bir cümle yok. Doğru mu yanlış mı, kitaptan anlaşılmaz: kaynağa bakmak lazım.',
  },
];
export const CHECK_LABELS = ['Doğru', 'Uydurma', 'Kaynağa bak'];

const chipsHtml = (items, attr) => `<div class="chips">${items.map((t, i) => `<button type="button" class="btn" ${attr}="${i}">${t}</button>`).join('')}</div>`;

export const STEPS = [
  {
    id: 'oyun',
    label: 'Oyun',
    title: 'Sıradaki kelime oyunu',
    body: `
      <p>Bıdık küçük bir kitap okudu: mutfağıyla ilgili <b><span data-n="sentences">71</span> kısa cümle</b>. Kitabın tamamı aşağıda. Şimdi bir oyun oynuyor: "Mantı en …" diye başlayan cümleyi nasıl sürdürürdü?</p>
      <p>Masadaki çubuklara bak. Her çubuk bir aday kelime; boyu da Bıdık'ın o kelimeye verdiği yüzde. <b>"Sıradaki kelimeyi seç"</b> düğmesine bas: Bıdık en uzun çubuğu seçer, kelime masaya eklenir ve yeni adaylar gelir. Cümle noktaya kadar büyüsün!</p>
      ${teacher('<p>Bu gerçek, küçük bir <b>dil modeli</b>dir: tarayıcıda, kitaptaki <span data-n="sentences">71</span> cümle üzerinden <b>ikili ve üçlü kelime dizilerini</b> (bigram/trigram) sayar. Bir bağlam için aday yüzdesi = o kelimenin sayısı / bağlamın toplam sayısı. Örneğin "mantı en" kitapta 9 kez geçer; 4\'ünde ardından "güzel" gelir, yani %44. Beşten fazla aday varsa yalnızca ilk beşi gösterilir, o yüzden çubuklar %100\'e tamamlanmayabilir. Bu bölümde her zaman en olası kelime seçilir (argmax); eşitlikte listede önce gelen. Nokta da bir kelime gibi sayılır; cümle böyle biter.</p>')}`,
    focus: 'tokens',
    say: 'Bu oyunu biliyorum: sıradaki kelime ne? Kitabı okudum, hazırım!',
    mood: 'happy',
    action: 'Sıradaki kelimeyi seç',
    controls: CORPUS_BOX,
    enter(c) {
      c.fillCounts();
      c.setPrompt(['mantı', 'en']);
      c.renderCorpus([]);
      c.showCandidates();
    },
    act(c) {
      c.chooseTop();
    },
  },
  {
    id: 'sayma',
    label: 'Sayma',
    title: 'Nasıl sayıyor? Sihir yok',
    body: `
      <p>Yüzdeler nereden geliyor? Bıdık bir şey <i>anlamıyor</i>; sadece <b>sayıyor</b>. Kitapta son iki kelimenin yan yana geçtiği yerleri buluyor ve hemen sonra hangi kelimenin kaç kez geldiğine bakıyor. Hepsi bu.</p>
      <p>Aşağıdaki kitapta sarı yerler Bıdık'ın baktığı bağlam, kalın kelime de ondan sonra gelen. Çiplerle başka bir başlangıç dene; <b>"Sıradaki kelimeyi ekle"</b> düğmesiyle kelime ekle ve bağlamın nasıl kaydığını izle.</p>
      ${teacher('<p><b>Geri çekilme (backoff)</b>: son iki kelime kitapta yan yana görüldüyse üçlü sayımlar kullanılır; görülmediyse yalnızca son kelimeye bakılır (ikili); o da kitapta yoksa kitaptaki tüm kelimelerin sıklığı kullanılır. Ekrandaki "kitapta N kez" sayısı bağlamın toplam geçiş sayısı, listedeki sayılar ise her devam kelimesinin sayısıdır; yüzde bu ikisinin oranıdır. Model, kitaptaki cümlelerin dışına yalnızca bu sayılarla çıkabilir; kelimelerin anlamını temsil eden hiçbir şey yoktur.</p>')}`,
    focus: 'tokens',
    say: 'Sayıyorum, sayıyorum… Sonra en çok geleni seçiyorum. Sihir yok!',
    mood: 'thinking',
    action: 'Sıradaki kelimeyi ekle',
    controls: `${chipsHtml(['mantı en', 'buharlı tencere', 'usta', 'bıdık her', 'sıcak', 'zebra'], 'data-ctx')}${CORPUS_BOX}`,
    enter(c) {
      c.$('#lesson-extra')?.querySelectorAll('[data-ctx]').forEach((b) => {
        b.addEventListener('click', () => {
          c.sound.play('click', { volume: 0.5 });
          c.setPrompt(b.textContent.split(' '));
          c.explainCounts();
        });
      });
      c.explainCounts();
    },
    act(c) {
      c.chooseTop(true);
      c.explainCounts();
    },
  },
  {
    id: 'sicaklik',
    label: 'Sıcaklık',
    title: 'Sıcaklık: hep aynı mı, sürpriz mi?',
    body: `
      <p>Hep en uzun çubuğu seçersen hep aynı cümle çıkar. Sıkıcı! Bu yüzden sohbet robotları bazen daha kısa çubukları da seçer: zar atar gibi, ama uzun çubuğun kazanma şansı daha yüksek.</p>
      <p>Bu zarın adı <b>sıcaklık</b>. Kaydırıcıyı sola çek (0): Bıdık hep en olası kelimeyi seçer, aynı cümleyi tekrar eder. Sağa çek (2): kısa çubukların şansı artar, cümleler şaşırtıcı, bazen saçma olur. Birkaç kez "Bir cümle yaz" de ve karşılaştır.</p>
      ${teacher('<p>Sıcaklık T için her adayın olasılığı p<sub>i</sub><sup>1/T</sup> olarak ölçeklenir ve yeniden %100\'e tamamlanır; kelime bu yeni dağılımdan rastgele çekilir. T = 1: sayılan oranlar olduğu gibi. T → 0: en olası kelime (T = 0 burada tam argmax). T > 1: dağılım düzleşir, seyrek kelimeler öne çıkar. Örnek, "mantı en" bağlamındaki "güzel": T = 1\'de %44, T = 0,2\'de %97, T = 2\'de %31. Bu bölümde çubuklar sıcaklık uygulanmış olasılıkları gösterir ve yeşil çubuk çekilen kelimedir. Cümle noktada ya da en çok 14 yeni kelimede biter.</p>')}`,
    focus: 'tokens',
    say: 'Biraz sürpriz olsun mu? Sıcaklığı sen ayarla, ben yazayım!',
    mood: 'curious',
    action: 'Bir cümle yaz',
    controls: `<div class="sliders"><label>Sıcaklık <input type="range" id="sl-temp" min="0" max="2" value="1" step="0.1" /><output id="out-temp">1,0</output></label></div>${chipsHtml(['Mantı', 'Bıdık', 'Usta', 'Buharlı tencere', 'Kayseri\'de'], 'data-start')}`,
    enter(c) {
      const sl = c.$('#sl-temp');
      const out = c.$('#out-temp');
      sl.value = String(c.T);
      out.textContent = c.fmtT(c.T);
      sl.addEventListener('input', () => {
        c.T = Number(sl.value);
        out.textContent = c.fmtT(c.T);
      });
      const chips = c.$('#lesson-extra').querySelectorAll('[data-start]');
      const mark = () => chips.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === c.startWord)));
      chips.forEach((b) => {
        b.addEventListener('click', () => {
          c.startWord = b.textContent;
          mark();
          c.sound.play('click', { volume: 0.5 });
        });
      });
      mark();
      c.setPrompt(c.startTokens());
      c.showCandidates(null, c.T);
      if (c.history.length) c.showHistory();
    },
    act(c) {
      c.writeSentence();
    },
    exit(c) {
      c.stopPlay();
    },
  },
  {
    id: 'uydurma',
    label: 'Uydurma',
    title: 'Bıdık bilmediği şeyi de söyler',
    body: `
      <p>Şimdi Bıdık'a kitabında cevabı <b>olmayan</b> bir soru soralım: <i>Mantı ilk kez nerede yapıldı?</i> Kitapta böyle bir bilgi yok. Sence "bilmiyorum" der mi?</p>
      <p>Demez. Oyun aynı oyun: "Mantı ilk kez …" diye başlar ve kitaptan parçaları birbirine dikip akıcı bir cümle kurar. Cümle düzgün <i>ses eder</i>, ama Bıdık bunu hiçbir yerde okumadı. Akıcı olmak, doğru olmak demek değil! "Kitapta ara" düğmesiyle kendin kontrol et.</p>
      ${teacher('<p>Buna <b>halüsinasyon</b> denir: modelin akıcı ama dayanaksız ya da yanlış metin üretmesi. Model soruya değil, "mantı ilk kez" başlangıcına bakar ve en olası devamı üretir; "bilmiyorum" diyebilmesi için bunu kitabında saymış olması gerekirdi. İlk cevap en olası kelimelerle (T = 0), sonrakiler T = 0,8 ile üretilir. Her cevabın altındaki "kitapta var/yok" etiketi gerçek bir aramadır: cümle kitaptaki 71 cümleden biriyle kelime kelime karşılaştırılır. Kitapta "ilk kez" üç cümlede geçer (Bıdık\'ın köyde mantı görmesi, yoğurt yemesi, ustanın Kayseri\'de mantı yemesi); hiçbiri mantının ilk nerede yapıldığını söylemez.</p>')}`,
    focus: 'tokens',
    say: 'Mantı ilk kez nerede mi yapıldı? Hmm… bir saniye, cevaplıyorum!',
    mood: 'thinking',
    action: 'Bıdık\'a sor: Mantı ilk kez nerede yapıldı?',
    secondary: 'Kitapta ara',
    controls: CORPUS_BOX,
    enter(c) {
      c.renderCorpus([]);
      c.setPrompt(['mantı', 'ilk', 'kez']);
      c.showCandidates(null, 0);
      if (c.asked.length) c.showAnswers();
    },
    act(c) {
      c.ask();
    },
    act2(c) {
      c.searchBook();
    },
    exit(c) {
      c.stopPlay();
    },
  },
  {
    id: 'kontrol',
    label: 'Kontrol',
    title: 'Kontrol et: doğru mu, uydurma mı?',
    body: `
      <p>Bıdık üç cümle söyledi. Elinde kitap var. Her cümle için karar ver: <b>Doğru</b> (kitapta böyle yazıyor), <b>Uydurma</b> (kitap tersini söylüyor) ya da <b>Kaynağa bak</b> (kitaptan anlaşılmıyor, başka güvenilir bir yere sormak lazım).</p>
      <p>Bir sohbet robotu da böyle: cümlesi ne kadar akıcı olursa olsun, önemli bir şeyse önce kontrol et. Kitaba, öğretmene, güvenilir bir siteye bak; robota "kaynağın ne?" diye sor.</p>
      ${teacher('<p>Bu üç cümle oyun için önceden yazılmıştır, model üretmemiştir; "doğru/uydurma" kararı yalnızca Bıdık\'ın kitabına göredir. Amaç <b>doğrulama alışkanlığı</b>: dil modelinin çıktısı bir iddiadır, kanıt değildir. Gerçek asistanlarda da aynı yaklaşım geçerlidir: kaynak istemek, birden fazla kaynağı karşılaştırmak, tarih ve sayı gibi ayrıntıları ayrıca kontrol etmek. Üçüncü cümle için not: kitap bu konuda sessizdir; cümlenin gerçek dünyada doğru olup olmadığı bu dersin konusu değildir, "kaynağa bak" doğru karardır.</p>')}`,
    focus: 'book',
    say: 'Üç cümle söyledim. Hangisine inanmalısın? Kitaba bak, bana değil!',
    mood: 'curious',
    controls: `<div id="check"></div>${CORPUS_BOX}`,
    enter(c) {
      c.renderCorpus([]);
      c.buildCheck();
    },
    exit(c) {
      c.hideScore();
    },
  },
  {
    id: 'buyuk',
    label: 'Büyük modeller',
    title: 'Peki ya ChatGPT gibi büyük modeller?',
    body: `
      <p>Sohbet robotları da tam olarak Bıdık'ın oyununu oynar: <b>sıradaki parçayı tahmin et</b>. Farklar var: Bıdık'ın kitabı <span data-n="sentences">71</span> cümle, onlar internetteki devasa miktarda yazıyı okudu. Bıdık sayıyor; onlar Ders 01'deki gibi <b>milyarlarca ipi</b> olan bir sinir ağı kullanıyor. Kelime değil, kelime parçası tahmin ediyorlar. Ayrıca sohbet edebilsinler diye insanların beğendiği cevaplarla ek bir eğitim aldılar.</p>
      <p>Ama en önemli şey aynı kaldı: cevabı <i>bilerek</i> değil, <i>en olası devam</i> diye üretiyorlar. O yüzden çok akıcı ama yanlış cümleler kurabiliyorlar; tıpkı Bıdık'ın "ustanın köyünde yapıldı" demesi gibi. Bugünkü asistanlar bunu azaltmak için internette arayıp kaynak gösteriyor, yine de yanlış olabiliyor. En iyi alışkanlık: kaynak iste, kontrol et.</p>
      ${teacher('<p><b>Büyük dil modelleri</b> (LLM) metni <b>token</b>lara (kelime ya da kelime parçası) böler ve bir sonraki token için olasılık dağılımı üretir; bunu milyarlarca parametreli bir sinir ağıyla yapar ve çok büyük metin derlemleriyle eğitilir. Ardından sohbet için insan geri bildirimiyle ek eğitim alır. Buradaki sayma modelinden farkı ölçek ve genellemedir: hiç görmediği bağlamlarda da akıcı devamlar üretebilir. Ancak üretim yine "olası devam"dır, doğrulanmış bilgi değil; bu yüzden halüsinasyon ortadan kalkmaz. Modern asistanlar arama/erişim (retrieval) ve kaynak gösterimiyle bunu azaltır ama tamamen yok etmez. Dersin mesajı: çıktıyı iddia gibi ele al, kaynağı kontrol et.</p>')}`,
    focus: 'bidik',
    say: 'Onlar benim büyük kuzenlerim. Çok daha akıcılar… ama onlar da bazen uyduruyor!',
    mood: 'proud',
    action: 'Bıdık, kaynağın ne?',
    enter(c) {
      c.fillCounts();
      c.setPrompt(['mantı', 'ilk', 'kez', 'ustanın', 'köyünde', 'yapıldı', '.'], false);
    },
    act(c) {
      c.askSource();
    },
  },
  {
    id: 'ozet',
    label: 'Bilgi testi',
    title: 'Bilgi testi: neden uydurur?',
    body: `
      <p>Bıdık'ın oyununu, saymayı, sıcaklığı ve uydurmayı gördün. Altı kısa soru; her soruda tek bir doğru cevap var:</p>
      <div class="quiz" id="quiz"></div>
      ${teacher('<p>Özet: (1) Dil modeli sıradaki kelimeyi tahmin eder; buradaki model kitaptaki ikili/üçlü dizileri sayar. (2) Yüzdeler sayım oranlarıdır, anlam değil. (3) Sıcaklık, olasılıkları keskinleştirir ya da düzleştirir; yüksek sıcaklık sürpriz ve hata getirir. (4) Model bilmediğinde de akıcı devam üretir: halüsinasyon. (5) Akıcılık doğruluk kanıtı değildir; kaynak iste, kontrol et. (6) Büyük modeller aynı ilkeyle, çok daha büyük ölçekte çalışır.</p>')}`,
    focus: 'overview',
    say: 'Artık akıcı cümleme hemen inanma, kaynağı sor. Hazır mısın?',
    mood: 'happy',
    quiz: true,
    enter(c) {
      c.setPrompt(['mantı', 'en'], false);
      c.showCandidates(null, 1, true);
    },
  },
];

export const QUIZ = [
  {
    q: 'Bıdık "mantı en" cümlesinin sıradaki kelimesini nasıl seçti?',
    options: ['Kitapta sayarak: en çok gelen kelimeyi', 'Cümlenin anlamını düşünerek', 'Ustaya sorarak'],
    answer: 0,
    why: 'Aynen! Kitapta "mantı en" geçen yerlere baktı, sonra gelen kelimeleri saydı, en çok geleni seçti.',
    nope: 'Hayır. Bıdık anlam düşünmüyor, ustaya da sormuyor; sadece kitapta sayıyor.',
  },
  {
    q: '"güzel" çubuğunun %44 olması ne demek?',
    options: ['Bıdık güzel kelimesini %44 seviyor', '"mantı en" geçen 9 yerin 4\'ünde ardından "güzel" gelmiş', 'Güzel kelimesi kitapta 44 kez geçiyor'],
    answer: 1,
    why: 'Bildin! Yüzde, bir oran: 4 bölü 9. Sayma işte, başka bir şey değil.',
    nope: 'Yüzde bir oran: "mantı en" 9 kez geçiyor, 4\'ünde sonra "güzel" geliyor. 4 / 9 = %44.',
  },
  {
    q: 'Sıcaklığı yükseltince ne olur?',
    options: ['Bıdık daha doğru bilir', 'Hep aynı cümle çıkar', 'Kısa çubukların şansı artar; cümleler şaşırtıcı, bazen saçma olur'],
    answer: 2,
    why: 'Doğru! Yüksek sıcaklık zarı düzleştirir; seyrek kelimeler de seçilebilir.',
    nope: 'Tam tersi. Sıcaklık 0 hep aynı cümleyi verir; yükseldikçe sürpriz ve saçmalık artar.',
  },
  {
    q: 'Bıdık "Mantı ilk kez ustanın köyünde yapıldı." dedi. Bu ne?',
    options: ['Kitaptan öğrendiği bir bilgi', 'Kitap parçalarından dikilmiş akıcı bir cümle; kitapta yok', 'Kesinlikle doğru bir bilgi'],
    answer: 1,
    why: 'Evet! Kitapta böyle bir cümle yok. Bıdık sadece en olası devamı üretti. Buna uydurma (halüsinasyon) diyoruz.',
    nope: 'Kitapta bu cümle yok. Bıdık onu parçalardan dikti; akıcı ama dayanaksız.',
  },
  {
    q: 'Sohbet robotu çok akıcı ve kendinden emin bir cevap verdi. Ne yapmalı?',
    options: ['Akıcıysa doğrudur, inanmalı', 'Önemliyse kaynağa bakıp kontrol etmeli', 'Robotu kapatmalı'],
    answer: 1,
    why: 'Aynen! Akıcılık doğruluk kanıtı değil. Kaynak iste, kitaba ya da güvenilir bir yere bak.',
    nope: 'Akıcı olması doğru olduğunu göstermez. Önemliyse kaynağa bakıp kontrol et.',
  },
  {
    q: 'Büyük modellerle Bıdık\'ın ortak noktası ne?',
    options: ['İkisi de her şeyi bilir', 'İkisi de sıradaki parçayı tahmin eder', 'İkisi de kitabı ezberler'],
    answer: 1,
    why: 'Bildin! Aynı oyun: sıradaki kelime ne? Fark, ölçek: devasa yazı ve milyarlarca ip.',
    nope: 'Hiçbiri her şeyi bilmez. Ortak nokta: ikisi de sıradaki parçayı tahmin eder.',
  },
];

export { START, END };
