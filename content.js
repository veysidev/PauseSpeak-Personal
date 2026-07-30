(() => {
  const panelId = "pausespeak-status-panel";

  if (document.getElementById(panelId)) {
    return;
  }

  let currentSubtitle = "";
  let sentenceParts = [];
  let lastVideoFound = null;

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
  completedBox.textContent = "Henüz tamamlanan cümle yok.";

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

  [pauseButton, playButton].forEach((button) => {
    Object.assign(button.style, {
      padding: "9px 12px",
      marginRight: "8px",
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
          cleanText(element.innerText || element.textContent || "")
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

    const lastPart = sentenceParts[sentenceParts.length - 1];

    if (!lastPart) {
      sentenceParts.push(text);
      return;
    }

    // Netflix bazen eski satırı yeni altyazının içinde tekrar gösterir.
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
    const fullSentence = cleanText(sentenceParts.join(" "));

    if (!fullSentence) {
      return;
    }

    completedBox.textContent = fullSentence;
    subtitleBox.textContent = fullSentence;
    sentenceParts = [];

    if (video && !video.paused) {
      video.pause();
      status.textContent = "⏸️ Cümle bitti — video durduruldu";
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
    } else {
      status.textContent = "⏳ Video aranıyor...";
      pauseButton.disabled = true;
      playButton.disabled = true;
    }
  }

  function updateSubtitle() {
    const video = getNetflixVideo();
    const newSubtitle = getNetflixSubtitle();

    if (newSubtitle === currentSubtitle) {
      return;
    }

    const previousSubtitle = currentSubtitle;
    currentSubtitle = newSubtitle;

    if (previousSubtitle) {
      addSentencePart(previousSubtitle);

      if (endsSentence(previousSubtitle)) {
        finishSentence(video);
      }
    }

    if (newSubtitle) {
      subtitleBox.textContent = newSubtitle;
    } else if (!previousSubtitle) {
      subtitleBox.textContent = "Altyazı bekleniyor...";
    }
  }

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

    try {
      await video.play();
      status.textContent = "▶️ Video oynatılıyor";
    } catch (error) {
      status.textContent = "Video başlatılamadı";
      console.error("PauseSpeak oynatma hatası:", error);
    }
  });

  panel.appendChild(title);
  panel.appendChild(status);
  panel.appendChild(subtitleTitle);
  panel.appendChild(subtitleBox);
  panel.appendChild(completedTitle);
  panel.appendChild(completedBox);
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