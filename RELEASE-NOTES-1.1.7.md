# PauseSpeak 1.1.7 — Zaman Kodlu Altyazı ve Güçlü Tekrar Temizliği

- Oynatıcıdan yakalanmış zaman kodlu altyazı varsa hareketli Netflix DOM metninden önce bu güvenilir cue kullanılır.
- Tarayıcının yerel `TextTrack.activeCues` verisi ikinci güvenilir kaynak olarak eklendi; DOM yalnızca son çare olarak okunur.
- Altyazı birleştirici artık yalnızca son–baş örtüşmesini değil, cümlenin ortasından yeniden başlayan dört veya daha uzun kelime bloklarını da algılar.
- Tek bir Netflix altyazı değerinin içinde art arda iki kez bulunan uzun kelime blokları temizlenir.
- Büyük/küçük harf, düz/kıvrımlı apostrof ve noktalama farklılıkları tekrar algılamasını bozmaz.
- Kelimeler arasındaki 4 piksellik yapay boşluk kaldırıldı; gerçek metin boşlukları korunuyor ve noktalamadan önce gereksiz boşluk oluşmuyor.
- Telaffuz Koçu renkleri mevcut kelimelere doğrudan uygulanmaya devam eder; renk açıldığında satır yapısı değişmez.
