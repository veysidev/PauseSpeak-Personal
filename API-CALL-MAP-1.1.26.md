# PauseSpeak 1.1.26 — yalnız işaretçiyle geri gösterme

Bu sürüm API isteklerini veya model seçimini değiştirmez.

## Arayüz davranışı

- Kullanıcı etkileşimi yoksa gizleme süresi: 3 saniye
- Kontrolleri geri gösterenler: fare hareketi, fare/kalem tıklaması, ekran dokunuşu
- Kontrolleri geri göstermeyenler: klavye, oynatma durumu değişikliği, tam ekran ve yeniden boyutlandırma
- Görünür kalan içerik: İngilizce ve Türkçe altyazılar

## Model

- Cümle ifade analizi: `gpt-5.6-luna`
- Kelime / ifade anlamı: `gpt-5.6-luna`
- Kullanıcı tarafından başlatılan Terra iyileştirmeleri değişmez.
