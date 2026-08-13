# PauseSpeak 1.1.20 — elle küçültmede alt altyazı konumu

Bu sürüm yalnızca istemci arayüz yerleşimini değiştirir; yeni bir API çağrısı eklemez.

## Oynatma paneli elle küçültüldüğünde

- Ana arayüze `ps-player-shell-collapsed` durumu uygulanır.
- Altyazı kartı ekran yüksekliği ve güvenli alt alanla hesaplanan alt konuma iner.
- Altyazı eylemleri çalışmaya ve görünmeye devam eder.

## Oynatma paneli yeniden açıldığında

- Elle küçültme durumu kaldırılır.
- Altyazı kartı oynatma panelinin üstündeki normal konumuna döner.

## Otomatik gizleme

- Tam ekranda 5 saniyelik otomatik gizleme aynı alt konum kuralını kullanır.
