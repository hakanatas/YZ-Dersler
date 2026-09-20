# Yeni bir ders eklemek

Ders 02'den itibaren tüm dersler ortak çalışma zamanını kullanır:
`js/shell.js`. Bir ders üç dosyadan oluşur:

```
<ders-klasoru>/
  index.html      ← ezber-mi-ogrenme-mi/index.html'in kopyası; başlık, meta ve giriş metni değişir
  js/steps.js     ← STEPS (bölümler) ve QUIZ (bilgi testi)
  js/main.js      ← createLesson({...}): sahne nesneleri, kamera ön ayarları, kare döngüsü
```

## Kalıp

- Ortaokul seviyesi, samimi ve kısa cümleler. Her bölümde **tek fikir** ve
  **elle yapılacak bir şey** (düğme, kaydırıcı, tıklama).
- Her bölümün altında `teacher('<p>…</p>')` ile katlanır **öğretmen notu**:
  gerçek terimler ve modelin tam olarak ne yaptığı. Notlar koddaki
  gerçek sayılarla birebir uyumlu olmalı; hiçbir bilgi hatası olmamalı.
- Son bölüm `quiz: true` ve gövdesinde `<div class="quiz" id="quiz"></div>`;
  QUIZ altı sorudan oluşur, her soruda üç seçenek ve tek doğru cevap.
- Bıdık konuşur (`say`), tepki verir (`c.bidik.react('joy', 1.5)`), zıplar
  (`c.bidik.doHop(0.7)`). Ruh halleri: calm, happy, curious, thinking,
  worried, surprised, proud, sleepy, joy, bliss, yum.

## `createLesson` seçenekleri

| Alan | Açıklama |
| --- | --- |
| `steps`, `quiz` | `steps.js`'ten |
| `focus` | Kamera ön ayarları: `{ name: { target: Vector3, dist, az, el, bidik: [x, z] } }`. `overview` ve `bidik` zorunlu. |
| `setup(ctx)` | Sahne nesnelerini kurar, `ctx`'e eklenecek alanları döndürür. |
| `update(dt, ctx)` | Her karede çağrılır (sahne nesnelerinin `update(dt)`'si burada). |
| `keys` | `{ e: (ctx) => … }` gibi ek kısayollar. |
| `onPick(ctx, point)` | Masaya tıklama (y = 0.03 düzleminde dünya noktası). Bölüm başına `step.onPick` de olabilir. |
| `restart(ctx)` | "Bir daha oynayalım" düğmesi. |
| `finishLine` | Tüm sorular doğruysa bitiş mesajının kuyruğu. |
| `finishText(correct, n)` | Bitiş mesajını tamamen özelleştirir. |
| `finishNext` | Test son bölüm değilse bitiş kartındaki düğmenin yazısı (varsayılan "Devam →"); düğme sonraki bölüme geçer. |

## Bölüm alanları

`id, label, title, body, focus, say, mood, action, secondary, stats,
controls (HTML; #lesson-extra içine konur), quiz, enter(ctx), exit(ctx),
act(ctx), act2(ctx), onPick(ctx, point)`.

## `ctx` içindekiler

`scene, camera, palette, mouths, softDot, sound, tweens, bidik, confetti,
state (busy, step, uiHidden…), dom, reducedMotion, isMobile, addTag(text,
getWorldPos, isOn, cls), toast(msg), focus(name), go(i), $(selector),
later(sec, fn), wait(sec), say(text, hold), readout(html), setStats(rows,
history?), score(a, b, labels?), hideScore(), setAction(text, running),
celebrate(), buildQuiz(), finishLesson(correct)`.

`setup` içinde döndürdüğünüz nesnenin alanları `ctx`'e **kopyalanır**; bu yüzden
yöntemler durumu her zaman `c.alan` üzerinden okuyup yazmalı (`ext.alan` değil),
yoksa `update(dt, c)` eski değeri görür.

Uzun bir işlem sürerken (antrenman gibi) `ctx.state.busy = true` yapın;
otomatik ilerleme o sırada durur ve test betiği bekler.

## Paylaşılan modüller (`js/`)

- `mlp.js` — `TinyNet(hidden, seed, inputs)`: n giriş → tanh gizli katman →
  sigmoid çıkış; `forward, predict, trainStep(data, lr), evaluate,
  gradients, reset, history`. `makeDataset(count, seed)`, `trueLabel`,
  `idealMinutes`, `MINUTES`.
- `board.js` — `Board({ size, tiles, palette, mouths })`: masa örtüsü +
  mantılar; `setDishes, revealAll, hideAll, revealDish(i), paint(fn),
  tintTarget, setProbe, probe, toLocal, fromLocal, update(dt)`.
- `network.js` — `Network3D({ net, palette, softDot, mouths })`: n giriş
  için yardımcılar ve ipler; `setWeightsVisible, syncWeights, emitPulses,
  setGlow, clearGlow, update(dt)`, `columns`, `pos`.
- `tokens.js` — `TokenDemo`: kelime karoları ve olasılık çubukları.
- `bidik.js`, `face.js`, `confetti.js`, `audio.js` (`sound.play('click' |
  'pick' | 'drip' | 'hop' | 'boing' | 'yum' | 'grab' | 'lift' | 'refill')`),
  `tween.js`, `textures.js`, `dumpling-shape.js`.

## Test

```bash
python3 -m http.server 8080   # sonra tarayıcıda /<ders-klasoru>/
```

Her bölümü baştan sona tıklayarak gezin; konsolda hata olmamalı.
