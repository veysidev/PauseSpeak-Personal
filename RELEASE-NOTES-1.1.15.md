# PauseSpeak Personal 1.1.15

- Parçalı modda yalnızca kullanıcı istediğinde çalışan ayrı bir `Terra` parçalama iyileştirme düğmesi eklendi.
- Yeni düğme mevcut Luna parçalarını ve çevirilerini bağlam olarak gönderir; Terra tek yapılandırılmış yanıtta hem parça sınırlarını hem Türkçe karşılıkları yeniden üretir.
- Mevcut yıldız düğmesi çeviri iyileştirmesi olarak korunur; yeni `Terra` düğmesi doğrudan parça sınırlarını iyileştirir.
- Luna parça doğrulaması gereksiz tek kelimelik parçaları, `not` / `to` sınırlarını ve yaygın phrasal verb ayrılmalarını reddedecek biçimde güçlendirildi.
- İlk Luna sonucu doğrulanamazsa ihlal nedenleri ve önceki parçalar ikinci Luna düzeltme isteğine aktarılır.
- İki Luna denemesi de güvenli değilse otomatik Terra çağrısı yapılmaz; istemci cümlenin tamamını güvenli tek parça olarak kullanır.
- Terra yalnızca kullanıcı yeni düğmeye bastığında çağrılır ve `improve_chunk` olarak kaydedilir.
- Normal çeviri, kumanda, kelime ayrıntısı, telaffuz ve tam ekran davranışları korunur.
