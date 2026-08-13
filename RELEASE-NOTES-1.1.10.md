# PauseSpeak 1.1.10 — Kumanda, Cümle Geçişi ve Kelime Ayrıntıları

- Otomatik durdurmadan sonra tamamlanan cümle artık yeni altyazı tarafından ezilmiyor; kelimeler tıklanabilir ve ok tuşlarıyla seçilebilir kalıyor.
- Yukarı ok önceki, aşağı ok sonraki kelimeyi seçiyor. Eski `Up`/`Down` adları ile Android kumandalarının tuş kodları da destekleniyor.
- Sol ve sağ oklar artık 10 saniye sarmak yerine önceki ve sonraki tam cümleyi başından oynatıyor.
- Ekrandaki önceki/sonraki cümle düğmeleri de aynı zaman kodlu cümle gezinme akışını kullanıyor.
- Kumandanın orta/Enter/Select tuşu seçili kelimenin ayrıntısını açıyor; ayrıntı zaten açıksa kapatıp bekleyen isteği iptal ediyor.
- Dokunmatik ekranda kelime ayrıntısı doğrudan `pointerup` ile açılıyor; gecikmeli `click` olayına bağımlı değil.
- Kelime ayrıntısı açıkken tabletin herhangi bir yerine tek dokunuş paneli kapatıyor ve dokunuşun videoyu yanlışlıkla oynatmasını engelliyor.
- Kelime ayrıntısı katmanı tam ekran kapsayıcısına da taşındığı için Netflix ve YouTube tam ekranında görünür kalıyor.
- Cümle gezinme, uzaktan kumanda, dokunmatik açma, tam ekran ayrıntı ve etkileşimli cümleyi koruma davranışları sözleşme testlerine eklendi.
