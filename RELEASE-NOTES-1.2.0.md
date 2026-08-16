# PauseSpeak Personal 1.2.0

## Yeni CaptionBlock altyazı motoru

- Eski büyük harf ve noktalama tabanlı `readingOrder` tahmini kaldırıldı.
- WebVTT ve TTML cue verileri artık kimlik, kaynak sırası, satırlar, bölge, stil, görsel X/Y konumu ve cue ayarları korunarak yakalanır.
- TTML üst öğe zamanları ve `begin` / `end` / `dur` ilişkileri medya zamanına çözülür.
- Ham cue'lar önce `CaptionBlock`, sonra aynı görüntü olayına ait `CaptionEvent`, en son konuşmacı/lane bazlı `SentenceSpan` nesnelerine dönüştürülür.
- Birden fazla blok için gerçek görsel sıra kanıtı yoksa cümle panelde gösterilir ancak otomatik durdurma üretmez.
- Yeni konuşmacı etiketi, önceki tamamlanmamış konuşmaya eklenmez.
- Üç noktayla devam eden ifadeler kesin cümle sonu sayılmaz.

## Güvenli otomatik durdurma

- Durdurma sınırı yalnızca güvenilir `SentenceSpan.endTimeMs` değeridir.
- Sonraki cue başlangıcına göre sınırı erkene çekme tamamen kaldırıldı.
- Ekrandaki bağımsız Netflix/YouTube altyazısı ile yakalanan cümle uyuşmazsa sınır `visible-mismatch` olarak işaretlenir ve video durdurulmaz.
- Yanlış sıradaki yakalanmış cümle ana kartta gösterilmez; bağımsız görünür altyazı güvenli yedek olarak kullanılır.
- Tek seferlik sınır, sarma, tekrar oynatma ve medya-saati denetleyicisi korunur.

## Tanılama

- Altyazı dışa aktarma menüsüne `Tanılama JSON` seçeneği eklendi.
- Tanılama dosyası geçerli zamanın 90 saniye öncesi ve sonrasındaki ham cue, blok, görüntü olayı, cümle, pause sınırı ve görünür altyazı eşleşmesini içerir.
- Kaynak URL sorguları veya oturum bilgileri tanılama dosyasına eklenmez.
- Altyazı sırası ve durdurma kararı için OpenAI ya da başka bir yapay zekâ kullanılmaz.

Doğrulama: CaptionBlock güveni, görsel sıra, konuşmacı lane ayrımı, görünür altyazı uyuşmazlığı, üç nokta, kesin cue sonu, medya-saati sınırı, tanılama dışa aktarımı, JavaScript sözdizimi, arayüz/sözleşme ve sunucu testleri çalıştırıldı.
