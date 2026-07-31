(() => {
  const panelId = "pausespeak-status-panel";

  const translationApiUrl =
    "http://localhost:3000/translate";

  const translationTimeoutMs = 8000;

  const SpeechRecognitionClass =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

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

  let speechRecognition = null;
  let isSpeechListening = false;
  let speechRecognitionHasResult = false;
  let speechRecognitionHadError = false;
  let speechRecognitionWasCancelled = false;

  const panel = document.createElement("div");
  panel.id = panelId;

  const title = document.createElement("div");
  title.textContent = "PauseSpeak";

  const status = document.createElement("div");
  status.textContent = "Video aranıyor...";

  const subtitleTitle =
    document.createElement("div");

  subtitleTitle.textContent =
    "Aktif İngilizce altyazı";

  const subtitleBox =
    document.createElement("div");

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

  const pronunciationTitle =
    document.createElement("div");

  pronunciationTitle.textContent =
    "Telaffuz";

  const spokenTitle =
    document.createElement("div");

  spokenTitle.textContent =
    "Söylediğin";

  const spokenBox =
    document.createElement("div");

  spokenBox.textContent =
    SpeechRecognitionClass
      ? "Bir cümle tamamlandıktan sonra Konuş düğmesine bas."
      : "Bu tarayıcıda konuşma tanıma desteklenmiyor.";

  const speakButton =
    document.createElement("button");

  speakButton.textContent = "🎤 Konuş";
  speakButton.disabled = true;

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
    translationTitle,
    pronunciationTitle,
    spokenTitle
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
    translationBox,
    spokenBox
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

  Object.assign(spokenBox.style, {
    backgroundColor: "#1f2937",
    color: "#d1fae5"
  });

  [
    speakButton,
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

    const timeoutId =
      setTimeout(() => {
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

  function getSpeechErrorMessage(
    errorCode
  ) {
    if (
      errorCode === "not-allowed" ||
      errorCode ===
        "service-not-allowed"
    ) {
      return (
        "Mikrofon izni verilmedi. " +
        "Chrome site ayarlarından mikrofon iznini aç."
      );
    }

    if (errorCode === "no-speech") {
      return (
        "Konuşma algılanmadı. " +
        "Mikrofona biraz daha yakın konuşup tekrar dene."
      );
    }

    if (errorCode === "audio-capture") {
      return (
        "Mikrofona ulaşılamadı. " +
        "Mikrofonun bağlı ve kullanılabilir olduğunu kontrol et."
      );
    }

    if (errorCode === "network") {
      return (
        "Konuşma tanıma hizmetine ulaşılamadı. " +
        "İnternet bağlantısını kontrol et."
      );
    }

    return (
      "Konuşma tanıma sırasında " +
      "hata oluştu."
    );
  }

  function stopSpeechRecognition() {
    if (
      speechRecognition &&
      isSpeechListening
    ) {
      speechRecognitionWasCancelled =
        true;

      try {
        speechRecognition.abort();
      } catch (error) {
        console.warn(
          "PauseSpeak mikrofon durdurma uyarısı:",
          error
        );
      }
    }
  }

  function createSpeechRecognition() {
    if (!SpeechRecognitionClass) {
      return null;
    }

    const recognition =
      new SpeechRecognitionClass();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isSpeechListening = true;
      speechRecognitionHasResult = false;
      speechRecognitionHadError = false;
      speechRecognitionWasCancelled =
        false;

      speakButton.textContent =
        "⏹ Dinlemeyi Durdur";

      status.textContent =
        "🎤 İngilizce konuşmanı dinliyorum...";

      spokenBox.textContent =
        "Dinleniyor...";
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const transcript = cleanText(
          event.results[index][0]
            ?.transcript || ""
        );

        if (!transcript) {
          continue;
        }

        if (
          event.results[index].isFinal
        ) {
          finalTranscript +=
            `${transcript} `;
        } else {
          interimTranscript +=
            `${transcript} `;
        }
      }

      const recognizedText =
        cleanText(
          finalTranscript ||
            interimTranscript
        );

      if (!recognizedText) {
        return;
      }

      speechRecognitionHasResult =
        true;

      spokenBox.textContent =
        recognizedText;
    };

    recognition.onerror = (event) => {
      if (
        event.error === "aborted" &&
        speechRecognitionWasCancelled
      ) {
        return;
      }

      speechRecognitionHadError =
        true;

      const errorMessage =
        getSpeechErrorMessage(
          event.error
        );

      spokenBox.textContent =
        errorMessage;

      status.textContent =
        "❌ Mikrofon veya konuşma tanıma hatası";

      console.error(
        "PauseSpeak konuşma tanıma hatası:",
        event.error
      );
    };

    recognition.onend = () => {
      isSpeechListening = false;
      speechRecognition = null;

      speakButton.textContent =
        "🎤 Tekrar Konuş";

      speakButton.disabled =
        completedStartTimeMs === null ||
        !SpeechRecognitionClass;

      if (
        speechRecognitionWasCancelled
      ) {
        speechRecognitionWasCancelled =
          false;

        return;
      }

      if (speechRecognitionHadError) {
        return;
      }

      if (
        !speechRecognitionHasResult
      ) {
        spokenBox.textContent =
          "Konuşma algılanmadı. Tekrar deneyebilirsin.";

        status.textContent =
          "🎤 Konuşma algılanmadı";

        return;
      }

      status.textContent =
        "✅ Söylediğin metne çevrildi";
    };

    return recognition;
  }

  speakButton.addEventListener(
    "click",
    () => {
      if (
        completedStartTimeMs === null ||
        completedBox.textContent ===
          "Henüz tamamlanan cümle yok."
      ) {
        status.textContent =
          "Önce tamamlanan bir İngilizce cümle gerekli.";

        return;
      }

      if (!SpeechRecognitionClass) {
        spokenBox.textContent =
          "Bu tarayıcıda konuşma tanıma desteklenmiyor.";

        status.textContent =
          "Konuşma tanıma desteklenmiyor";

        return;
      }

      if (
        speechRecognition &&
        isSpeechListening
      ) {
        speechRecognition.stop();
        return;
      }

      const video =
        getNetflixVideo();

      if (video && !video.paused) {
        video.pause();
      }

      speechRecognitionHasResult =
        false;

      speechRecognitionHadError =
        false;

      spokenBox.textContent =
        "Mikrofon hazırlanıyor...";

      speechRecognition =
        createSpeechRecognition();

      if (!speechRecognition) {
        spokenBox.textContent =
          "Konuşma tanıma başlatılamadı.";

        return;
      }

      try {
        speechRecognition.start();
      } catch (error) {
        speechRecognition = null;
        isSpeechListening = false;

        speakButton.textContent =
          "🎤 Konuş";

        spokenBox.textContent =
          "Mikrofon başlatılamadı. Birkaç saniye sonra tekrar dene.";

        status.textContent =
          "❌ Mikrofon başlatılamadı";

        console.error(
          "PauseSpeak mikrofon başlatma hatası:",
          error
        );
      }
    }
  );

  function finishSentence(video) {
    const fullSentence =
      cleanText(
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

    if (
      sentenceStartTime !== null
    ) {
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

    stopSpeechRecognition();

    spokenBox.textContent =
      SpeechRecognitionClass
        ? "Cümleyi İngilizce söylemek için Konuş düğmesine bas."
        : "Bu tarayıcıda konuşma tanıma desteklenmiyor.";

    speakButton.textContent =
      "🎤 Konuş";

    speakButton.disabled =
      !SpeechRecognitionClass;

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

    const videoFound =
      Boolean(video);

    if (
      videoFound === lastVideoFound
    ) {
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

      speakButton.disabled =
        completedStartTimeMs === null ||
        !SpeechRecognitionClass;
    } else {
      status.textContent =
        "⏳ Video aranıyor...";

      pauseButton.disabled = true;
      playButton.disabled = true;
      replayButton.disabled = true;
      speakButton.disabled = true;
    }
  }

  function updateSubtitle() {
    const video =
      getNetflixVideo();

    const newSubtitle =
      getNetflixSubtitle();

    if (
      newSubtitle ===
      currentSubtitle
    ) {
      return;
    }

    if (isReplayStarting) {
      currentSubtitle =
        newSubtitle;

      if (newSubtitle) {
        subtitleBox.textContent =
          newSubtitle;
      }

      return;
    }

    const previousSubtitle =
      currentSubtitle;

    currentSubtitle =
      newSubtitle;

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

      stopSpeechRecognition();

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

      stopSpeechRecognition();

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

      stopSpeechRecognition();

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
    pronunciationTitle
  );

  panel.appendChild(
    spokenTitle
  );

  panel.appendChild(
    spokenBox
  );

  panel.appendChild(
    speakButton
  );

  panel.appendChild(
    document.createElement("br")
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