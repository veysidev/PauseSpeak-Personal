# PauseSpeak 1.1.9 — Mikrofon Anahtarı ve Sıradaki Çeviri

- Ana altyazı kartındaki mikrofon düğmesi artık gerçek bir aç/kapat anahtarıdır: ilk tıklama kart içi Telaffuz Koçu'nu açar, ikinci tıklama Koç'u ve mikrofon oturumunu kapatır.
- Zaman kodlu altyazı akışı kullanılabildiğinde ekrana gelmekte olan cümle önceden hazırlanır; tamamlanan cümle karta geçtiğinde hazır çeviri doğrudan önbellekten gösterilir.
- Normal çeviri modunda yalnızca normal cümle çevirisi önceden hazırlanır.
- Parçalı çeviri modunda yalnızca parça ayrımı ve o parçaların çevirileri önceden hazırlanır.
- Mod değiştirildiğinde önceki moda ait bekleyen ön hazırlık isteği iptal edilir; normal ve parçalı ön çeviri aynı anda çalışmaz.
- Tam altyazı kanalı henüz bulunmadıysa görünür altyazıdan tamamlandığı anlaşılabilen cümleler de önceden hazırlanabilir.
- Önbelleğe alınmış normal ve parçalı çeviriler ağ isteği beklenmeden ekrana yerleştirilir.
