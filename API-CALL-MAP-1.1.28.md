# PauseSpeak 1.1.28 — altyazıyla birlikte küçülen kart

Bu sürüm API isteklerini veya model seçimini değiştirmez.

## Arayüz davranışı

- Altyazı boyutu değiştiğinde kart genişliği ve iç boşlukları aynı ayardan hesaplanır.
- Kart genişliği yazıdan daha yavaş ölçeklenir; `%60` altyazıda masaüstü üst sınırı `578px`, `%100` değerinde `680px` olur.
- İşlem düğmeleri dokunulabilirliği koruyan sınırlı bir aralıkta küçülür.
- Dar ekran ve tablet yerleşimleri için ayrı genişlik ve boşluk değerleri kullanılır.

## Model

- Cümle ifade analizi: `gpt-5.6-luna`
- Kelime / ifade anlamı: `gpt-5.6-luna`
- Kullanıcı tarafından başlatılan Terra iyileştirmeleri değişmez.
