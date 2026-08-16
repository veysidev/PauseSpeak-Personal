# PauseSpeak 1.2.0 — CaptionBlock altyazı motoru

Bu sürüm altyazı sırası veya otomatik durdurma için yeni bir API ya da yapay zekâ çağrısı eklemez.

## Yerel veri zinciri

1. `player-bridge.js`, WebVTT/TTML yanıtlarını kayıpsız cue metadata ile ayrıştırır.
2. `content.js`, cue'ları `CaptionBlock` nesnelerine normalleştirir.
3. Aynı zaman/lane içindeki bloklar `CaptionEvent` olarak gruplanır.
4. Konuşmacı ve lane durumları ayrı tutularak `SentenceSpan` zaman çizelgesi oluşturulur.
5. Yalnızca güvenilir ve kesinleşmiş span'ler medya-saati durdurma sınırı üretir.
6. Görünür platform altyazısı son doğrulama kapısı olarak yerel biçimde karşılaştırılır.

## Tanılama dosyası

`Tanılama JSON` tamamen tarayıcı içinde hazırlanır ve yerel olarak indirilir. Sunucuya gönderilmez.

## Değişmeyen model yolları

- Normal cümle çevirisi: `gpt-5.6-luna`
- Cümle ifade analizi: `gpt-5.6-luna`
- Kelime / ifade anlamı: `gpt-5.6-luna`
- Kullanıcı tarafından başlatılan Terra iyileştirmeleri değişmez.
