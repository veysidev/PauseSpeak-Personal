# PauseSpeak 1.1.17 — iyileştirme düğmeleri

## Normal altyazı modu

- `AI Çeviri+` görünür ve tam cümle çevirisini tek bir iyileştirme isteğiyle günceller.
- `AI Parçalama+` görünmez ve bu moddan parçalama iyileştirme isteği başlatılamaz.
- Mikrofon davranışı değişmez.

## Parçalı altyazı modu

- `AI Çeviri+` yalnız mevcut parçaların Türkçe karşılıklarını iyileştirir; İngilizce parça sınırlarını değiştiremez.
- `AI Parçalama+` yalnız parça sınırlarını iyileştirir ve yeni parçaların gösterimi için gerekli temel karşılıkları üretir; çeviri iyileştirmesini çalıştırmaz.
- Her iki iyileştirme istenirse iki düğmeye ayrı ayrı basılır.

## Ortak korumalar

- Aynı anda yalnızca bir iyileştirme isteği çalışabilir.
- Cümle veya görünüm değişirse eski cevap uygulanmaz.
- Hata durumunda mevcut başarılı sonuç korunur.
