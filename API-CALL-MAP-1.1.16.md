# PauseSpeak 1.1.16 — API çağrı sözleşmesi

## Otomatik normal mod

- Model: `gpt-5.6-luna`
- Önbellek yoksa cümle başına en fazla bir `/translate` isteği.
- `/chunk` veya iyileştirme modeli otomatik çağrılmaz.

## Otomatik parçalı mod

- Model: `gpt-5.6-luna`
- Önbellek yoksa cümle başına bir birleşik `/chunk` isteği.
- İngilizce parçalar ve bütün Türkçe karşılıklar aynı yapılandırılmış cevapta alınır.
- İlk cevap geçersizse en fazla bir düzeltme isteği yapılır; ikinci başarısızlıkta güvenli tek-parça akışına geçilir.

## Kullanıcı tarafından başlatılan `AI Çeviri+`

- Normal modda tam cümle için tek bir `gpt-5.6-terra` `/translate` isteği yapılır.
- Parçalı modda bütün mevcut parçalar için tek bir `gpt-5.6-terra` `/chunk` isteği yapılır; `improvementType` değeri `translation` olur.
- Parçalı modda İngilizce parça sayısı, sırası ve sınırları aynen korunur; yalnızca Türkçe karşılıklar değişebilir.
- İşlem her iki görünümde `improve_translation` olarak kaydedilir.

## Kullanıcı tarafından başlatılan `AI Parçalama+`

- Her iki görünümde bütün cümle için tek bir `gpt-5.6-terra` `/chunk` isteği yapılır; `improvementType` değeri `segmentation` olur.
- Yalnız parça sınırları iyileştirilir. Yeni parçaların gösterimi için gerekli temel Türkçe karşılıklar aynı cevapta döner; `improve_translation` işlemi çağrılmaz.
- Normal görünüm, başarılı ve doğrulanmış cevaptan sonra otomatik olarak parçalı görünüme geçer.
- İşlem `improve_chunk` olarak kaydedilir.
- Hem parçalama hem çeviri iyileştirmesi isteniyorsa önce `AI Parçalama+`, ardından `AI Çeviri+` çalıştırılır.

## İstek korumaları

- Aynı anda yalnızca bir iyileştirme isteği çalışabilir.
- Cümle veya görünüm değişirse eski cevap uygulanmaz.
- Zaman aşımı ve iptal desteklenir.
- İyileştirme başarısız olursa mevcut başarılı sonuç korunur.
- Model, token, cache-write, retry ve hata alanları kullanım sayacında kaydedilir.
