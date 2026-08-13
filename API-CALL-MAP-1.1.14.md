# PauseSpeak 1.1.14 — API çağrı sözleşmesi

## Normal mod

- Tamamlanan cümle için `/chunk` çağrısı yapılmaz.
- Önbellekte yoksa yalnızca bir Luna `/translate` çağrısı yapılır.
- Yalnız seçili normal modun bir sonraki cümlesi önceden çevrilebilir.

## Parçalı mod

- Önbellekte yoksa cümle başına tek bir Luna `/chunk` çağrısı yapılır.
- Bu tek yapılandırılmış yanıt `suitable` kararını ve `parts[].english` / `parts[].turkish` alanlarını birlikte üretir.
- Sunucu İngilizce parçaların eksiksiz ve doğru sırada birleştiğini, Türkçe alanların dolu olduğunu doğrular.
- İstemci İngilizce parçaları ve Türkçe çevirileri birlikte önbelleğe alır.
- Başarılı normal akışta parça başına ek `/translate` çağrısı yapılmaz.
- Bölünmeye uygun olmayan cümle `suitable:false` ve tek İngilizce/Türkçe parça olarak döner.
- Yalnız seçili parçalı modun bir sonraki cümlesi bu tek çağrıyla hazırlanabilir.

## Model ve sayaç

- Birleşik parçalama/çeviri modeli: `gpt-5.6-luna`
- Reasoning: `none`
- Sayaç işlemi: `chunk_translation`
- Eski `chunk_split` kayıtları geçmiş özetlerle uyumluluk için okunmaya devam eder ancak yeni birleşik akışta üretilmez.
- Kullanıcının parça iyileştirme isteği `improve_chunk` olarak Terra ile ayrı kaydedilir.

Bu sözleşme, tek `/chunk` yanıtının çeviri önbelleğini doldurduğunu ve ardından parça çevirisi okunurken ikinci ağ isteği oluşmadığını ölçen testle korunur.
