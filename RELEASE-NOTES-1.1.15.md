# PauseSpeak Personal 1.1.15

- Terra ve mikrofon düğmeleri altyazı metninin üzerinden kaldırılarak kartın sağ altındaki ortak, responsive flex eylem satırına taşındı.
- Tek Terra düğmesi aktif moda göre normal çeviriyi veya parçalı çeviriyi iyileştiriyor.
- Normal mod iyileştirmesi yalnızca bir Terra `/translate` isteği, parçalı mod iyileştirmesi bütün parçalar için yalnızca bir Terra `/chunk` isteği yapıyor.
- Terra yalnızca kullanıcının düğmeye basmasıyla çalışıyor; otomatik Terra kurtarması bulunmuyor.
- Çift tıklama, cümle veya mod değişimi ve geciken cevaplar için istek korumaları eklendi; Terra hatasında mevcut başarılı Luna sonucu korunuyor.
- Luna parçalı cevabı geçersizse hata nedenleriyle en fazla bir Luna düzeltme isteği yapılıyor; ikinci başarısızlıkta güvenli tek-parça akışına geçiliyor.
- Parçalı cevap doğrulaması eksik, eklenmiş, tekrarlanmış veya çakışan İngilizce metni; boş Türkçeyi; gereksiz tek kelimelik parçaları; yanlış olumsuzluk ve bilinen phrasal verb bölünmelerini reddediyor.
- `Why?`, `Stop!` ve uygun discourse marker örnekleri gibi doğal tek kelimelik anlam birimleri korunuyor.
- Normal ve parçalı Terra işlemleri sayaçta sırasıyla `improve_translation` ve `improve_chunk` olarak model, token, cache-write, retry ve hata alanlarıyla kaydediliyor.
- Mevcut kumanda, kelime ayrıntısı, tam ekran ve Sisli Okyanus davranışları korunuyor.

Doğrulama: 54 arayüz/sözleşme testi ve 5 sunucu/sayaç testi geçti; ayrıca gerçek cihazdaki manuel görünüm ve kullanım testi kullanıcı tarafından onaylandı.
