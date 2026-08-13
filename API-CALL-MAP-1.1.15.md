# PauseSpeak 1.1.15 — Parçalama doğrulama ve Terra iyileştirme sözleşmesi

## Normal mod

- Tamamlanan cümle için `/chunk` çağrısı yapılmaz.
- Önbellekte yoksa en fazla bir Luna `/translate` çağrısı yapılır.
- Kapalı parçalı mod ve yeni Terra düğmesi hiçbir otomatik çağrı oluşturmaz.

## Parçalı modun normal akışı

1. Önbellekte yoksa Luna ile birleşik `/chunk` isteği yapılır.
2. Sunucu İngilizce bütünlüğünü, dolu çevirileri, parça sayısını, gereksiz tek kelimelik parçaları ve korunan ifade sınırlarını doğrular.
3. İlk sonuç geçersizse doğrulama ihlalleri ve önceki sonuç ikinci Luna isteğine düzeltme bağlamı olarak verilir.
4. İkinci sonuç da geçersizse otomatik Terra çağrısı yapılmaz.
5. İstemci cümlenin tamamını güvenli tek İngilizce parça olarak tutar ve çevirisini mevcut Luna `/translate` yoluyla alabilir.

Başarılı ilk Luna yanıtında önceki sürümde olduğu gibi cümle başına tek model isteği yeterlidir. İkinci istek yalnızca yapı veya güvenlik doğrulaması başarısız olduğunda oluşur.

## Kullanıcı kontrollü Terra iyileştirmesi

- `Terra` düğmesi yalnız parçalı mod açıkken altyazı kartında görünür.
- Düğmeye basılmadıkça Terra parçalama isteği yapılmaz.
- İstek `/chunk` gövdesinde `improve:true` ve mevcut `currentParts` değerlerini gönderir.
- Model `gpt-5.6-terra`, reasoning `none` ve en fazla bir model isteğidir.
- Terra hem yeni İngilizce parçaları hem her parçanın Türkçe karşılığını aynı yapılandırılmış yanıtta döndürür.
- Sonuç aynı güvenlik doğrulamasından geçerse iki önbellek birlikte güncellenir; geçmezse mevcut Luna sonucu ekranda korunur.
- Sayaç işlemi `improve_chunk` olarak kaydedilir.

## Korunan sınırlar

- İngilizce parçalar özgün cümleyi eksiksiz ve doğru sırada oluşturmalıdır.
- Her İngilizce ve Türkçe alan dolu olmalıdır.
- `suitable:true` en az iki, `suitable:false` tam cümleyi içeren tek parça gerektirir.
- Gereksiz tek kelimelik parçalar reddedilir.
- `not`, korunan `to` yapıları ve `give up`, `find out`, `look after`, `work out` gibi yaygın phrasal verb sınırları bölünemez.

Bu sözleşme `tests/ui-contract.test.js` içinde Luna/Terra model seçimi, güvenli doğrulama, kullanıcı düğmesi, istek gövdesi, önbellek yazımı ve otomatik Terra kullanılmaması testleriyle korunur.
