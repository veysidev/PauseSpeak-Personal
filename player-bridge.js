(() => {
  const badgeId = "pausespeak-player-api-test";

  if (document.getElementById(badgeId)) {
    return;
  }

  function getNetflixPlayer() {
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

    if (!sessionId) {
      return null;
    }

    return videoPlayerManager
      ?.getVideoPlayerBySessionId?.(sessionId);
  }

  const badge = document.createElement("div");
  badge.id = badgeId;

  const statusText = document.createElement("div");
  statusText.textContent =
    "Netflix oynatıcı kontrolü aranıyor...";

  const testButton = document.createElement("button");
  testButton.textContent = "5 Saniye Geri Git";
  testButton.disabled = true;

  Object.assign(badge.style, {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: "2147483647",
    padding: "12px 16px",
    width: "240px",
    backgroundColor: "#111827",
    color: "#ffffff",
    borderRadius: "10px",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)"
  });

  Object.assign(testButton.style, {
    marginTop: "10px",
    padding: "8px 12px",
    border: "none",
    borderRadius: "7px",
    fontWeight: "bold",
    cursor: "pointer"
  });

  badge.appendChild(statusText);
  badge.appendChild(testButton);
  document.documentElement.appendChild(badge);

  let attempts = 0;
  const maximumAttempts = 60;

  const searchTimer = setInterval(() => {
    attempts += 1;

    try {
      const player = getNetflixPlayer();

      if (
        player &&
        typeof player.seek === "function" &&
        typeof player.getCurrentTime === "function"
      ) {
        clearInterval(searchTimer);

        statusText.textContent =
          "✅ Netflix oynatıcı kontrolü bulundu";

        badge.style.backgroundColor = "#14532d";
        testButton.disabled = false;
        return;
      }

      if (attempts >= maximumAttempts) {
        clearInterval(searchTimer);

        statusText.textContent =
          "❌ Netflix oynatıcı kontrolü bulunamadı";

        badge.style.backgroundColor = "#7f1d1d";
      }
    } catch (error) {
      clearInterval(searchTimer);

      statusText.textContent =
        "⚠️ Oynatıcı testi sırasında hata oluştu";

      badge.style.backgroundColor = "#78350f";

      console.error(
        "PauseSpeak oynatıcı bulma hatası:",
        error
      );
    }
  }, 500);

  testButton.addEventListener("click", async () => {
    const player = getNetflixPlayer();

    if (
      !player ||
      typeof player.seek !== "function" ||
      typeof player.getCurrentTime !== "function"
    ) {
      statusText.textContent =
        "❌ Oynatıcı kontrolü artık bulunamıyor";
      return;
    }

    testButton.disabled = true;

    try {
      if (typeof player.pause === "function") {
        player.pause();
      }

      const currentTimeMs = Number(
        player.getCurrentTime()
      );

      if (!Number.isFinite(currentTimeMs)) {
        throw new Error("Oynatma zamanı okunamadı.");
      }

      const targetTimeMs = Math.max(
        0,
        currentTimeMs - 5000
      );

      await Promise.resolve(
        player.seek(targetTimeMs)
      );

      statusText.textContent =
        "✅ 5 saniye geri gitme komutu gönderildi";

      testButton.textContent =
        "Tekrar 5 Saniye Geri Git";
    } catch (error) {
      statusText.textContent =
        "❌ Netflix geri sarma işlemini reddetti";

      badge.style.backgroundColor = "#7f1d1d";

      console.error(
        "PauseSpeak player.seek hatası:",
        error
      );
    } finally {
      testButton.disabled = false;
    }
  });
})();