(() => {
  const panelId = "pausespeak-status-panel";
 const translationApiUrl =
  "http://localhost:3000/translate";

const translationTimeoutMs = 8000;

const chunkApiUrl =
  "http://localhost:3000/chunk";

const chunkTimeoutMs = 20000;

const studySegmentsApiUrl =
  "http://localhost:3000/study-segments";

const studySegmentsTimeoutMs = 20000;
const studyMeaningApiUrl =
  "http://localhost:3000/study-meaning";

const studyMeaningTimeoutMs = 20000;
  const pronunciationSuccessThreshold = 0.78;

  const SpeechRecognitionClass =
    window.SpeechRecognition || window.webkitSpeechRecognition;

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
  let isAutomaticRetryReplay = false;

  let previousCompletedSentence = "";
  let translationRequestNumber = 0;
 let chunkRequestNumber = 0;
let chunkAbortController = null;
let isChunkRequestPending = false;

let studySegmentsRequestNumber = 0;
let studySegmentsAbortController = null;
let studyMeaningRequestNumber = 0;
let studyMeaningAbortController = null;

  let speechRecognition = null;
  let isSpeechListening = false;
  let speechRecognitionHasResult = false;
  let speechRecognitionHadError = false;
  let speechRecognitionWasCancelled = false;
  let recognizedSpeechText = "";

  let pronunciationAttemptCount = 0;
  let pronunciationMode = "sentence";
  let pronunciationChunks = [];
  let pronunciationChunkIndex = 0;
  let pronunciationChunkSuccessCount = 0;
  let finalSentenceAttemptCount = 0;
  let isPronunciationEnabled = false;
  let isAutomaticPauseEnabled = true;
  let autoContinueTimeout = null;
  let speechSilenceTimeout = null;
  let autoSpeechStartTimeout = null;

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
  completedTitle.textContent = "Tamamlanan İngilizce cümle";

  const completedBox = document.createElement("div");
  completedBox.textContent = "Henüz tamamlanan cümle yok.";

  const translationTitle = document.createElement("div");
  translationTitle.textContent = "Türkçe çeviri";

  const translationBox = document.createElement("div");
  translationBox.textContent =
    "İngilizce cümle tamamlandığında çeviri gösterilecek.";

  const pronunciationTitle = document.createElement("div");
  pronunciationTitle.textContent = "Telaffuz";
const nowSpeakTitle = document.createElement("div");
nowSpeakTitle.textContent = "Şimdi söyle";

const nowSpeakBox = document.createElement("div");
nowSpeakBox.textContent = "Henüz söylenecek bir cümle yok.";
  const spokenTitle = document.createElement("div");
  spokenTitle.textContent = "Söylediğin";

  const spokenBox = document.createElement("div");
  spokenBox.textContent = SpeechRecognitionClass
    ? "Bir cümle tamamlandıktan sonra Konuş düğmesine bas."
    : "Bu tarayıcıda konuşma tanıma desteklenmiyor.";

  const pronunciationResultTitle = document.createElement("div");
  pronunciationResultTitle.textContent = "Sonuç";

  const pronunciationResultBox = document.createElement("div");
  pronunciationResultBox.textContent =
    "Henüz telaffuz denemesi yapılmadı.";

  const chunkTitle = document.createElement("div");
  chunkTitle.textContent = "Parçalı çalışma";
  chunkTitle.style.display = "none";

  const chunkBox = document.createElement("div");
  chunkBox.style.display = "none";

  const speakButton = document.createElement("button");
  speakButton.textContent = "🎤 Konuş";
  speakButton.disabled = true;
  const pronunciationToggleButton =
  document.createElement("button");

pronunciationToggleButton.textContent =
  "Telaffuz: Kapalı";
  const automaticPauseToggleButton =
  document.createElement("button");

automaticPauseToggleButton.textContent =
  "Otomatik Durdurma: Açık";
  const chunkPracticeButton =
  document.createElement("button");

chunkPracticeButton.textContent =
  "Parçalara Ayır";

chunkPracticeButton.disabled = true;

  const replayButton = document.createElement("button");
  replayButton.textContent = "Cümleyi Tekrar Oynat";
  replayButton.disabled = true;

  const pauseButton = document.createElement("button");
  pauseButton.textContent = "Durdur";

  const playButton = document.createElement("button");
  playButton.textContent = "Devam Et";
  const controlsPanel = document.createElement("div");

controlsPanel.id = "pausespeak-controls-panel";

Object.assign(controlsPanel.style, {
  position: "fixed",
  top: "16px",
  right: "16px",
  zIndex: "2147483647",
  width: "174px",
padding: "10px",
display: "flex",
flexDirection: "column",
gap: "6px",
  backgroundColor: "rgba(15, 20, 20, 0.78)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "16px",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
  backdropFilter: "blur(10px)",
  boxSizing: "border-box"
});
Object.assign(panel.style, {
  position: "fixed",
 left: "0",
right: "0",
bottom: "130px",
margin: "0 auto",
  zIndex: "2147483647",
  width: "fit-content",
  maxWidth: "calc(100vw - 380px)",
  padding: "18px 22px",
  backgroundColor: "rgba(0, 0, 0, 0.58)",
  color: "#ffffff",
  border: "1px solid rgba(255, 255, 255, 0.28)",
  borderRadius: "18px",
  fontFamily: "Arial, sans-serif",
  fontSize: "16px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
  boxSizing: "border-box"
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
  nowSpeakTitle,
  spokenTitle,
  pronunciationResultTitle,
  chunkTitle
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
    nowSpeakBox,
    spokenBox,
    pronunciationResultBox,
    chunkBox
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

 [
  subtitleBox,
  translationBox
].forEach((box) => {
  Object.assign(box.style, {
    minHeight: "0",
    padding: "2px",
    marginBottom: "2px",
    backgroundColor: "transparent",
    borderRadius: "0"
  });
});

Object.assign(translationBox.style, {
  color: "#60a5fa"
});
Object.assign(nowSpeakBox.style, {
  display: "none",
  backgroundColor: "#064e3b",
  color: "#ecfdf5",
  fontSize: "16px",
  fontWeight: "bold"
});
  Object.assign(spokenBox.style, {
    color: "#d1fae5"
  });

  Object.assign(pronunciationResultBox.style, {
    color: "#fef3c7"
  });

Object.assign(chunkBox.style, {
  backgroundColor: "#312e81",
  color: "#e0e7ff",
  whiteSpace: "pre-line"
});

[
  title,
  status,
  subtitleTitle,
  completedTitle,
  completedBox,
  translationTitle,
  pronunciationTitle,
  nowSpeakTitle,
  spokenTitle,
  spokenBox,
  pronunciationResultTitle,
  pronunciationResultBox,
  chunkTitle,
  chunkBox
].forEach((element) => {
  element.style.display = "none";
});

[
  speakButton,
  pronunciationToggleButton,
  automaticPauseToggleButton,
  chunkPracticeButton,
  replayButton,
  pauseButton,
  playButton
].forEach((button, index) => {
Object.assign(button.style, {
  position: "static",
  width: "100%",
 minHeight: "50px",
padding: "8px 12px",
  margin: "0",
  border: "1px solid rgba(255, 255, 255, 0.20)",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "400",
  lineHeight: "1.35",
  textAlign: "left",
  color: "#f9fafb",
  backgroundColor: "rgba(55, 55, 58, 0.62)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
  whiteSpace: "normal",
  boxSizing: "border-box",
  opacity: "1"
});
});
const speakButtonIconSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2024%2024' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='2' width='6' height='12' rx='3'/%3E%3Cpath d='M5%2010a7%207%200%200%200%2014%200'/%3E%3Cpath d='M12%2017v5'/%3E%3Cpath d='M8%2022h8'/%3E%3C/svg%3E\")";

Object.assign(speakButton.style, {
  backgroundImage: speakButtonIconSvg,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "16px center",
  backgroundSize: "20px 20px",
  paddingLeft: "50px"
});

const removeSpeakButtonEmoji = () => {
  const cleanLabel =
    speakButton.textContent.replace(
      /^[🎤⏹]\s*/,
      ""
    );

  if (
    cleanLabel !==
    speakButton.textContent
  ) {
    speakButton.textContent =
      cleanLabel;
  }
};

removeSpeakButtonEmoji();

const speakButtonLabelObserver =
  new MutationObserver(
    removeSpeakButtonEmoji
  );

speakButtonLabelObserver.observe(
  speakButton,
  {
    childList: true,
    characterData: true,
    subtree: true
  }
);
const pronunciationButtonIconSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2024%2024' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6%2010a6%206%200%200%201%2012%200c0%204-2%205-4%206-1.4.7-2%201.6-2%203a2%202%200%200%201-4%200'/%3E%3Cpath d='M10%2010a2%202%200%200%201%204%200c0%201.5-.8%202.2-2%203'/%3E%3C/svg%3E\")";

Object.assign(
  pronunciationToggleButton.style,
  {
    backgroundImage:
      pronunciationButtonIconSvg,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "16px center",
    backgroundSize: "20px 20px",
    paddingLeft: "50px"
  }
);
const automaticPauseButtonIconSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2024%2024' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3Ccircle cx='12' cy='12' r='2' fill='%23ffffff' stroke='none'/%3E%3C/svg%3E\")";

Object.assign(
  automaticPauseToggleButton.style,
  {
    backgroundImage:
      automaticPauseButtonIconSvg,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "16px center",
    backgroundSize: "20px 20px",
    paddingLeft: "50px"
  }
);
const chunkPracticeButtonIconSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2024%2024' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9%203H5a2%202%200%200%200-2%202v4h1.5a2.5%202.5%200%201%201%200%205H3v5a2%202%200%200%200%202%202h5v-1.5a2.5%202.5%200%201%201%205%200V21h4a2%202%200%200%200%202-2v-5h-1.5a2.5%202.5%200%201%201%200-5H21V5a2%202%200%200%200-2-2h-4v1.5a2.5%202.5%200%201%201-5%200V3Z'/%3E%3C/svg%3E\")";

Object.assign(
  chunkPracticeButton.style,
  {
    backgroundImage:
      chunkPracticeButtonIconSvg,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "16px center",
    backgroundSize: "20px 20px",
    paddingLeft: "50px"
  }
);
const replayButtonIconSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2024%2024' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20%2011a8%208%200%201%201-2.34-5.66'/%3E%3Cpath d='M20%204v7h-7'/%3E%3C/svg%3E\")";

Object.assign(
  replayButton.style,
  {
    backgroundImage:
      replayButtonIconSvg,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "16px center",
    backgroundSize: "20px 20px",
    paddingLeft: "50px"
  }
);
const pauseButtonIconSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2024%2024'%3E%3Crect x='6' y='6' width='12' height='12' rx='1' fill='%23ffffff'/%3E%3C/svg%3E\")";

Object.assign(
  pauseButton.style,
  {
    backgroundImage:
      pauseButtonIconSvg,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "16px center",
    backgroundSize: "20px 20px",
    paddingLeft: "50px"
  }
);
const playButtonIconSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2024%2024'%3E%3Cpath d='M7%204l12%208-12%208V4Z' fill='%23ffffff'/%3E%3C/svg%3E\")";

Object.assign(
  playButton.style,
  {
    backgroundImage:
      playButtonIconSvg,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "16px center",
    backgroundSize: "20px 20px",
    paddingLeft: "50px"
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
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function removeSubtitleDescriptions(text) {
    return String(text || "")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\([^)]*\)/g, " ")
      .replace(/♪[^♪]*♪/g, " ")
      .replace(/[♪♫]/g, " ")
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

      const uniqueTexts = [...new Set(texts)];

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

      if (
        error.name ===
        "AbortError"
      ) {
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

  function normalizeSpeechText(text) {
    const replacements = [
      [/\bwhere's\b/g, "where is"],
      [/\bwhat's\b/g, "what is"],
      [/\bwho's\b/g, "who is"],
      [/\bhow's\b/g, "how is"],
      [/\bwhen's\b/g, "when is"],
      [/\bwhy's\b/g, "why is"],
      [/\bhere's\b/g, "here is"],
      [/\bthere's\b/g, "there is"],
      [/\blet's\b/g, "let us"],

      [/\bcan't\b/g, "cannot"],
      [/\bwon't\b/g, "will not"],
      [/\bdon't\b/g, "do not"],
      [/\bdoesn't\b/g, "does not"],
      [/\bdidn't\b/g, "did not"],
      [/\bisn't\b/g, "is not"],
      [/\baren't\b/g, "are not"],
      [/\bwasn't\b/g, "was not"],
      [/\bweren't\b/g, "were not"],
      [/\bhaven't\b/g, "have not"],
      [/\bhasn't\b/g, "has not"],
      [/\bhadn't\b/g, "had not"],
      [/\bshouldn't\b/g, "should not"],
      [/\bwouldn't\b/g, "would not"],
      [/\bcouldn't\b/g, "could not"],
      [/\bmustn't\b/g, "must not"],

      [/\bi'm\b/g, "i am"],
      [/\byou're\b/g, "you are"],
      [/\bwe're\b/g, "we are"],
      [/\bthey're\b/g, "they are"],
      [/\bhe's\b/g, "he is"],
      [/\bshe's\b/g, "she is"],
      [/\bit's\b/g, "it is"],
      [/\bthat's\b/g, "that is"],

      [/\bi've\b/g, "i have"],
      [/\byou've\b/g, "you have"],
      [/\bwe've\b/g, "we have"],
      [/\bthey've\b/g, "they have"],
      [/\bshould've\b/g, "should have"],
      [/\bwould've\b/g, "would have"],
      [/\bcould've\b/g, "could have"],
      [/\bmight've\b/g, "might have"],
      [/\bmust've\b/g, "must have"],

      [/\bi'll\b/g, "i will"],
      [/\byou'll\b/g, "you will"],
      [/\bwe'll\b/g, "we will"],
      [/\bthey'll\b/g, "they will"],
      [/\bhe'll\b/g, "he will"],
      [/\bshe'll\b/g, "she will"],
      [/\bit'll\b/g, "it will"],

      [/\bi'd\b/g, "i would"],
      [/\byou'd\b/g, "you would"],
      [/\bwe'd\b/g, "we would"],
      [/\bthey'd\b/g, "they would"],

      [/\bgonna\b/g, "going to"],
      [/\bwanna\b/g, "want to"],
      [/\bgotta\b/g, "got to"],
      [/\bkinda\b/g, "kind of"],
      [/\bsorta\b/g, "sort of"],
      [/\blemme\b/g, "let me"],
      [/\bgimme\b/g, "give me"]
    ];

    let normalized =
      String(text || "")
        .toLowerCase()
        .replace(/[’‘`]/g, "'")
        .replace(/\[[^\]]*\]/g, " ")
        .replace(/\([^)]*\)/g, " ")
        .replace(/♪[^♪]*♪/g, " ")
        .replace(/[♪♫]/g, " ");

    for (
      const [
        pattern,
        replacement
      ] of replacements
    ) {
      normalized =
        normalized.replace(
          pattern,
          replacement
        );
    }

    normalized =
      normalized.replace(
        /\b(?:uh|um|erm|hmm|mm|ah)\b/g,
        " "
      );

    return normalized
      .replace(
        /[^a-z0-9'\s]/g,
        " "
      )
      .replace(/'/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getWordTokens(text) {
    const normalized =
      normalizeSpeechText(text);

    return normalized
      ? normalized.split(" ")
      : [];
  }

  function getTokenEditDistance(
    firstTokens,
    secondTokens
  ) {
    const row =
      Array.from(
        {
          length:
            secondTokens.length + 1
        },
        (_, index) => index
      );

    for (
      let firstIndex = 1;
      firstIndex <=
        firstTokens.length;
      firstIndex += 1
    ) {
      let previousDiagonal =
        row[0];

      row[0] = firstIndex;

      for (
        let secondIndex = 1;
        secondIndex <=
          secondTokens.length;
        secondIndex += 1
      ) {
        const previousTop =
          row[secondIndex];

        const substitutionCost =
          firstTokens[
            firstIndex - 1
          ] ===
          secondTokens[
            secondIndex - 1
          ]
            ? 0
            : 1;

        row[secondIndex] =
          Math.min(
            row[secondIndex] + 1,
            row[
              secondIndex - 1
            ] + 1,
            previousDiagonal +
              substitutionCost
          );

        previousDiagonal =
          previousTop;
      }
    }

    return row[
      secondTokens.length
    ];
  }

  function hasNegationMismatch(
    targetTokens,
    spokenTokens
  ) {
    const negativeWords =
      new Set([
        "not",
        "no",
        "never",
        "nothing",
        "nobody",
        "neither",
        "without"
      ]);

    const targetNegatives =
      targetTokens.filter(
        (token) =>
          negativeWords.has(token)
      );

    const spokenNegatives =
      spokenTokens.filter(
        (token) =>
          negativeWords.has(token)
      );

    return (
      targetNegatives.join(" ") !==
      spokenNegatives.join(" ")
    );
  }

  function comparePronunciation(
    targetText,
    spokenText
  ) {
    const targetTokens =
      getWordTokens(targetText);

    const spokenTokens =
      getWordTokens(spokenText);

    if (
      targetTokens.length === 0 ||
      spokenTokens.length === 0
    ) {
      return {
        success: false,
        score: 0
      };
    }

    const distance =
      getTokenEditDistance(
        targetTokens,
        spokenTokens
      );

    const longestLength =
      Math.max(
        targetTokens.length,
        spokenTokens.length
      );

    const score =
      Math.max(
        0,
        1 -
          distance /
            longestLength
      );

    const success =
      !hasNegationMismatch(
        targetTokens,
        spokenTokens
      ) &&
      score >=
        pronunciationSuccessThreshold;

    return {
      success,
      score
    };
  }

  function hasMultipleClauses(
    sentence
  ) {
    const originalText =
      removeSubtitleDescriptions(
        sentence
      );

    const normalizedText =
      normalizeSpeechText(
        originalText
      );

    if (!normalizedText) {
      return false;
    }

    if (
      /[,;:—–]/.test(
        originalText
      )
    ) {
      return true;
    }

    if (
      /\b(even if|although|though|because|while|whenever|unless|until|whereas|as soon as|so that|provided that|in case)\b/.test(
        normalizedText
      )
    ) {
      return true;
    }

    const words =
      normalizedText.split(" ");

    const timeClauseIndex =
      words.findIndex(
        (word) =>
          [
            "if",
            "when",
            "after",
            "before",
            "since"
          ].includes(word)
      );

    if (
      timeClauseIndex > 0 &&
      timeClauseIndex <
        words.length - 2
    ) {
      return true;
    }

    const clauseWordIndex =
      words.findIndex(
        (word) =>
          [
            "that",
            "which",
            "who",
            "whom",
            "whose"
          ].includes(word)
      );

    if (
      clauseWordIndex >= 2 &&
      clauseWordIndex <
        words.length - 2
    ) {
      return true;
    }

    if (
      /\b(and|but|so|yet)\s+(i|you|he|she|it|we|they|this|that|there)\b/.test(
        normalizedText
      )
    ) {
      return true;
    }

    if (
      /\b(know|knows|knew|wonder|wonders|wondered|tell|tells|told|show|shows|showed|remember|remembers|remembered|forget|forgets|forgot|understand|understands|understood)\s+(where|why|how|when|what|who)\b/.test(
        normalizedText
      )
    ) {
      return true;
    }

    return false;
  }

  function shouldUseChunkMode(
    sentence
  ) {
    const wordCount =
      getWordTokens(
        sentence
      ).length;

    return (
      wordCount > 7 ||
      hasMultipleClauses(
        sentence
      )
    );
  }
  function renderStudySegments(
  segments
) {
  subtitleBox.replaceChildren();

  Object.assign(
    subtitleBox.style,
    {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "4px"
    }
  );

  for (const segment of segments) {
    if (
      segment.type ===
      "punctuation"
    ) {
      const punctuation =
        document.createElement(
          "span"
        );

      punctuation.textContent =
        segment.text;

      Object.assign(
        punctuation.style,
        {
          color: "#ffffff",
          font: "inherit",
          lineHeight: "1.35"
        }
      );

      subtitleBox.appendChild(
        punctuation
      );

      continue;
    }

    const segmentButton =
      document.createElement(
        "button"
      );

    segmentButton.type = "button";

    segmentButton.textContent =
      segment.text;

    segmentButton.dataset.studyText =
      segment.text;

    segmentButton.dataset.studyType =
      segment.type;

    Object.assign(
      segmentButton.style,
      {
        appearance: "none",
        padding: "2px 5px",
        margin: "0",
        border:
          "1px solid rgba(255, 255, 255, 0.42)",
        borderRadius: "3px",
        backgroundColor:
          "rgba(20, 20, 24, 0.58)",
        color: "#ffffff",
        font: "inherit",
        lineHeight: "1.35",
        cursor: "pointer",
        boxShadow:
          "inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      }
    );

    segmentButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
window.speechSynthesis.cancel();

const utterance =
  new SpeechSynthesisUtterance(
    segment.text
  );

utterance.lang = "en-US";
utterance.rate = 0.9;
utterance.pitch = 1;

window.speechSynthesis.speak(
  utterance
);
void loadStudyMeaning(
  segment.text,
  completedBox.textContent,
  segment.type
);
        subtitleBox
          .querySelectorAll(
            "button[data-study-text]"
          )
          .forEach((button) => {
            button.style.borderColor =
              "rgba(255, 255, 255, 0.42)";

            button.style.backgroundColor =
              "rgba(20, 20, 24, 0.58)";
          });

        segmentButton.style.borderColor =
          "#ffffff";

        segmentButton.style.backgroundColor =
          "rgba(255, 255, 255, 0.16)";
      }
    );

    subtitleBox.appendChild(
      segmentButton
    );
  }
}
async function loadStudyMeaning(
  selectedText,
  sentence,
  segmentType
) {
  if (studyMeaningAbortController) {
    studyMeaningAbortController.abort();

    studyMeaningAbortController =
      null;
  }

  const requestNumber =
    ++studyMeaningRequestNumber;

  try {
    const meaning =
      await requestStudyMeaning(
        selectedText,
        sentence,
        segmentType,
        requestNumber
      );

    if (
      !meaning ||
      requestNumber !==
        studyMeaningRequestNumber ||
      completedBox.textContent !==
        sentence
    ) {
      return;
    }

    renderStudyMeaning(
      meaning
    );
  } catch (error) {
    if (
      requestNumber !==
        studyMeaningRequestNumber
    ) {
      return;
    }

    if (
      error.name ===
      "AbortError"
    ) {
      return;
    }

    console.error(
      "PauseSpeak kelime anlamı hatası:",
      error
    );
  }
}
function renderStudyMeaning(
  meaning
) {
  let meaningBox =
    subtitleBox.querySelector(
      "[data-study-meaning-box]"
    );

  if (!meaningBox) {
    meaningBox =
      document.createElement(
        "div"
      );

    meaningBox.dataset
      .studyMeaningBox = "true";

    meaningBox.style.width =
      "100%";

    meaningBox.style.marginTop =
      "8px";

    meaningBox.style.paddingTop =
      "8px";

    meaningBox.style.borderTop =
      "1px solid rgba(255, 255, 255, 0.25)";

    meaningBox.style.fontSize =
      "18px";

    meaningBox.style.lineHeight =
      "1.4";

    meaningBox.style.color =
      "#ffffff";

    subtitleBox.appendChild(
      meaningBox
    );
  }

  meaningBox.replaceChildren();

  const title =
    document.createElement(
      "div"
    );

  title.textContent =
    meaning.text;

  title.style.fontWeight =
    "700";

  title.style.marginBottom =
    "4px";

  meaningBox.appendChild(
    title
  );

  const meanings =
    document.createElement(
      "div"
    );

  meanings.textContent =
    meaning.meanings.join(
      " • "
    );

  meanings.style.color =
    "#4da3ff";

  meaningBox.appendChild(
    meanings
  );

  if (meaning.expansion) {
    const expansion =
      document.createElement(
        "div"
      );

    expansion.textContent =
      `Açılım: ${meaning.expansion}`;

    expansion.style.marginTop =
      "4px";

    meaningBox.appendChild(
      expansion
    );
  }

  if (meaning.note) {
    const note =
      document.createElement(
        "div"
      );

    note.textContent =
      meaning.note;

    note.style.marginTop =
      "4px";

    note.style.opacity =
      "0.85";

    meaningBox.appendChild(
      note
    );
  }
}
async function requestStudyMeaning(
  selectedText,
  sentence,
  segmentType,
  requestNumber
) {
  const abortController =
    new AbortController();

  studyMeaningAbortController =
    abortController;

  const timeoutId =
    window.setTimeout(
      () => {
        abortController.abort();
      },
      studyMeaningTimeoutMs
    );

  try {
    const response =
      await fetch(
        studyMeaningApiUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            selectedText,
            sentence,
            segmentType
          }),

          signal:
            abortController.signal
        }
      );

    const data =
      await response.json();

    if (
      requestNumber !==
      studyMeaningRequestNumber
    ) {
      return null;
    }

    if (
      !response.ok ||
      data?.success !== true ||
      typeof data.text !==
        "string" ||
      !Array.isArray(
        data.meanings
      ) ||
      data.meanings.length === 0
    ) {
      throw new Error(
        data?.error ||
          "Kelime anlamı alınamadı."
      );
    }

    return {
      text:
        data.text.trim(),

      meanings:
        data.meanings
          .filter(
            (meaning) =>
              typeof meaning ===
                "string" &&
              meaning.trim() !== ""
          )
          .map(
            (meaning) =>
              meaning.trim()
          ),

      expansion:
        typeof data.expansion ===
          "string"
          ? data.expansion.trim()
          : "",

      note:
        typeof data.note ===
          "string"
          ? data.note.trim()
          : ""
    };
  } finally {
    window.clearTimeout(
      timeoutId
    );

    if (
      studyMeaningAbortController ===
      abortController
    ) {
      studyMeaningAbortController =
        null;
    }
  }
}
async function requestStudySegments(
  sentence,
  requestNumber
) {
  const controller =
    new AbortController();

  studySegmentsAbortController =
    controller;

  const timeoutId =
    setTimeout(() => {
      controller.abort();
    }, studySegmentsTimeoutMs);

  try {
    const response = await fetch(
      studySegmentsApiUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          text: sentence
        }),

        signal: controller.signal
      }
    );

    let data = null;

    try {
      data =
        await response.json();
    } catch (error) {
      throw new Error(
        "Sunucudan geçerli kelime analizi cevabı alınamadı."
      );
    }

    if (
      requestNumber !==
      studySegmentsRequestNumber
    ) {
      return null;
    }

    if (
      !response.ok ||
      !data?.success ||
      !Array.isArray(
        data.segments
      ) ||
      data.segments.some(
        (segment) =>
          !segment ||
          typeof segment !==
            "object" ||
          typeof segment.text !==
            "string" ||
          segment.text.trim() ===
            "" ||
          typeof segment.type !==
            "string"
      )
    ) {
      throw new Error(
        data?.error ||
          "Kelime ve kalıp analizi alınamadı."
      );
    }

    return data.segments.map(
      (segment) => ({
        text: cleanText(
          segment.text
        ),
        type: segment.type
      })
    );
  } finally {
    clearTimeout(timeoutId);

    if (
      studySegmentsAbortController ===
      controller
    ) {
      studySegmentsAbortController =
        null;
    }
  }
}
async function loadStudySegments(
  sentence
) {
  if (studySegmentsAbortController) {
    studySegmentsAbortController.abort();

    studySegmentsAbortController =
      null;
  }

  const requestNumber =
    ++studySegmentsRequestNumber;

  subtitleBox.textContent =
    sentence;

  try {
    const segments =
      await requestStudySegments(
        sentence,
        requestNumber
      );

    if (
      !segments ||
      requestNumber !==
        studySegmentsRequestNumber ||
      completedBox.textContent !==
        sentence
    ) {
      return;
    }

    renderStudySegments(
      segments
    );
  } catch (error) {
    if (
      requestNumber !==
      studySegmentsRequestNumber
    ) {
      return;
    }

    subtitleBox.textContent =
      sentence;

    if (
      error.name ===
      "AbortError"
    ) {
      return;
    }

    console.error(
      "PauseSpeak kelime analizi hatası:",
      error
    );
  }
}
  async function requestSmartChunks(
    sentence,
    requestNumber
  ) {
    const controller =
      new AbortController();

    chunkAbortController =
      controller;

    const timeoutId =
      setTimeout(() => {
        controller.abort();
      }, chunkTimeoutMs);

    try {
      const response = await fetch(
        chunkApiUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            text: sentence
          }),

          signal: controller.signal
        }
      );

      let data = null;

      try {
        data =
          await response.json();
      } catch (error) {
        throw new Error(
          "Sunucudan geçerli chunk cevabı alınamadı."
        );
      }

      if (
        requestNumber !==
        chunkRequestNumber
      ) {
        return null;
      }

if (
  !response.ok ||
  !data?.success ||
  typeof data.suitable !==
    "boolean" ||
  !Array.isArray(
    data.chunks
  ) ||
  data.chunks.some(
    (chunk) =>
      typeof chunk !==
        "string"
  )
) {
  throw new Error(
    data?.error ||
      "Akıllı parçalar alınamadı."
  );
}

if (!data.suitable) {
  return null;
}

      const chunks =
        data.chunks.map(
          (chunk) =>
            cleanText(chunk)
        );

      if (
        chunks.length <= 1 ||
        chunks.some(
          (chunk) => !chunk
        )
      ) {
        throw new Error(
          "Sunucu geçerli parçalar döndürmedi."
        );
      }

      return chunks;
    } finally {
      clearTimeout(timeoutId);

      if (
        chunkAbortController ===
        controller
      ) {
        chunkAbortController =
          null;
      }
    }
  }

  function updateChunkDisplay() {
    if (
      pronunciationMode !==
      "chunk"
    ) {
      chunkTitle.style.display =
        "none";

      chunkBox.style.display =
        "none";

      return;
    }

    chunkTitle.style.display =
      "block";

    chunkBox.style.display =
      "block";

    const currentChunk =
      pronunciationChunks[
        pronunciationChunkIndex
      ] || "";
      nowSpeakBox.textContent =
  currentChunk;

    chunkBox.textContent =
      `${pronunciationChunkIndex + 1}/` +
      `${pronunciationChunks.length}\n` +
      currentChunk;
  }

  function resetPronunciationPractice() {
    chunkRequestNumber += 1;

    if (chunkAbortController) {
      chunkAbortController.abort();
      chunkAbortController = null;
    }

    isChunkRequestPending = false;
    pronunciationAttemptCount = 0;
    pronunciationMode = "sentence";
    pronunciationChunks = [];
    pronunciationChunkIndex = 0;
    pronunciationChunkSuccessCount = 0;
    finalSentenceAttemptCount = 0;
    recognizedSpeechText = "";

    if (autoContinueTimeout) {
      clearTimeout(
        autoContinueTimeout
      );

      autoContinueTimeout = null;
    }

    pronunciationResultBox.textContent =
      "Henüz telaffuz denemesi yapılmadı.";

    updateChunkDisplay();
  }

  async function continueVideoAfterSuccess() {
    const video =
      getNetflixVideo();

    if (!video) {
      status.textContent =
        "Video bulunamadı";

      return;
    }

    speakButton.disabled = true;
    replayButton.disabled = true;

    status.textContent =
      "✅ Başarılı — video devam ediyor";

    pronunciationResultBox.textContent =
      "✅ Başarılı söyledin.";

    try {
      await video.play();

      status.textContent =
        "▶️ Video oynatılıyor";
    } catch (error) {
speakButton.disabled =
  !isPronunciationEnabled ||
  !SpeechRecognitionClass;

      replayButton.disabled =
        completedStartTimeMs ===
        null;

      status.textContent =
        "Video otomatik başlatılamadı";

      console.error(
        "PauseSpeak otomatik oynatma hatası:",
        error
      );
    }
  }
function scheduleAutomaticSpeechStart(
  delayMs = 350
) {
  if (autoSpeechStartTimeout) {
    clearTimeout(
      autoSpeechStartTimeout
    );
  }

  if (!SpeechRecognitionClass) {
    return;
  }

  autoSpeechStartTimeout =
    setTimeout(() => {
      autoSpeechStartTimeout =
        null;

      startSpeechRecognition();
    }, delayMs);
}
  async function startChunkPractice(
  shouldStartSpeech =
    isPronunciationEnabled
) {
    const sentence =
      completedBox.textContent;

   

    if (isChunkRequestPending) {
      return true;
    }

    if (chunkAbortController) {
      chunkAbortController.abort();
      chunkAbortController = null;
    }

    const requestNumber =
      ++chunkRequestNumber;

    isChunkRequestPending = true;

    pronunciationMode = "sentence";
    pronunciationChunks = [];
    pronunciationChunkIndex = 0;

    chunkTitle.style.display =
      "block";

    chunkBox.style.display =
      "block";

    chunkBox.textContent =
      "Akıllı konuşma parçaları hazırlanıyor...";

    pronunciationResultBox.textContent =
      "İki deneme de başarılı olmadı. Cümle doğal konuşma parçalarına ayrılıyor.";

    status.textContent =
      "🧠 Akıllı parçalar hazırlanıyor";

    speakButton.textContent =
      "Hazırlanıyor...";

    speakButton.disabled = true;
    replayButton.disabled = true;

    try {
      const chunks =
        await requestSmartChunks(
          sentence,
          requestNumber
        );

      if (
        requestNumber !==
          chunkRequestNumber ||
        completedBox.textContent !==
          sentence
      ) {
        return true;
      }

    if (!chunks) {
  pronunciationAttemptCount = 0;
  pronunciationMode = "sentence";
  pronunciationChunks = [];
  pronunciationChunkIndex = 0;
  pronunciationChunkSuccessCount = 0;

  chunkTitle.style.display = "none";
  chunkBox.style.display = "none";

  nowSpeakBox.textContent =
    sentence;

  nowSpeakBox.style.display =
    isPronunciationEnabled
      ? "block"
      : "none";

  pronunciationResultBox.textContent =
    "Bu cümle doğal ve öğrenmeye değer parçalara uygun değil.";

  status.textContent =
    "Tam cümleyle devam et";

  speakButton.textContent =
    "🎤 Tam Cümleyi Söyle";

  return true;
}

      pronunciationChunks =
        chunks;

      pronunciationMode = "chunk";
      pronunciationChunkIndex = 0;
      pronunciationChunkSuccessCount = 0;

      pronunciationResultBox.textContent =
        "Cümleyi doğal konuşma parçalarıyla çalışalım.";

      status.textContent =
        "🧩 Parçalı çalışma başladı";

      speakButton.textContent =
        "🎤 Parçayı Söyle";
nowSpeakBox.style.display = "block";
   updateChunkDisplay();

if (shouldStartSpeech) {
  scheduleAutomaticSpeechStart();
}

      return true;
    } catch (error) {
      if (
        requestNumber !==
        chunkRequestNumber
      ) {
        return true;
      }

      pronunciationAttemptCount = 0;
      pronunciationMode = "sentence";
      pronunciationChunks = [];
      pronunciationChunkIndex = 0;

      updateChunkDisplay();

      let errorMessage =
        "Akıllı parçalar hazırlanamadı. Tam cümleyi tekrar dinleyip yeniden söyle.";

      if (
        error.name ===
        "AbortError"
      ) {
        errorMessage =
          "Akıllı parçalama isteği zaman aşımına uğradı. Tam cümleyi tekrar dinleyip yeniden söyle.";
      } else if (
        error instanceof TypeError
      ) {
        errorMessage =
          "PauseSpeak sunucusuna ulaşılamadı. Sunucuyu kontrol edip tam cümleyi yeniden söyle.";
      }

      pronunciationResultBox.textContent =
        errorMessage;

      status.textContent =
        "🔁 Tam cümleyi yeniden dene";

      speakButton.textContent =
        "🎤 Tekrar Dene";

      console.error(
        "PauseSpeak chunk isteği hatası:",
        error
      );

      return true;
    } finally {
      if (
        requestNumber ===
        chunkRequestNumber
      ) {
        isChunkRequestPending =
          false;

        speakButton.disabled =
          completedStartTimeMs ===
            null ||
          !SpeechRecognitionClass;

        replayButton.disabled =
          completedStartTimeMs ===
          null;
      }
    }
  }

  function getCurrentPronunciationTarget() {
    if (
      pronunciationMode ===
      "chunk"
    ) {
      return (
        pronunciationChunks[
          pronunciationChunkIndex
        ] || ""
      );
    }

    return completedBox.textContent;
  }

  async function handlePronunciationResult(
    spokenText
  ) {
    const targetText =
      getCurrentPronunciationTarget();

    const result =
      comparePronunciation(
        targetText,
        spokenText
      );

    const percentage =
      Math.round(
        result.score * 100
      );

if (
  pronunciationMode ===
  "chunk"
) {
  if (!result.success) {
    pronunciationResultBox.textContent =
      `Bu parçayı tekrar dene. Benzerlik: %${percentage}`;

    status.textContent =
      pronunciationChunkSuccessCount === 1
        ? "🔁 İkinci doğru söyleyişi tekrar dene"
        : "🔁 Aynı parçayı tekrar söyle";

    speakButton.textContent =
      "🎤 Parçayı Tekrar Söyle";

    scheduleAutomaticSpeechStart();

    return;
  }

  pronunciationChunkSuccessCount += 1;

  if (
    pronunciationChunkSuccessCount <
    2
  ) {
    pronunciationResultBox.textContent =
      `✅ İlk doğru söyleyiş tamamlandı. ` +
      `Aynı parçayı bir kez daha söyle. Benzerlik: %${percentage}`;

    status.textContent =
      "✅ 1/2 doğru — aynı parçayı tekrar söyle";

    speakButton.textContent =
      "🎤 Aynı Parçayı Tekrar Söyle";

    scheduleAutomaticSpeechStart();

    return;
  }

  pronunciationChunkSuccessCount = 0;
  pronunciationChunkIndex += 1;

  if (
    pronunciationChunkIndex <
    pronunciationChunks.length
  ) {
    pronunciationResultBox.textContent =
      `✅ Parça iki kez doğru söylendi. Benzerlik: %${percentage}`;

    status.textContent =
      "✅ Sıradaki parçaya geçiliyor";

    speakButton.textContent =
      "🎤 Sıradaki Parçayı Söyle";

    updateChunkDisplay();
    scheduleAutomaticSpeechStart();

    return;
  }

  pronunciationMode =
    "final-sentence";

  finalSentenceAttemptCount = 0;

  chunkTitle.style.display =
    "block";

  chunkBox.style.display =
    "block";

  chunkBox.textContent =
    "Tüm parçalar tamamlandı.\nŞimdi cümlenin tamamını söyle.";

  nowSpeakBox.textContent =
    completedBox.textContent;

  pronunciationResultBox.textContent =
    "✅ Parçalar tamamlandı. Şimdi tam cümleyi söyle.";

  status.textContent =
    "🎤 Tam cümleyi söyle";

  speakButton.textContent =
    "🎤 Tam Cümleyi Söyle";

  scheduleAutomaticSpeechStart();

  return;
}
    if (
      pronunciationMode ===
      "final-sentence"
    ) {
      if (result.success) {
        void continueVideoAfterSuccess();

        return;
      }

      finalSentenceAttemptCount += 1;

      pronunciationResultBox.textContent =
        `Tam cümleyi tekrar dene. Benzerlik: %${percentage}`;

      status.textContent =
        "🔁 Tam cümleyi tekrar söyle";

      speakButton.textContent =
        "🎤 Tam Cümleyi Tekrar Söyle";
        scheduleAutomaticSpeechStart();

      if (
        finalSentenceAttemptCount >=
        2
      ) {
        pronunciationChunkIndex = 0;
pronunciationChunkSuccessCount = 0;
pronunciationMode = "chunk";
finalSentenceAttemptCount = 0;

        pronunciationResultBox.textContent =
          "Tam cümle yine zor geldi. Parçaları bir kez daha çalışalım.";

        speakButton.textContent =
          "🎤 Parçayı Söyle";

        updateChunkDisplay();
      }

      return;
    }

    if (result.success) {
      void continueVideoAfterSuccess();

      return;
    }

    pronunciationAttemptCount += 1;

  if (
  pronunciationAttemptCount ===
  1
) {
  pronunciationResultBox.textContent =
    `İlk deneme başarılı olmadı. ` +
    `Cümle tekrar oynatılıyor. Benzerlik: %${percentage}`;

  status.textContent =
    "🔁 İkinci deneme için cümle tekrar oynatılıyor";

  speakButton.textContent =
    "Cümle tekrar oynatılıyor...";

  speakButton.disabled = true;

  if (replayButton.disabled) {
    status.textContent =
      "❌ Cümle otomatik tekrar oynatılamadı";

    speakButton.textContent =
      "🎤 İkinci Kez Dene";

    speakButton.disabled =
      !SpeechRecognitionClass;

    return;
  }

  isAutomaticRetryReplay = true;

  replayButton.click();

  return;
}

 pronunciationAttemptCount = 0;

pronunciationResultBox.textContent =
  `İkinci deneme de başarılı olmadı. ` +
  `Tam cümleyi tekrar söyleyebilir veya ` +
  `Parçalara Ayır düğmesini kullanabilirsin. ` +
  `Benzerlik: %${percentage}`;

status.textContent =
  "Tam cümleyi tekrar söyle veya parçalara ayır";

speakButton.textContent =
  "🎤 Tekrar Dene";

    pronunciationAttemptCount = 0;

    pronunciationResultBox.textContent =
      `Bu cümle kısa olduğu için parçalara bölünmedi. ` +
      `Cümleyi tekrar dinleyip yeniden söyle. Benzerlik: %${percentage}`;

    status.textContent =
      "🔁 Kısa cümleyi yeniden dene";

    speakButton.textContent =
      "🎤 Tekrar Dene";

    chunkTitle.style.display =
      "none";

    chunkBox.style.display =
      "none";
  }

  function getSpeechErrorMessage(
    errorCode
  ) {
    if (
      errorCode ===
        "not-allowed" ||
      errorCode ===
        "service-not-allowed"
    ) {
      return (
        "Mikrofon izni verilmedi. " +
        "Chrome site ayarlarından mikrofon iznini aç."
      );
    }

    if (
      errorCode ===
      "no-speech"
    ) {
      return (
        "Konuşma algılanmadı. " +
        "Mikrofona biraz daha yakın konuşup tekrar dene."
      );
    }

    if (
      errorCode ===
      "audio-capture"
    ) {
      return (
        "Mikrofona ulaşılamadı. " +
        "Mikrofonun bağlı ve kullanılabilir olduğunu kontrol et."
      );
    }

    if (
      errorCode ===
      "network"
    ) {
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

  function clearSpeechSilenceTimeout() {
    if (!speechSilenceTimeout) {
      return;
    }

    clearTimeout(speechSilenceTimeout);
    speechSilenceTimeout = null;
  }

  function stopSpeechRecognition() {
    clearSpeechSilenceTimeout();

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
    if (
      !SpeechRecognitionClass
    ) {
      return null;
    }

    const recognition =
      new SpeechRecognitionClass();

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      clearSpeechSilenceTimeout();

      isSpeechListening = true;
      speechRecognitionHasResult = false;
      speechRecognitionHadError = false;
      speechRecognitionWasCancelled =
        false;

      recognizedSpeechText = "";

      speakButton.textContent =
        "⏹ Dinlemeyi Durdur";

      status.textContent =
        "🎤 İngilizce konuşmanı dinliyorum...";

      spokenBox.textContent =
        "Dinleniyor...";
    };

    recognition.onresult =
      (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (
          let index = 0;
          index <
            event.results.length;
          index += 1
        ) {
          const transcript =
            cleanText(
              event.results[
                index
              ][0]?.transcript ||
                ""
            );

          if (!transcript) {
            continue;
          }

          if (
            event.results[
              index
            ].isFinal
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
            `${finalTranscript} ${interimTranscript}`
          );

        if (!recognizedText) {
          return;
        }

        speechRecognitionHasResult =
          true;

        recognizedSpeechText =
          recognizedText;

        spokenBox.textContent =
          recognizedText;

        clearSpeechSilenceTimeout();

        speechSilenceTimeout =
          setTimeout(() => {
            speechSilenceTimeout =
              null;

            if (
              speechRecognition ===
                recognition &&
              isSpeechListening
            ) {
              try {
                recognition.stop();
              } catch (error) {
                console.warn(
                  "PauseSpeak sessizlik sonrası mikrofon durdurma uyarısı:",
                  error
                );
              }
            }
          }, 1800);
      };

    recognition.onerror =
      (event) => {
        clearSpeechSilenceTimeout();

        if (
          event.error ===
            "aborted" &&
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
      clearSpeechSilenceTimeout();

      isSpeechListening = false;

      if (
        speechRecognition ===
        recognition
      ) {
        speechRecognition = null;
      }

      speakButton.textContent =
        pronunciationMode ===
        "chunk"
          ? "🎤 Parçayı Söyle"
          : pronunciationMode ===
              "final-sentence"
            ? "🎤 Tam Cümleyi Söyle"
            : "🎤 Tekrar Konuş";

      speakButton.disabled =
        completedStartTimeMs ===
          null ||
        !SpeechRecognitionClass;

      if (
        speechRecognitionWasCancelled
      ) {
        speechRecognitionWasCancelled =
          false;

        return;
      }

      if (
        speechRecognitionHadError
      ) {
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

      void handlePronunciationResult(
        recognizedSpeechText
      );
    };

    return recognition;
  }

  function startSpeechRecognition() {
    if (
      completedStartTimeMs ===
        null ||
      completedBox.textContent ===
        "Henüz tamamlanan cümle yok."
    ) {
      status.textContent =
        "Önce tamamlanan bir İngilizce cümle gerekli.";

      return;
    }

    if (
      !SpeechRecognitionClass
    ) {
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
      return;
    }

    const video =
      getNetflixVideo();

    if (
      video &&
      !video.paused
    ) {
      video.pause();
    }

    clearSpeechSilenceTimeout();

    speechRecognitionHasResult =
      false;

    speechRecognitionHadError =
      false;

    recognizedSpeechText = "";

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

  speakButton.addEventListener(
    "click",
    () => {
      if (
        speechRecognition &&
        isSpeechListening
      ) {
        clearSpeechSilenceTimeout();
        speechRecognition.stop();

        return;
      }

      startSpeechRecognition();
    }
  );
pronunciationToggleButton.addEventListener(
  "click",
  () => {
    isPronunciationEnabled =
      !isPronunciationEnabled;
      if (isPronunciationEnabled) {
  isAutomaticPauseEnabled = true;

  automaticPauseToggleButton.textContent =
    "Otomatik Durdurma: Açık";

 
}

    pronunciationToggleButton.textContent =
      isPronunciationEnabled
        ? "Telaffuz: Açık"
        : "Telaffuz: Kapalı";

  

    if (!isPronunciationEnabled) {
      nowSpeakBox.style.display = "none";

      if (autoSpeechStartTimeout) {
        clearTimeout(autoSpeechStartTimeout);
        autoSpeechStartTimeout = null;
      }

      stopSpeechRecognition();

     speakButton.disabled = true;

chunkPracticeButton.disabled =
  completedStartTimeMs === null;

return;
    }

    speakButton.disabled =
      completedStartTimeMs === null ||
      !SpeechRecognitionClass;
     chunkPracticeButton.disabled =
  completedStartTimeMs === null;

    const video = getNetflixVideo();

    if (
      completedStartTimeMs !== null &&
      video?.paused
    ) {
      nowSpeakBox.textContent =
        completedBox.textContent;

      nowSpeakBox.style.display =
        "block";

      scheduleAutomaticSpeechStart();
    }
  }
);

automaticPauseToggleButton.addEventListener(
  "click",
  () => {
    isAutomaticPauseEnabled =
      !isAutomaticPauseEnabled;

    automaticPauseToggleButton.textContent =
      isAutomaticPauseEnabled
        ? "Otomatik Durdurma: Açık"
        : "Otomatik Durdurma: Kapalı";


  }
);
chunkPracticeButton.addEventListener(
  "click",
  () => {
        if (
      pronunciationChunks.length > 0 &&
      (
        pronunciationMode === "chunk" ||
        pronunciationMode ===
          "final-sentence"
      )
    ) {
      stopSpeechRecognition();

      pronunciationChunkSuccessCount = 0;
      recognizedSpeechText = "";

      if (
        pronunciationMode ===
        "final-sentence"
      ) {
        pronunciationMode = "chunk";
        pronunciationChunkIndex = 0;
      } else {
        pronunciationChunkIndex =
          (
            pronunciationChunkIndex + 1
          ) %
          pronunciationChunks.length;
      }

      updateChunkDisplay();

if (isPronunciationEnabled) {
  scheduleAutomaticSpeechStart();
}

return;
    }
    const sentence =
      completedBox.textContent;

 if (
  completedStartTimeMs === null
) {
  chunkPracticeButton.disabled =
    true;

  return;
}

   void startChunkPractice(
  isPronunciationEnabled
);

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

nowSpeakBox.textContent =
  fullSentence;

nowSpeakBox.style.display =
  isPronunciationEnabled
    ? "block"
    : "none";

void loadStudySegments(
  fullSentence
);

    if (
      isReplayPlaybackActive
    ) {
      isReplayPlaybackActive =
        false;
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

    const currentTime =
      video
        ? Number(
            video.currentTime
          )
        : 0;

    if (
      sentenceStartTime !==
      null
    ) {
      completedStartTimeMs =
        Math.max(
          0,
          sentenceStartTime -
            0.25
        ) * 1000;
    } else {
      completedStartTimeMs =
        Math.max(
          0,
          currentTime - 3
        ) * 1000;
    }

    replayButton.disabled =
      false;

    stopSpeechRecognition();

if (isAutomaticRetryReplay) {
  isAutomaticRetryReplay = false;
  recognizedSpeechText = "";
} else {
  resetPronunciationPractice();
}
    spokenBox.textContent =
      SpeechRecognitionClass
        ? "Mikrofon otomatik açılıyor..."
        : "Bu tarayıcıda konuşma tanıma desteklenmiyor.";

    speakButton.textContent =
      "🎤 Konuş";

    speakButton.disabled =
      !SpeechRecognitionClass;

    sentenceParts = [];
    sentenceStartTime = null;
    replayGuardUntilVideoTime =
      null;
if (
  video &&
  !video.paused &&
  isAutomaticPauseEnabled
) {
  video.pause();

  status.textContent =
    "⏸️ Cümle bitti — video durduruldu";
} else if (
  video &&
  !isAutomaticPauseEnabled
) {
  status.textContent =
    "▶️ Otomatik durdurma kapalı";
} else {
  status.textContent =
    "✅ Cümle tamamlandı";
}

    if (autoSpeechStartTimeout) {
      clearTimeout(
        autoSpeechStartTimeout
      );
    }

 if (
  SpeechRecognitionClass &&
  isPronunciationEnabled
) {
  scheduleAutomaticSpeechStart();
}
  }

  function updateVideoStatus() {
    const video =
      getNetflixVideo();

    const videoFound =
      Boolean(video);

    if (
      videoFound ===
      lastVideoFound
    ) {
      return;
    }

    lastVideoFound =
      videoFound;

    if (videoFound) {
      status.textContent =
        "✅ Video bulundu";

      pauseButton.disabled =
        false;

      playButton.disabled =
        false;

      replayButton.disabled =
        completedStartTimeMs ===
        null;

      speakButton.disabled =
        completedStartTimeMs ===
          null ||
        !SpeechRecognitionClass;
    } else {
      status.textContent =
        "⏳ Video aranıyor...";

      pauseButton.disabled =
        true;

      playButton.disabled =
        true;

      replayButton.disabled =
        true;

      speakButton.disabled =
        true;
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

    let replayGuardActive =
      false;

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
        sentenceStartTime ===
        null
      ) {
        sentenceStartTime =
          video
            ? Math.max(
                0,
                video.currentTime -
                  0.15
              )
            : null;
      }

      subtitleBox.textContent =
        newSubtitle;
    } else if (
      !previousSubtitle
    ) {
      subtitleBox.textContent =
        "Altyazı bekleniyor...";
    }
  }

  function finishReplay(
    success,
    message
  ) {
    if (replayTimeout) {
      clearTimeout(
        replayTimeout
      );

      replayTimeout = null;
    }

    isReplayStarting = false;
    activeReplayRequestId = null;

    pauseButton.disabled = false;
    playButton.disabled = false;

    replayButton.disabled =
      completedStartTimeMs ===
      null;

   if (!success) {
  isReplayPlaybackActive =
    false;

  isAutomaticRetryReplay =
    false;

  speakButton.textContent =
    "🎤 İkinci Kez Dene";

  speakButton.disabled =
    completedStartTimeMs ===
      null ||
    !SpeechRecognitionClass;

  status.textContent =
    `❌ ${
      message ||
      "Cümle tekrar oynatılamadı"
    }`;

  return;
}

    isReplayPlaybackActive = true;

    const replayStartSeconds =
      completedStartTimeMs !==
      null
        ? completedStartTimeMs /
          1000
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
        completedStartTimeMs ===
          null
      ) {
        status.textContent =
          "Tekrar oynatılacak cümle bulunamadı";

        return;
      }

      stopSpeechRecognition();
      video.pause();

      isReplayPlaybackActive =
        false;

      isReplayStarting = true;
      currentSubtitle = "";
      sentenceParts = [];
      replayGuardUntilVideoTime =
        null;

      activeReplayRequestId =
        `replay-${Date.now()}-${Math.random()}`;

      replayButton.disabled =
        true;

      pauseButton.disabled =
        true;

      playButton.disabled =
        true;

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
      if (
        event.source !==
        window
      ) {
        return;
      }

      const data =
        event.data;

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
  nowSpeakTitle
);

panel.appendChild(
  nowSpeakBox
);
  panel.appendChild(
    spokenTitle
  );

  panel.appendChild(
    spokenBox
  );

  panel.appendChild(
    pronunciationResultTitle
  );

  panel.appendChild(
    pronunciationResultBox
  );

  panel.appendChild(
    chunkTitle
  );

  panel.appendChild(
    chunkBox
  );

  panel.appendChild(
    speakButton
  );

 [
  speakButton,
  pronunciationToggleButton,
  automaticPauseToggleButton,
  chunkPracticeButton,
  replayButton,
  pauseButton,
  playButton
].forEach((button) => {
  controlsPanel.appendChild(button);
});

document.documentElement.appendChild(
  panel
);

document.documentElement.appendChild(
  controlsPanel
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