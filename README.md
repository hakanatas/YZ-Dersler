# YZ Dersler

Ortaokul öğrencileri için etkileşimli yapay zeka dersleri. Çırak robot aşçı
Bıdık'ın mutfağında her ders bir oyun: tahmin et, yanıl, düzelt, tekrar.

Her şey tarayıcıda çalışır: derleme yok, paketleyici yok, CDN yok, veri
toplama yok. Herhangi bir statik dosya sunucusuyla açılır.

## Canlı

GitHub Pages ile yayınlanır: <https://hakanatas.github.io/YZ-Dersler/>

| Ders | Konu | Adres |
| --- | --- | --- |
| 01 | Yapay zeka nasıl çalışır? | <https://hakanatas.github.io/YZ-Dersler/YZ-nasil-calisir/> |
| 02 | Ezber mi, öğrenme mi? | <https://hakanatas.github.io/YZ-Dersler/ezber-mi-ogrenme-mi/> |
| 03 | Bıdık kimin mantısını tattı? | <https://hakanatas.github.io/YZ-Dersler/adil-mi/> |
| 04 | Sohbet robotu neden uydurur? | <https://hakanatas.github.io/YZ-Dersler/neden-uydurur/> |
| 05 | Bıdık görüyor | <https://hakanatas.github.io/YZ-Dersler/bidik-goruyor/> |
| 06 | Bıdık ödülle öğreniyor | <https://hakanatas.github.io/YZ-Dersler/odulle-ogrenmek/> |

`.github/workflows/pages.yml` iş akışı `main` dalına her gönderimde siteyi
yeniden yayınlar.

## Çalıştırma

```bash
node serve.mjs          # → http://localhost:8080
# ya da
python3 -m http.server 8080
```

ES modülleri `http://` ister; `index.html` dosyasını doğrudan diskten açmak
çalışmaz.

## Ders 01 · Yapay zeka nasıl çalışır?

`YZ-nasil-calisir/` klasöründe. Bıdık, mantıyı ne kadar pişireceğini
örneklerden öğrenirken tarayıcıda gerçek bir 2-8-1 yapay sinir ağı eğitilir.

| Bölüm | Fikir |
| --- | --- |
| 1. Mantılar | Kural değil, örnek: eğitim verisi, özellik ve etiket |
| 2. Kafası | Yapay sinir ağı: yardımcılar (düğümler) ve ipler (ağırlıklar) |
| 3. Oyun | İleri geçiş: önce sen tahmin et, sonra Bıdık |
| 4. Düzelt | Hata puanı (kayıp), geri yayılım, bir adım gradyan inişi |
| 5. Antrenman | 600 adım eğitim, masa örtüsünde canlı karar sınırı |
| 6. Sınav | Genelleme: hiç görülmemiş bir mantı |
| 7. Sohbet | Dil modelleri aynı döngüyü "sıradaki kelime" oyununda oynar |
| 8. Bilgi testi | Altı soruluk test ve kutlama |

Her bölümün altında öğretmenler için katlanır bir not vardır; gerçek
terimleri ve modelin tam olarak ne yaptığını anlatır.

Model `YZ-nasil-calisir/js/mlp.js` içindedir: 2 giriş, 8 düğümlü gizli
katman (tanh), sigmoid çıkış, ikili çapraz entropi kaybı, tam yığın gradyan
inişi (öğrenme hızı 1,2, 600 adım). Masanın gizli kuralı: ideal pişme süresi
3 + 6·boy dakika, ±1,5 dakika tolerans.

## Ders 02 · Ezber mi, öğrenme mi?

`ezber-mi-ogrenme-mi/`. İki masa: Bıdık soldaki antrenman masasında
öğrenir, sağdaki sınav masasında ölçülür (64 örneklik eğitim havuzu, 32
örneklik test kümesi, aynı gizli kural, farklı mantılar).

| Bölüm | Fikir |
| --- | --- |
| 1. İki masa | Eğitim ve test kümesi; sınav mantıları antrenmanda görülmez |
| 2. Az örnek | 6 mantıyla 600 adım: antrenmanda %100, sınavda ~%78 |
| 3. Ezber | Sınav masasındaki yanlışlar kırmızı halkayla; aşırı öğrenme |
| 4. Çok örnek | 64 mantıyla iki masa da %100; kaydırıcıyla örnek sayısı deneyi |
| 5. Yanlış etiket | Etiketlerin %25'i ters: iki masada da puan düşer; veri kalitesi |
| 6. Bilgi testi | Altı soru |

## Ders 03 · Bıdık kimin mantısını tattı?

`adil-mi/`. Üç usta, üç boy aralığı (Ayşe 0,05–0,35, Kemal 0,35–0,65, Deniz
0,65–0,95). Antrenman masasında yalnızca Ayşe ve Kemal'in mantıları var;
sınav masasında her ustadan 16. Bu dersin mutfak kuralı eğridir (ideal süre
3 + 6·boy² dakika), çünkü düz kuralda model görmediği bölgeye doğru
uzatabiliyordu ve öğretilecek bir etki kalmıyordu.

