(() => {
  const panelId = "pausespeak-status-panel";

  if (document.getElementById(panelId)) {
    return;
  }

  const panel = document.createElement("div");
  panel.id = panelId;

  const title = document.createElement("div");
  title.textContent = "PauseSpeak";
  title.style.fontSize = "17px";
  title.style.fontWeight = "bold";

  const status = document.createElement("div");
  status.textContent = "Video aranıyor...";
  status.style.marginTop = "8px";
  status.style.marginBottom = "12px";

  const pauseButton = document.createElement("button");
  pauseButton.textContent = "Durdur";

  const playButton = document.createElement("button");
  playButton.textContent = "Devam Et";

  Object.assign(panel.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "2147483647",
    width: "220px",
    padding: "16px",
    backgroundColor: "#111827",
    color: "#ffffff",
    borderRadius: "12px",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)"
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

  function updateVideoStatus() {
    const video = getNetflixVideo();

    if (video) {
      status.textContent = "✅ Video bulundu";
      pauseButton.disabled = false;
      playButton.disabled = false;
    } else {
      status.textContent = "⏳ Video aranıyor...";
      pauseButton.disabled = true;
      playButton.disabled = true;
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
      console.error(error);
    }
  });

  panel.appendChild(title);
  panel.appendChild(status);
  panel.appendChild(pauseButton);
  panel.appendChild(playButton);

  document.documentElement.appendChild(panel);

  updateVideoStatus();
  setInterval(updateVideoStatus, 1000);
})();