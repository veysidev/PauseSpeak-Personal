# PauseSpeak 1.1.12 — OpenAI API çağrı haritası

Bu harita 1.1.11 davranışı korunarak hazırlanmıştır. 1.1.12'nin bu adımında model seçimi, çağrı sıklığı veya kullanıcı akışı değiştirilmemiş; yalnız ölçüm doğruluğu ve gözlemlenebilirlik tamamlanmıştır.

| Endpoint | Tetikleyici | Model | En fazla model isteği | İstemci önbelleği | Sayaç işlemi |
| --- | --- | --- | ---: | --- | --- |
| `POST /translate` | Normal cümle çevirisi veya normal mod ön hazırlığı | `gpt-5.6-luna` | 1 | `translatedCueCache` | `normal_translation` |
| `POST /translate` | Parçalı modda her İngilizce parçanın çevirisi veya ön hazırlığı | `gpt-5.6-luna` | Her parça için 1 | `requestSubtitleChunkTranslation.translationCache` | `chunk_translation` |
| `POST /translate` | Kullanıcının normal çeviriyi iyileştirmesi | `gpt-5.6-terra` | 1 | İyileştirme isteği önbelleği atlar; başarılı sonuç normal çeviri önbelleğine yazılır | `improve_translation` |
| `POST /translate` | Kullanıcının parçalı çeviriyi iyileştirmesi | `gpt-5.6-terra` | Her parça için 1 | İyileştirme isteği önbelleği atlar | `improve_chunk` |
| `POST /chunk` | `finishSentence()` → `loadStudySegments()`; normal veya parçalı mod fark etmeksizin tamamlanan her yeni cümle | `gpt-5.6-terra` | Doğrulama başarısızsa en fazla 2 | `getSubtitleChunkCache()` | `chunk_split` |
| `POST /study-meaning` | Kullanıcı kelime/ifadeye dokunur veya tıklar; önbellekte anlam yoktur | `context-expression-v1` için `gpt-5.6-terra`, diğer modda `gpt-5.6-luna` | Doğrulama başarısızsa en fazla 2 | `studyMeaningCache` | `study_meaning` |
| `POST /study-segments` | İstemci işlevi mevcut fakat 1.1.11 akışında otomatik çağrısı yok | `context-expression-v1` için `gpt-5.6-terra`, diğer modda `gpt-5.6-luna` | Doğrulama başarısızsa en fazla 2 | Kalıcı sonuç önbelleği yok | `study_segments` |
| `POST /speak-translation` | İngilizce/Türkçe ses kullanıcı akışı tarafından istendiğinde | `gpt-4o-mini-tts` | 1 | Sunucu TTS önbelleği yok | `tts_english` veya `tts_turkish` |

## Tamamlanan altyazı başına mevcut çağrı sözleşmesi

- Normal mod: tamamlanan cümle için bir `/chunk` ve önbellekte yoksa bir `/translate` çağrısı yapılır.
- Parçalı mod: tamamlanan cümle için bir `/chunk`, ardından önbellekte olmayan her parça için ayrı bir `/translate` çağrısı yapılır.
- Seçili modun yalnız bir sonraki cümlesi önceden hazırlanır. Normal ön hazırlık bir `/translate`; parçalı ön hazırlık bir `/chunk` ve parça sayısı kadar `/translate` oluşturabilir.
- `POST /study-segments` mevcut istemci sürümünde tamamlanan altyazı akışına bağlı değildir.

Bu sözleşme `tests/ui-contract.test.js` içindeki testlerle sabitlenmiştir. Sonraki maliyet adımı otomatik `/chunk` çağrısını kaldırdığında test de hedef sözleşmeye göre bilinçli biçimde güncellenmelidir.

## 1.1.12 sayaç alanları

Her OpenAI işlemi artık metin veya kullanıcı verisi yazmadan şu alanlarla gözlemlenir:

- `requests`
- `inputTokens`
- `cachedInputTokens`
- `cacheWriteTokens`
- `outputTokens`
- `reasoningTokens`
- `retryCount`
- `cacheHits`
- `cacheMisses`
- `errorCount`
- `estimatedUsd`

`cacheWriteTokens`, toplam giriş tokenlerinin bir alt kümesi olarak hesaplanır. Maliyet hesabında Luna için 1M cache yazımı `$0,25`, Terra için `$2,50` olarak kullanılır; bu değerler normal giriş fiyatının `1,25x` karşılığıdır.
