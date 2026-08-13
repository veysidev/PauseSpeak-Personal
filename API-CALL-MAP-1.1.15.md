# PauseSpeak 1.1.15 — API çağrı sözleşmesi

## Otomatik normal mod

- Model: `gpt-5.6-luna`
- Önbellek yoksa cümle başına en fazla bir `/translate` isteği.
- `/chunk` ve Terra çağrısı yapılmaz.
- Yalnızca aktif normal modun sonraki cümlesi hazırlanabilir.

## Otomatik parçalı mod

- Model: `gpt-5.6-luna`
- Önbellek yoksa cümle başına bir birleşik `/chunk` isteği.
- İngilizce parçalar ve bütün Türkçe karşılıklar aynı yapılandırılmış cevapta alınır.
- Geçersiz ilk cevapta hata nedenleriyle en fazla bir Luna düzeltme isteği yapılır.
- İkinci Luna da geçersizse otomatik Terra çağrılmadan güvenli tek-parça akışına geçilir.
- Başarılı birleşik cevap için parça başına `/translate` isteği yapılmaz.

## Kullanıcı tarafından başlatılan Terra

- Terra hiçbir zaman otomatik çağrılmaz.
- Normal moddaki ortak düğme, tam cümleyi tek `gpt-5.6-terra` `/translate` isteğiyle iyileştirir; işlem `improve_translation` olarak kaydedilir.
- Parçalı moddaki aynı düğme, bütün parçaları ve Türkçe karşılıklarını tek `gpt-5.6-terra` `/chunk` isteğiyle yeniden hazırlar; işlem `improve_chunk` olarak kaydedilir.
- Terra parça cevabı sunucu ve istemci doğrulamasından geçmeden ekrana yazılmaz.
- Aynı düğmeye art arda basılması ikinci bir istek oluşturmaz.
- Mod veya cümle değişirse eski cevap uygulanmaz.
- Terra hatası mevcut başarılı Luna sonucunu silmez.

## Sayaç ve güvenlik

- Her model çağrısında model, giriş/çıkış tokenleri, cache-write tokenleri, retry ve hata sayısı korunur.
- Gizli anahtarlar, bağlantı bilgileri ve senkronizasyon kodları loglanmaz.
- PostgreSQL sonuç önbelleği ve TTS önbelleği bu sürümün kapsamında değildir.
