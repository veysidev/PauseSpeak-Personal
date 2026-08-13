# PauseSpeak 1.1.13 — Tamamlanan altyazı çağrı sözleşmesi

## Normal mod

Bir altyazı tamamlandığında:

- Yerel güvenli parçalar hazırlanır; kelime düğmeleri ve ayrıntı etkileşimi korunur.
- Önbellekte yoksa normal çeviri için en fazla bir `POST /translate` Luna isteği yapılır.
- `POST /chunk` çağrısı yapılmaz.
- Seçili normal modun yalnızca bir sonraki cümlesi Luna ile önceden çevrilebilir.

## Parçalı mod

Bir altyazı tamamlandığında veya kullanıcı geçerli cümlede parçalı modu açtığında:

- Önbellekte yoksa `POST /chunk` Terra isteği yapılır.
- Geçerli AI parçaları doğrulandıktan sonra önbellekte olmayan her parça `POST /translate` ile çevrilir.
- Seçili parçalı modun yalnızca bir sonraki cümlesi önceden hazırlanabilir.

## Değişmeyen yollar

- Kullanıcının çeviri iyileştirmesi Terra kullanmaya devam eder.
- Kelime/ifade ayrıntısı isteği mevcut model kurallarını korur.
- TTS yalnız mevcut kullanıcı akışı tetiklediğinde çalışır.
- Sayaç `cacheWriteTokens`, retry, cache hit/miss ve hata alanlarını kaydetmeye devam eder.

Bu sözleşme `tests/ui-contract.test.js` içinde normal modun `/chunk` isteğinden önce döndüğünü ve parçalı mod açıldığında AI parçalarının istendiğini doğrulayan testlerle korunur.
