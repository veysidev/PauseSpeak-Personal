# PauseSpeak Personal 1.1.14

- Parçalı moddaki `1 Terra parçalama + N Luna parça çevirisi` zinciri kaldırıldı.
- `/chunk` artık `gpt-5.6-luna` ve `reasoning.effort: "none"` ile çalışıyor.
- Tek yapılandırılmış yanıt içinde `suitable` kararı, İngilizce parçalar ve her parçanın doğal Türkçe çevirisi dönüyor.
- İstemci aynı yanıtın çevirilerini parça önbelleğine yazıyor; normal parçalı akışta parça başına ek `/translate` çağrısı yapılmıyor.
- Bölünmesi uygun olmayan cümleler tek İngilizce/Türkçe parça olarak güvenle dönebiliyor.
- Kullanıcının açıkça başlattığı parça iyileştirme yolu Terra kullanmaya devam ediyor.
- Normal moddaki sıfır `/chunk` davranışı, kumanda, kelime ayrıntıları ve tam ekran görünümü korunuyor.
