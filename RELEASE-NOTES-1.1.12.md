# PauseSpeak Personal 1.1.12

- Bütün OpenAI endpointleri için model, token, cache, retry ve hata gözlemlenebilirliği tamamlandı.
- `cache_write_tokens` sayaç ve tahmini maliyet hesabına eklendi.
- Cache yazımı Luna için `$0,25/1M`, Terra için `$2,50/1M` olarak hesaplanıyor.
- Daha önce sayılmayan `/study-segments` kullanımı sunucu ve tarayıcı sayacına eklendi.
- `/study-segments` yanıtında gerçek kullanılan model ve kullanım verisi döndürülüyor.
- Geçersiz model yanıtlarında harcanan tokenler mümkün olduğunda retry ve hata sayısıyla birlikte korunuyor.
- Tamamlanan altyazının mevcut `/chunk` ve `/translate` çağrı sözleşmesi testle sabitlendi.
- Çeviri, kumanda, kelime ayrıntısı ve tam ekran davranışları değiştirilmedi.
