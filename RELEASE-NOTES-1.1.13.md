# PauseSpeak Personal 1.1.13

- Normal çeviri modunda tamamlanan her cümle için otomatik yapılan Terra `/chunk` çağrısı kaldırıldı.
- Normal mod, kelime düğmeleri ve ayrıntı etkileşimleri için yerel güvenli parçaları kullanmaya devam ediyor.
- Parçalı mod açıksa `/chunk` çağrısı ve parça çevirileri çalışmaya devam ediyor.
- Kullanıcı normal moddan parçalı moda geçtiğinde geçerli cümlenin AI parçaları o anda hazırlanıyor.
- Seçili modun bir sonraki cümle ön hazırlığı korunuyor; kapalı parçalı mod için `/chunk` ön hazırlığı yapılmıyor.
- Kumanda, kelime ayrıntısı, normal çeviri, tam ekran ve telaffuz davranışları değiştirilmedi.
