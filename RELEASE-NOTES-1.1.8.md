# PauseSpeak 1.1.8 — Netflix TTML Boşluk Onarımı

- Netflix'in zaman kodlu TTML altyazılarındaki yan yana `span` parçaları artık sözcükleri birbirine yapıştırmıyor.
- TTML `br` satır sınırları gerçek bir boşluk olarak korunuyor.
- `camerasin`, `hasa`, `suspiciousthe` ve `gatherevery` gibi kaynak ayrıştırma hataları sağ altyazı listesine ulaşmadan önleniyor.
- Nokta, virgül, kesme işareti, kısa çizgi ve İngilizce kısaltmalar için gereksiz boşluk eklenmiyor.
- Ana altyazı kartı, sağ altyazı listesi ve Telaffuz Koçu aynı düzeltilmiş zaman kodlu metni kullanıyor.
