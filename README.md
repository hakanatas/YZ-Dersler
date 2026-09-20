# YZ Dersler

Ortaokul öğrencileri için etkileşimli yapay zeka dersleri. Çırak robot aşçı
Bıdık'ın mutfağında her ders bir oyun: tahmin et, yanıl, düzelt, tekrar.

Her şey tarayıcıda çalışır: derleme yok, paketleyici yok, CDN yok, veri
toplama yok. Herhangi bir statik dosya sunucusuyla açılır.

## Canlı

GitHub Pages ile yayınlanır: <https://hakanatas.github.io/YZ-Dersler/>

- Ders 01 · **Yapay zeka nasıl çalışır?** →
  <https://hakanatas.github.io/YZ-Dersler/YZ-nasil-calisir/>

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

## Klasörler

| Klasör | İçerik |
| --- | --- |
| `index.html` | Ders listesi (giriş sayfası) |
| `YZ-nasil-calisir/` | Ders 01: sayfa, stil ve ders kodu |
| `js/` | Paylaşılan yardımcılar: animasyon, sentezlenmiş sesler, dokular, mantı geometrisi |
| `vendor/three/` | Three.js r170 (MIT) |
| `assets/` | Yazı tipleri (SIL Open Font License) ve simge |

## Kaynak

Bu ders, [The Dumpling Club](https://github.com/hakanatas/cin-manti)
projesinin "Küçük Dersler" bölümünden buraya taşınmıştır.

## Üçüncü taraf

- Three.js r170 (MIT) — `vendor/three/` (bkz. `vendor/three/LICENSE`)
- Fraunces ve Instrument Sans (SIL Open Font License) — `assets/fonts/`
