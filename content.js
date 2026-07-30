(() => {
  const panelId = "pausespeak-status-panel";

  const translationApiUrl =
    "http://localhost:3000/translate";

  const translationTimeoutMs = 8000;

  if (document.getElementById(panelId)) {
    return;
  }

  let currentSubtitle = "";
  let sentenceParts = [];
  let sentenceStartTime = null;
  let completedStartTimeMs = null;
  let lastVideoFound = null;

  let isReplayStarting = false;
  let activeReplayRequestId = null;
  let replayTimeout = null;
  let replayGuardUntilVideoTime = null;
  let isReplayPlaybackActive = false;

  let previousCompletedSentence = "";
  let translationRequestNumber = 0;

  const panel = document.createElement("div");
  panel.id = panelId;

  const title = document.createElement("div");
  title.textContent = "PauseSpeak";

  const status = document.createElement("div");
  status.textContent = "Video aranıyor...";

  const subtitleTitle = document.createElement("div");
  subtitleTitle.textContent =
    "Aktif İngilizce altyazı";

  const subtitleBox = document.createElement("div");
  subtitleBox.textContent =
    "Altyazı bekleniyor...";

  const completedTitle =
    document.createElement("div");

  completedTitle.textContent =
    "Tamamlanan İngilizce cümle";

  const completedBox =
    document.createElement("div");

  completedBox.textContent =
    "Henüz tamamlanan cümle yok.";

  const translationTitle =
    document.createElement("div");

  translationTitle.textContent =
    "Türkçe çeviri";

  const translationBox =
    document.createElement("div");

  translationBox.textContent =
    "İngilizce cümle tamamlandığında çeviri gösterilecek.";

  const replayButton =
    document.createElement("button");

  replayButton.textContent =
    "Cümleyi Tekrar Oynat";

  replayButton.disabled = true;

  const pauseButton =
    document.createElement("button");

  pauseButton.textContent = "Durdur";

  const playButton =
    document.createElement("button");

  playButton.textContent = "Devam Et";

  Object.assign(panel.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "2147483647",
    width: "340px",
    maxHeight: "calc(100vh - 40px)",
    overflowY: "auto",
    padding: "16px",
    backgroundColor: "#111827",
    color: "#ffffff",
    borderRadius: "12px",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    boxShadow:
      "0 6px 20px rgba(0, 0, 0, 0.35)"
  });

  Object.assign(title.style, {
    fontSize: "18px",
    fontWeight: "bold"
  });

  Object.assign(status.style, {
    marginTop: "8px",
    marginBottom: "12px"
  });

  [
    subtitleTitle,
    completedTitle,
    translationTitle
  ].forEach((element) => {
    Object.assign(element.style, {
      marginTop: "12px",
      marginBottom: "6px",
      fontSize: "12px",
      fontWeight: "bold",
      color: "#9ca3af"
    });
  });

  [
    subtitleBox,
    completedBox,
    translationBox
  ].forEach((element) => {
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

  Object.assign(translationBox.style, {
    backgroundColor: "#172554",
    color: "#dbeafe"
  });

  [
    replayButton,
    pauseButton,
    playButton
  ].forEach((button) => {
    Object.assign(button.style, {
      padding: "9px 12px",
      marginRight: "8px",
      marginBottom: "8px",
      border: "none",
      borderRadius: "7px",
      cursor: "pointer",
      fontWeight: "bold"
    });
  });

  function getNetflixVideo() {
    return document.querySelector("video");
  }

  function isVisible(element) {
    const rectangle =
      element.getBoundingClientRect();

    const style =
      window.getComputedStyle(element);

    return (
      rectangle.width > 0 &&
      rectangle.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  }

  function cleanText(text) {
    return text
      .replace(/\s+/g, " ")
      .trim();
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

      const uniqueTexts =
        [...new Set(texts)];

      if (uniqueTexts.length > 0) {
        return uniqueTexts.join(" ");
      }
    }

    return "";
  }

  function endsSentence(text) {
    return /[.!?…]["'’”)\]]*$/.test(
      text.trim()
    );
  }

  function addSentencePart(text) {
    if (!text) {
      return;
    }

    const lastPart =
      sentenceParts[
        sentenceParts.length - 1
      ];

    if (!lastPart) {
      sentenceParts.push(text);
      return;
    }

    if (text.includes(lastPart)) {
      sentenceParts[
        sentenceParts.length - 1
      ] = text;

      return;
    }

    if (lastPart.includes(text)) {
      return;
    }

    sentenceParts.push(text);
  }

  async function translateSentence(
    text,
    previousText
  ) {
    const requestNumber =
      ++translationRequestNumber;

    const controller =
      new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, translationTimeoutMs);

    translationBox.textContent =
      "Çevriliyor...";

    try {
      const response = await fetch(
        translationApiUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            text,
            previousText
          }),

          signal: controller.signal
        }
      );

      const data =
        await response.json();

      if (
        requestNumber !==
        translationRequestNumber
      ) {
        return;
      }

      if (
        !response.ok ||
        !data?.success ||
        typeof data.translation !==
          "string"
      ) {
        throw new Error(
          data?.error ||
            "Çeviri alınamadı."
        );
      }

      translationBox.textContent =
        data.translation;
    } catch (error) {
      if (
        requestNumber !==
        translationRequestNumber
      ) {
        return;
      }

      if (error.name === "AbortError") {
        translationBox.textContent =
          "Çeviri isteği zaman aşımına uğradı.";
      } else if (
        error instanceof TypeError
      ) {
        translationBox.textContent =
          "PauseSpeak sunucusuna ulaşılamadı. Sunucunun açık olduğunu kontrol et.";
      } else {
        translationBox.textContent =
          "Çeviri alınamadı.";
      }

      console.error(
        "PauseSpeak çeviri hatası:",
        error
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function finishSentence(video) {
    const fullSentence = cleanText(
      sentenceParts.join(" ")
    );

    if (!fullSentence) {
      return;
    }

    completedBox.textContent =
      fullSentence;

    subtitleBox.textContent =
      fullSentence;

    if (isReplayPlaybackActive) {
      isReplayPlaybackActive = false;
    } else {
      const previousText =
        previousCompletedSentence;

      previousCompletedSentence =
        fullSentence;

      void translateSentence(
        fullSentence,
        previousText
      );
    }

    const currentTime = video
      ? Number(video.currentTime)
      : 0;

    if (sentenceStartTime !== null) {
      completedStartTimeMs =
        Math.max(
          0,
          sentenceStartTime - 0.25
        ) * 1000;
    } else {
      completedStartTimeMs =
        Math.max(
          0,
          currentTime - 3
        ) * 1000;
    }

    replayButton.disabled = false;

    sentenceParts = [];
    sentenceStartTime = null;
    replayGuardUntilVideoTime = null;

    if (video && !video.paused) {
      video.pause();

      status.textContent =
        "⏸️ Cümle bitti — video durduruldu";
    } else {
      status.textContent =
        "✅ Cümle tamamlandı";
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
      status.textContent =
        "✅ Video bulundu";

      pauseButton.disabled = false;
      playButton.disabled = false;

      replayButton.disabled =
        completedStartTimeMs === null;
    } else {
      status.textContent =
        "⏳ Video aranıyor...";

      pauseButton.disabled = true;
      playButton.disabled = true;
      replayButton.disabled = true;
    }
  }

  function updateSubtitle() {
    const video = getNetflixVideo();

    const newSubtitle =
      getNetflixSubtitle();

    if (
      newSubtitle ===
      currentSubtitle
    ) {
      return;
    }

    if (isReplayStarting) {
      currentSubtitle = newSubtitle;

      if (newSubtitle) {
        subtitleBox.textContent =
          newSubtitle;
      }

      return;
    }

    const previousSubtitle =
      currentSubtitle;

    currentSubtitle = newSubtitle;

    let replayGuardActive = false;

    if (
      replayGuardUntilVideoTime !==
        null &&
      video
    ) {
      replayGuardActive =
        video.currentTime <
        replayGuardUntilVideoTime;

      if (!replayGuardActive) {
        replayGuardUntilVideoTime =
          null;
      }
    }

    if (
      previousSubtitle &&
      !replayGuardActive
    ) {
      addSentencePart(
        previousSubtitle
      );

      if (
        endsSentence(
          previousSubtitle
        )
      ) {
        finishSentence(video);
      }
    }

    if (newSubtitle) {
      if (
        sentenceStartTime === null
      ) {
        sentenceStartTime = video
          ? Math.max(
              0,
              video.currentTime -
                0.15
            )
          : null;
      }

      subtitleBox.textContent =
        newSubtitle;
    } else if (!previousSubtitle) {
      subtitleBox.textContent =
        "Altyazı bekleniyor...";
    }
  }

  function finishReplay(
    success,
    message
  ) {
    if (replayTimeout) {
      clearTimeout(replayTimeout);
      replayTimeout = null;
    }

    isReplayStarting = false;
    activeReplayRequestId = null;

    pauseButton.disabled = false;
    playButton.disabled = false;

    replayButton.disabled =
      completedStartTimeMs === null;

    if (!success) {
      isReplayPlaybackActive = false;

      status.textContent =
        `❌ ${
          message ||
          "Cümle tekrar oynatılamadı"
        }`;

      return;
    }

    isReplayPlaybackActive = true;

    const replayStartSeconds =
      completedStartTimeMs !== null
        ? completedStartTimeMs / 1000
        : 0;

    currentSubtitle = "";
    sentenceParts = [];

    sentenceStartTime =
      replayStartSeconds;

    replayGuardUntilVideoTime =
      replayStartSeconds + 0.8;

    subtitleBox.textContent =
      completedBox.textContent;

    status.textContent =
      "🔁 Cümle tekrar oynatılıyor";
  }

  replayButton.addEventListener(
    "click",
    () => {
      const video =
        getNetflixVideo();

      if (
        !video ||
        completedStartTimeMs === null
      ) {
        status.textContent =
          "Tekrar oynatılacak cümle bulunamadı";

        return;
      }

      video.pause();

      isReplayPlaybackActive = false;
      isReplayStarting = true;
      currentSubtitle = "";
      sentenceParts = [];
      replayGuardUntilVideoTime = null;

      activeReplayRequestId =
        `replay-${Date.now()}-${Math.random()}`;

      replayButton.disabled = true;
      pauseButton.disabled = true;
      playButton.disabled = true;

      status.textContent =
        "🔁 Cümle tekrar hazırlanıyor...";

      window.postMessage(
        {
          source:
            "PAUSESPEAK_EXTENSION",

          type:
            "PAUSESPEAK_REPLAY_REQUEST",

          requestId:
            activeReplayRequestId,

          targetTimeMs:
            completedStartTimeMs
        },
        "*"
      );

      replayTimeout =
        setTimeout(() => {
          finishReplay(
            false,
            "Netflix oynatıcıdan cevap alınamadı"
          );
        }, 6000);
    }
  );

  window.addEventListener(
    "message",
    (event) => {
      if (event.source !== window) {
        return;
      }

      const data = event.data;

      if (
        !data ||
        data.source !==
          "PAUSESPEAK_PAGE" ||
        data.type !==
          "PAUSESPEAK_REPLAY_RESPONSE" ||
        data.requestId !==
          activeReplayRequestId
      ) {
        return;
      }

      finishReplay(
        data.success,
        data.message
      );
    }
  );

  pauseButton.addEventListener(
    "click",
    () => {
      const video =
        getNetflixVideo();

      if (!video) {
        status.textContent =
          "Video bulunamadı";

        return;
      }

      video.pause();

      status.textContent =
        "⏸️ Video durduruldu";
    }
  );

  playButton.addEventListener(
    "click",
    async () => {
      const video =
        getNetflixVideo();

      if (!video) {
        status.textContent =
          "Video bulunamadı";

        return;
      }

      try {
        await video.play();

        status.textContent =
          "▶️ Video oynatılıyor";
      } catch (error) {
        status.textContent =
          "Video başlatılamadı";

        console.error(
          "PauseSpeak oynatma hatası:",
          error
        );
      }
    }
  );

  panel.appendChild(title);
  panel.appendChild(status);

  panel.appendChild(
    subtitleTitle
  );

  panel.appendChild(
    subtitleBox
  );

  panel.appendChild(
    completedTitle
  );

  panel.appendChild(
    completedBox
  );

  panel.appendChild(
    translationTitle
  );

  panel.appendChild(
    translationBox
  );

  panel.appendChild(
    replayButton
  );

  panel.appendChild(
    document.createElement("br")
  );

  panel.appendChild(
    pauseButton
  );

  panel.appendChild(
    playButton
  );

  document.documentElement.appendChild(
    panel
  );

  const observer =
    new MutationObserver(() => {
      updateVideoStatus();
      updateSubtitle();
    });

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true,
      characterData: true
    }
  );

  updateVideoStatus();
  updateSubtitle();

  setInterval(() => {
    updateVideoStatus();
    updateSubtitle();
  }, 400);
})();