| Bölüm | Fikir |
| --- | --- |
| 1. Üç usta | Renkli halkalar ustayı, mantı rengi sonucu gösterir |
| 2. Masada kim var? | Eğitim kümesinde Deniz Usta yok: kapsama yanlılığı |
| 3. Usta usta puan | Sınav: Ayşe %100, Kemal %94, Deniz %56; ortalama sorunu gizler |
| 4. Neden? | Model gördüğü şeridi düz uzatır; gerçek şerit kıvrılır |
| 5. Düzelt | Deniz'in mantıları masaya: 8 mantıdan sonra üçü de %100 |
| 6. Gerçek hayat | Gender Shades (2018), sesli asistanlar; herkesin verisi, gruplara ayrı puan |
| 7. Bilgi testi | Altı soru |

## Ders 04 · Sohbet robotu neden uydurur?

`neden-uydurur/`. Gerçek, küçük bir dil modeli: Bıdık'ın 71 cümlelik
kitabındaki ikili ve üçlü kelime dizileri sayılır (`js/ngram.js`, geri
çekilmeli n-gram), çubuklar gerçek oranları gösterir.

| Bölüm | Fikir |
| --- | --- |
| 1. Sıradaki kelime | "mantı en" → güzel %44: sayım oranı |
| 2. Nasıl sayıyor? | Kitapta bağlamı bul, devamları say; sihir yok |
| 3. Sıcaklık | p^(1/T): 0'da hep aynı cümle, 2'de sürpriz ve saçma |
| 4. Uydurma | Bilmediği soruya da akıcı cümle: halüsinasyon; "kitapta var/yok" gerçek arama |
| 5. Kontrol et | Doğru / uydurma / kaynağa bak oyunu |
| 6. Büyük modeller | Ölçek farkı, insan geri bildirimi, uydurma neden bitmez |
| 7. Bilgi testi | Altı soru |

## Ders 05 · Bıdık görüyor

`bidik-goruyor/`. Görüntü tanıma: 8×8 siyah-beyaz resimler (64 piksel),
mantı ile börek. Model 64 giriş → 8 gizli → 1 çıkış (529 parametre),
öğrenme hızı 0,5, 300 adım; 120 eğitim ve 60 test resmi
(`js/shapes.js`, tohumlu). Eğitim %100, sınav %98.

| Bölüm | Fikir |
| --- | --- |
| 1. Sayılar | Resim = 64 sayı |
| 2. 64 göz | İleri geçiş: pikseller yardımcılara akar |
| 3. Örnekler | 120 resim: konum, boy ve gürültü değişir |
| 4. Antrenman | 300 adım; yanlış bilinen tek sınav resmi tepsiye konur |
| 5. Sen çiz | Kareleri boya, Bıdık canlı tahmin etsin |
| 6. Kandır | Kare, tek nokta, harf: %50 "emin değilim" demek; güven ≠ doğruluk |
| 7. Bilgi testi | Altı soru |

## Ders 06 · Bıdık ödülle öğreniyor

`odulle-ogrenmek/`. Pekiştirmeli öğrenme: 10 kollu bir haydut (1–10
dakika), ödül müşterinin alkışı (mantı kıvamındaysa 1, değilse 0), değer
tahmini alkış ortalaması, seçim epsilon-açgözlü (`js/bandit.js`). Her
mantının boyu ±0,2 oynadığı için alkış olasılıklı; orta boyda 6 dakika
%100, 5 ve 7 dakika %71.

| Bölüm | Fikir |
| --- | --- |
| 1. Etiket yok, alkış var | Ajan, eylem, ödül |
| 2. Sen dene | Dakikayı sen seç, alkışı gör; çubuklar ortalamayı tutar |
| 3. Bıdık kendi deniyor | 300 deneme, ε = 0,1: 6 dakikaya yakınsar (259 alkış) |
| 4. Keşfet mi, kullan mı? | ε = 0 → 5 dakikada takılır (209 alkış), ε = 0,05 → 283, ε = 0,5 → 197 |
| 5. Boy değişince | Küçük ve büyük mantı için ayrı defter: 4 dk ve 8 dk (254 alkış, tek defterle 120) |
| 6. Yanlış alkış | Müşteri hıza alkışlarsa Bıdık çiğ mantı servis eder: ödül hilesi (CoastRunners, 2016) |
| 7. Bilgi testi | Altı soru |

## Yeni ders eklemek

Ders 02'den itibaren dersler `js/shell.js` ortak çalışma zamanını kullanır.
Kalıp ve API için `docs/yeni-ders.md` dosyasına bakın.

## Klasörler

| Klasör | İçerik |
| --- | --- |
| `index.html` | Ders listesi (giriş sayfası) |
| `YZ-nasil-calisir/`, `ezber-mi-ogrenme-mi/`, … | Dersler: sayfa ve ders kodu |
| `js/` | Paylaşılan modüller: ders çalışma zamanı (`shell.js`), sinir ağı (`mlp.js`), masa (`board.js`), 3B ağ (`network.js`), Bıdık, yüz, konfeti, sesler, dokular |
| `css/lesson.css` | Tüm derslerin ortak stili |
| `docs/` | Yeni ders ekleme kılavuzu |
| `vendor/three/` | Three.js r170 (MIT) |
| `assets/` | Yazı tipleri (SIL Open Font License) ve simge |

## Kaynak

Bu ders, [The Dumpling Club](https://github.com/hakanatas/cin-manti)
projesinin "Küçük Dersler" bölümünden buraya taşınmıştır.

## Üçüncü taraf

- Three.js r170 (MIT) — `vendor/three/` (bkz. `vendor/three/LICENSE`)
- Fraunces ve Instrument Sans (SIL Open Font License) — `assets/fonts/`
