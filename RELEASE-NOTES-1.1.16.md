# PauseSpeak Personal 1.1.16

- Altyazı kartındaki tek iyileştirme kontrolü `AI Çeviri+` ve `AI Parçalama+` olarak iki bağımsız düğmeye ayrıldı.
- `AI Çeviri+` normal modda tam cümle çevirisini, parçalı modda ise mevcut İngilizce parça sınırlarını değiştirmeden yalnızca Türkçe karşılıkları iyileştiriyor.
- `AI Parçalama+` hem normal hem parçalı modda yalnız konuşma parçası sınırlarını iyileştiriyor; yeni parçaların ekranda boş kalmaması için gerekli temel Türkçe karşılıkları birlikte hazırlıyor fakat çeviri-iyileştirme işlemini çağırmıyor.
- Normal moddaki `AI Parçalama+` sonucu başarıyla alındıktan sonra arayüz otomatik olarak `Parçalar açık` görünümüne geçiyor.
- Yalnızca çeviri iyileştirmesinde İngilizce parça sayısı, sırası veya sınırı değişirse sonuç hem sunucu hem istemci tarafında reddediliyor.
- İki düğme ortak istek kilidini, zaman aşımını, cümle/mod değişimi korumasını ve eski başarılı sonucu hata durumunda koruma davranışını paylaşıyor.
- Hem parçalama hem çeviri kalitesi isteniyorsa işlemler `AI Parçalama+` ve ardından `AI Çeviri+` sırasıyla uygulanabiliyor.
- Yeni iki düğme ve mikrofon, dar ekranlarda taşmadan sarılabilen aynı responsive eylem satırında kalıyor.

Doğrulama: 54 arayüz/sözleşme testi ve 5 sunucu/sayaç testi geçti.
