# PauseSpeak 1.1.3 — Tekrarlanan Parça Koruması

- Netflix'in yeni altyazı kutusuna önceki kutunun son kelimelerini yeniden taşıdığı durumlar artık algılanır.
- Önceki altyazının sonu ile yeni altyazının başındaki ortak kelimeler yalnızca bir kez birleştirilir.
- Tek kelimelik doğal tekrarlar yanlışlıkla silinmez.
- Sunucudan gelen parçalar özgün cümleye karşı istemci tarafında yeniden doğrulanır.
- Çakışan, eksik, fazla veya tekrarlı parçalar Telaffuz Koçu'na gönderilmez ve önbelleğe alınmaz.
- Geçersiz sunucu cevabında güvenli yerel parçalama otomatik olarak kullanılır.
- Fotoğraftaki tekrarlı `that Maddie and Kaylee were in bed together` örneği için regresyon testi eklenmiştir.
