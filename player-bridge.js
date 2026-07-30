(() => {
  const badgeId = "pausespeak-player-api-test";

  if (document.getElementById(badgeId)) {
    return;
  }

  const badge = document.createElement("div");
  badge.id = badgeId;
  badge.textContent =
    "PauseSpeak: Netflix oynatıcı kontrolü aranıyor...";

  Object.assign(badge.style, {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: "2147483647",
    padding: "12px 16px",
    maxWidth: "320px",
    backgroundColor: "#111827",
    color: "#ffffff",
    borderRadius: "10px",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)"
  });

  document.documentElement.appendChild(badge);

  let attempts = 0;
  const maximumAttempts = 60;

  const timer = setInterval(() => {
    attempts += 1;

    try {
      /*
       * Bu Netflix tarafından belgelenmiş bir genel API değildir.
       * Yalnızca mevcut oynatıcı nesnesini güvenli biçimde arıyoruz.
       */
      const playerApp =
        window.netflix?.appContext?.state?.playerApp;

      const playerApi = playerApp?.getAPI?.();
      const videoPlayerManager = playerApi?.videoPlayer;

      const sessionIds =
        videoPlayerManager?.getAllPlayerSessionIds?.() || [];

      const sessionId =
        sessionIds.find((id) =>
          String(id).toLowerCase().includes("watch")
        ) || sessionIds[0];

      const player = sessionId
        ? videoPlayerManager?.getVideoPlayerBySessionId?.(
            sessionId
          )
        : null;

      if (player && typeof player.seek === "function") {
        clearInterval(timer);

        badge.textContent =
          "✅ Netflix oynatıcı kontrolü bulundu";
        badge.style.backgroundColor = "#14532d";

        console.log(
          "PauseSpeak: Netflix oynatıcı kontrolü bulundu.",
          {
            sessionId,
            hasSeek: typeof player.seek === "function",
            hasPlay: typeof player.play === "function",
            hasPause: typeof player.pause === "function"
          }
        );

        return;
      }

      if (attempts >= maximumAttempts) {
        clearInterval(timer);

        badge.textContent =
          "❌ Netflix oynatıcı kontrolü bulunamadı";
        badge.style.backgroundColor = "#7f1d1d";

        console.log("PauseSpeak oynatıcı testi:", {
          netflixObjectFound: Boolean(window.netflix),
          playerAppFound: Boolean(playerApp),
          playerApiFound: Boolean(playerApi),
          sessionIds
        });
      }
    } catch (error) {
      clearInterval(timer);

      badge.textContent =
        "⚠️ Oynatıcı kontrolü testi sırasında hata oluştu";
      badge.style.backgroundColor = "#78350f";

      console.error(
        "PauseSpeak oynatıcı kontrolü test hatası:",
        error
      );
    }
  }, 500);
})();