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
