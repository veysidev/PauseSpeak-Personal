# PauseSpeak 1.1.21 — ana Parçalar modunun kaldırılması

## Normal izleme akışı

- Ana oynatıcıda parçalı çeviri modu bulunmaz.
- Tamamlanan ve önceden hazırlanabilen sıradaki cümleler normal `/translate` akışını kullanır.
- Ana ekran otomatik `/chunk` ön hazırlığı başlatmaz.
- `AI Çeviri+`, kullanıcının açık eylemiyle `/translate` üzerinde Terra iyileştirmesi yapar.

## Korunan altyapı

- Telaffuz Koçu'nun yerel çalışma parçaları ve parça gezinmesi korunur.
- Sunucudaki `/chunk` ucu, uyumluluk ve korunan koç/parça yardımcı akışları için yerinde kalır.
- Bu sürüm sunucu API sözleşmesine yeni bir uç eklemez.
