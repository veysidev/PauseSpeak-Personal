(() => {
  const panelId = "pausespeak-status-panel";

  // Aynı panelin iki kez oluşmasını engeller.
  if (document.getElementById(panelId)) {
    return;
  }

  let lastSubtitle = "";
  let lastVideoFound = null;

  const panel = document.createElement("div");

  const title = document.createElement("div");
  title.textContent = "PauseSpeak";

  const status = document.createElement("div");
  status.textContent = "Video aranıyor...";

  const subtitleTitle = document.createElement("div");
  subtitleTitle.textContent = "İngilizce altyazı";

  const subtitleBox = document.createElement("div");
  subtitleBox.textContent = "Altyazı bekleniyor...";

  const pauseButton = document.createElement("button");
  pauseButton.textContent = "Durdur";

  const playButton = document.createElement("button");
  playButton.textContent = "Devam Et";

  panel.id = panelId;

  Object.assign(panel.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "2147483647",
    width: "300px",
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

  Object.assign(subtitleTitle.style, {
    marginTop: "14px",
    marginBottom: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    color: "#9ca3af"
  });

  Object.assign(subtitleBox.style, {
    minHeight: "42px",
    padding: "10px",
    marginBottom: "12px",
    backgroundColor: "#1f2937",
    borderRadius: "8px",
    lineHeight: "1.45",
    color: "#ffffff"
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
        .map((element) => cleanText(element.innerText || element.textContent))
        .filter(Boolean);

      const uniqueTexts = [...new Set(texts)];

      if (uniqueTexts.length > 0) {
        return uniqueTexts.join(" ");
      }
    }

    return "";
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
    const subtitle = getNetflixSubtitle();

    if (!subtitle || subtitle === lastSubtitle) {
      return;
    }

    lastSubtitle = subtitle;
    subtitleBox.textContent = subtitle;

    console.log("PauseSpeak altyazı:", subtitle);
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
      console.error(error);
    }
  });

  panel.appendChild(title);
  panel.appendChild(status);
  panel.appendChild(subtitleTitle);
  panel.appendChild(subtitleBox);
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
  }, 500);
})();