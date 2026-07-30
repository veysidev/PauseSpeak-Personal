(() => {
  if (window.__PAUSESPEAK_PLAYER_BRIDGE_LOADED__) {
    return;
  }

  window.__PAUSESPEAK_PLAYER_BRIDGE_LOADED__ = true;

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

  function sendResponse(
    requestId,
    success,
    message
  ) {
    window.postMessage(
      {
        source: "PAUSESPEAK_PAGE",
        type: "PAUSESPEAK_REPLAY_RESPONSE",
        requestId,
        success,
        message
      },
      "*"
    );
  }

  function wait(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  async function waitForSeek(
    player,
    targetTimeMs
  ) {
    if (
      typeof player.getCurrentTime !== "function"
    ) {
      await wait(500);
      return;
    }

    for (
      let attempt = 0;
      attempt < 25;
      attempt += 1
    ) {
      const currentTimeMs = Number(
        player.getCurrentTime()
      );

      if (
        Number.isFinite(currentTimeMs) &&
        Math.abs(currentTimeMs - targetTimeMs) <
          1500
      ) {
        return;
      }

      await wait(100);
    }
  }

  async function replaySentence(
    requestId,
    targetTimeMs
  ) {
    try {
      const player = getNetflixPlayer();

      if (
        !player ||
        typeof player.seek !== "function"
      ) {
        sendResponse(
          requestId,
          false,
          "Netflix oynatıcı kontrolü bulunamadı."
        );
        return;
      }

      if (typeof player.pause === "function") {
        await Promise.resolve(player.pause());
      }

      await Promise.resolve(
        player.seek(targetTimeMs)
      );

      await waitForSeek(player, targetTimeMs);

      if (typeof player.play === "function") {
        await Promise.resolve(player.play());
      } else {
        const video =
          document.querySelector("video");

        if (!video) {
          throw new Error(
            "Netflix video öğesi bulunamadı."
          );
        }

        await video.play();
      }

      sendResponse(
        requestId,
        true,
        "Cümle tekrar oynatılıyor."
      );
    } catch (error) {
      console.error(
        "PauseSpeak tekrar oynatma hatası:",
        error
      );

      sendResponse(
        requestId,
        false,
        "Netflix tekrar oynatma işlemini reddetti."
      );
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;

    if (
      !data ||
      data.source !== "PAUSESPEAK_EXTENSION" ||
      data.type !==
        "PAUSESPEAK_REPLAY_REQUEST"
    ) {
      return;
    }

    const targetTimeMs = Number(
      data.targetTimeMs
    );

    if (
      !Number.isFinite(targetTimeMs) ||
      targetTimeMs < 0
    ) {
      sendResponse(
        data.requestId,
        false,
        "Geçersiz cümle başlangıç zamanı."
      );
      return;
    }

    replaySentence(
      data.requestId,
      Math.round(targetTimeMs)
    );
  });
})();