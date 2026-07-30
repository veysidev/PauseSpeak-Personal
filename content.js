(() => {
  const panelId = "pausespeak-status-panel";

  if (document.getElementById(panelId)) {
    return;
  }

  const panel = document.createElement("div");
  panel.id = panelId;
  panel.textContent = "✅ PauseSpeak Netflix'te aktif";

  Object.assign(panel.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "2147483647",
    padding: "14px 18px",
    backgroundColor: "#111827",
    color: "#ffffff",
    borderRadius: "10px",
    fontFamily: "Arial, sans-serif",
    fontSize: "15px",
    fontWeight: "bold",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)"
  });

  document.documentElement.appendChild(panel);
})();