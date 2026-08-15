# PauseSpeak Personal 1.1.25

- PauseSpeak kontrolleri hem video oynarken hem de duraklatılmışken 3 saniye kullanıcı etkileşimi olmadığında gizlenir.
- İngilizce ve Türkçe altyazılar görünür kalır; üst araçlar, yan cümle düğmeleri, oynatıcı çubuğu ve altyazı kartındaki işlem düğmeleri gizlenir.
- Fare hareketi, tıklama, dokunma veya klavye kullanımı kontrolleri yeniden gösterir ve 3 saniyelik süreyi baştan başlatır.
- Oynatma/duraklatma durumu değiştiğinde süre yalnız bir kez yeniden başlatılır; 400 ms güncelleme döngüsü süreyi sürekli sıfırlamaz.
- Açık ayar menüsü, altyazı paneli, kullanım paneli, kelime/ifade anlamı veya Telaffuz Koçu sırasında kontroller gizlenmez.
- Luna uyumluluk modu ve diğer 1.1.24 davranışları değişmez.

Doğrulama: JavaScript sözdizimi, manifest, arayüz/sözleşme testleri ve sunucu testleri çalıştırıldı.
