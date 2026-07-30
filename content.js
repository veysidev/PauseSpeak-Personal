(() => {
  const panelId = "pausespeak-status-panel";

  if (document.getElementById(panelId)) {
    return;
  }

  let currentSubtitle = "";
  let sentenceParts = [];
  let sentenceStartTime = null;
  let completedStartTimeMs = null;
  let lastVideoFound = null;

  let isSeeking = false;
  let activeSeekRequestId = null;
  let seekTimeout = null;

  // Cümlenin başına döndükten sonraki ilk oynatma için kullanılır.
  let replayPending = false;
  let replayGuardUntilVideoTime = null;

  const panel = document.createElement("div");
  panel.id = panelId;

  const title = document.createElement("div");
  title.textContent = "PauseSpeak";

  const status = document.createElement("div");
  status.textContent = "Video aranıyor...";

  const subtitleTitle = document.createElement("div");
  subtitleTitle.textContent = "Aktif İngilizce altyazı";

  const subtitleBox = document.createElement("div");
  subtitleBox.textContent = "Altyazı bekleniyor...";

  const completedTitle = document.createElement("div");
  completedTitle.textContent = "Tamamlanan cümle";

  const completedBox = document.createElement("div");
  completedBox.textContent =
    "Henüz tamamlanan cümle yok.";

  const rewindButton = document.createElement("button");
  rewindButton.textContent = "Cümlenin Başına Dön";
  rewindButton.disabled = true;

  const pauseButton = document.createElement("button");
  pauseButton.textContent = "Durdur";

  const playButton = document.createElement("button");
  playButton.textContent = "Devam Et";

  Object.assign(panel.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "2147483647",
    width: "320px",
    padding: "16px",
    backgroundColor: "#111827",
    color: "#ffffff",
    borderRadius: "12px",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)"
  });

  Object.assign(title.style, {
    fontSize: "18px",
    fontWeight: "bold"
  });

  Object.assign(status.style, {
    marginTop: "8px",
    marginBottom: "12px"
  });

  [subtitleTitle, completedTitle].forEach((element) => {
    Object.assign(element.style, {
      marginTop: "12px",
      marginBottom: "6px",
      fontSize: "12px",
      fontWeight: "bold",
      color: "#9ca3af"
    });
  });

  [subtitleBox, completedBox].forEach((element) => {
    Object.assign(element.style, {
      minHeight: "38px",
      padding: "10px",
      marginBottom: "10px",
      backgroundColor: "#1f2937",
      borderRadius: "8px",
      lineHeight: "1.45",
      color: "#ffffff"
    });
  });

  [rewindButton, pauseButton, playButton].forEach(
    (button) => {
      Object.assign(button.style, {
        padding: "9px 12px",
        marginRight: "8px",
        marginBottom: "8px",
        border: "none",
        borderRadius: "7px",
        cursor: "pointer",
        fontWeight: "bold"
      });
    }
  );

  function getNetflixVideo() {
    return document.querySelector("video");
  }

  function isVisible(element) {
    const rectangle = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rectangle.width > 0 &&
      rectangle.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  }

  function cleanText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function getNetflixSubtitle() {
    const selectors = [
      '[data-uia="player-subtitle"]',
      '[data-uia="player-timedtext"]',
      ".player-timedtext-text-container",
      ".player-timedtext"
    ];

    for (const selector of selectors) {
      const elements = Array.from(
        document.querySelectorAll(selector)
      ).filter(isVisible);

      const texts = elements
        .map((element) =>
          cleanText(
            element.innerText ||
              element.textContent ||
              ""
          )
        )
        .filter(Boolean);

      const uniqueTexts = [...new Set(texts)];

      if (uniqueTexts.length > 0) {
        return uniqueTexts.join(" ");
      }
    }

    return "";
  }

  function endsSentence(text) {
    return /[.!?…]["'’”)\]]*$/.test(text.trim());
  }

  function addSentencePart(text) {
    if (!text) {
      return;
    }

    const lastPart =
      sentenceParts[sentenceParts.length - 1];

    if (!lastPart) {
      sentenceParts.push(text);
      return;
    }

    if (text.includes(lastPart)) {
      sentenceParts[sentenceParts.length - 1] = text;
      return;
    }

    if (lastPart.includes(text)) {
      return;
    }

    sentenceParts.push(text);
  }

  function finishSentence(video) {
    const fullSentence = cleanText(
      sentenceParts.join(" ")
    );

    if (!fullSentence) {
      return;
    }

    completedBox.textContent = fullSentence;
    subtitleBox.textContent = fullSentence;

    const currentTime = video
      ? Number(video.currentTime)
      : 0;

    if (sentenceStartTime !== null) {
      completedStartTimeMs =
        Math.max(0, sentenceStartTime - 0.25) * 1000;
    } else {
      completedStartTimeMs =
        Math.max(0, currentTime - 3) * 1000;
    }

    rewindButton.disabled = false;

    sentenceParts = [];
    sentenceStartTime = null;
    replayPending = false;
    replayGuardUntilVideoTime = null;

    if (video && !video.paused) {
      video.pause();
      status.textContent =
        "⏸️ Cümle bitti — video durduruldu";
    } else {
      status.textContent = "✅ Cümle tamamlandı";
    }
  }

  function updateVideoStatus() {
    const video = getNetflixVideo();
    const videoFound = Boolean(video);

    if (videoFound === lastVideoFound) {
      return;
    }

    lastVideoFound = videoFound;

    if (videoFound) {
      status.textContent = "✅ Video bulundu";
      pauseButton.disabled = false;
      playButton.disabled = false;
      rewindButton.disabled =
        completedStartTimeMs === null;
    } else {
      status.textContent = "⏳ Video aranıyor...";
      pauseButton.disabled = true;
      playButton.disabled = true;
      rewindButton.disabled = true;
    }
  }

  function updateSubtitle() {
    const video = getNetflixVideo();
    const newSubtitle = getNetflixSubtitle();

    if (newSubtitle === currentSubtitle) {
      return;
    }

    if (isSeeking) {
      currentSubtitle = newSubtitle;

      if (newSubtitle) {
        subtitleBox.textContent = newSubtitle;
      }

      return;
    }

    const previousSubtitle = currentSubtitle;
    currentSubtitle = newSubtitle;

    let replayGuardActive = false;

    if (
      replayGuardUntilVideoTime !== null &&
      video
    ) {
      replayGuardActive =
        video.currentTime < replayGuardUntilVideoTime;

      if (!replayGuardActive) {
        replayGuardUntilVideoTime = null;
      }
    }

    /*
     * Geri sarma sonrasında Netflix eski tamamlanmış
     * altyazıyı kısa süre ekranda tutabilir.
     * Bu süre içinde onu yeni bitmiş cümle saymıyoruz.
     */
    if (previousSubtitle && !replayGuardActive) {
      addSentencePart(previousSubtitle);

      if (endsSentence(previousSubtitle)) {
        finishSentence(video);
      }
    }

    if (newSubtitle) {
      if (sentenceStartTime === null) {
        sentenceStartTime = video
          ? Math.max(0, video.currentTime - 0.15)
          : null;
      }

      subtitleBox.textContent = newSubtitle;
    } else if (!previousSubtitle) {
      subtitleBox.textContent =
        "Altyazı bekleniyor...";
    }
  }

  function finishSeek(success, message) {
    if (seekTimeout) {
      clearTimeout(seekTimeout);
      seekTimeout = null;
    }

    isSeeking = false;
    activeSeekRequestId = null;

    pauseButton.disabled = false;
    playButton.disabled = false;
    rewindButton.disabled =
      completedStartTimeMs === null;

    if (!success) {
      status.textContent =
        `❌ ${message || "Cümlenin başına dönülemedi"}`;
      return;
    }

    /*
     * Eski altyazıyı hafızada tutmuyoruz.
     * Önceki sorunun temel nedeni buydu.
     */
    currentSubtitle = "";
    sentenceParts = [];

    sentenceStartTime =
      completedStartTimeMs !== null
        ? completedStartTimeMs / 1000
        : null;

    replayPending = true;
    replayGuardUntilVideoTime = null;

    subtitleBox.textContent =
      completedBox.textContent;

    status.textContent =
      "⏪ Cümlenin başına dönüldü — Devam Et'e bas";
  }

  rewindButton.addEventListener("click", () => {
    const video = getNetflixVideo();

    if (!video || completedStartTimeMs === null) {
      status.textContent =
        "Geri dönülecek cümle bulunamadı";
      return;
    }

    video.pause();

    isSeeking = true;
    replayPending = false;
    replayGuardUntilVideoTime = null;

    currentSubtitle = "";
    sentenceParts = [];

    activeSeekRequestId =
      `seek-${Date.now()}-${Math.random()}`;

    rewindButton.disabled = true;
    pauseButton.disabled = true;
    playButton.disabled = true;

    status.textContent =
      "⏪ Cümlenin başına dönülüyor...";

    window.postMessage(
      {
        source: "PAUSESPEAK_EXTENSION",
        type: "PAUSESPEAK_SEEK_REQUEST",
        requestId: activeSeekRequestId,
        targetTimeMs: completedStartTimeMs
      },
      "*"
    );

    seekTimeout = setTimeout(() => {
      finishSeek(
        false,
        "Netflix oynatıcıdan cevap alınamadı"
      );
    }, 5000);
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;

    if (
      !data ||
      data.source !== "PAUSESPEAK_PAGE" ||
      data.type !== "PAUSESPEAK_SEEK_RESPONSE" ||
      data.requestId !== activeSeekRequestId
    ) {
      return;
    }

    finishSeek(data.success, data.message);
  });

  pauseButton.addEventListener("click", () => {
    const video = getNetflixVideo();

    if (!video) {
      status.textContent = "Video bulunamadı";
      return;
    }

    video.pause();
    status.textContent = "⏸️ Video durduruldu";
  });

  playButton.addEventListener("click", async () => {
    const video = getNetflixVideo();

    if (!video) {
      status.textContent = "Video bulunamadı";
      return;
    }

    if (replayPending) {
      replayPending = false;

      currentSubtitle = "";
      sentenceParts = [];

      const replayStartSeconds =
        completedStartTimeMs !== null
          ? completedStartTimeMs / 1000
          : video.currentTime;

      sentenceStartTime = replayStartSeconds;

      /*
       * Geri sarma sonrası ilk 0,8 saniyede eski
       * altyazının videoyu tekrar durdurmasını engeller.
       */
      replayGuardUntilVideoTime =
        replayStartSeconds + 0.8;
    }

    try {
      await video.play();
      status.textContent = "▶️ Video oynatılıyor";
    } catch (error) {
      status.textContent = "Video başlatılamadı";

      console.error(
        "PauseSpeak oynatma hatası:",
        error
      );
    }
  });

  panel.appendChild(title);
  panel.appendChild(status);
  panel.appendChild(subtitleTitle);
  panel.appendChild(subtitleBox);
  panel.appendChild(completedTitle);
  panel.appendChild(completedBox);
  panel.appendChild(rewindButton);
  panel.appendChild(document.createElement("br"));
  panel.appendChild(pauseButton);
  panel.appendChild(playButton);

  document.documentElement.appendChild(panel);

  const observer = new MutationObserver(() => {
    updateVideoStatus();
    updateSubtitle();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  updateVideoStatus();
  updateSubtitle();

  setInterval(() => {
    updateVideoStatus();
    updateSubtitle();
  }, 400);
})();