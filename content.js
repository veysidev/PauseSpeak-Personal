(() => {
  let remoteStudyButtonIndex = -1;
  let keyboardStudyMeaningTimer = null;
  const keyboardStudyMeaningDelayMs =
    1800;

  function getPauseSpeakRemoteKey(event) {
    const key = String(event?.key || "");
    const keyCode = Number(
      event?.keyCode || event?.which || 0
    );

    if (key === "ArrowUp" || key === "Up" || keyCode === 38) {
      return "ArrowUp";
    }

    if (key === "ArrowDown" || key === "Down" || keyCode === 40) {
      return "ArrowDown";
    }

    if (key === "ArrowLeft" || key === "Left" || keyCode === 37) {
      return "ArrowLeft";
    }

    if (key === "ArrowRight" || key === "Right" || keyCode === 39) {
      return "ArrowRight";
    }

    if (
      key === "Enter" ||
      key === "Select" ||
      key === "Accept" ||
      keyCode === 13 ||
      keyCode === 23
    ) {
      return "Confirm";
    }

    if (key === "Escape" || keyCode === 27) {
      return "Escape";
    }

    return key;
  }

window.addEventListener(
  "keydown",
  (event) => {
    const remoteKey =
      getPauseSpeakRemoteKey(event);
    const isMeaningOpen =
      studyMeaningOverlay.classList
        .contains("ps-open");

    if (
      isMeaningOpen &&
      (
        remoteKey === "Confirm" ||
        remoteKey === "Escape"
      )
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closeStudyMeaningPanel(false);
      return;
    }

    if (event.repeat) {
      return;
    }

    if (isPronunciationCoachOpen) {
      return;
    }

    if (
      event.target instanceof HTMLElement &&
      (
        event.target.matches(
          "input, textarea, select"
        ) ||
        event.target.isContentEditable
      )
    ) {
      return;
    }

  const isPreviousWordKey =
  remoteKey === "ArrowUp";

const isNextWordKey =
  remoteKey === "ArrowDown";

    if (remoteKey === "ArrowLeft") {
      clearKeyboardStudyMeaningTimer();
      clearStudySelection();
      event.preventDefault();
      event.stopPropagation();

      navigateToAdjacentSentence(-1);

      return;
    }

    if (remoteKey === "ArrowRight") {
      clearKeyboardStudyMeaningTimer();
      clearStudySelection();
      event.preventDefault();
      event.stopPropagation();

      if (replayButton.disabled) {
        status.textContent =
          "Tekrar oynatılacak cümle bulunamadı";
      } else {
        replayButton.click();
      }

      return;
    }

    if (
      isPreviousWordKey ||
      isNextWordKey
    ) {
      event.preventDefault();
      event.stopPropagation();

      const studyButtons = [
        ...subtitleBox.querySelectorAll(
          "button[data-study-text]"
        )
      ];

      if (!studyButtons.length) {
        return;
      }

      const previousRemoteIndex =
        remoteStudyButtonIndex;

      if (
        studyMeaningOverlay.classList
          .contains("ps-open")
      ) {
        closeStudyMeaningPanel(false);
        remoteStudyButtonIndex =
          previousRemoteIndex;
      }

      clearKeyboardStudyMeaningTimer();
      clearStudyKeyboardTarget();

      if (isNextWordKey) {
        remoteStudyButtonIndex =
          (
            remoteStudyButtonIndex + 1
          ) % studyButtons.length;
      } else {
        remoteStudyButtonIndex =
          (
            remoteStudyButtonIndex -
            1 +
            studyButtons.length
          ) % studyButtons.length;
      }

      const selectedButton =
        studyButtons[
          remoteStudyButtonIndex
        ];

      const context =
        getStudyButtonContext(
          selectedButton
        );

      if (!context) {
        return;
      }

      const selectedButtons =
        selectStudyExpression(
          context.studyButtons,
          context.buttonIndex,
          context.mappedSegment
        );

      selectedButtons.forEach(
        (button) => {
          button.classList.add(
            "ps-study-keyboard-target"
          );
          button.setAttribute(
            "aria-current",
            "true"
          );
        }
      );

      selectedButton.scrollIntoView({
        block: "nearest",
        inline: "nearest"
      });

      scheduleKeyboardStudyMeaning(
        selectedButton,
        remoteStudyButtonIndex
      );

      return;
    }

    if (remoteKey === "Confirm") {
      clearKeyboardStudyMeaningTimer();
      clearStudySelection();
      event.preventDefault();
      event.stopPropagation();

      const video =
        getNetflixVideo();

      if (!video) {
        return;
      }

      if (video.paused) {
        void video.play();
      } else {
        video.pause();
      }
    }
  },
  true
);
  const panelId = "pausespeak-status-panel";
 const translationApiUrl =
  "https://pausespeak.onrender.com/translate";

const translationTimeoutMs = 70000;
const translationSpeechApiUrl =
  "https://pausespeak.onrender.com/speak-translation";

const translationSpeechTimeoutMs =
  70000

const chunkApiUrl =
  "https://pausespeak.onrender.com/chunk";

const chunkTimeoutMs = 20000;

const studySegmentsApiUrl =
  "https://pausespeak.onrender.com/study-segments";

const studySegmentsTimeoutMs = 20000;

const studyMeaningApiUrl =
  "https://pausespeak.onrender.com/study-meaning";

const studyMeaningTimeoutMs = 20000;

const usageSummaryApiUrl =
  "https://pausespeak.onrender.com/usage/summary";

const usageImportApiUrl =
  "https://pausespeak.onrender.com/usage/import";

const usageCounterApiUrl =
  "https://pausespeak.onrender.com/usage/counter/start";

const usageTtsDurationApiUrl =
  "https://pausespeak.onrender.com/usage/tts-duration";
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
  let completedEndTimeMs = null;
  let lastVideoFound = null;
  let lastPlaybackMediaKey = "";

  let isReplayStarting = false;
  let activeReplayRequestId = null;
  let replayTimeout = null;
  let replayGuardUntilVideoTime = null;
  let isReplayPlaybackActive = false;
  let isAutomaticRetryReplay = false;
  let replayPauseGeneration = 0;

  const sentencePauseConfig =
    Object.freeze({
      schedulerLeadMs: 0,
      lateGraceMs: 150,
      subtitleOffsetMs: 0,
      minArmLeadAfterSeekMs: 100
    });
  const captionEngineVersion =
    "1.2.0-caption-block-v2";

  const sentencePauseController = {
    video: null,
    trackId: "",
    timelineKey: "",
    timeline: [],
    armed: null,
    lastMediaMs: null,
    settled: new Map(),
    callbackId: null,
    callbackKind: "",
    eventAbortController: null,
    generation: 0
  };

  let previousCompletedSentence = "";

  let previousSentenceText = "";
  let previousSentenceStartTimeMs =
    null;
  let previousSentenceEndTimeMs = null;

  let translationRequestNumber = 0;
  let translationAbortController = null;
  let currentTranslationPreviousText = "";
  let translationSpeechRequestNumber = 0;
let translationSpeechAbortController =
  null;
let translationSpeechAudio = null;
let translationSpeechObjectUrl = null;
 let chunkRequestNumber = 0;
let chunkAbortController = null;
let isChunkRequestPending = false;

let studySegmentsRequestNumber = 0;
let studySegmentsAbortController = null;
let studyMeaningRequestNumber = 0;
let studyMeaningAbortController = null;
let currentSentenceStudySegments = [];
let currentStudyTokenMappings = [];

const studyMeaningCache =
  new Map();
const translatedCueCache =
  new Map();
const capturedSubtitleTracks = new Map();
let activeSubtitleTrackId = "";
let activeTranscriptCueIndex = -1;
let activeTranscriptSeekRequestId = "";
let lastSubtitleTrackRequestAt = 0;
let visibleSubtitleCueStartMs = null;
let visibleSubtitleCueText = "";
let lastIndependentVisibleSubtitle = "";
let lastIndependentVisibleSubtitleAt = 0;
const visibleSubtitleCues = [];
let subtitleChunkRequestNumber = 0;
let subtitleChunkAbortController = null;

let subtitleTranslationRequestNumber = 0;
let subtitleTranslationAbortController = null;
let terraImproveRequestNumber = 0;
let terraImproveAbortController = null;
let isTerraImprovePending = false;
let terraImprovePendingAction = "";

let sentenceTranslationPrefetchRequestNumber = 0;
let sentenceTranslationPrefetchAbortController = null;
let sentenceTranslationPrefetchKey = "";
let sentenceTranslationPrefetchPromise = null;

let currentSubtitleChunks = [];
let currentSubtitleChunkTranslations = [];

const isChunkTranslationVisible = false;
let isSubtitlePanelHidden = false;
let subtitleHiddenAtSentence = "";
let isPrivacyCurtainActive = false;
let privacyTapCount = 0;
let privacyTapStartedAt = 0;
let privacyLastTapAt = 0;
let privacyLastTapX = 0;
let privacyLastTapY = 0;
let privacySuppressClickUntil = 0;
let privacyHeartbeatAt = Date.now();

  let speechRecognition = null;
  let isSpeechListening = false;
  let speechRecognitionHasResult = false;
  let speechRecognitionHadError = false;
  let speechRecognitionWasCancelled = false;
   let recognizedSpeechText = "";

  let pronunciationRetryWords = [];
  let pronunciationRetryWordIndex = 0;

  let pronunciationAttemptCount = 0;
  let pronunciationMode = "sentence";
  let pronunciationChunks = [];
  let pronunciationChunkIndex = 0;
  let pronunciationChunkSuccessCount = 0;
  let finalSentenceAttemptCount = 0;
  let isPronunciationEnabled = false;
  let isPronunciationCoachSessionActive = false;
  let isPronunciationCoachOpen = false;
  let pronunciationCoachRecognition = null;
  let pronunciationCoachListening = false;
  let pronunciationCoachShouldRestart = false;
  let pronunciationCoachManualPause = false;
  let pronunciationCoachHadSpeech = false;
  let pronunciationCoachIsModelSpeaking = false;
  let pronunciationCoachWaitingForTranslation =
    false;
  let pronunciationCoachRestartCount = 0;
  let pronunciationCoachRestartTimeout = null;
  let pronunciationCoachSilenceTimeout = null;
  let pronunciationCoachAdvanceTimeout = null;
  let pronunciationCoachSentence = "";
  let pronunciationCoachChunks = [];
  let pronunciationCoachChunkIndex = 0;
  let pronunciationCoachLiveMatches = new Set();
  let pronunciationCoachActiveWordIndex = -1;
  let pronunciationCoachLastHeard = "";
  let pronunciationCoachStudySelection =
    new Set();
  let pronunciationCoachResumeAfterMeaning =
    false;
  let pronunciationCoachVideoPreview = null;
  const pronunciationCoachViewStorageKey =
    "pausespeak-coach-view-mode";
  let isPronunciationCoachAllChunksVisible =
    false;

  try {
    isPronunciationCoachAllChunksVisible =
      localStorage.getItem(
        pronunciationCoachViewStorageKey
      ) === "all";
  } catch (error) {
    console.debug(
      "PauseSpeak Telaffuz Koçu görünümü okunamadı.",
      error
    );
  }
  let isTurkishTranslationSpeechEnabled =
  false;
  let isAutomaticPauseEnabled = true;
  let autoContinueTimeout = null;
  let speechSilenceTimeout = null;
  let autoSpeechStartTimeout = null;

  const panel = document.createElement("div");
  panel.id = panelId;
  const privacyCurtain =
    document.createElement("div");
  privacyCurtain.id =
    "pausespeak-privacy-curtain";
  privacyCurtain.setAttribute(
    "aria-hidden",
    "true"
  );
  privacyCurtain.setAttribute(
    "aria-label",
    "PauseSpeak gizlilik perdesi"
  );
  const subtitleCloseButton =
  document.createElement("button");

subtitleCloseButton.type =
  "button";

subtitleCloseButton.textContent =
  "×";

subtitleCloseButton.title =
  "Altyazı kutusunu kapat";

const improveTranslationButton =
  document.createElement("button");

improveTranslationButton.type =
  "button";

improveTranslationButton.className =
  "ps-terra-action";

improveTranslationButton.textContent =
  "AI Çeviri+";

improveTranslationButton.title =
  "Türkçe çeviriyi daha doğal ve akıcı hale getir";
improveTranslationButton.setAttribute(
  "aria-label",
  improveTranslationButton.title
);

improveTranslationButton.disabled =
  true;

const pronunciationCoachButton =
  document.createElement("button");

pronunciationCoachButton.type =
  "button";

pronunciationCoachButton.title =
  "Telaffuz Koçu";

pronunciationCoachButton.setAttribute(
  "aria-label",
  pronunciationCoachButton.title
);

pronunciationCoachButton.disabled =
  true;

const subtitleActionsRow =
  document.createElement("div");

subtitleActionsRow.className =
  "ps-subtitle-actions";

subtitleActionsRow.setAttribute(
  "role",
  "group"
);

subtitleActionsRow.setAttribute(
  "aria-label",
  "Altyazı eylemleri"
);

const subtitleOpenButton =
  document.createElement("button");

subtitleOpenButton.type =
  "button";

subtitleOpenButton.textContent =
  "Altyazıyı Aç";

subtitleOpenButton.title =
  "Altyazı kutusunu aç";

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
  const turkishTranslationSpeechToggleButton =
  document.createElement("button");

turkishTranslationSpeechToggleButton.textContent =
  "Türkçe Ses: Kapalı";
  const automaticPauseToggleButton =
  document.createElement("button");

automaticPauseToggleButton.textContent =
  "Otomatik Durdurma: Açık";
  const replayButton = document.createElement("button");
  replayButton.textContent = "Cümleyi Tekrar Oynat";
  replayButton.disabled = true;

  const pauseButton = document.createElement("button");
  pauseButton.textContent = "Durdur";

  const playButton =
    document.createElement("button");

  playButton.textContent =
    "Devam Et";

  const previousSentenceButton =
    document.createElement("button");

  previousSentenceButton.textContent =
    "↶ Önceki Cümle";

  previousSentenceButton.disabled =
    true;

  const moreButton =
    document.createElement("button");

  moreButton.textContent =
    "☰ Daha Fazla";

  const usageButton =
    document.createElement("button");

  usageButton.type = "button";
  usageButton.textContent =
    "Günlük Kullanım";
  usageButton.title =
    "Bugünkü API kullanımını göster";

  const transcriptButton =
    document.createElement("button");

  transcriptButton.type = "button";
  transcriptButton.textContent =
    "Altyazılar";
  transcriptButton.title =
    "Bölümün zaman kodlu altyazılarını göster";

  const topControlsRow =
    document.createElement("div");

  const moreMenu =
    document.createElement("div");

  moreMenu.style.display =
    "none";

  const usageOverlay =
    document.createElement("div");

  const usagePanel =
    document.createElement("div");

  const usageHeader =
    document.createElement("div");

  const usageTitle =
    document.createElement("div");

  usageTitle.textContent =
    "Günlük Kullanım";

  const usageHeaderActions =
    document.createElement("div");

  const usageCounterButton =
    document.createElement("button");

  usageCounterButton.type = "button";
  usageCounterButton.textContent =
    "Yeni Sayaç Başlat";
  usageCounterButton.title =
    "Günlük toplamları silmeden yeni karşılaştırma sayacı başlat";

  const usageCloseButton =
    document.createElement("button");

  usageCloseButton.type = "button";
  usageCloseButton.textContent = "×";
  usageCloseButton.title = "Kapat";

  const usageContent =
    document.createElement("div");

  const transcriptOverlay =
    document.createElement("div");

  const transcriptPanel =
    document.createElement("div");

  const transcriptHeader =
    document.createElement("div");

  transcriptHeader.className =
    "ps-transcript-header";

  const transcriptTitle =
    document.createElement("div");

  transcriptTitle.textContent =
    "Altyazılar";

  const transcriptCloseButton =
    document.createElement("button");

  transcriptCloseButton.type = "button";
  transcriptCloseButton.textContent = "×";
  transcriptCloseButton.title = "Kapat";

  const transcriptSearchInput =
    document.createElement("input");

  transcriptSearchInput.type = "search";
  transcriptSearchInput.placeholder =
    "Altyazılarda ara…";
  transcriptSearchInput.autocomplete =
    "off";

  const transcriptStatus =
    document.createElement("div");

  transcriptStatus.id =
    "pausespeak-transcript-status";

  transcriptStatus.textContent =
    "Video altyazı verisi bekleniyor…";

  const transcriptList =
    document.createElement("div");

  const studyMeaningOverlay =
    document.createElement("div");

  const studyMeaningPanel =
    document.createElement("div");

  const studyMeaningHeader =
    document.createElement("div");
  studyMeaningHeader.className =
    "ps-study-meaning-header";

  const studyMeaningEyebrow =
    document.createElement("div");
  studyMeaningEyebrow.className =
    "ps-study-meaning-eyebrow";
  studyMeaningEyebrow.textContent =
    "Bağlama göre kelime ve ifade";

  const studyMeaningCloseButton =
    document.createElement("button");
  studyMeaningCloseButton.type =
    "button";
  studyMeaningCloseButton.className =
    "ps-study-meaning-close";
  studyMeaningCloseButton.title =
    "Ayrıntı panelini kapat";
  studyMeaningCloseButton.setAttribute(
    "aria-label",
    studyMeaningCloseButton.title
  );

  const studyMeaningContent =
    document.createElement("div");
  studyMeaningContent.className =
    "ps-study-meaning-content";

  const pronunciationCoachOverlay =
    document.createElement("div");

  const pronunciationCoachPanel =
    document.createElement("div");

  const pronunciationCoachHeader =
    document.createElement("div");
  pronunciationCoachHeader.className =
    "ps-pronunciation-coach-header";

  const pronunciationCoachHeading =
    document.createElement("div");
  pronunciationCoachHeading.className =
    "ps-pronunciation-coach-heading";

  const pronunciationCoachEyebrow =
    document.createElement("div");
  pronunciationCoachEyebrow.className =
    "ps-pronunciation-coach-eyebrow";
  pronunciationCoachEyebrow.textContent =
    "Canlı konuşma çalışması";

  const pronunciationCoachTitle =
    document.createElement("h2");
  pronunciationCoachTitle.textContent =
    "Telaffuz Koçu";

  const pronunciationCoachProgress =
    document.createElement("div");
  pronunciationCoachProgress.className =
    "ps-pronunciation-coach-progress";

  const pronunciationCoachChunkNavigation =
    document.createElement("div");
  pronunciationCoachChunkNavigation.className =
    "ps-pronunciation-coach-chunk-navigation";

  const pronunciationCoachPreviousChunkButton =
    document.createElement("button");
  pronunciationCoachPreviousChunkButton.type =
    "button";
  pronunciationCoachPreviousChunkButton.className =
    "ps-pronunciation-coach-chunk-button";
  pronunciationCoachPreviousChunkButton.title =
    "Önceki parça";
  pronunciationCoachPreviousChunkButton.setAttribute(
    "aria-label",
    pronunciationCoachPreviousChunkButton.title
  );

  const pronunciationCoachNextChunkButton =
    document.createElement("button");
  pronunciationCoachNextChunkButton.type =
    "button";
  pronunciationCoachNextChunkButton.className =
    "ps-pronunciation-coach-chunk-button";
  pronunciationCoachNextChunkButton.title =
    "Sonraki parça";
  pronunciationCoachNextChunkButton.setAttribute(
    "aria-label",
    pronunciationCoachNextChunkButton.title
  );

  const pronunciationCoachViewToggleButton =
    document.createElement("button");
  pronunciationCoachViewToggleButton.type =
    "button";
  pronunciationCoachViewToggleButton.className =
    "ps-pronunciation-coach-view-toggle";
  pronunciationCoachViewToggleButton.title =
    "Tek parça veya tüm parçalar görünümünü değiştir";
  pronunciationCoachViewToggleButton.setAttribute(
    "aria-label",
    pronunciationCoachViewToggleButton.title
  );

  const pronunciationCoachCloseButton =
    document.createElement("button");
  pronunciationCoachCloseButton.type =
    "button";
  pronunciationCoachCloseButton.className =
    "ps-pronunciation-coach-close";
  pronunciationCoachCloseButton.title =
    "Telaffuz Koçu oturumunu bitir";
  pronunciationCoachCloseButton.setAttribute(
    "aria-label",
    pronunciationCoachCloseButton.title
  );

  const pronunciationCoachInstruction =
    document.createElement("div");
  pronunciationCoachInstruction.className =
    "ps-pronunciation-coach-instruction";
  pronunciationCoachInstruction.textContent =
    "Parçayı doğal biçimde söyle";

  const pronunciationCoachWords =
    document.createElement("div");
  pronunciationCoachWords.className =
    "ps-pronunciation-coach-words";
  pronunciationCoachWords.setAttribute(
    "aria-live",
    "polite"
  );

  const pronunciationCoachTranslation =
    document.createElement("div");
  pronunciationCoachTranslation.className =
    "ps-pronunciation-coach-translation";
  pronunciationCoachTranslation.setAttribute(
    "aria-live",
    "polite"
  );

  const pronunciationCoachHeard =
    document.createElement("div");
  pronunciationCoachHeard.className =
    "ps-pronunciation-coach-heard";
  pronunciationCoachHeard.textContent =
    "Mikrofon hazır";

  const pronunciationCoachStatus =
    document.createElement("div");
  pronunciationCoachStatus.className =
    "ps-pronunciation-coach-status";
  pronunciationCoachStatus.textContent =
    "Başlamak için mikrofona dokun";

  const pronunciationCoachActions =
    document.createElement("div");
  pronunciationCoachActions.className =
    "ps-pronunciation-coach-actions";

  const pronunciationCoachListenButton =
    document.createElement("button");
  pronunciationCoachListenButton.type =
    "button";
  pronunciationCoachListenButton.className =
    "ps-pronunciation-coach-listen";
  pronunciationCoachListenButton.textContent =
    "Dinle";
  pronunciationCoachListenButton.title =
    "Cümleyi baştan dinle";
  pronunciationCoachListenButton.setAttribute(
    "aria-label",
    pronunciationCoachListenButton.title
  );

  const pronunciationCoachMicButton =
    document.createElement("button");
  pronunciationCoachMicButton.type =
    "button";
  pronunciationCoachMicButton.className =
    "ps-pronunciation-coach-mic";
  pronunciationCoachMicButton.textContent =
    "Konuş";

  usageHeader.appendChild(
    usageTitle
  );

  usageHeaderActions.appendChild(
    usageCounterButton
  );

  usageHeaderActions.appendChild(
    usageCloseButton
  );

  usageHeader.appendChild(
    usageHeaderActions
  );

  usagePanel.appendChild(
    usageHeader
  );

  usagePanel.appendChild(
    usageContent
  );

  usageOverlay.appendChild(
    usagePanel
  );

  transcriptHeader.append(
    transcriptTitle,
    transcriptCloseButton
  );

  transcriptPanel.append(
    transcriptHeader,
    transcriptSearchInput,
    transcriptStatus,
    transcriptList
  );

  transcriptOverlay.appendChild(
    transcriptPanel
  );

  studyMeaningHeader.append(
    studyMeaningEyebrow,
    studyMeaningCloseButton
  );

  studyMeaningPanel.append(
    studyMeaningHeader,
    studyMeaningContent
  );

  studyMeaningOverlay.appendChild(
    studyMeaningPanel
  );

  pronunciationCoachHeading.append(
    pronunciationCoachEyebrow,
    pronunciationCoachTitle
  );

  pronunciationCoachChunkNavigation.append(
    pronunciationCoachPreviousChunkButton,
    pronunciationCoachProgress,
    pronunciationCoachNextChunkButton,
    pronunciationCoachViewToggleButton
  );

  pronunciationCoachHeader.append(
    pronunciationCoachHeading,
    pronunciationCoachChunkNavigation,
    pronunciationCoachCloseButton
  );

  pronunciationCoachActions.append(
    pronunciationCoachListenButton,
    pronunciationCoachMicButton
  );

  pronunciationCoachPanel.append(
    pronunciationCoachHeader,
    pronunciationCoachInstruction,
    pronunciationCoachWords,
    pronunciationCoachTranslation,
    pronunciationCoachHeard,
    pronunciationCoachStatus,
    pronunciationCoachActions
  );

  pronunciationCoachOverlay.appendChild(
    pronunciationCoachPanel
  );

  const controlsPanel =
    document.createElement("div");

  controlsPanel.id =
    "pausespeak-controls-panel";

  panel.classList.add(
    "ps-subtitle-card"
  );

  subtitleBox.id =
    "pausespeak-subtitle-english";
  translationBox.id =
    "pausespeak-subtitle-turkish";
  improveTranslationButton.id =
    "pausespeak-improve-button";
  pronunciationCoachButton.id =
    "pausespeak-pronunciation-coach-button";
  subtitleCloseButton.id =
    "pausespeak-subtitle-close";
  subtitleOpenButton.id =
    "pausespeak-subtitle-open";
  transcriptOverlay.id =
    "pausespeak-transcript-overlay";
  transcriptPanel.id =
    "pausespeak-transcript-panel";
  transcriptList.id =
    "pausespeak-transcript-list";
  usageOverlay.id =
    "pausespeak-usage-overlay";
  studyMeaningOverlay.id =
    "pausespeak-study-meaning-overlay";
  studyMeaningOverlay.setAttribute(
    "aria-hidden",
    "true"
  );
  studyMeaningPanel.id =
    "pausespeak-study-meaning-panel";
  studyMeaningPanel.setAttribute(
    "role",
    "dialog"
  );
  studyMeaningPanel.setAttribute(
    "aria-modal",
    "true"
  );
  studyMeaningPanel.setAttribute(
    "aria-label",
    "Kelime veya ifade ayrıntıları"
  );
  pronunciationCoachOverlay.id =
    "pausespeak-pronunciation-coach-overlay";
  pronunciationCoachOverlay.setAttribute(
    "aria-hidden",
    "true"
  );
  pronunciationCoachPanel.id =
    "pausespeak-pronunciation-coach-panel";
  pronunciationCoachPanel.setAttribute(
    "role",
    "dialog"
  );
  pronunciationCoachPanel.setAttribute(
    "aria-modal",
    "true"
  );
  pronunciationCoachPanel.setAttribute(
    "aria-label",
    "Telaffuz Koçu"
  );

  function getPauseSpeakIcon(name) {
    const icons = {
      close:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
      sliders:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6"/></svg>',
      panel:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h7M7 17h4"/></svg>',
      more:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>',
      previous:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 5L8.5 12l7 7"/></svg>',
      next:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5l7 7-7 7"/></svg>',
      replay:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 1-2.4-5.7M20 4v7h-7"/></svg>',
      rewind:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7H4V3M4.7 7.2A9 9 0 1 1 3 12"/><text x="12" y="15" text-anchor="middle" fill="currentColor" stroke="none" font-size="7" font-weight="700">10</text></svg>',
      forward:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 7h4V3M19.3 7.2A9 9 0 1 0 21 12"/><text x="12" y="15" text-anchor="middle" fill="currentColor" stroke="none" font-size="7" font-weight="700">10</text></svg>',
      pause:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
      play:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
      subtitles:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h4M7 14h3M14 10h3M13 14h4"/></svg>',
      audio:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18 6a9 9 0 0 1 0 12"/></svg>',
      parts:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z"/></svg>',
      export:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>',
      chevron:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
      chevronDown:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>',
      chevronUp:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15l7-7 7 7"/></svg>',
      brand:
        '<svg viewBox="0 0 28 24" aria-hidden="true"><rect x="3" y="4" width="3.5" height="16" rx="1.75"/><rect x="9" y="4" width="3.5" height="16" rx="1.75"/><path d="M16 14l2.2-4 2.4 7 2.1-10 2.3 7"/></svg>',
      waveSpark:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13h3l2-5 3.2 10 2.7-13 2.6 8H21"/><path d="M19 3v4M17 5h4"/></svg>',
      coach:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>',
      speaker:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18 6a9 9 0 0 1 0 12"/></svg>'
    };

    return icons[name] || "";
  }

  function setPauseSpeakButton(
    button,
    icon,
    label
  ) {
    button.replaceChildren();
    button.insertAdjacentHTML(
      "afterbegin",
      getPauseSpeakIcon(icon)
    );

    if (label) {
      const labelElement =
        document.createElement("span");

      labelElement.textContent = label;
      button.appendChild(labelElement);
    }
  }

  const topBar =
    document.createElement("div");
  topBar.className = "ps-topbar";

  const topLeft =
    document.createElement("div");
  topLeft.className = "ps-top-left";

  const interfaceCloseButton =
    document.createElement("button");
  interfaceCloseButton.type = "button";
  interfaceCloseButton.className =
    "ps-icon-button";
  interfaceCloseButton.title =
    "PauseSpeak arayüzünü gizle";
  interfaceCloseButton.setAttribute(
    "aria-label",
    interfaceCloseButton.title
  );

  const mediaCopy =
    document.createElement("div");
  mediaCopy.className = "ps-media-copy";

  const brandMark =
    document.createElement("div");
  brandMark.className = "ps-brand-mark";
  brandMark.innerHTML =
    getPauseSpeakIcon("brand");
  brandMark.setAttribute(
    "aria-hidden",
    "true"
  );

  const mediaTitle =
    document.createElement("div");
  mediaTitle.className = "ps-media-title";
  mediaTitle.textContent = "PauseSpeak";

  const mediaSubtitle =
    document.createElement("div");
  mediaSubtitle.className =
    "ps-media-subtitle";
  mediaSubtitle.textContent =
    "Video hazırlanıyor…";

  const topActions =
    document.createElement("div");
  topActions.className = "ps-top-actions";

  const settingsButton =
    document.createElement("button");
  settingsButton.type = "button";
  settingsButton.className =
    "ps-icon-button ps-settings-button";
  settingsButton.title =
    "PauseSpeak ayarları";

  const speedButton =
    document.createElement("button");
  speedButton.type = "button";
  speedButton.className =
    "ps-top-button ps-speed-button";
  speedButton.textContent = "1.0x";
  speedButton.title =
    "Oynatma hızını değiştir";

  const panelVisibilityButton =
    document.createElement("button");
  panelVisibilityButton.type = "button";
  panelVisibilityButton.className =
    "ps-icon-button ps-panel-button";
  panelVisibilityButton.title =
    "Sağdaki altyazı geçmişini göster";

  const nextSentenceButton =
    document.createElement("button");
  nextSentenceButton.type = "button";
  nextSentenceButton.className =
    "ps-side-nav ps-next";
  nextSentenceButton.title =
    "Sonraki altyazıya git";

  const playerShell =
    document.createElement("div");
  playerShell.className =
    "ps-player-shell";

  const playerShellToggleButton =
    document.createElement("button");
  playerShellToggleButton.type =
    "button";
  playerShellToggleButton.className =
    "ps-player-shell-toggle";
  playerShellToggleButton.title =
    "Oynatıcı çubuğunu küçült";
  playerShellToggleButton.setAttribute(
    "aria-label",
    playerShellToggleButton.title
  );

  const progressRow =
    document.createElement("div");
  progressRow.className =
    "ps-progress-row";

  const currentTimeLabel =
    document.createElement("span");
  currentTimeLabel.className = "ps-time";
  currentTimeLabel.textContent = "0:00";

  const progressRange =
    document.createElement("input");
  progressRange.type = "range";
  progressRange.className = "ps-progress";
  progressRange.min = "0";
  progressRange.max = "1000";
  progressRange.step = "1";
  progressRange.value = "0";
  progressRange.setAttribute(
    "aria-label",
    "Video konumu"
  );

  const durationLabel =
    document.createElement("span");
  durationLabel.className = "ps-time";
  durationLabel.textContent = "0:00";

  const commandRow =
    document.createElement("div");
  commandRow.className =
    "ps-command-row";

  const seekBackwardButton =
    document.createElement("button");
  seekBackwardButton.type = "button";
  seekBackwardButton.className =
    "ps-command-button";
  seekBackwardButton.title =
    "10 saniye geri git";

  const playPauseButton =
    document.createElement("button");
  playPauseButton.type = "button";
  playPauseButton.className =
    "ps-command-button ps-play-pause";
  playPauseButton.title =
    "Oynat veya duraklat";
  playPauseButton.setAttribute(
    "aria-label",
    playPauseButton.title
  );

  const seekForwardButton =
    document.createElement("button");
  seekForwardButton.type = "button";
  seekForwardButton.className =
    "ps-command-button";
  seekForwardButton.title =
    "10 saniye ileri git";

  const audioSubtitleButton =
    document.createElement("button");
  audioSubtitleButton.type = "button";
  audioSubtitleButton.className =
    "ps-command-button";
  audioSubtitleButton.title =
    "Ses ve altyazı seçenekleri";

  const settingsMenu =
    document.createElement("div");
  settingsMenu.className =
    "ps-popup-menu ps-popup-top";

  const audioMenu =
    document.createElement("div");
  audioMenu.className =
    "ps-popup-menu ps-popup-bottom";

  moreMenu.className =
    "ps-popup-menu ps-popup-top";

  const subtitleVisibilityButton =
    document.createElement("button");
  subtitleVisibilityButton.type =
    "button";
  subtitleVisibilityButton.textContent =
    "Çeviri kartını gizle";

  const helpButton =
    document.createElement("button");
  helpButton.type = "button";
  helpButton.textContent =
    "Klavye kısayolları";

  const fontScaleSetting =
    document.createElement("div");
  fontScaleSetting.className =
    "ps-setting-row";

  const fontScaleLabel =
    document.createElement("div");
  fontScaleLabel.className =
    "ps-setting-label";
  fontScaleLabel.innerHTML =
    "<span>Altyazı boyutu</span><strong>100%</strong>";

  const fontScaleRange =
    document.createElement("input");
  fontScaleRange.type = "range";
  fontScaleRange.min = "60";
  fontScaleRange.max = "140";
  fontScaleRange.step = "5";
  fontScaleRange.value = "100";

  const opacitySetting =
    document.createElement("div");
  opacitySetting.className =
    "ps-setting-row";

  const opacityLabel =
    document.createElement("div");
  opacityLabel.className =
    "ps-setting-label";
  opacityLabel.innerHTML =
    "<span>Arayüz opaklığı</span><strong>88%</strong>";

  const opacityRange =
    document.createElement("input");
  opacityRange.type = "range";
  opacityRange.min = "25";
  opacityRange.max = "98";
  opacityRange.step = "1";
  opacityRange.value = "88";

  const transcriptHeaderActions =
    document.createElement("div");
  transcriptHeaderActions.className =
    "ps-transcript-header-actions";

  const exportButton =
    document.createElement("button");
  exportButton.type = "button";
  exportButton.className =
    "ps-transcript-action";
  exportButton.title =
    "Altyazıları dışa aktar";

  const exportMenu =
    document.createElement("div");
  exportMenu.className =
    "ps-export-menu";

  const exportFormats =
    document.createElement("div");
  exportFormats.className =
    "ps-export-formats";

  const exportFormatsLabel =
    document.createElement("div");
  exportFormatsLabel.className =
    "ps-export-section-label";
  exportFormatsLabel.textContent =
    "Dosya biçimi";

  const exportLanguages =
    document.createElement("div");
  exportLanguages.className =
    "ps-export-languages";

  const exportLanguagesLabel =
    document.createElement("div");
  exportLanguagesLabel.className =
    "ps-export-section-label";
  exportLanguagesLabel.textContent =
    "İndirme dili";

  const diagnosticExportButton =
    document.createElement("button");
  diagnosticExportButton.type = "button";
  diagnosticExportButton.textContent =
    "Tanılama JSON";
  diagnosticExportButton.title =
    "Geçerli zamanın çevresindeki ham cue, blok, cümle ve durdurma sınırlarını indir";

  const transcriptSettingsButton =
    document.createElement("button");
  transcriptSettingsButton.type =
    "button";
  transcriptSettingsButton.className =
    "ps-transcript-footer-button";
  transcriptSettingsButton.innerHTML =
    `<span>Altyazı ayarları</span>${getPauseSpeakIcon("chevron")}`;

  let selectedExportFormat = "srt";
  let isInterfaceHidden = false;
  let isPlayerShellCollapsed = false;
  let controlsHideTimeout = null;
  let controlsPlaybackVideo = null;
  let controlsPlaybackPausedState = null;
  const interfaceControlsHideDelayMs =
    3000;
  const playbackRates = [
    0.75,
    1,
    1.25,
    1.5
  ];

Object.assign(
  controlsPanel.style,
  {
    position: "fixed",
    top: "60px",
    right: "16px",
    zIndex: "2147483647",
  width: "fit-content",
minWidth: "145px",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backgroundColor:
      "rgba(15, 20, 20, 0.78)",
    border:
      "1px solid rgba(255, 255, 255, 0.10)",
    borderRadius: "20px",
    boxShadow:
      "0 12px 32px rgba(0, 0, 0, 0.35)",
    backdropFilter: "blur(12px)",
    boxSizing: "border-box"
  }
);

Object.assign(
  topControlsRow.style,
  {
    display: "grid",
  gridTemplateColumns:
  "1fr",
    gap: "10px"
  }
);

Object.assign(
  moreMenu.style,
  {
    alignSelf: "flex-end",
    width: "250px",
    overflow: "hidden",
    backgroundColor:
      "rgba(45, 48, 52, 0.96)",
    border:
      "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "16px",
    boxShadow:
      "0 14px 30px rgba(0, 0, 0, 0.40)"
  }
);

Object.assign(
  usageOverlay.style,
  {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    backgroundColor:
      "rgba(0, 0, 0, 0.72)",
    boxSizing: "border-box"
  }
);

Object.assign(
  usagePanel.style,
  {
    width: "min(760px, 100%)",
    maxHeight: "85vh",
    overflow: "auto",
    padding: "18px",
    backgroundColor: "#111827",
    color: "#f9fafb",
    border:
      "1px solid rgba(255, 255, 255, 0.22)",
    borderRadius: "18px",
    boxShadow:
      "0 20px 60px rgba(0, 0, 0, 0.55)",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box"
  }
);

Object.assign(
  usageHeader.style,
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "16px"
  }
);

Object.assign(
  usageTitle.style,
  {
    fontSize: "22px",
    fontWeight: "700"
  }
);

Object.assign(
  usageHeaderActions.style,
  {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  }
);

Object.assign(
  usageCounterButton.style,
  {
    minHeight: "36px",
    padding: "7px 12px",
    border:
      "1px solid rgba(96, 165, 250, 0.65)",
    borderRadius: "10px",
    backgroundColor:
      "rgba(30, 64, 175, 0.38)",
    color: "#bfdbfe",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer"
  }
);

Object.assign(
  usageCloseButton.style,
  {
    width: "36px",
    height: "36px",
    padding: "0",
    border:
      "1px solid rgba(255, 255, 255, 0.25)",
    borderRadius: "50%",
    backgroundColor: "#374151",
    color: "#ffffff",
    fontSize: "24px",
    cursor: "pointer"
  }
);

Object.assign(
  transcriptOverlay.style,
  {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    display: "none",
    alignItems: "stretch",
    justifyContent: "flex-end",
    padding: "16px",
    backgroundColor:
      "rgba(0, 0, 0, 0.42)",
    boxSizing: "border-box"
  }
);

Object.assign(
  transcriptPanel.style,
  {
    width:
      "min(460px, 100%)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "14px",
    backgroundColor:
      "rgba(8, 10, 12, 0.97)",
    color: "#f9fafb",
    border:
      "1px solid rgba(255, 255, 255, 0.22)",
    borderRadius: "16px",
    boxShadow:
      "0 20px 60px rgba(0, 0, 0, 0.65)",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
    overflow: "hidden"
  }
);

Object.assign(
  transcriptHeader.style,
  {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px"
  }
);

Object.assign(
  transcriptTitle.style,
  {
    fontSize: "22px",
    fontWeight: "700"
  }
);

Object.assign(
  transcriptCloseButton.style,
  {
    width: "36px",
    height: "36px",
    padding: "0",
    border:
      "1px solid rgba(255, 255, 255, 0.25)",
    borderRadius: "50%",
    backgroundColor: "#374151",
    color: "#ffffff",
    fontSize: "24px",
    cursor: "pointer"
  }
);

Object.assign(
  transcriptSearchInput.style,
  {
    width: "100%",
    minHeight: "40px",
    padding: "9px 12px",
    border:
      "1px solid rgba(255, 255, 255, 0.24)",
    borderRadius: "10px",
    outline: "none",
    backgroundColor: "#1f2937",
    color: "#ffffff",
    fontSize: "15px",
    boxSizing: "border-box"
  }
);

Object.assign(
  transcriptStatus.style,
  {
    padding: "9px 2px",
    color: "#93c5fd",
    fontSize: "12px",
    lineHeight: "1.35"
  }
);

Object.assign(
  transcriptList.style,
  {
    flex: "1",
    minHeight: "0",
    overflowY: "auto",
    overscrollBehavior: "contain",
    borderTop:
      "1px solid rgba(255, 255, 255, 0.14)"
  }
);

Object.assign(panel.style, {
  position: "fixed",
 left: "0",
right: "0",
bottom:
  window.innerWidth <= 1100
    ? "15px"
    : "130px",
margin: "0 auto",
  zIndex: "2147483647",
  width: "fit-content",
  maxWidth: "calc(100vw - 380px)",
  padding: "18px 22px",
 backgroundColor: "#1d2a30",
  color: "#f1f4f5",
  border: "1px solid rgba(133, 194, 209, 0.2)",
  borderRadius: "18px",
  fontFamily: "Arial, sans-serif",
  fontSize: "16px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
  boxSizing: "border-box"
});
Object.assign(
  subtitleCloseButton.style,
  {
    position: "absolute",
    top: "-12px",
    right: "-12px",
    zIndex: "2",
    width: "34px",
    height: "34px",
    padding: "0",
    border:
      "1px solid rgba(255, 255, 255, 0.35)",
    borderRadius: "50%",
    backgroundColor:
      "rgba(40, 40, 44, 0.92)",
    color: "#ffffff",
    fontSize: "22px",
    fontWeight: "700",
    lineHeight: "30px",
    textAlign: "center",
    cursor: "pointer"
  }
);

Object.assign(
  improveTranslationButton.style,
  {
    position: "static",
    minHeight: "34px",
    padding: "6px 12px",
    border:
      "1px solid rgba(255, 255, 255, 0.35)",
    borderRadius: "18px",
    backgroundColor:
      "rgba(40, 40, 44, 0.92)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    lineHeight: "1.2",
    whiteSpace: "nowrap",
    cursor: "pointer"
  }
);

Object.assign(
  subtitleOpenButton.style,
  {
    position: "fixed",
    left: "50%",
    bottom:
      window.innerWidth <= 1100
        ? "15px"
        : "130px",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
    display: "none",
    padding: "10px 18px",
    border:
      "1px solid rgba(255, 255, 255, 0.35)",
    borderRadius: "12px",
    backgroundColor: "#1d2a30",
    color: "#f1f4f5",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow:
      "0 8px 22px rgba(0, 0, 0, 0.45)"
  }
);
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
  translationBox,
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
    borderRadius: "0",
    fontSize: "24px"
  });
});

Object.assign(translationBox.style, {
  color: "#58c7e5"
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
  previousSentenceButton,
  replayButton,
  moreButton,
  speakButton,
  pronunciationToggleButton,
  turkishTranslationSpeechToggleButton,
  automaticPauseToggleButton,
  transcriptButton,
  usageButton,
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
const turkishSpeechButtonIconSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2024%2024' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11%205L6%209H2v6h4l5%204V5Z'/%3E%3Cpath d='M15.5%208.5a5%205%200%200%201%200%207'/%3E%3Cpath d='M18%206a9%209%200%200%201%200%2012'/%3E%3C/svg%3E\")";

Object.assign(
  turkishTranslationSpeechToggleButton.style,
  {
    backgroundImage:
      turkishSpeechButtonIconSvg,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "16px center",
    backgroundSize: "20px 20px",
    paddingLeft: "40px"
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
const usageButtonIconSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2024%2024' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4%2020V10'/%3E%3Cpath d='M10%2020V4'/%3E%3Cpath d='M16%2020v-7'/%3E%3Cpath d='M22%2020V7'/%3E%3C/svg%3E\")";

Object.assign(
  usageButton.style,
  {
    backgroundImage:
      usageButtonIconSvg,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "16px center",
    backgroundSize: "20px 20px",
    paddingLeft: "50px"
  }
);

const transcriptButtonIconSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2024%2024' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='14' rx='2'/%3E%3Cpath d='M7%2010h4M7%2014h3M14%2010h3M13%2014h4'/%3E%3C/svg%3E\")";

Object.assign(
  transcriptButton.style,
  {
    backgroundImage:
      transcriptButtonIconSvg,
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

previousSentenceButton.textContent =
  "↶\nÖnceki Cümle";

replayButton.textContent =
  "↻\nCümleyi Tekrar Oynat";

moreButton.textContent =
  "☰\nDaha Fazla";

[
  previousSentenceButton,
  replayButton,
  moreButton
].forEach((button) => {
  Object.assign(
    button.style,
    {
      minHeight: "54px",
      padding: "6px",
      backgroundImage: "none",
      backgroundPosition: "initial",
      backgroundSize: "initial",
      textAlign: "center",
      fontSize: "12px",
      fontWeight: "500",
      lineHeight: "1.25",
      whiteSpace: "pre-line"
    }
  );
});
[
  speakButton,
  pronunciationToggleButton,
  turkishTranslationSpeechToggleButton,
  automaticPauseToggleButton,
  transcriptButton,
  usageButton,
  pauseButton,
  playButton
].forEach((button) => {
  Object.assign(
    button.style,
    {
      minHeight: "38px",
      paddingTop: "5px",
      paddingRight: "8px",
      paddingBottom: "5px",
      paddingLeft: "40px",
      fontSize: "12px",
      borderRadius: "8px"
    }
  );
});

const usageStorageKey =
  "pausespeak-daily-usage-v1";

const usageSyncCodeStorageKey =
  "pausespeakUsageSyncCodeV1";

const usageDeviceIdStorageKey =
  "pausespeakUsageDeviceIdV1";

const usageMigrationStorageKey =
  "pausespeak-usage-sync-migrations-v1";

let usageSyncCode = "";
let usageDeviceId = "";
let synchronizedUsageStore = null;
let usageSyncState = "local";
let usageSyncError = "";
let usageRefreshRequestId = 0;

const usageOperationLabels = {
  normal_translation:
    "Normal çeviri",
  chunk_split:
    "Parça belirleme",
  chunk_translation:
    "Parçalama ve çeviri",
  improve_translation:
    "Çeviri iyileştirme",
  improve_chunk:
    "Parça iyileştirme",
  study_segments:
    "Cümle ifade analizi",
  study_meaning:
    "Kelime / ifade anlamı",
  tts_english:
    "İngilizce ses",
  tts_turkish:
    "Türkçe ses"
};

const usageModelPrices = {
  "gpt-5.6-luna": {
    input: 0.2,
    cachedInput: 0.02,
    cacheWriteInput: 0.25,
    output: 1.2
  },
  "gpt-5.6-terra": {
    input: 2,
    cachedInput: 0.2,
    cacheWriteInput: 2.5,
    output: 12
  }
};

function getLocalUsageDate(
  date = new Date()
) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeUsageSyncCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  return (
    normalized.length >= 16 &&
    normalized.length <= 96 &&
    /^[A-Z0-9-]+$/.test(normalized)
  )
    ? normalized
    : "";
}

function getExtensionStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      keys,
      (result) => resolve(result || {})
    );
  });
}

function setExtensionStorage(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      values,
      () => resolve()
    );
  });
}

function createUsageDeviceId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  return [...bytes]
    .map((value) =>
      value.toString(16).padStart(2, "0")
    )
    .join("");
}

function getUsageSyncHeaders(
  includeJson = true
) {
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] =
      "application/json";
  }

  if (usageSyncCode) {
    headers["X-PauseSpeak-Sync-Code"] =
      usageSyncCode;
    headers["X-PauseSpeak-Local-Date"] =
      getLocalUsageDate();
  }

  return headers;
}

async function getUsageSyncFingerprint() {
  const data = new TextEncoder().encode(
    usageSyncCode
  );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return [...new Uint8Array(digest)]
    .map((value) =>
      value.toString(16).padStart(2, "0")
    )
    .join("");
}

function readUsageMigrationFingerprints() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(
        usageMigrationStorageKey
      ) || "[]"
    );

    return Array.isArray(parsed)
      ? parsed.filter(
          (value) =>
            typeof value === "string"
        )
      : [];
  } catch (error) {
    return [];
  }
}

function saveUsageMigrationFingerprint(
  fingerprint
) {
  try {
    const fingerprints = [
      ...new Set([
        ...readUsageMigrationFingerprints(),
        fingerprint
      ])
    ].slice(-10);

    window.localStorage.setItem(
      usageMigrationStorageKey,
      JSON.stringify(fingerprints)
    );
  } catch (error) {
    console.warn(
      "PauseSpeak aktarım kaydı yazılamadı:",
      error
    );
  }
}

async function importLocalUsageOnce() {
  if (!usageSyncCode || !usageDeviceId) {
    return;
  }

  const fingerprint =
    await getUsageSyncFingerprint();

  if (
    readUsageMigrationFingerprints()
      .includes(fingerprint)
  ) {
    return;
  }

  const response = await fetch(
    usageImportApiUrl,
    {
      method: "POST",
      headers: getUsageSyncHeaders(),
      body: JSON.stringify({
        deviceId: usageDeviceId,
        days: readUsageStore().days
      })
    }
  );

  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({}));

    throw new Error(
      data.error ||
      "Yerel kullanım aktarılamadı."
    );
  }

  saveUsageMigrationFingerprint(
    fingerprint
  );
}

async function fetchSynchronizedUsageStore() {
  const response = await fetch(
    `${usageSummaryApiUrl}?today=` +
      encodeURIComponent(
        getLocalUsageDate()
      ),
    {
      headers: getUsageSyncHeaders(false)
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (
    !response.ok ||
    !data.store ||
    typeof data.store !== "object"
  ) {
    throw new Error(
      data.error ||
      "Ortak sayaç okunamadı."
    );
  }

  return data.store;
}

async function refreshUsagePanel() {
  const requestId =
    ++usageRefreshRequestId;

  synchronizedUsageStore = null;
  usageSyncError = "";
  usageSyncState = usageSyncCode
    ? "loading"
    : "local";
  renderUsagePanel();

  if (!usageSyncCode) {
    return;
  }

  try {
    await importLocalUsageOnce();

    const store =
      await fetchSynchronizedUsageStore();

    if (requestId !== usageRefreshRequestId) {
      return;
    }

    synchronizedUsageStore = store;
    usageSyncState = "synced";
    renderUsagePanel();
  } catch (error) {
    if (requestId !== usageRefreshRequestId) {
      return;
    }

    synchronizedUsageStore = null;
    usageSyncState = "error";
    usageSyncError =
      error?.message ||
      "Ortak sayaç okunamadı.";
    renderUsagePanel();
  }
}

async function syncTtsDuration(
  eventId,
  seconds
) {
  if (
    !usageSyncCode ||
    !eventId ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return;
  }

  try {
    await fetch(
      usageTtsDurationApiUrl,
      {
        method: "POST",
        headers: getUsageSyncHeaders(),
        body: JSON.stringify({
          eventId,
          seconds
        })
      }
    );
  } catch (error) {
    console.warn(
      "PauseSpeak ses süresi eşitlenemedi:",
      error
    );
  }
}

async function initializeUsageSync() {
  const stored = await getExtensionStorage([
    usageSyncCodeStorageKey,
    usageDeviceIdStorageKey
  ]);

  usageSyncCode = normalizeUsageSyncCode(
    stored[usageSyncCodeStorageKey]
  );
  usageDeviceId = String(
    stored[usageDeviceIdStorageKey] || ""
  );

  if (!usageDeviceId) {
    usageDeviceId = createUsageDeviceId();

    await setExtensionStorage({
      [usageDeviceIdStorageKey]:
        usageDeviceId
    });
  }

  if (usageSyncCode) {
    if (
      usageOverlay.style.display ===
      "flex"
    ) {
      void refreshUsagePanel();
    } else {
      void importLocalUsageOnce().catch(
        () => {}
      );
    }
  }
}

chrome.storage.onChanged.addListener(
  (changes, areaName) => {
    if (
      areaName !== "local" ||
      !changes[usageSyncCodeStorageKey]
    ) {
      return;
    }

    usageSyncCode = normalizeUsageSyncCode(
      changes[usageSyncCodeStorageKey]
        .newValue
    );
    synchronizedUsageStore = null;
    usageSyncState = usageSyncCode
      ? "loading"
      : "local";

    if (
      usageOverlay.style.display ===
      "flex"
    ) {
      void refreshUsagePanel();
    } else if (usageSyncCode) {
      void importLocalUsageOnce().catch(
        () => {}
      );
    }
  }
);

void initializeUsageSync();

function readUsageStore() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(
        usageStorageKey
      ) || "null"
    );

    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.days &&
      typeof parsed.days === "object"
    ) {
      return parsed;
    }
  } catch (error) {
    console.warn(
      "PauseSpeak kullanım kaydı okunamadı:",
      error
    );
  }

  return {
    version: 1,
    days: {}
  };
}

function saveUsageStore(store) {
  try {
    const retainedDays =
      Object.keys(store.days)
        .sort()
        .slice(-90);

    store.days =
      Object.fromEntries(
        retainedDays.map(
          (date) => [
            date,
            store.days[date]
          ]
        )
      );

    window.localStorage.setItem(
      usageStorageKey,
      JSON.stringify(store)
    );
  } catch (error) {
    console.warn(
      "PauseSpeak kullanım kaydı yazılamadı:",
      error
    );
  }
}

function addUsageRecord(
  operations,
  operation,
  model,
  updates
) {
  const current =
    operations[operation] || {
      model: model || "-",
      requests: 0,
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      retryCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      ttsCharacters: 0,
      ttsSeconds: 0,
      estimatedUsd: 0
    };

  if (model) {
    current.model = model;
  }

  [
    "requests",
    "inputTokens",
    "cachedInputTokens",
    "cacheWriteTokens",
    "outputTokens",
    "reasoningTokens",
    "retryCount",
    "cacheHits",
    "cacheMisses",
    "errorCount",
    "ttsCharacters",
    "ttsSeconds",
    "estimatedUsd"
  ].forEach((key) => {
    current[key] =
      (Number(current[key]) || 0) +
      (Number(updates?.[key]) || 0);
  });

  operations[operation] = current;
}

function updateUsageRecord(
  operation,
  model,
  updates
) {
  const store = readUsageStore();
  const date = getLocalUsageDate();

  if (!store.days[date]) {
    store.days[date] = {
      operations: {}
    };
  }

  const operations =
    store.days[date].operations || {};

  store.days[date].operations =
    operations;

  addUsageRecord(
    operations,
    operation,
    model,
    updates
  );

  if (
    store.activeCounter &&
    typeof store.activeCounter ===
      "object"
  ) {
    const counterOperations =
      store.activeCounter.operations &&
      typeof store.activeCounter
        .operations === "object"
        ? store.activeCounter.operations
        : {};

    store.activeCounter.operations =
      counterOperations;

    addUsageRecord(
      counterOperations,
      operation,
      model,
      updates
    );
  }

  saveUsageStore(store);

  synchronizedUsageStore = null;

  if (
    usageOverlay.style.display ===
    "flex"
  ) {
    if (usageSyncCode) {
      void refreshUsagePanel();
    } else {
      renderUsagePanel();
    }
  }
}

function recordTextUsage(
  operation,
  model,
  usage
) {
  const requests =
    Number(usage?.requests) || 0;

  if (requests <= 0) {
    return;
  }

  const inputTokens =
    Number(usage?.inputTokens) || 0;
  const cachedInputTokens =
    Math.min(
      inputTokens,
      Number(
        usage?.cachedInputTokens
      ) || 0
    );
  const cacheWriteTokens =
    Math.max(
      0,
      Math.min(
        Math.max(
          0,
          inputTokens -
            cachedInputTokens
        ),
        Number(
          usage?.cacheWriteTokens
        ) || 0
      )
    );
  const regularInputTokens =
    Math.max(
      0,
      inputTokens -
        cachedInputTokens -
        cacheWriteTokens
    );
  const outputTokens =
    Number(usage?.outputTokens) || 0;
  const prices =
    usageModelPrices[model];

  let estimatedUsd = 0;

  if (prices) {
    estimatedUsd = (
      regularInputTokens *
        prices.input +
      cachedInputTokens *
        prices.cachedInput +
      cacheWriteTokens *
        prices.cacheWriteInput +
      outputTokens * prices.output
    ) / 1000000;
  }

  updateUsageRecord(
    operation,
    model,
    {
      requests,
      inputTokens,
      cachedInputTokens,
      cacheWriteTokens,
      outputTokens,
      reasoningTokens:
        Number(
          usage?.reasoningTokens
        ) || 0,
      retryCount:
        Number(
          usage?.retryCount
        ) || 0,
      cacheHits:
        Number(
          usage?.cacheHits
        ) || 0,
      cacheMisses:
        Number(
          usage?.cacheMisses
        ) || 0,
      errorCount:
        Number(
          usage?.errorCount
        ) || 0,
      estimatedUsd
    }
  );
}

function recordTtsRequest(
  operation,
  text
) {
  const characters =
    String(text || "").length;

  updateUsageRecord(
    operation,
    "gpt-4o-mini-tts",
    {
      requests: 1,
      ttsCharacters: characters,
      estimatedUsd:
        (
          characters / 4 * 0.6
        ) / 1000000
    }
  );
}

function recordTtsDuration(
  operation,
  seconds,
  synchronizedEventId = ""
) {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return;
  }

  updateUsageRecord(
    operation,
    "gpt-4o-mini-tts",
    {
      ttsSeconds: seconds,
      estimatedUsd:
        seconds * 0.0144 / 60
    }
  );

  void syncTtsDuration(
    synchronizedEventId,
    seconds
  );
}

function formatUsageNumber(value) {
  return new Intl.NumberFormat(
    "tr-TR"
  ).format(
    Math.round(Number(value) || 0)
  );
}

function formatUsageCost(value) {
  const cost = Number(value) || 0;

  if (cost > 0 && cost < 0.0001) {
    return "< $0,0001";
  }

  return `$${cost.toFixed(4)}`
    .replace(".", ",");
}

async function startNewUsageCounter() {
  const confirmed = window.confirm(
    "Yeni karşılaştırma sayacı 0'dan başlasın mı? Bugünkü ve önceki günlerdeki toplamlar silinmeyecek."
  );

  if (!confirmed) {
    return;
  }

  if (usageSyncCode) {
    usageCounterButton.disabled = true;

    try {
      const response = await fetch(
        usageCounterApiUrl,
        {
          method: "POST",
          headers: getUsageSyncHeaders(),
          body: "{}"
        }
      );
      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Ortak sayaç başlatılamadı."
        );
      }

      const store = readUsageStore();

      store.activeCounter = {
        startedAt: data.startedAt,
        operations: {}
      };

      saveUsageStore(store);
      await refreshUsagePanel();
    } catch (error) {
      window.alert(
        error?.message ||
        "Ortak sayaç başlatılamadı."
      );
    } finally {
      usageCounterButton.disabled = false;
    }

    return;
  }

  const store = readUsageStore();

  store.activeCounter = {
    startedAt:
      new Date().toISOString(),
    operations: {}
  };

  saveUsageStore(store);
  renderUsagePanel();
}

function createUsageCell(
  tagName,
  textValue,
  align = "left"
) {
  const cell =
    document.createElement(tagName);

  cell.textContent = textValue;

  Object.assign(
    cell.style,
    {
      padding: "9px 8px",
      borderBottom:
        "1px solid rgba(255, 255, 255, 0.10)",
      textAlign: align,
      verticalAlign: "top",
      whiteSpace: "nowrap"
    }
  );

  return cell;
}

function appendUsageTable(
  records
) {
  const wrapper =
    document.createElement("div");

  wrapper.style.overflowX = "auto";

  const table =
    document.createElement("table");

  Object.assign(
    table.style,
    {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "13px"
    }
  );

  const headerRow =
    document.createElement("tr");

  [
    "İşlem",
    "Model",
    "İstek ↓",
    "Kullanım",
    "Tahmini"
  ].forEach((label, index) => {
    headerRow.appendChild(
      createUsageCell(
        "th",
        label,
        index >= 2 ? "right" : "left"
      )
    );
  });

  table.appendChild(headerRow);

  records.forEach(
    ([operation, record]) => {
      const row =
        document.createElement("tr");
      const isTts =
        operation.startsWith("tts_");
      const usageText = isTts
        ? `${formatUsageNumber(
            record.ttsCharacters
          )} karakter / ${(
            Number(record.ttsSeconds) ||
            0
          ).toFixed(1)} sn`
        : `${formatUsageNumber(
            record.inputTokens
          )} giriş (${formatUsageNumber(
            record.cachedInputTokens
          )} önbellek, ${formatUsageNumber(
            record.cacheWriteTokens
          )} yazım) / ${formatUsageNumber(
            record.outputTokens
          )} çıkış`;

      row.appendChild(
        createUsageCell(
          "td",
          usageOperationLabels[
            operation
          ] || operation
        )
      );
      row.appendChild(
        createUsageCell(
          "td",
          record.model || "-"
        )
      );
      row.appendChild(
        createUsageCell(
          "td",
          formatUsageNumber(
            record.requests
          ),
          "right"
        )
      );
      row.appendChild(
        createUsageCell(
          "td",
          usageText,
          "right"
        )
      );
      row.appendChild(
        createUsageCell(
          "td",
          formatUsageCost(
            record.estimatedUsd
          ),
          "right"
        )
      );

      table.appendChild(row);
    }
  );

  wrapper.appendChild(table);
  usageContent.appendChild(wrapper);
}

function getSortedUsageRecords(
  operations
) {
  return Object.entries(
    operations || {}
  )
    .filter(
      ([, record]) =>
        Number(record?.requests) > 0
    )
    .sort(
      (
        [firstOperation, firstRecord],
        [secondOperation, secondRecord]
      ) => {
        const requestDifference =
          (
            Number(
              secondRecord.requests
            ) || 0
          ) -
          (
            Number(
              firstRecord.requests
            ) || 0
          );

        if (requestDifference !== 0) {
          return requestDifference;
        }

        const firstLabel =
          usageOperationLabels[
            firstOperation
          ] || firstOperation;
        const secondLabel =
          usageOperationLabels[
            secondOperation
          ] || secondOperation;

        return firstLabel.localeCompare(
          secondLabel,
          "tr"
        );
      }
    );
}

function renderUsagePanel() {
  const store =
    synchronizedUsageStore ||
    readUsageStore();
  const today = getLocalUsageDate();
  const operations =
    store.days[today]?.operations || {};
  const records =
    getSortedUsageRecords(
      operations
    );

  usageContent.replaceChildren();

  const syncStatus =
    document.createElement("div");

  if (!usageSyncCode) {
    syncStatus.textContent =
      "Bu cihazın yerel kaydı gösteriliyor. Ortak sayaç için uzantı penceresinde bir senkronizasyon kodu oluştur.";
  } else if (
    usageSyncState === "loading"
  ) {
    syncStatus.textContent =
      "Bilgisayar ve tablet kullanımı eşitleniyor...";
  } else if (
    usageSyncState === "synced"
  ) {
    syncStatus.textContent =
      "Ortak sayaç güncel · Bilgisayar ve tablet birlikte";
  } else {
    syncStatus.textContent =
      `Ortak sayaca ulaşılamadı; bu cihazın yerel kaydı gösteriliyor. ${usageSyncError}`;
  }

  Object.assign(
    syncStatus.style,
    {
      marginBottom: "14px",
      padding: "10px 12px",
      borderRadius: "9px",
      backgroundColor:
        usageSyncState === "synced"
          ? "rgba(34, 197, 94, 0.14)"
          : usageSyncState === "error"
            ? "rgba(239, 68, 68, 0.14)"
            : "rgba(59, 130, 246, 0.12)",
      color:
        usageSyncState === "synced"
          ? "#bbf7d0"
          : usageSyncState === "error"
            ? "#fecaca"
            : "#bfdbfe",
      fontSize: "12px",
      lineHeight: "1.45"
    }
  );

  usageContent.appendChild(syncStatus);

  const todayTitle =
    document.createElement("div");

  todayTitle.textContent =
    `Bugün · ${today}`;

  Object.assign(
    todayTitle.style,
    {
      marginBottom: "10px",
      color: "#93c5fd",
      fontSize: "16px",
      fontWeight: "700"
    }
  );

  usageContent.appendChild(todayTitle);

  if (records.length > 0) {
    appendUsageTable(records);
  } else {
    const empty =
      document.createElement("div");

    empty.textContent =
      "Bugün henüz kaydedilmiş API kullanımı yok.";
    empty.style.padding = "16px 0";
    empty.style.color = "#d1d5db";

    usageContent.appendChild(empty);
  }

  const counterTitle =
    document.createElement("div");

  counterTitle.textContent =
    "Yeni sayaçtan beri";

  Object.assign(
    counterTitle.style,
    {
      marginTop: "22px",
      marginBottom: "8px",
      color: "#93c5fd",
      fontSize: "16px",
      fontWeight: "700"
    }
  );

  usageContent.appendChild(
    counterTitle
  );

  const activeCounter =
    store.activeCounter;

  if (
    activeCounter &&
    typeof activeCounter === "object"
  ) {
    const counterRecords =
      getSortedUsageRecords(
        activeCounter.operations || {}
      );
    const counterRequests =
      counterRecords.reduce(
        (total, [, record]) =>
          total +
          (Number(record.requests) || 0),
        0
      );
    const counterCost =
      counterRecords.reduce(
        (total, [, record]) =>
          total +
          (
            Number(
              record.estimatedUsd
            ) || 0
          ),
        0
      );
    const startedAt =
      new Date(activeCounter.startedAt);
    const startedAtText =
      Number.isNaN(startedAt.getTime())
        ? "Başlangıç zamanı bilinmiyor"
        : `Başlangıç: ${startedAt
            .toLocaleString("tr-TR")}`;
    const counterSummary =
      document.createElement("div");

    counterSummary.textContent =
      `${startedAtText} · ` +
      `${formatUsageNumber(
        counterRequests
      )} istek · ` +
      formatUsageCost(counterCost);

    Object.assign(
      counterSummary.style,
      {
        marginBottom: "10px",
        color: "#d1d5db",
        fontSize: "13px"
      }
    );

    usageContent.appendChild(
      counterSummary
    );

    if (counterRecords.length > 0) {
      appendUsageTable(
        counterRecords
      );
    } else {
      const counterEmpty =
        document.createElement("div");

      counterEmpty.textContent =
        "Sayaç başladı. Bu andan sonraki API kullanımları burada görünecek.";
      counterEmpty.style.padding =
        "10px 0";
      counterEmpty.style.color =
        "#d1d5db";

      usageContent.appendChild(
        counterEmpty
      );
    }
  } else {
    const counterEmpty =
      document.createElement("div");

    counterEmpty.textContent =
      "Karşılaştırma için Yeni Sayaç Başlat düğmesine bas. Günlük ve haftalık toplamlar korunur.";
    counterEmpty.style.padding =
      "10px 0";
    counterEmpty.style.color =
      "#d1d5db";

    usageContent.appendChild(
      counterEmpty
    );
  }

  const weekTitle =
    document.createElement("div");

  weekTitle.textContent =
    "Son 7 gün";

  Object.assign(
    weekTitle.style,
    {
      marginTop: "22px",
      marginBottom: "8px",
      color: "#93c5fd",
      fontSize: "16px",
      fontWeight: "700"
    }
  );

  usageContent.appendChild(weekTitle);

  const weekList =
    document.createElement("div");

  for (
    let offset = 0;
    offset < 7;
    offset += 1
  ) {
    const date = new Date();
    date.setDate(
      date.getDate() - offset
    );

    const dateKey =
      getLocalUsageDate(date);
    const dayOperations =
      store.days[dateKey]
        ?.operations || {};
    const dayRecords =
      Object.values(dayOperations);
    const requests =
      dayRecords.reduce(
        (total, record) =>
          total +
          (Number(record.requests) || 0),
        0
      );
    const estimatedUsd =
      dayRecords.reduce(
        (total, record) =>
          total +
          (
            Number(
              record.estimatedUsd
            ) || 0
          ),
        0
      );

    const row =
      document.createElement("div");

    Object.assign(
      row.style,
      {
        display: "grid",
        gridTemplateColumns:
          "1fr auto auto",
        gap: "16px",
        padding: "8px 0",
        borderBottom:
          "1px solid rgba(255, 255, 255, 0.08)",
        fontSize: "13px"
      }
    );

    [
      dateKey,
      `${formatUsageNumber(
        requests
      )} istek`,
      formatUsageCost(
        estimatedUsd
      )
    ].forEach((textValue) => {
      const item =
        document.createElement("div");

      item.textContent = textValue;
      row.appendChild(item);
    });

    weekList.appendChild(row);
  }

  usageContent.appendChild(weekList);

  const note =
    document.createElement("div");

  note.textContent =
    "Yeni sayaç yalnızca PauseSpeak içindeki karşılaştırma başlangıcını değiştirir; OpenAI kullanımını sıfırlamaz. Tahmini maliyet model fiyatları ve ses süresiyle hesaplanır. Kesin fatura tutarı için OpenAI Usage ekranını kullan.";

  Object.assign(
    note.style,
    {
      marginTop: "16px",
      padding: "12px",
      borderRadius: "10px",
      backgroundColor:
        "rgba(59, 130, 246, 0.12)",
      color: "#bfdbfe",
      fontSize: "12px",
      lineHeight: "1.45"
    }
  );

  usageContent.appendChild(note);
}

function normalizeTranscriptText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIncomingSubtitleTrack(
  track
) {
  if (
    !track ||
    typeof track.trackId !== "string" ||
    !Array.isArray(track.cues)
  ) {
    return null;
  }

  const cues = track.cues
    .map((cue, sourceIndex) => {
      const text = normalizeTranscriptText(
        cue?.text
      );

      return {
        id:
          String(cue?.id || "") ||
          `cue-${Math.round(
            Number(cue?.startTimeMs)
          )}-${Math.round(
            Number(cue?.endTimeMs)
          )}-${sourceIndex}`,
        startTimeMs: Math.round(
          Number(cue?.startTimeMs)
        ),
        endTimeMs: Math.round(
          Number(cue?.endTimeMs)
        ),
        sourceOrder: Number.isFinite(
          Number(cue?.sourceOrder)
        )
          ? Math.round(
              Number(cue.sourceOrder)
            )
          : sourceIndex,
        sourceKind:
          String(cue?.sourceKind || ""),
        regionId:
          String(cue?.regionId || ""),
        laneKey:
          String(
            cue?.laneKey ||
              cue?.regionId ||
              "default"
          ),
        styleId:
          String(cue?.styleId || ""),
        cueSettings:
          String(cue?.cueSettings || ""),
        visualX:
          cue?.visualX !== null &&
          cue?.visualX !== "" &&
          Number.isFinite(
            Number(cue?.visualX)
          )
          ? Number(cue.visualX)
          : null,
        visualY:
          cue?.visualY !== null &&
          cue?.visualY !== "" &&
          Number.isFinite(
            Number(cue?.visualY)
          )
          ? Number(cue.visualY)
          : null,
        lines: Array.isArray(cue?.lines)
          ? cue.lines
              .map(
                normalizeTranscriptText
              )
              .filter(Boolean)
              .slice(0, 20)
          : [text],
        text
      };
    })
    .filter(
      (cue) =>
        Number.isFinite(
          cue.startTimeMs
        ) &&
        Number.isFinite(
          cue.endTimeMs
        ) &&
        cue.startTimeMs >= 0 &&
        cue.endTimeMs >
          cue.startTimeMs &&
        cue.text
    )
    .sort(
      (first, second) =>
        first.startTimeMs -
          second.startTimeMs ||
        (
          Number.isFinite(first.visualY) &&
          Number.isFinite(second.visualY)
            ? first.visualY - second.visualY
            : 0
        ) ||
        (
          Number.isFinite(first.visualX) &&
          Number.isFinite(second.visualX)
            ? first.visualX - second.visualX
            : 0
        ) ||
        first.sourceOrder -
          second.sourceOrder ||
        first.endTimeMs -
          second.endTimeMs
    )
    .slice(0, 10000);

  if (cues.length < 2) {
    return null;
  }

  return {
    trackId: track.trackId,
    language:
      normalizeTranscriptText(
        track.language
      ),
    format:
      normalizeTranscriptText(
        track.format
      ),
    parserVersion:
      normalizeTranscriptText(
        track.parserVersion
      ),
    sourcePath:
      normalizeTranscriptText(
        track.sourcePath
      ),
    cues
  };
}

function findLastTranscriptCueStartIndex(
  cues,
  timeMs
) {
  if (
    !Array.isArray(cues) ||
    cues.length === 0 ||
    !Number.isFinite(timeMs)
  ) {
    return -1;
  }

  let low = 0;
  let high = cues.length - 1;
  let candidate = -1;

  while (low <= high) {
    const middle = Math.floor(
      (low + high) / 2
    );

    if (
      cues[middle].startTimeMs <=
      timeMs + 250
    ) {
      candidate = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return candidate;
}

function getActiveTranscriptCues(
  cues,
  timeMs
) {
  const lastStartedIndex =
    findLastTranscriptCueStartIndex(
      cues,
      timeMs
    );

  if (lastStartedIndex < 0) {
    return [];
  }

  const activeCues = [];
  const minimumIndex = Math.max(
    0,
    lastStartedIndex - 79
  );
  const activeGroupStartTimeMs = Number(
    cues[lastStartedIndex]?.startTimeMs
  );

  for (
    let index = lastStartedIndex;
    index >= minimumIndex;
    index -= 1
  ) {
    const cue = cues[index];
    const cueStartTimeMs = Number(
      cue?.startTimeMs
    );

    if (
      cueStartTimeMs <
      activeGroupStartTimeMs - 50
    ) {
      break;
    }

    if (
      timeMs <=
      Number(cue?.endTimeMs) + 600
    ) {
      activeCues.push({ cue, index });
    }
  }

  return activeCues.reverse();
}

function findTranscriptCueIndex(
  cues,
  timeMs
) {
  const activeCues =
    getActiveTranscriptCues(
      cues,
      timeMs
    );

  return activeCues.length > 0
    ? activeCues[activeCues.length - 1]
        .index
    : -1;
}

function getActiveSubtitleTrack() {
  return activeSubtitleTrackId
    ? capturedSubtitleTracks.get(
        activeSubtitleTrackId
      ) || null
    : null;
}

function chooseBestSubtitleTrack(
  visibleText = currentSubtitle
) {
  if (capturedSubtitleTracks.size === 0) {
    activeSubtitleTrackId = "";
    return null;
  }

  const video = getNetflixVideo();
  const timeMs = video
    ? Number(video.currentTime) * 1000
    : 0;
  const normalizedVisible =
    normalizeSpeechText(
      visibleText
    );
  let bestTrack = null;
  let bestScore = -Infinity;

  for (const track of
    capturedSubtitleTracks.values()) {
    let score = Math.min(
      track.cues.length / 1000,
      3
    );

    if (
      /^(?:en|eng)(?:[-_]|$)/i.test(
        track.language
      ) ||
      /english/i.test(track.language)
    ) {
      score += 5;
    }

    if (!/asr/i.test(track.format)) {
      score += 1;
    }

    const cueIndex =
      findTranscriptCueIndex(
        track.cues,
        timeMs
      );

    if (
      cueIndex >= 0 &&
      normalizedVisible
    ) {
      const cueText = normalizeSpeechText(
        track.cues[cueIndex].text
      );

      if (
        cueText === normalizedVisible
      ) {
        score += 20;
      } else if (
        cueText.includes(
          normalizedVisible
        ) ||
        normalizedVisible.includes(
          cueText
        )
      ) {
        score += 12;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestTrack = track;
    }
  }

  if (bestTrack) {
    activeSubtitleTrackId =
      bestTrack.trackId;
  }

  return bestTrack;
}

function getTranscriptCues() {
  const track =
    getActiveSubtitleTrack() ||
    chooseBestSubtitleTrack();

  if (track) {
    return {
      source: "captured_track",
      track,
      cues: track.cues
    };
  }

  return {
    source: "visible_fallback",
    track: null,
    cues: visibleSubtitleCues
  };
}

function buildCaptionTimelineData(cues) {
  if (!Array.isArray(cues)) {
    return {
      blocks: [],
      events: [],
      sentences: []
    };
  }

  const blocks = cues
    .map((cue, sourceIndex) => {
      const displayText =
        normalizeTranscriptText(
          cue?.text
        );
      const startTimeMs = Number(
        cue?.startTimeMs
      );
      const endTimeMs = Number(
        cue?.endTimeMs
      );

      if (
        !displayText ||
        !Number.isFinite(startTimeMs) ||
        !Number.isFinite(endTimeMs) ||
        endTimeMs <= startTimeMs
      ) {
        return null;
      }

      const visualX =
        cue?.visualX !== null &&
        cue?.visualX !== ""
          ? Number(cue?.visualX)
          : null;
      const visualY =
        cue?.visualY !== null &&
        cue?.visualY !== ""
          ? Number(cue?.visualY)
          : null;

      return {
        id:
          String(cue?.id || "") ||
          `block-${Math.round(
            startTimeMs
          )}-${Math.round(
            endTimeMs
          )}-${sourceIndex}`,
        startTimeMs,
        endTimeMs,
        displayText,
        text: displayText,
        lines: Array.isArray(cue?.lines)
          ? cue.lines
              .map(
                normalizeTranscriptText
              )
              .filter(Boolean)
          : [displayText],
        sourceOrder: Number.isFinite(
          Number(cue?.sourceOrder)
        )
          ? Number(cue.sourceOrder)
          : sourceIndex,
        sourceKind:
          String(cue?.sourceKind || ""),
        regionId:
          String(cue?.regionId || ""),
        laneKey:
          String(
            cue?.laneKey ||
              cue?.regionId ||
              "default"
          ),
        styleId:
          String(cue?.styleId || ""),
        cueSettings:
          String(cue?.cueSettings || ""),
        visualX:
          Number.isFinite(visualX)
            ? visualX
            : null,
        visualY:
          Number.isFinite(visualY)
            ? visualY
            : null
      };
    })
    .filter(Boolean)
    .sort(
      (first, second) =>
        first.startTimeMs -
          second.startTimeMs ||
        (
          Number.isFinite(first.visualY) &&
          Number.isFinite(second.visualY)
            ? first.visualY - second.visualY
            : 0
        ) ||
        (
          Number.isFinite(first.visualX) &&
          Number.isFinite(second.visualX)
            ? first.visualX - second.visualX
            : 0
        ) ||
        first.sourceOrder -
          second.sourceOrder ||
        first.endTimeMs -
          second.endTimeMs
    );

  const eventDrafts = [];

  for (const block of blocks) {
    let eventDraft = null;

    for (
      let index =
        eventDrafts.length - 1;
      index >= 0 &&
        index >=
          eventDrafts.length - 8;
      index -= 1
    ) {
      const candidate =
        eventDrafts[index];

      if (
        candidate.laneKey ===
          block.laneKey &&
        Math.abs(
          candidate.anchorStartTimeMs -
            block.startTimeMs
        ) <= 80 &&
        Math.abs(
          candidate.anchorEndTimeMs -
            block.endTimeMs
        ) <= 250
      ) {
        eventDraft = candidate;
        break;
      }
    }

    if (!eventDraft) {
      eventDraft = {
        laneKey: block.laneKey,
        anchorStartTimeMs:
          block.startTimeMs,
        anchorEndTimeMs:
          block.endTimeMs,
        blocks: []
      };
      eventDrafts.push(eventDraft);
    }

    eventDraft.blocks.push(block);
  }

  const events = eventDrafts
    .map((draft, eventIndex) => {
      const orderedBlocks = [
        ...draft.blocks
      ].sort(
        (first, second) =>
          (
            Number.isFinite(
              first.visualY
            ) &&
            Number.isFinite(
              second.visualY
            )
              ? first.visualY -
                second.visualY
              : 0
          ) ||
          (
            Number.isFinite(
              first.visualX
            ) &&
            Number.isFinite(
              second.visualX
            )
              ? first.visualX -
                second.visualX
              : 0
          ) ||
          first.sourceOrder -
            second.sourceOrder
      );
      const layoutPositions =
        orderedBlocks
          .filter(
            (block) =>
              Number.isFinite(
                block.visualY
              )
          )
          .map(
            (block) =>
              `${block.visualY}:${
                Number.isFinite(
                  block.visualX
                )
                  ? block.visualX
                  : ""
              }`
          );
      const hasLayoutOrder =
        orderedBlocks.length === 1 ||
        (
          layoutPositions.length ===
            orderedBlocks.length &&
          new Set(layoutPositions).size ===
            orderedBlocks.length
        );
      const displayText =
        orderedBlocks.reduce(
          (combinedText, block) =>
            mergeOverlappingSubtitleText(
              combinedText,
              block.displayText
            ),
          ""
        );

      return {
        id:
          `event-${Math.round(
            Math.min(
              ...orderedBlocks.map(
                (block) =>
                  block.startTimeMs
              )
            )
          )}-${eventIndex}`,
        laneKey: draft.laneKey,
        startTimeMs: Math.min(
          ...orderedBlocks.map(
            (block) =>
              block.startTimeMs
          )
        ),
        endTimeMs: Math.max(
          ...orderedBlocks.map(
            (block) =>
              block.endTimeMs
          )
        ),
        displayText,
        text: displayText,
        blockIds: orderedBlocks.map(
          (block) => block.id
        ),
        sourceOrders:
          orderedBlocks.map(
            (block) =>
              block.sourceOrder
          ),
        orderEvidence:
          orderedBlocks.length === 1
            ? "single-block"
            : hasLayoutOrder
              ? "layout"
              : "ambiguous-source-order",
        reliableOrder: hasLayoutOrder
      };
    })
    .sort(
      (first, second) =>
        first.startTimeMs -
          second.startTimeMs ||
        first.endTimeMs -
          second.endTimeMs
    );

  const sentences = [];
  const draftsByLane = new Map();

  const flushDraft = (
    laneKey,
    boundaryReason = "ambiguous"
  ) => {
    const draft =
      draftsByLane.get(laneKey);

    if (!draft?.text) {
      draftsByLane.delete(laneKey);
      return;
    }

    const spokenText =
      removeSubtitleDescriptions(
        draft.text
      );
    const finalized =
      boundaryReason === "punctuation" &&
      endsSentence(spokenText);
    const hasReliableTiming =
      Number.isFinite(
        draft.startTimeMs
      ) &&
      Number.isFinite(
        draft.endTimeMs
      ) &&
      draft.endTimeMs >
        draft.startTimeMs;

    sentences.push({
      ...draft,
      displayText: draft.text,
      spokenText,
      finalized,
      pauseEligible:
        finalized &&
        Boolean(spokenText) &&
        hasReliableTiming &&
        draft.reliableOrder,
      boundaryReason
    });
    draftsByLane.delete(laneKey);
  };

  for (const event of events) {
    const laneKey = event.laneKey;
    const eventText = event.displayText;
    const speakerLead = eventText.match(
      /^([\p{Lu}\d][\p{Lu}\p{N} .'-]{0,30}:)(?:\s|$)/u
    );
    const existingDraft =
      draftsByLane.get(laneKey);

    if (
      existingDraft &&
      speakerLead
    ) {
      flushDraft(
        laneKey,
        "speaker-change"
      );
    } else if (
      existingDraft &&
      event.startTimeMs >
        existingDraft.endTimeMs + 1800
    ) {
      flushDraft(laneKey, "gap");
    }

    let draft =
      draftsByLane.get(laneKey);

    if (!draft) {
      draft = {
        laneKey,
        startTimeMs:
          event.startTimeMs,
        endTimeMs: event.endTimeMs,
        text: "",
        eventIds: [],
        blockIds: [],
        orderEvidence: [],
        reliableOrder: true
      };
      draftsByLane.set(
        laneKey,
        draft
      );
    }

    draft.text =
      mergeOverlappingSubtitleText(
        draft.text,
        eventText
      );
    draft.endTimeMs = Math.max(
      draft.endTimeMs,
      event.endTimeMs
    );
    draft.eventIds.push(event.id);
    draft.blockIds.push(
      ...event.blockIds
    );
    draft.orderEvidence.push(
      event.orderEvidence
    );
    draft.reliableOrder =
      draft.reliableOrder &&
      event.reliableOrder;

    const spokenEventText =
      removeSubtitleDescriptions(
        eventText
      );

    if (endsSentence(spokenEventText)) {
      const hasTrailingEllipsis =
        /(?:\.{2,}|…)["'’”)\]]*$/.test(
          spokenEventText
        );

      flushDraft(
        laneKey,
        hasTrailingEllipsis
          ? "ambiguous"
          : "punctuation"
      );
    }
  }

  for (const laneKey of [
    ...draftsByLane.keys()
  ]) {
    flushDraft(laneKey, "track-end");
  }

  sentences.sort(
    (first, second) =>
      first.startTimeMs -
        second.startTimeMs ||
      first.endTimeMs -
        second.endTimeMs
  );

  sentences.forEach(
    (sentence, sentenceIndex) => {
      sentence.id =
        `sentence-${Math.round(
          sentence.startTimeMs
        )}-${Math.round(
          sentence.endTimeMs
        )}-${sentenceIndex}`;
    }
  );

  return {
    blocks,
    events,
    sentences
  };
}

function groupTranscriptCuesIntoSentences(
  cues
) {
  return buildCaptionTimelineData(
    cues
  ).sentences;
}

function buildSentencePauseTimeline(
  track
) {
  if (!track?.trackId) {
    return [];
  }

  const sentences =
    groupTranscriptCuesIntoSentences(
      track.cues
    );

  return sentences
    .map((sentence) => {
      const nominalTimeMs =
        sentence.endTimeMs +
        sentencePauseConfig.subtitleOffsetMs;

      const effectiveTimeMs =
        nominalTimeMs -
        sentencePauseConfig.schedulerLeadMs;

      return {
        ...sentence,
        id:
          `${track.trackId}:${sentence.id}`,
        nominalTimeMs,
        effectiveTimeMs,
        pauseEligible:
          sentence.pauseEligible &&
          Number.isFinite(effectiveTimeMs) &&
          effectiveTimeMs >
            sentence.startTimeMs
      };
    })
    .filter(
      (sentence) =>
        sentence.pauseEligible
    );
}

function getSentencePauseTimelineKey(
  track
) {
  const cues = track?.cues || [];
  const lastCue =
    cues[cues.length - 1] || null;

  return [
    track?.trackId || "",
    cues.length,
    lastCue?.startTimeMs || 0,
    lastCue?.endTimeMs || 0,
    lastCue?.text || ""
  ].join("|");
}

function syncSentencePauseTimeline() {
  const transcript = getTranscriptCues();
  const track =
    transcript.source ===
    "captured_track"
      ? transcript.track
      : null;
  const nextTrackId =
    track?.trackId || "";

  if (
    nextTrackId !==
    sentencePauseController.trackId
  ) {
    sentencePauseController.trackId =
      nextTrackId;
    sentencePauseController.timelineKey =
      "";
    sentencePauseController.timeline = [];
    sentencePauseController.armed = null;
    sentencePauseController.lastMediaMs =
      null;
    sentencePauseController.settled.clear();
  }

  if (!track) {
    return;
  }

  const timelineKey =
    getSentencePauseTimelineKey(track);

  if (
    timelineKey ===
    sentencePauseController.timelineKey
  ) {
    return;
  }

  sentencePauseController.timelineKey =
    timelineKey;
  sentencePauseController.timeline =
    buildSentencePauseTimeline(track);
  sentencePauseController.armed = null;
}

function getReplayPauseBoundary() {
  if (
    !isReplayPlaybackActive ||
    completedStartTimeMs === null ||
    completedEndTimeMs === null
  ) {
    return null;
  }

  const startTimeMs = Number(
    completedStartTimeMs
  );
  const endTimeMs = Number(
    completedEndTimeMs
  );
  const spokenText = cleanText(
    completedBox.textContent
  );
  const effectiveTimeMs =
    endTimeMs -
    sentencePauseConfig.schedulerLeadMs;

  if (
    !spokenText ||
    !Number.isFinite(startTimeMs) ||
    !Number.isFinite(endTimeMs) ||
    endTimeMs <= startTimeMs ||
    effectiveTimeMs <= startTimeMs
  ) {
    return null;
  }

  return {
    id:
      `replay-${replayPauseGeneration}`,
    displayText: spokenText,
    spokenText,
    startTimeMs,
    endTimeMs,
    nominalTimeMs: endTimeMs,
    effectiveTimeMs,
    finalized: true,
    pauseEligible: true,
    boundaryReason: "punctuation"
  };
}

function getActiveSentencePauseTimeline() {
  const replayBoundary =
    getReplayPauseBoundary();

  if (replayBoundary) {
    return [replayBoundary];
  }

  return sentencePauseController.timeline;
}

function canMonitorSentencePause(video) {
  return Boolean(
    video &&
    (
      isReplayPlaybackActive ||
      sentencePauseController.timeline.length >
        0
    ) &&
    (
      isAutomaticPauseEnabled ||
      isReplayPlaybackActive
    ) &&
    !isReplayStarting &&
    !pronunciationCoachVideoPreview &&
    !isPrivacyCurtainActive
  );
}

function stopSentencePauseClock() {
  const callbackId =
    sentencePauseController.callbackId;
  const callbackKind =
    sentencePauseController.callbackKind;
  const video =
    sentencePauseController.video;

  sentencePauseController.callbackId =
    null;
  sentencePauseController.callbackKind =
    "";

  if (callbackId === null) {
    return;
  }

  if (
    callbackKind === "video-frame" &&
    typeof video?.cancelVideoFrameCallback ===
      "function"
  ) {
    video.cancelVideoFrameCallback(
      callbackId
    );
  } else if (
    callbackKind === "animation-frame"
  ) {
    window.cancelAnimationFrame(
      callbackId
    );
  }
}

function findNextSentencePauseBoundary(
  timeline,
  settled,
  nowMs,
  reason,
  config = sentencePauseConfig
) {
  for (const boundary of timeline) {
    if (settled.has(boundary.id)) {
      continue;
    }

    const effectiveTimeMs = Number(
      boundary.effectiveTimeMs
    );

    if (
      !Number.isFinite(effectiveTimeMs) ||
      effectiveTimeMs <= nowMs
    ) {
      settled.set(
        boundary.id,
        "missed"
      );
      continue;
    }

    if (
      reason === "seeked" &&
      effectiveTimeMs - nowMs <
        config.minArmLeadAfterSeekMs
    ) {
      settled.set(
        boundary.id,
        "missed"
      );
      continue;
    }

    return {
      boundary,
      effectiveTimeMs
    };
  }

  return null;
}

function crossedSentencePauseBoundary(
  lastMediaMs,
  nowMs,
  effectiveTimeMs
) {
  return (
    Number.isFinite(lastMediaMs) &&
    Number.isFinite(nowMs) &&
    Number.isFinite(effectiveTimeMs) &&
    lastMediaMs < effectiveTimeMs &&
    nowMs >= effectiveTimeMs
  );
}

function armNextSentencePause(
  nowMs,
  reason = "continuous"
) {
  sentencePauseController.armed = null;

  const timeline =
    getActiveSentencePauseTimeline();
  sentencePauseController.armed =
    findNextSentencePauseBoundary(
      timeline,
      sentencePauseController.settled,
      nowMs,
      reason
    );
}

function boundaryMatchesIndependentVisible(
  boundary
) {
  if (isReplayPlaybackActive) {
    return true;
  }

  if (
    !lastIndependentVisibleSubtitle ||
    Date.now() -
      lastIndependentVisibleSubtitleAt >
      1800
  ) {
    return true;
  }

  const boundaryText =
    normalizeSpeechText(
      boundary?.spokenText ||
        boundary?.displayText ||
        ""
    );
  const visibleText =
    normalizeSpeechText(
      lastIndependentVisibleSubtitle
    );

  return Boolean(
    boundaryText &&
    visibleText &&
    (
      boundaryText.includes(
        visibleText
      ) ||
      visibleText.includes(
        boundaryText
      )
    )
  );
}

function commitSentencePause(boundary) {
  const video =
    sentencePauseController.video;

  if (
    !video ||
    sentencePauseController.settled.has(
      boundary.id
    )
  ) {
    return;
  }

  if (
    !boundaryMatchesIndependentVisible(
      boundary
    )
  ) {
    sentencePauseController.settled.set(
      boundary.id,
      "visible-mismatch"
    );
    sentencePauseController.armed = null;
    status.textContent =
      "⚠️ Altyazı sırası doğrulanamadı — video durdurulmadı";
    return;
  }

  sentencePauseController.settled.set(
    boundary.id,
    "paused"
  );
  sentencePauseController.armed = null;
  stopSentencePauseClock();
  video.pause();
  finishSentence(
    video,
    boundary,
    true
  );
}

function tickSentencePauseClock(nowMs) {
  const video =
    sentencePauseController.video;

  if (
    !canMonitorSentencePause(video) ||
    video.paused ||
    video.seeking ||
    !Number.isFinite(nowMs)
  ) {
    return;
  }

  const lastMediaMs =
    sentencePauseController.lastMediaMs;

  if (
    lastMediaMs !== null &&
    nowMs + 50 < lastMediaMs
  ) {
    sentencePauseController.armed = null;
    sentencePauseController.lastMediaMs =
      nowMs;
    armNextSentencePause(nowMs, "seeked");
    return;
  }

  const armed =
    sentencePauseController.armed;

  if (
    armed &&
    crossedSentencePauseBoundary(
      lastMediaMs,
      nowMs,
      armed.effectiveTimeMs
    )
  ) {
    const latenessMs =
      nowMs - armed.effectiveTimeMs;

    if (
      latenessMs <=
      sentencePauseConfig.lateGraceMs
    ) {
      sentencePauseController.lastMediaMs =
        nowMs;
      commitSentencePause(
        armed.boundary
      );
      return;
    }

    sentencePauseController.settled.set(
      armed.boundary.id,
      "missed"
    );
    sentencePauseController.armed = null;
  }

  sentencePauseController.lastMediaMs =
    nowMs;

  if (!sentencePauseController.armed) {
    armNextSentencePause(
      nowMs,
      "continuous"
    );
  }
}

function scheduleSentencePauseClock() {
  const video =
    sentencePauseController.video;

  if (
    sentencePauseController.callbackId !==
      null ||
    !sentencePauseController.armed ||
    !canMonitorSentencePause(video) ||
    video.paused ||
    video.seeking
  ) {
    return;
  }

  const generation =
    sentencePauseController.generation;

  if (
    typeof video.requestVideoFrameCallback ===
    "function"
  ) {
    sentencePauseController.callbackKind =
      "video-frame";
    sentencePauseController.callbackId =
      video.requestVideoFrameCallback(
        (_now, metadata) => {
          sentencePauseController.callbackId =
            null;
          sentencePauseController.callbackKind =
            "";

          if (
            generation !==
              sentencePauseController.generation ||
            video !==
              sentencePauseController.video
          ) {
            return;
          }

          const mediaTimeMs =
            Number(metadata?.mediaTime) *
            1000;

          tickSentencePauseClock(
            Number.isFinite(mediaTimeMs)
              ? mediaTimeMs
              : Number(video.currentTime) *
                  1000
          );
          scheduleSentencePauseClock();
        }
      );
    return;
  }

  sentencePauseController.callbackKind =
    "animation-frame";
  sentencePauseController.callbackId =
    window.requestAnimationFrame(() => {
      sentencePauseController.callbackId =
        null;
      sentencePauseController.callbackKind =
        "";

      if (
        generation !==
          sentencePauseController.generation ||
        video !==
          sentencePauseController.video
      ) {
        return;
      }

      tickSentencePauseClock(
        Number(video.currentTime) * 1000
      );
      scheduleSentencePauseClock();
    });
}

function startSentencePauseClock(
  reason = "continuous"
) {
  const video =
    sentencePauseController.video;

  if (
    !canMonitorSentencePause(video) ||
    video.paused ||
    video.seeking
  ) {
    stopSentencePauseClock();
    return;
  }

  const nowMs =
    Number(video.currentTime) * 1000;

  if (!Number.isFinite(nowMs)) {
    return;
  }

  sentencePauseController.lastMediaMs =
    nowMs;

  if (!sentencePauseController.armed) {
    armNextSentencePause(nowMs, reason);
  }

  scheduleSentencePauseClock();
}

function resetSentencePauseController() {
  stopSentencePauseClock();

  if (
    sentencePauseController
      .eventAbortController
  ) {
    sentencePauseController
      .eventAbortController.abort();
  }

  sentencePauseController.video = null;
  sentencePauseController.trackId = "";
  sentencePauseController.timelineKey =
    "";
  sentencePauseController.timeline = [];
  sentencePauseController.armed = null;
  sentencePauseController.lastMediaMs =
    null;
  sentencePauseController.settled.clear();
  sentencePauseController.callbackId = null;
  sentencePauseController.callbackKind = "";
  sentencePauseController.eventAbortController =
    null;
  sentencePauseController.generation += 1;
}

function bindSentencePauseVideo(video) {
  if (
    sentencePauseController.video ===
    video
  ) {
    return;
  }

  resetSentencePauseController();

  if (!video) {
    return;
  }

  const eventAbortController =
    new AbortController();
  const eventOptions = {
    signal: eventAbortController.signal
  };

  sentencePauseController.video = video;
  sentencePauseController
    .eventAbortController =
    eventAbortController;

  video.addEventListener(
    "play",
    () => {
      syncSentencePauseTimeline();
      sentencePauseController.armed = null;
      startSentencePauseClock("play");
    },
    eventOptions
  );

  video.addEventListener(
    "pause",
    () => {
      stopSentencePauseClock();
    },
    eventOptions
  );

  video.addEventListener(
    "seeking",
    () => {
      stopSentencePauseClock();
      sentencePauseController.armed = null;
      sentencePauseController.lastMediaMs =
        null;
    },
    eventOptions
  );

  video.addEventListener(
    "seeked",
    () => {
      syncSentencePauseTimeline();
      sentencePauseController.armed = null;
      startSentencePauseClock("seeked");
    },
    eventOptions
  );

  video.addEventListener(
    "timeupdate",
    () => {
      tickSentencePauseClock(
        Number(video.currentTime) * 1000
      );
    },
    eventOptions
  );
}

function updateSentencePauseController(
  video
) {
  bindSentencePauseVideo(video);
  syncSentencePauseTimeline();

  if (
    !canMonitorSentencePause(video) ||
    video?.paused ||
    video?.seeking
  ) {
    stopSentencePauseClock();
    return;
  }

  if (!sentencePauseController.armed) {
    startSentencePauseClock(
      "continuous"
    );
  } else {
    scheduleSentencePauseClock();
  }
}

function collectTranscriptSentence(
  cues,
  startIndex
) {
  if (
    !Array.isArray(cues) ||
    startIndex < 0 ||
    startIndex >= cues.length
  ) {
    return null;
  }

  let sentence = "";
  const maximumCueCount = 40;

  for (
    let index = startIndex;
    index < cues.length &&
      index < startIndex + maximumCueCount;
    index += 1
  ) {
    const cueText =
      removeSubtitleDescriptions(
        cues[index]?.text
      );

    if (!cueText) {
      continue;
    }

    sentence =
      mergeOverlappingSubtitleText(
        sentence,
        cueText
      );

    if (endsSentence(cueText)) {
      return {
        text: cleanText(sentence),
        startIndex,
        endIndex: index,
        startTimeMs:
          Number(
            cues[startIndex]
              ?.startTimeMs
          ) || 0,
        endTimeMs:
          Number(
            cues[index]?.endTimeMs
          ) || 0
      };
    }
  }

  return null;
}

function findTranscriptSentenceStartIndex(
  cues,
  cueIndex
) {
  if (
    !Array.isArray(cues) ||
    cueIndex < 0 ||
    cueIndex >= cues.length
  ) {
    return -1;
  }

  let startIndex = cueIndex;
  const minimumStartIndex = Math.max(
    0,
    cueIndex - 40
  );

  while (
    startIndex > minimumStartIndex &&
    !endsSentence(
      removeSubtitleDescriptions(
        cues[startIndex - 1]?.text
      )
    )
  ) {
    startIndex -= 1;
  }

  return startIndex;
}

function collectNavigableTranscriptSentence(
  cues,
  startIndex
) {
  const completeSentence =
    collectTranscriptSentence(
      cues,
      startIndex
    );

  if (completeSentence) {
    return completeSentence;
  }

  if (
    !Array.isArray(cues) ||
    startIndex < 0 ||
    startIndex >= cues.length
  ) {
    return null;
  }

  let sentence = "";
  let endIndex = startIndex - 1;
  const maximumEndIndex = Math.min(
    cues.length - 1,
    startIndex + 39
  );

  for (
    let index = startIndex;
    index <= maximumEndIndex;
    index += 1
  ) {
    const cueText =
      removeSubtitleDescriptions(
        cues[index]?.text
      );

    if (!cueText) {
      continue;
    }

    sentence =
      mergeOverlappingSubtitleText(
        sentence,
        cueText
      );
    endIndex = index;
  }

  if (!sentence || endIndex < startIndex) {
    return null;
  }

  return {
    text: cleanText(sentence),
    startIndex,
    endIndex,
    startTimeMs:
      Number(
        cues[startIndex]?.startTimeMs
      ) || 0,
    endTimeMs:
      Number(
        cues[endIndex]?.endTimeMs
      ) || 0
  };
}

function getTranscriptSentenceAtTime(
  cues,
  timeMs
) {
  if (
    !Array.isArray(cues) ||
    cues.length === 0 ||
    !Number.isFinite(timeMs)
  ) {
    return null;
  }

  let cueIndex = findTranscriptCueIndex(
    cues,
    timeMs
  );

  if (cueIndex < 0) {
    cueIndex = cues.findIndex(
      (cue) =>
        Number(cue?.startTimeMs) >=
        timeMs - 300
    );
  }

  if (cueIndex < 0) {
    cueIndex = cues.length - 1;
  }

  const startIndex =
    findTranscriptSentenceStartIndex(
      cues,
      cueIndex
    );

  return collectNavigableTranscriptSentence(
    cues,
    startIndex
  );
}

function getAdjacentTranscriptSentence(
  cues,
  referenceTimeMs,
  direction
) {
  const normalizedDirection =
    direction < 0 ? -1 : 1;
  const currentSentence =
    getTranscriptSentenceAtTime(
      cues,
      referenceTimeMs
    );

  if (!currentSentence) {
    return null;
  }

  let targetStartIndex =
    currentSentence.endIndex + 1;

  if (normalizedDirection < 0) {
    const previousEndIndex =
      currentSentence.startIndex - 1;

    if (previousEndIndex < 0) {
      return null;
    }

    targetStartIndex =
      findTranscriptSentenceStartIndex(
        cues,
        previousEndIndex
      );
  }

  return collectNavigableTranscriptSentence(
    cues,
    targetStartIndex
  );
}

function getSentenceNavigationReferenceTimeMs(
  video
) {
  const currentTimeMs =
    Number(video?.currentTime) * 1000;
  const canUseCompletedSentence =
    Boolean(video?.paused) &&
    completedStartTimeMs !== null &&
    completedEndTimeMs !== null &&
    currentTimeMs >=
      completedStartTimeMs - 1000 &&
    currentTimeMs <=
      completedEndTimeMs + 2500;

  return canUseCompletedSentence
    ? completedStartTimeMs + 300
    : currentTimeMs;
}

function navigateToAdjacentSentence(
  direction
) {
  const video = getNetflixVideo();
  const cues = getTranscriptCues().cues;
  const normalizedDirection =
    direction < 0 ? -1 : 1;

  if (!video) {
    status.textContent =
      "Video bulunamadı";
    return false;
  }

  const referenceTimeMs =
    getSentenceNavigationReferenceTimeMs(
      video
    );
  const targetSentence =
    getAdjacentTranscriptSentence(
      cues,
      referenceTimeMs,
      normalizedDirection
    );

  if (!targetSentence) {
    if (
      normalizedDirection < 0 &&
      previousSentenceText &&
      previousSentenceStartTimeMs !== null
    ) {
      playStoredPreviousSentence();
      return true;
    }

    status.textContent =
      normalizedDirection < 0
        ? "Önceki cümle bulunamadı"
        : "Sonraki cümle bulunamadı";
    return false;
  }

  closeStudyMeaningPanel(false);
  stopSpeechRecognition();
  currentSubtitle = "";
  sentenceParts = [];
  sentenceStartTime = null;
  replayGuardUntilVideoTime = null;

  status.textContent =
    normalizedDirection < 0
      ? "◀ Önceki cümle oynatılıyor"
      : "Sonraki cümle oynatılıyor ▶";

  requestNetflixSeek(
    Math.max(
      0,
      targetSentence.startTimeMs - 150
    ),
    normalizedDirection < 0
      ? "Önceki cümleye gidiliyor…"
      : "Sonraki cümleye gidiliyor…"
  );
  showInterfaceControls();
  return true;
}

function getSentenceForTranslationPrefetch(
  video
) {
  const cues = getTranscriptCues().cues;

  if (!video || cues.length === 0) {
    return null;
  }

  const currentTimeMs =
    Number(video.currentTime) * 1000;
  let cueIndex = findTranscriptCueIndex(
    cues,
    currentTimeMs
  );

  if (cueIndex < 0) {
    cueIndex = cues.findIndex(
      (cue) =>
        cue.startTimeMs >=
        currentTimeMs - 250
    );
  }

  if (cueIndex < 0) {
    return null;
  }

  let startIndex = cueIndex;
  const minimumStartIndex = Math.max(
    0,
    cueIndex - 40
  );

  while (
    startIndex > minimumStartIndex &&
    !endsSentence(
      removeSubtitleDescriptions(
        cues[startIndex - 1]?.text
      )
    )
  ) {
    startIndex -= 1;
  }

  if (
    startIndex === minimumStartIndex &&
    startIndex > 0 &&
    !endsSentence(
      removeSubtitleDescriptions(
        cues[startIndex - 1]?.text
      )
    )
  ) {
    return null;
  }

  let sentence =
    collectTranscriptSentence(
      cues,
      startIndex
    );

  if (
    sentence &&
    completedEndTimeMs !== null &&
    sentence.endTimeMs <=
      completedEndTimeMs + 250
  ) {
    sentence =
      collectTranscriptSentence(
        cues,
        sentence.endIndex + 1
      );
  }

  return sentence?.text
    ? sentence
    : null;
}

function cancelSentenceTranslationPrefetch() {
  sentenceTranslationPrefetchRequestNumber +=
    1;

  if (
    sentenceTranslationPrefetchAbortController
  ) {
    sentenceTranslationPrefetchAbortController
      .abort();
  }

  sentenceTranslationPrefetchAbortController =
    null;
  sentenceTranslationPrefetchKey = "";
  sentenceTranslationPrefetchPromise = null;
}

async function prefetchNormalSentenceTranslation(
  sentence,
  previousText,
  requestNumber,
  signal
) {
  if (getCachedCueTranslation(sentence)) {
    return;
  }

  const response = await fetch(
    translationApiUrl,
    {
      method: "POST",
      headers: getUsageSyncHeaders(),
      body: JSON.stringify({
        text: sentence,
        previousText
      }),
      signal
    }
  );
  const data = await response.json();

  if (
    !response.ok ||
    !data?.success ||
    typeof data.translation !== "string"
  ) {
    throw new Error(
      data?.error ||
        "Ön çeviri alınamadı."
    );
  }

  recordTextUsage(
    "normal_translation",
    data.model,
    data.usage
  );

  if (
    requestNumber !==
      sentenceTranslationPrefetchRequestNumber
  ) {
    return;
  }

  cacheCueTranslation(
    sentence,
    data.translation
  );
}

function scheduleSentenceTranslationPrefetch(
  video = getNetflixVideo()
) {
  const sentence =
    getSentenceForTranslationPrefetch(
      video
    );

  if (!sentence) {
    return;
  }

  const normalizedSentence =
    cleanText(sentence.text);
  const prefetchKey =
    `normal:${normalizedSentence.toLocaleLowerCase("en-US")}`;

  if (
    prefetchKey ===
      sentenceTranslationPrefetchKey
  ) {
    return;
  }

  if (
    getCachedCueTranslation(
      normalizedSentence
    )
  ) {
    cancelSentenceTranslationPrefetch();
    sentenceTranslationPrefetchKey =
      prefetchKey;
    return;
  }

  cancelSentenceTranslationPrefetch();

  const requestNumber =
    sentenceTranslationPrefetchRequestNumber;
  const controller =
    new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    translationTimeoutMs
  );
  const completedText = cleanText(
    completedBox.textContent
  );
  const previousText =
    completedText ===
      "Henüz tamamlanan cümle yok."
      ? ""
      : completedText;

  sentenceTranslationPrefetchAbortController =
    controller;
  sentenceTranslationPrefetchKey =
    prefetchKey;

  const prefetchWork =
    prefetchNormalSentenceTranslation(
      normalizedSentence,
      previousText,
      requestNumber,
      controller.signal
    );

  sentenceTranslationPrefetchPromise =
    prefetchWork
      .catch((error) => {
        if (
          error.name !== "AbortError" &&
          requestNumber ===
            sentenceTranslationPrefetchRequestNumber
        ) {
          console.debug(
            "PauseSpeak sıradaki cümle ön çevirisi hazırlanamadı.",
            error
          );
          sentenceTranslationPrefetchKey =
            "";
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);

        if (
          sentenceTranslationPrefetchAbortController ===
            controller
        ) {
          sentenceTranslationPrefetchAbortController =
            null;
        }
      });
}

function formatTranscriptTime(
  timeMs
) {
  const totalSeconds = Math.max(
    0,
    Math.floor(Number(timeMs) / 1000)
  );
  const hours = Math.floor(
    totalSeconds / 3600
  );
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [
      hours,
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0")
    ].join(":");
  }

  return `${minutes}:${String(
    seconds
  ).padStart(2, "0")}`;
}

function formatExportTime(
  timeMs,
  format
) {
  const safeTimeMs = Math.max(
    0,
    Math.round(Number(timeMs) || 0)
  );
  const hours = Math.floor(
    safeTimeMs / 3600000
  );
  const minutes = Math.floor(
    (safeTimeMs % 3600000) / 60000
  );
  const seconds = Math.floor(
    (safeTimeMs % 60000) / 1000
  );
  const milliseconds =
    safeTimeMs % 1000;
  const separator =
    format === "srt" ? "," : ".";

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":") +
    separator +
    String(milliseconds).padStart(3, "0");
}

function getCachedCueTranslation(text) {
  return translatedCueCache.get(
    normalizeTranscriptText(text)
      .toLocaleLowerCase("en-US")
  ) || "";
}

function cacheCueTranslation(
  text,
  translation
) {
  const cacheKey =
    normalizeTranscriptText(text)
      .toLocaleLowerCase("en-US");
  const cleanTranslation =
    cleanText(translation);

  if (!cacheKey || !cleanTranslation) {
    return;
  }

  translatedCueCache.set(
    cacheKey,
    cleanTranslation
  );

  if (translatedCueCache.size > 1500) {
    translatedCueCache.delete(
      translatedCueCache.keys().next().value
    );
  }
}

function cleanSubtitleExportText(
  text,
  forceCleanup = false
) {
  const value = String(text || "");

  if (!forceCleanup) {
    return value;
  }

  return value
    .replace(/\[[^\]]+\]\s*:?[ \t]*/g, "")
    .replace(/(^|\n)\s*[-–—]+\s*/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function createSubtitleExport(
  format,
  language
) {
  const cues = getTranscriptCues().cues;
  const rows = cues
    .map((cue) => ({
      ...cue,
      translation:
        getCachedCueTranslation(
          cue.text
        )
    }))
    .filter((cue) =>
      language !== "tr" ||
      cue.translation
    );

  if (rows.length === 0) {
    return "";
  }

  const getCueText = (cue) => {
    const forceCleanup =
      format === "plain-txt";

    if (language === "tr") {
      return cleanSubtitleExportText(
        cue.translation,
        forceCleanup
      );
    }

    if (language === "bilingual") {
      return cue.translation
        ? `${cleanSubtitleExportText(
            cue.text,
            forceCleanup
          )}\n${cleanSubtitleExportText(
            cue.translation,
            forceCleanup
          )}`
        : cleanSubtitleExportText(
            cue.text,
            forceCleanup
          );
    }

    return cleanSubtitleExportText(
      cue.text,
      forceCleanup
    );
  };

  if (format === "plain-txt") {
    return rows
      .map(getCueText)
      .filter(Boolean)
      .join("\n\n");
  }

  if (format === "timed-txt") {
    return rows
      .map((cue) =>
        `${formatTranscriptTime(
          cue.startTimeMs
        )}  ${getCueText(cue)}`
      )
      .join("\n\n");
  }

  const blocks = rows.map(
    (cue, index) => {
      const timing =
        `${formatExportTime(
          cue.startTimeMs,
          format
        )} --> ${formatExportTime(
          cue.endTimeMs,
          format
        )}`;
      const indexLine =
        format === "srt"
          ? `${index + 1}\n`
          : "";

      return `${indexLine}${timing}\n${getCueText(
        cue
      )}`;
    }
  );

  return (
    format === "vtt"
      ? `WEBVTT\n\n${blocks.join(
          "\n\n"
        )}`
      : blocks.join("\n\n")
  );
}

function downloadSubtitleExport(
  format,
  language
) {
  const contents = createSubtitleExport(
    format,
    language
  );

  if (!contents) {
    transcriptStatus.textContent =
      language === "tr"
        ? "Henüz dışa aktarılabilecek Türkçe çeviri yok. Önce birkaç satırı oynat."
        : "Dışa aktarılabilecek altyazı bulunamadı.";
    return;
  }

  const blob = new Blob(
    [contents],
    {
      type:
        format === "vtt"
          ? "text/vtt;charset=utf-8"
          : "text/plain;charset=utf-8"
    }
  );
  const objectUrl =
    URL.createObjectURL(blob);
  const link =
    document.createElement("a");
  const safeTitle = String(
    document.title || "PauseSpeak"
  )
    .replace(
      /\s*[-|]\s*(?:Netflix|YouTube).*$/i,
      ""
    )
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "") ||
    "PauseSpeak";

  const fileExtension =
    format.endsWith("-txt")
      ? "txt"
      : format;
  const formatSuffix =
    format === "plain-txt"
      ? "-sadece-altyazi"
      : format === "timed-txt"
        ? "-zamanli"
        : "";

  link.href = objectUrl;
  link.download =
    `${safeTitle}-${language}${formatSuffix}.${fileExtension}`;
  link.style.display = "none";
  document.documentElement.appendChild(
    link
  );
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);

  transcriptStatus.textContent =
    `${fileExtension.toUpperCase()} dosyası indirildi.`;
  exportMenu.classList.remove(
    "ps-open"
  );
}

function createCaptionDiagnostic() {
  const video = getNetflixVideo();
  const transcript = getTranscriptCues();
  const track = transcript.track;
  const currentTimeMs = video
    ? Number(video.currentTime) * 1000
    : 0;
  const windowStartTimeMs = Math.max(
    0,
    currentTimeMs - 90000
  );
  const windowEndTimeMs =
    currentTimeMs + 90000;
  const timeline =
    buildCaptionTimelineData(
      transcript.cues
    );
  const overlapsWindow = (item) =>
    Number(item?.endTimeMs) >=
      windowStartTimeMs &&
    Number(item?.startTimeMs) <=
      windowEndTimeMs;
  const visibleDomText =
    getSubtitleFromVisibleDom();
  const nativeTrackText =
    getSubtitleFromNativeTextTracks(
      video
    );
  const capturedTrackText =
    getSubtitleFromCapturedTrack(video);
  const activeEvents =
    timeline.events.filter(
      (event) =>
        event.startTimeMs <=
          currentTimeMs + 250 &&
        event.endTimeMs >=
          currentTimeMs - 600
    );
  const activeEventText =
    activeEvents.reduce(
      (combinedText, event) =>
        mergeOverlappingSubtitleText(
          combinedText,
          event.displayText
        ),
      ""
    );
  const normalizedVisible =
    normalizeSpeechText(
      visibleDomText || nativeTrackText
    );
  const normalizedActive =
    normalizeSpeechText(activeEventText);

  return {
    schemaVersion: 1,
    captionEngineVersion,
    generatedAt:
      new Date().toISOString(),
    platform: getPlaybackPlatform(),
    pageTitle: String(
      document.title || ""
    ),
    currentTimeMs:
      Math.round(currentTimeMs),
    windowStartTimeMs:
      Math.round(windowStartTimeMs),
    windowEndTimeMs:
      Math.round(windowEndTimeMs),
    automaticPauseEnabled:
      isAutomaticPauseEnabled,
    visible: {
      domText: visibleDomText,
      nativeTextTrackText:
        nativeTrackText,
      capturedTrackText,
      activeEventText,
      activeEventMatchesVisible:
        Boolean(
          normalizedVisible &&
          normalizedActive &&
          (
            normalizedVisible.includes(
              normalizedActive
            ) ||
            normalizedActive.includes(
              normalizedVisible
            )
          )
        )
    },
    track: track
      ? {
          trackId: track.trackId,
          language: track.language,
          format: track.format,
          parserVersion:
            track.parserVersion,
          sourcePath: track.sourcePath,
          cueCount: track.cues.length
        }
      : null,
    rawCues: transcript.cues
      .filter(overlapsWindow)
      .map((cue) => ({
        id: cue.id,
        startTimeMs:
          cue.startTimeMs,
        endTimeMs: cue.endTimeMs,
        sourceOrder:
          cue.sourceOrder,
        sourceKind:
          cue.sourceKind,
        regionId: cue.regionId,
        laneKey: cue.laneKey,
        styleId: cue.styleId,
        cueSettings:
          cue.cueSettings,
        visualX: cue.visualX,
        visualY: cue.visualY,
        lines: cue.lines,
        text: cue.text
      })),
    blocks:
      timeline.blocks.filter(
        overlapsWindow
      ),
    events:
      timeline.events.filter(
        overlapsWindow
      ),
    sentences:
      timeline.sentences.filter(
        overlapsWindow
      ),
    pauseBoundaries:
      sentencePauseController.timeline
        .filter(overlapsWindow)
        .map((boundary) => ({
          id: boundary.id,
          startTimeMs:
            boundary.startTimeMs,
          endTimeMs:
            boundary.endTimeMs,
          nominalTimeMs:
            boundary.nominalTimeMs,
          effectiveTimeMs:
            boundary.effectiveTimeMs,
          spokenText:
            boundary.spokenText,
          settled:
            sentencePauseController
              .settled.get(
                boundary.id
              ) || null
        })),
    armedBoundary:
      sentencePauseController.armed
        ? {
            id:
              sentencePauseController
                .armed.boundary.id,
            effectiveTimeMs:
              sentencePauseController
                .armed.effectiveTimeMs,
            spokenText:
              sentencePauseController
                .armed.boundary.spokenText
          }
        : null
  };
}

function downloadCaptionDiagnostic() {
  const contents = JSON.stringify(
    createCaptionDiagnostic(),
    null,
    2
  );
  const blob = new Blob([contents], {
    type: "application/json;charset=utf-8"
  });
  const objectUrl =
    URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeTitle = String(
    document.title || "PauseSpeak"
  )
    .replace(
      /\s*[-|]\s*(?:Netflix|YouTube).*$/i,
      ""
    )
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "") ||
    "PauseSpeak";

  link.href = objectUrl;
  link.download =
    `${safeTitle}-PauseSpeak-1.2.0-tanilama.json`;
  link.style.display = "none";
  document.documentElement.appendChild(
    link
  );
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);

  transcriptStatus.textContent =
    "Tanılama JSON dosyası indirildi.";
  exportMenu.classList.remove("ps-open");
  exportButton.classList.remove(
    "ps-active"
  );
}

function styleTranscriptRow(
  row,
  isActive
) {
  row.dataset.active = isActive
    ? "true"
    : "false";

  Object.assign(row.style, {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "56px 1fr",
    gap: "8px",
    alignItems: "start",
    padding: "11px 10px 11px 12px",
    border: "none",
    borderBottom:
      "1px solid rgba(189, 218, 225, 0.09)",
    borderRadius: "0",
    outline: "none",
    backgroundColor: isActive
      ? "rgba(88, 199, 229, 0.11)"
      : "transparent",
    color: "#edf2f3",
    fontFamily: "Arial, sans-serif",
    textAlign: "left",
    cursor: "pointer",
    boxSizing: "border-box"
  });
}

function seekToTranscriptCue(cue) {
  if (!cue) {
    return;
  }

  requestNetflixSeek(
    Math.max(
      0,
      cue.startTimeMs - 150
    ),
    "Seçilen altyazıya gidiliyor…"
  );
}

function requestNetflixSeek(
  targetTimeMs,
  pendingMessage = "Video konumu değiştiriliyor…"
) {
  const normalizedTargetTimeMs =
    Math.max(
      0,
      Math.round(
        Number(targetTimeMs) || 0
      )
    );

  activeTranscriptSeekRequestId =
    `subtitle-${Date.now()}-${Math.random()}`;

  transcriptStatus.textContent =
    pendingMessage;

  window.postMessage(
    {
      source: "PAUSESPEAK_EXTENSION",
      type: "PAUSESPEAK_SEEK_REQUEST",
      requestId:
        activeTranscriptSeekRequestId,
      targetTimeMs:
        normalizedTargetTimeMs
    },
    "*"
  );
}

function renderTranscriptPanel() {
  const transcriptData =
    getTranscriptCues();
  const cues =
    groupTranscriptCuesIntoSentences(
      transcriptData.cues
    );
  const query =
    normalizeTranscriptText(
      transcriptSearchInput.value
    ).toLocaleLowerCase("en-US");
  const video = getNetflixVideo();
  const currentTimeMs = video
    ? Number(video.currentTime) * 1000
    : 0;

  activeTranscriptCueIndex =
    findTranscriptCueIndex(
      cues,
      currentTimeMs
    );

  transcriptList.replaceChildren();

  if (cues.length === 0) {
    transcriptStatus.textContent =
      `Altyazı verisi bekleniyor. ${getPlaybackPlatformLabel()} altyazısını açıp videoyu birkaç saniye oynat.`;

    const empty = document.createElement(
      "div"
    );

    empty.textContent =
      "Henüz listelenecek altyazı bulunamadı.";

    Object.assign(empty.style, {
      padding: "20px 8px",
      color: "#cbd5e1",
      fontSize: "14px"
    });

    transcriptList.appendChild(empty);
    return;
  }

  const indexedCues = cues
    .map((cue, index) => ({
      cue,
      index
    }))
    .filter(({ cue }) =>
      !query ||
      cue.text
        .toLocaleLowerCase("en-US")
        .includes(query)
    );

  if (
    transcriptData.source ===
    "captured_track"
  ) {
    const languageLabel =
      transcriptData.track.language
        ? ` · ${transcriptData.track.language}`
        : "";

    const reliablePauseCount =
      cues.filter(
        (cue) => cue.pauseEligible
      ).length;

    transcriptStatus.textContent =
      `${cues.length} cümle önceden yüklendi${languageLabel} · ${reliablePauseCount} güvenilir durdurma · OpenAI kullanılmıyor`;
  } else {
    transcriptStatus.textContent =
      `${cues.length} geçmiş cümle oluşturuldu · Tam altyazı akışı bekleniyor`;
  }

  if (query) {
    transcriptStatus.textContent +=
      ` · ${indexedCues.length} sonuç`;
  }

  for (const { cue, index } of
    indexedCues) {
    const row = document.createElement(
      "button"
    );

    row.type = "button";
    row.dataset.transcriptCueIndex =
      String(index);
    row.dataset.pauseEligible =
      String(
        Boolean(cue.pauseEligible)
      );
    row.title = cue.pauseEligible
      ? "Güvenilir cümle sınırı"
      : "Belirsiz sıra veya cümle sonu: otomatik durdurma uygulanmaz";

    styleTranscriptRow(
      row,
      index === activeTranscriptCueIndex
    );

    const time = document.createElement(
      "span"
    );

    time.textContent = formatTranscriptTime(
      cue.startTimeMs
    );

    Object.assign(time.style, {
      color: "#58c7e5",
      fontSize: "11px",
      fontWeight: "650",
      lineHeight: "1.45"
    });

    const text = document.createElement(
      "span"
    );

    text.textContent = cue.text;

    Object.assign(text.style, {
      fontSize: "16px",
      fontWeight: "600",
      lineHeight: "1.45"
    });

    row.append(time, text);

    row.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        seekToTranscriptCue(cue);
      }
    );

    transcriptList.appendChild(row);
  }

  if (
    !query &&
    activeTranscriptCueIndex >= 0
  ) {
    window.setTimeout(() => {
      transcriptList
        .querySelector(
          `[data-transcript-cue-index="${activeTranscriptCueIndex}"]`
        )
        ?.scrollIntoView({
          block: "center"
        });
    }, 0);
  }
}

function updateTranscriptActiveCue() {
  if (
    transcriptOverlay.style.display ===
    "none"
  ) {
    return;
  }

  const cues =
    groupTranscriptCuesIntoSentences(
      getTranscriptCues().cues
    );
  const video = getNetflixVideo();

  if (!video || cues.length === 0) {
    return;
  }

  const nextIndex = findTranscriptCueIndex(
    cues,
    Number(video.currentTime) * 1000
  );

  if (
    nextIndex === activeTranscriptCueIndex
  ) {
    return;
  }

  const previousRow = transcriptList.querySelector(
    `[data-transcript-cue-index="${activeTranscriptCueIndex}"]`
  );
  const nextRow = transcriptList.querySelector(
    `[data-transcript-cue-index="${nextIndex}"]`
  );

  if (previousRow) {
    styleTranscriptRow(
      previousRow,
      false
    );
  }

  if (nextRow) {
    styleTranscriptRow(nextRow, true);

    if (!transcriptSearchInput.value) {
      nextRow.scrollIntoView({
        block: "center",
        behavior:
          window.matchMedia?.(
            "(prefers-reduced-motion: reduce)"
          ).matches
            ? "auto"
            : "smooth"
      });
    }
  }

  activeTranscriptCueIndex = nextIndex;
}

function captureVisibleSubtitleCue(
  subtitleText,
  video
) {
  const text = normalizeTranscriptText(
    subtitleText
  );
  const currentTimeMs = video
    ? Math.max(
        0,
        Number(video.currentTime) * 1000
      )
    : 0;

  if (text === visibleSubtitleCueText) {
    return;
  }

  if (
    visibleSubtitleCueText &&
    visibleSubtitleCueStartMs !== null
  ) {
    const previousCue =
      visibleSubtitleCues[
        visibleSubtitleCues.length - 1
      ];

    if (previousCue) {
      previousCue.endTimeMs = Math.max(
        previousCue.startTimeMs + 400,
        currentTimeMs
      );
    }
  }

  visibleSubtitleCueText = text;

  if (!text) {
    visibleSubtitleCueStartMs = null;
    return;
  }

  visibleSubtitleCueStartMs = Math.max(
    0,
    currentTimeMs - 180
  );

  visibleSubtitleCues.push({
    startTimeMs: visibleSubtitleCueStartMs,
    endTimeMs:
      visibleSubtitleCueStartMs + 5000,
    text
  });

  if (visibleSubtitleCues.length > 3000) {
    visibleSubtitleCues.shift();
  }

  chooseBestSubtitleTrack(text);

  if (
    transcriptOverlay.style.display !==
    "none" &&
    !getActiveSubtitleTrack()
  ) {
    renderTranscriptPanel();
  }
}

function receiveSubtitleTrack(track) {
  const normalizedTrack =
    normalizeIncomingSubtitleTrack(track);

  if (!normalizedTrack) {
    return;
  }

  const previousTrack =
    capturedSubtitleTracks.get(
      normalizedTrack.trackId
    );

  if (
    previousTrack &&
    previousTrack.cues.length >=
      normalizedTrack.cues.length
  ) {
    return;
  }

  capturedSubtitleTracks.set(
    normalizedTrack.trackId,
    normalizedTrack
  );

  chooseBestSubtitleTrack();

  updateSentencePauseController(
    getNetflixVideo()
  );

  scheduleSentenceTranslationPrefetch(
    getNetflixVideo()
  );

  if (
    transcriptOverlay.style.display !==
    "none"
  ) {
    renderTranscriptPanel();
  }
}

window.addEventListener(
  "message",
  (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;

    if (
      !data ||
      data.source !== "PAUSESPEAK_PAGE"
    ) {
      return;
    }

    if (
      data.type ===
      "PAUSESPEAK_SUBTITLE_TRACK"
    ) {
      receiveSubtitleTrack(data.track);
      return;
    }

    if (
      data.type ===
        "PAUSESPEAK_SEEK_RESPONSE" &&
      data.requestId ===
        activeTranscriptSeekRequestId
    ) {
      transcriptStatus.textContent =
        data.success
          ? "Seçilen altyazı oynatılıyor."
          : data.message ||
            "Altyazıya gidilemedi.";

      activeTranscriptSeekRequestId = "";
    }
  }
);

  function getPlaybackPlatform() {
    const hostname = window.location.hostname
      .toLowerCase();

    if (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com")
    ) {
      return "youtube";
    }

    if (
      hostname === "netflix.com" ||
      hostname.endsWith(".netflix.com")
    ) {
      return "netflix";
    }

    return "unsupported";
  }

  function getPlaybackPlatformLabel() {
    return getPlaybackPlatform() ===
      "youtube"
      ? "YouTube"
      : "Netflix";
  }

  function getYouTubeVideoId() {
    if (window.location.pathname === "/watch") {
      return new URLSearchParams(
        window.location.search
      ).get("v") || "";
    }

    return window.location.pathname.match(
      /^\/shorts\/([^/?#]+)/
    )?.[1] || "";
  }

  function isSupportedWatchPage() {
    const platform = getPlaybackPlatform();

    if (platform === "netflix") {
      return /^\/watch(?:\/|$)/.test(
        window.location.pathname
      );
    }

    if (platform === "youtube") {
      return Boolean(getYouTubeVideoId());
    }

    return false;
  }

  function getPlaybackMediaKey() {
    const platform = getPlaybackPlatform();

    if (platform === "youtube") {
      return `youtube:${getYouTubeVideoId()}`;
    }

    if (platform === "netflix") {
      return `netflix:${window.location.pathname}`;
    }

    return "unsupported";
  }

  function requestPageSubtitleTracks() {
    lastSubtitleTrackRequestAt = Date.now();

    window.postMessage(
      {
        source: "PAUSESPEAK_EXTENSION",
        type:
          "PAUSESPEAK_SUBTITLE_TRACKS_REQUEST"
      },
      "*"
    );
  }

  function getNetflixVideo() {
    if (getPlaybackPlatform() === "youtube") {
      return document.querySelector(
        "video.html5-main-video, video"
      );
    }

    return document.querySelector("video");
  }

  function resetPrivacyTapSequence() {
    privacyTapCount = 0;
    privacyTapStartedAt = 0;
    privacyLastTapAt = 0;
    privacyLastTapX = 0;
    privacyLastTapY = 0;
  }

  function setPrivacyCurtainVisibility(
    shouldShow
  ) {
    isPrivacyCurtainActive =
      Boolean(shouldShow);
    privacyCurtain.classList.toggle(
      "ps-open",
      isPrivacyCurtainActive
    );
    privacyCurtain.setAttribute(
      "aria-hidden",
      String(!isPrivacyCurtainActive)
    );
    resetPrivacyTapSequence();

    const video = getNetflixVideo();

    if (video && !video.paused) {
      video.pause();
    }

    stopSpeechRecognition();

    if (isPronunciationCoachOpen) {
      pronunciationCoachManualPause = true;
      pronunciationCoachStatus.textContent =
        "Gizlilik perdesi açık — ilerlemen korunuyor";
      stopPronunciationCoachRecognition(
        false
      );
      renderPronunciationCoach();
    }

    if (isPrivacyCurtainActive) {
      closePauseSpeakMenus();
      status.textContent =
        "Gizlilik perdesi açık — video durduruldu";
    } else {
      status.textContent =
        "Gizlilik perdesi kapandı — video duraklatılmış durumda";
    }
  }

  function handlePrivacyCurtainPointerUp(
    event
  ) {
    if (
      event.isPrimary === false ||
      (
        event.pointerType === "mouse" &&
        event.button !== 0
      )
    ) {
      return;
    }

    const now = Date.now();
    const elapsedFromFirst =
      now - privacyTapStartedAt;
    const elapsedFromLast =
      now - privacyLastTapAt;
    const distanceFromLast =
      Math.hypot(
        Number(event.clientX) -
          privacyLastTapX,
        Number(event.clientY) -
          privacyLastTapY
      );
    const continuesSequence =
      privacyTapCount > 0 &&
      elapsedFromFirst <= 1100 &&
      elapsedFromLast <= 520 &&
      distanceFromLast <= 72;

    if (!continuesSequence) {
      privacyTapCount = 1;
      privacyTapStartedAt = now;
    } else {
      privacyTapCount += 1;
    }

    privacyLastTapAt = now;
    privacyLastTapX =
      Number(event.clientX);
    privacyLastTapY =
      Number(event.clientY);

    if (privacyTapCount < 3) {
      return;
    }

    privacySuppressClickUntil =
      now + 650;
    event.preventDefault();
    event.stopImmediatePropagation();
    setPrivacyCurtainVisibility(
      !isPrivacyCurtainActive
    );
  }

  function clearPrivacyCurtainAfterSleep() {
    privacyHeartbeatAt = Date.now();

    if (!isPrivacyCurtainActive) {
      return;
    }

    setPrivacyCurtainVisibility(false);
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
    .replace(/<[^>]+>/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/♪[^♪]*♪/g, " ")
    .replace(/♫[^♫]*♫/g, " ")
    .replace(/[♪♫♬♩]+/g, " ")
    .replace(
      /^\s*[\p{L}][\p{L}\p{N} .'-]{0,30}:\s*/u,
      ""
    )
    .replace(/^\s*[-–—]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

  function getSubtitleFromCapturedTrack(
    video
  ) {
    if (!video) {
      return "";
    }

    const track =
      getActiveSubtitleTrack() ||
      chooseBestSubtitleTrack();

    if (!track) {
      return "";
    }

    const timeMs =
      Number(video.currentTime) * 1000;
    const sentences =
      groupTranscriptCuesIntoSentences(
        track.cues
      );
    const sentenceIndex =
      findTranscriptCueIndex(
        sentences,
        timeMs
      );

    const sentence =
      sentences[sentenceIndex] || null;

    if (sentence?.text) {
      return sentence.text;
    }

    const activeCues =
      getActiveTranscriptCues(
        track.cues,
        timeMs
      );

    return activeCues.reduce(
      (combinedText, { cue }) =>
        mergeOverlappingSubtitleText(
          combinedText,
          cue.text
        ),
      ""
    );
  }

  function getSubtitleFromNativeTextTracks(
    video
  ) {
    if (!video?.textTracks) {
      return "";
    }

    for (const track of Array.from(
      video.textTracks
    )) {
      if (
        track.mode !== "showing" ||
        !track.activeCues?.length
      ) {
        continue;
      }

      const activeCueTexts = Array.from(
        track.activeCues
      )
        .map((cue) =>
          cleanText(cue?.text || "")
        )
        .filter(Boolean);

      if (activeCueTexts.length) {
        return activeCueTexts.reduce(
          (
            combinedText,
            cueText
          ) =>
            mergeOverlappingSubtitleText(
              combinedText,
              cueText
            ),
          ""
        );
      }
    }

    return "";
  }

  function getSubtitleFromVisibleDom() {
    const platform = getPlaybackPlatform();
    const selectors = platform === "youtube"
      ? [
          ".ytp-caption-segment",
          ".caption-window .captions-text"
        ]
      : [
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
      const uniqueTexts = [
        ...new Set(texts)
      ];

      if (uniqueTexts.length > 0) {
        return uniqueTexts.reduce(
          (
            combinedText,
            visibleText
          ) =>
            mergeOverlappingSubtitleText(
              combinedText,
              visibleText
            ),
          ""
        );
      }
    }

    return "";
  }

  function getNetflixSubtitle() {
    const video = getNetflixVideo();
    const capturedTrackSubtitle =
      getSubtitleFromCapturedTrack(video);

    if (capturedTrackSubtitle) {
      return capturedTrackSubtitle;
    }

    const nativeTrackSubtitle =
      getSubtitleFromNativeTextTracks(
        video
      );

    if (nativeTrackSubtitle) {
      return nativeTrackSubtitle;
    }

    return getSubtitleFromVisibleDom();
  }

  function endsSentence(text) {
    return /[.!?…]["'’”)\]]*$/.test(
      text.trim()
    );
  }

  function hasDefiniteSentenceEnding(
    text
  ) {
    const normalizedText = String(
      text || ""
    ).trim();

    return (
      endsSentence(normalizedText) &&
      !/(?:\.{2,}|…)["'’”)\]]*$/.test(
        normalizedText
      )
    );
  }

  function mergeOverlappingSubtitleText(
    accumulatedText,
    incomingText
  ) {
    const normalizeOverlapWord =
      (word) =>
        String(word || "")
          .toLocaleLowerCase("en-US")
          .replace(/[’‘`]/g, "'")
          .replace(
            /^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu,
            ""
          );
    const collapseRepeatedBlocks =
      (value) => {
        let words = cleanText(value)
          .split(" ")
          .filter(Boolean);
        let changed = true;

        while (changed) {
          changed = false;
          const normalizedWords =
            words.map(
              normalizeOverlapWord
            );
          const maximumBlockLength =
            Math.floor(
              normalizedWords.length / 2
            );

          for (
            let blockLength =
              maximumBlockLength;
            blockLength >= 4;
            blockLength -= 1
          ) {
            let duplicateStart = -1;

            for (
              let startIndex = 0;
              startIndex +
                  blockLength * 2 <=
                normalizedWords.length;
              startIndex += 1
            ) {
              const firstBlock =
                normalizedWords.slice(
                  startIndex,
                  startIndex +
                    blockLength
                );
              const secondBlock =
                normalizedWords.slice(
                  startIndex +
                    blockLength,
                  startIndex +
                    blockLength * 2
                );

              if (
                firstBlock.every(
                  (word, index) =>
                    word &&
                    word ===
                      secondBlock[index]
                )
              ) {
                duplicateStart =
                  startIndex +
                  blockLength;
                break;
              }
            }

            if (duplicateStart >= 0) {
              words.splice(
                duplicateStart,
                blockLength
              );
              changed = true;
              break;
            }
          }
        }

        return cleanText(words.join(" "));
      };
    const findWordSequence = (
      haystack,
      needle
    ) => {
      if (
        !needle.length ||
        needle.length > haystack.length
      ) {
        return -1;
      }

      for (
        let startIndex = 0;
        startIndex <=
          haystack.length -
            needle.length;
        startIndex += 1
      ) {
        if (
          needle.every(
            (word, offset) =>
              word &&
              word ===
                haystack[
                  startIndex + offset
                ]
          )
        ) {
          return startIndex;
        }
      }

      return -1;
    };
    const accumulated =
      collapseRepeatedBlocks(
        accumulatedText
      );
    const incoming =
      collapseRepeatedBlocks(
        incomingText
      );

    if (!accumulated) {
      return incoming;
    }

    if (!incoming) {
      return accumulated;
    }

    if (incoming.includes(accumulated)) {
      return incoming;
    }

    if (accumulated.includes(incoming)) {
      return accumulated;
    }

    const accumulatedWords =
      accumulated.split(" ");
    const incomingWords =
      incoming.split(" ");
    const normalizedAccumulated =
      accumulatedWords.map(
        normalizeOverlapWord
      );
    const normalizedIncoming =
      incomingWords.map(
        normalizeOverlapWord
      );

    if (
      findWordSequence(
        normalizedIncoming,
        normalizedAccumulated
      ) >= 0
    ) {
      return incoming;
    }

    if (
      findWordSequence(
        normalizedAccumulated,
        normalizedIncoming
      ) >= 0
    ) {
      return accumulated;
    }
    const maximumOverlap = Math.min(
      normalizedAccumulated.length,
      normalizedIncoming.length
    );

    for (
      let overlapLength = maximumOverlap;
      overlapLength >= 2;
      overlapLength -= 1
    ) {
      const accumulatedStart =
        normalizedAccumulated.length -
        overlapLength;
      let matches = true;

      for (
        let index = 0;
        index < overlapLength;
        index += 1
      ) {
        const previousWord =
          normalizedAccumulated[
            accumulatedStart + index
          ];
        const nextWord =
          normalizedIncoming[index];

        if (
          !previousWord ||
          previousWord !== nextWord
        ) {
          matches = false;
          break;
        }
      }

      if (!matches) {
        continue;
      }

      return cleanText(
        collapseRepeatedBlocks(
          [
            accumulated,
            ...incomingWords.slice(
              overlapLength
            )
          ].join(" ")
        )
      );
    }

    const maximumRestartLength =
      Math.min(
        normalizedAccumulated.length,
        normalizedIncoming.length
      );

    for (
      let restartLength =
        maximumRestartLength;
      restartLength >= 4;
      restartLength -= 1
    ) {
      const restartWords =
        normalizedIncoming.slice(
          0,
          restartLength
        );
      const restartIndex =
        findWordSequence(
          normalizedAccumulated,
          restartWords
        );

      if (restartIndex < 0) {
        continue;
      }

      return cleanText(
        collapseRepeatedBlocks(
          [
            ...accumulatedWords.slice(
              0,
              restartIndex
            ),
            ...incomingWords
          ].join(" ")
        )
      );
    }

    return cleanText(
      collapseRepeatedBlocks(
        `${accumulated} ${incoming}`
      )
    );
  }

  function addSentencePart(text) {
    const incoming = cleanText(text);

    if (!incoming) {
      return;
    }

    const accumulated = cleanText(
      sentenceParts.join(" ")
    );

    sentenceParts = [
      mergeOverlappingSubtitleText(
        accumulated,
        incoming
      )
    ];
  }
function stopTranslationSpeech() {
  translationSpeechRequestNumber += 1;

  if (translationSpeechAbortController) {
    translationSpeechAbortController.abort();

    translationSpeechAbortController =
      null;
  }

  if (translationSpeechAudio) {
    translationSpeechAudio.pause();
    translationSpeechAudio.currentTime = 0;

    translationSpeechAudio = null;
  }

   if (translationSpeechObjectUrl) {
    URL.revokeObjectURL(
      translationSpeechObjectUrl
    );

    translationSpeechObjectUrl = null;
  }
}
async function speakTranslation(
  text,
  language = "tr"
) {
if (
  (
    language === "tr" &&
    !isTurkishTranslationSpeechEnabled
  ) ||
  typeof text !== "string" ||
  text.trim() === ""
) {
    return;
  }

  stopTranslationSpeech();

  const requestNumber =
    translationSpeechRequestNumber;

  const controller =
    new AbortController();

  translationSpeechAbortController =
    controller;

  const timeoutId =
    setTimeout(() => {
      controller.abort();
    }, translationSpeechTimeoutMs);

  try {
    const response = await fetch(
      translationSpeechApiUrl,
      {
        method: "POST",

        headers:
          getUsageSyncHeaders(),

       body: JSON.stringify({
  text: text.trim(),
  language
}),

        signal: controller.signal
      }
    );

    if (response.ok) {
      recordTtsRequest(
        language === "en"
          ? "tts_english"
          : "tts_turkish",
        text.trim()
      );
    }

    const synchronizedTtsEventId =
      response.ok
        ? response.headers.get(
            "x-pausespeak-usage-event"
          ) || ""
        : "";

if (
  requestNumber !==
    translationSpeechRequestNumber ||
  (
    language === "tr" &&
    !isTurkishTranslationSpeechEnabled
  )
) {
  return;
}

    if (!response.ok) {
      throw new Error(
        "Türkçe ses alınamadı."
      );
    }

    const audioBlob =
      await response.blob();

 if (
  requestNumber !==
    translationSpeechRequestNumber ||
  (
    language === "tr" &&
    !isTurkishTranslationSpeechEnabled
  )
) {
  return;
}

    translationSpeechObjectUrl =
      URL.createObjectURL(
        audioBlob
      );

    const createdAudio =
      new Audio(
        translationSpeechObjectUrl
      );

    translationSpeechAudio =
      createdAudio;

    createdAudio
      .addEventListener(
        "loadedmetadata",
        () => {
          recordTtsDuration(
            language === "en"
              ? "tts_english"
              : "tts_turkish",
            createdAudio.duration,
            synchronizedTtsEventId
          );
        },
        {
          once: true
        }
      );

    translationSpeechAudio.playbackRate =
      language === "tr"
        ? 1.2
        : 1;

    translationSpeechAudio.preservesPitch =
      true;

    await translationSpeechAudio.play();
  } catch (error) {
    if (
      requestNumber !==
      translationSpeechRequestNumber
    ) {
      return;
    }

    if (
      error.name !==
      "AbortError"
    ) {
      console.error(
        "PauseSpeak Türkçe ses oynatma hatası:",
        error
      );
    }
  } finally {
    clearTimeout(timeoutId);

    if (
      translationSpeechAbortController ===
      controller
    ) {
      translationSpeechAbortController =
        null;
    }
  }
}
function stopNormalTranslation() {
  translationRequestNumber += 1;

  if (translationAbortController) {
    translationAbortController.abort();
    translationAbortController = null;
  }
}
  async function translateSentence(
    text,
    previousText
  ) {
    if (isChunkTranslationVisible) {
      return;
    }

    stopNormalTranslation();

    const requestNumber =
      translationRequestNumber;
    const normalizedText =
      cleanText(text);
    let cachedTranslation =
      getCachedCueTranslation(
        normalizedText
      );

    if (cachedTranslation) {
      translationBox.textContent =
        cachedTranslation;
      void speakTranslation(
        cachedTranslation
      );
      return;
    }

    const matchingPrefetchKey =
      `normal:${normalizedText.toLocaleLowerCase("en-US")}`;

    if (
      sentenceTranslationPrefetchKey ===
        matchingPrefetchKey &&
      sentenceTranslationPrefetchPromise
    ) {
      translationBox.textContent =
        "Çevriliyor...";

      await sentenceTranslationPrefetchPromise;

      if (
        requestNumber !==
          translationRequestNumber ||
        isChunkTranslationVisible
      ) {
        return;
      }

      cachedTranslation =
        getCachedCueTranslation(
          normalizedText
        );

      if (cachedTranslation) {
        translationBox.textContent =
          cachedTranslation;
        void speakTranslation(
          cachedTranslation
        );
        return;
      }
    }

    const controller =
      new AbortController();

    translationAbortController =
      controller;

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

          headers:
            getUsageSyncHeaders(),

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
        response.ok &&
        data?.success &&
        typeof data.translation ===
          "string"
      ) {
        recordTextUsage(
          "normal_translation",
          data.model,
          data.usage
        );
      }

      if (
        requestNumber !==
          translationRequestNumber ||
        isChunkTranslationVisible
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

      cacheCueTranslation(
        text,
        data.translation
      );

      void speakTranslation(
        data.translation
      );
    } catch (error) {
      if (
        requestNumber !==
          translationRequestNumber ||
        isChunkTranslationVisible
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

      if (
        translationAbortController ===
        controller
      ) {
        translationAbortController =
          null;
      }
    }
  }
function updateTerraImproveButtonState() {
  const completedText =
    cleanText(completedBox.textContent);
  const hasCompletedSentence =
    completedStartTimeMs !== null &&
    completedText !== "" &&
    completedText !==
      "Henüz tamamlanan cümle yok.";
  const isActiveRequest =
    isTerraImprovePending &&
    terraImprovePendingAction ===
      "translation";
  const accessibleName =
    "Türkçe çeviriyi daha doğal ve akıcı hale getir";

  improveTranslationButton.title =
    accessibleName;
  improveTranslationButton.setAttribute(
    "aria-label",
    accessibleName
  );
  improveTranslationButton.dataset.mode =
    "normal";
  improveTranslationButton.dataset.action =
    "translation";
  improveTranslationButton.disabled =
    isTerraImprovePending ||
    !hasCompletedSentence;
  improveTranslationButton.classList.toggle(
    "ps-loading",
    isActiveRequest
  );

  if (isActiveRequest) {
    improveTranslationButton.setAttribute(
      "aria-busy",
      "true"
    );
  } else {
    improveTranslationButton.removeAttribute(
      "aria-busy"
    );
  }

  setPauseSpeakButton(
    improveTranslationButton,
    "waveSpark",
    isActiveRequest
      ? "Yükleniyor"
      : "AI Çeviri+"
  );
}

function cancelTerraImprovement() {
  terraImproveRequestNumber += 1;

  if (terraImproveAbortController) {
    terraImproveAbortController.abort();
    terraImproveAbortController = null;
  }

  isTerraImprovePending = false;
  terraImprovePendingAction = "";
  updateTerraImproveButtonState();
}

async function requestTerraImprovement(
  action,
  mode,
  text,
  previousText,
  chunks,
  translations,
  signal
) {
  if (
    action === "translation" &&
    mode === "normal"
  ) {
    const response = await fetch(
      translationApiUrl,
      {
        method: "POST",
        headers: getUsageSyncHeaders(),
        body: JSON.stringify({
          text,
          previousText,
          improve: true
        }),
        signal
      }
    );
    const data = await response.json();
    const translation =
      cleanText(data?.translation);

    if (
      !response.ok ||
      !data?.success ||
      !translation
    ) {
      throw new Error(
        data?.error ||
          "İyileştirilmiş çeviri alınamadı."
      );
    }

    recordTextUsage(
      "improve_translation",
      data.model,
      data.usage
    );

    return {
      action,
      mode,
      translation
    };
  }

  const response = await fetch(
    chunkApiUrl,
    {
      method: "POST",
      headers: getUsageSyncHeaders(),
      body: JSON.stringify({
        text,
        improve: true,
        improvementType: action,
        currentParts: chunks.map(
          (english, index) => ({
            english,
            turkish:
              cleanText(
                translations[index]
              )
          })
        )
      }),
      signal
    }
  );
  const data = await response.json();
  const improvedChunks =
    Array.isArray(data?.chunks)
      ? data.chunks.map(cleanText)
      : [];
  const improvedTranslations =
    Array.isArray(data?.translations)
      ? data.translations.map(cleanText)
      : [];
  const preservesCurrentChunks =
    action !== "translation" ||
    (
      improvedChunks.length ===
        chunks.length &&
      chunks.every(
        (chunk, index) =>
          cleanText(chunk) ===
          improvedChunks[index]
      )
    );

  if (
    !response.ok ||
    !data?.success ||
    !validateSubtitleChunks(
      text,
      improvedChunks
    ) ||
    improvedTranslations.length !==
      improvedChunks.length ||
    !preservesCurrentChunks ||
    improvedTranslations.some(
      (translation) => !translation
    )
  ) {
    throw new Error(
      data?.error ||
        "İyileştirilmiş parça sonucu doğrulanamadı."
    );
  }

  recordTextUsage(
    action === "translation"
      ? "improve_translation"
      : "improve_chunk",
    data.model,
    data.usage
  );

  return {
    action,
    mode,
    chunks: improvedChunks,
    translations: improvedTranslations
  };
}

async function improveCurrentWithTerra(
  action
) {
  if (isTerraImprovePending) {
    return;
  }

  if (
    action !== "translation" &&
    action !== "segmentation"
  ) {
    return;
  }

  const text =
    cleanText(completedBox.textContent);

  if (
    !text ||
    text ===
      "Henüz tamamlanan cümle yok."
  ) {
    return;
  }

  const mode =
    isChunkTranslationVisible
      ? "chunk"
      : "normal";

  if (
    action === "segmentation" &&
    mode !== "chunk"
  ) {
    return;
  }

  const chunks =
    [...currentSubtitleChunks];
  const translations =
    [...currentSubtitleChunkTranslations];

  if (
    action === "translation" &&
    mode === "chunk" &&
    chunks.length === 0
  ) {
    return;
  }

  if (
    mode === "normal" &&
    action === "translation"
  ) {
    stopNormalTranslation();
  } else if (mode === "chunk") {
    subtitleChunkRequestNumber += 1;
    subtitleTranslationRequestNumber += 1;

    if (subtitleChunkAbortController) {
      subtitleChunkAbortController.abort();
      subtitleChunkAbortController = null;
    }

    if (
      subtitleTranslationAbortController
    ) {
      subtitleTranslationAbortController
        .abort();
      subtitleTranslationAbortController =
        null;
    }
  }

  const requestNumber =
    ++terraImproveRequestNumber;
  const controller =
    new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    translationTimeoutMs
  );

  terraImproveAbortController =
    controller;
  isTerraImprovePending = true;
  terraImprovePendingAction = action;
  updateTerraImproveButtonState();

  try {
    const result =
      await requestTerraImprovement(
        action,
        mode,
        text,
        cleanText(
          currentTranslationPreviousText
        ),
        chunks,
        translations,
        controller.signal
      );

    if (
      requestNumber !==
        terraImproveRequestNumber ||
      cleanText(completedBox.textContent) !==
        text ||
      (
        isChunkTranslationVisible
          ? "chunk"
          : "normal"
      ) !== mode
    ) {
      return;
    }

    if (
      action === "translation" &&
      mode === "normal"
    ) {
      translationBox.textContent =
        result.translation;
      cacheCueTranslation(
        text,
        result.translation
      );
      return;
    }

    cacheSubtitleChunks(
      text,
      result.chunks
    );
    cacheSubtitleChunkTranslations(
      text,
      result.chunks,
      result.translations
    );
    currentSubtitleChunks =
      [...result.chunks];
    currentSubtitleChunkTranslations =
      [...result.translations];
    renderChunkedSubtitle();
    scheduleSentenceTranslationPrefetch();
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(
        "PauseSpeak iyileştirme hatası:",
        error
      );
    }
  } finally {
    clearTimeout(timeoutId);

    if (
      requestNumber ===
        terraImproveRequestNumber
    ) {
      terraImproveAbortController = null;
      isTerraImprovePending = false;
      terraImprovePendingAction = "";
      updateTerraImproveButtonState();
    }
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

    const compactTarget =
      targetTokens.join("");

    const compactSpoken =
      spokenTokens.join("");

    if (
      compactTarget &&
      compactTarget === compactSpoken
    ) {
      return {
        success: true,
        score: 1
      };
    }

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

  function getPronunciationRetryWords(
    targetText,
    spokenText
  ) {
    const targetTokens =
      getWordTokens(targetText);

    const spokenTokens =
      getWordTokens(spokenText);

    const distances =
      Array.from(
        {
          length:
            targetTokens.length + 1
        },
        () =>
          Array(
            spokenTokens.length + 1
          ).fill(0)
      );

    for (
      let targetIndex = 0;
      targetIndex <=
        targetTokens.length;
      targetIndex += 1
    ) {
      distances[targetIndex][0] =
        targetIndex;
    }

    for (
      let spokenIndex = 0;
      spokenIndex <=
        spokenTokens.length;
      spokenIndex += 1
    ) {
      distances[0][spokenIndex] =
        spokenIndex;
    }

    for (
      let targetIndex = 1;
      targetIndex <=
        targetTokens.length;
      targetIndex += 1
    ) {
      for (
        let spokenIndex = 1;
        spokenIndex <=
          spokenTokens.length;
        spokenIndex += 1
      ) {
        const substitutionCost =
          targetTokens[
            targetIndex - 1
          ] ===
          spokenTokens[
            spokenIndex - 1
          ]
            ? 0
            : 1;

        distances[
          targetIndex
        ][spokenIndex] =
          Math.min(
            distances[
              targetIndex - 1
            ][spokenIndex] + 1,

            distances[
              targetIndex
            ][spokenIndex - 1] + 1,

            distances[
              targetIndex - 1
            ][spokenIndex - 1] +
              substitutionCost
          );
      }
    }

    const retryWords = [];

    let targetIndex =
      targetTokens.length;

    let spokenIndex =
      spokenTokens.length;

    while (
      targetIndex > 0 ||
      spokenIndex > 0
    ) {
      if (
        targetIndex > 0 &&
        spokenIndex > 0 &&
        targetTokens[
          targetIndex - 1
        ] ===
          spokenTokens[
            spokenIndex - 1
          ]
      ) {
        targetIndex -= 1;
        spokenIndex -= 1;
        continue;
      }

      if (
        targetIndex > 0 &&
        spokenIndex > 0 &&
        distances[
          targetIndex
        ][spokenIndex] ===
          distances[
            targetIndex - 1
          ][spokenIndex - 1] + 1
      ) {
        retryWords.unshift(
          targetTokens[
            targetIndex - 1
          ]
        );

        targetIndex -= 1;
        spokenIndex -= 1;
        continue;
      }

      if (
        targetIndex > 0 &&
        distances[
          targetIndex
        ][spokenIndex] ===
          distances[
            targetIndex - 1
          ][spokenIndex] + 1
      ) {
        retryWords.unshift(
          targetTokens[
            targetIndex - 1
          ]
        );

        targetIndex -= 1;
        continue;
      }

      spokenIndex -= 1;
    }

    return retryWords;
  }

  function createPronunciationCoachParts(
    text
  ) {
    const pieces =
      String(text || "").match(
        /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*(?:-[\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]+/gu
      ) || [];

    return pieces.map((piece) => ({
      text: piece,
      kind:
        /^[\p{L}\p{N}]/u.test(piece)
          ? "word"
          : "punctuation"
    }));
  }

  function getPronunciationCoachCharacterDistance(
    firstValue,
    secondValue
  ) {
    const first = String(firstValue || "");
    const second = String(secondValue || "");
    const row = Array.from(
      { length: second.length + 1 },
      (_, index) => index
    );

    for (
      let firstIndex = 1;
      firstIndex <= first.length;
      firstIndex += 1
    ) {
      let previousDiagonal = row[0];
      row[0] = firstIndex;

      for (
        let secondIndex = 1;
        secondIndex <= second.length;
        secondIndex += 1
      ) {
        const previousTop =
          row[secondIndex];
        const substitutionCost =
          first[firstIndex - 1] ===
          second[secondIndex - 1]
            ? 0
            : 1;

        row[secondIndex] = Math.min(
          row[secondIndex] + 1,
          row[secondIndex - 1] + 1,
          previousDiagonal +
            substitutionCost
        );

        previousDiagonal = previousTop;
      }
    }

    return row[second.length];
  }

  function getPronunciationCoachWordSimilarity(
    targetText,
    spokenText
  ) {
    const target = getWordTokens(
      targetText
    ).join("");
    const spoken = getWordTokens(
      spokenText
    ).join("");

    if (!target || !spoken) {
      return 0;
    }

    if (target === spoken) {
      return 1;
    }

    const longestLength = Math.max(
      target.length,
      spoken.length
    );

    return Math.max(
      0,
      1 -
        getPronunciationCoachCharacterDistance(
          target,
          spoken
        ) /
          longestLength
    );
  }

  function isPronunciationCoachWordMatch(
    targetText,
    spokenText
  ) {
    const target = getWordTokens(
      targetText
    ).join("");
    const score =
      getPronunciationCoachWordSimilarity(
        targetText,
        spokenText
      );

    const threshold =
      target.length <= 3
        ? 1
        : target.length <= 5
          ? 0.8
          : 0.72;

    return {
      success: score >= threshold,
      score
    };
  }

  function collectPronunciationCoachMatches(
    wordReferences,
    spokenText
  ) {
    const spokenTokens =
      getWordTokens(spokenText);
    const matchedKeys = new Set();
    let spokenCursor = 0;
    let totalScore = 0;

    for (const reference of wordReferences) {
      let bestMatch = null;
      const targetTokenCount = Math.max(
        1,
        getWordTokens(
          reference.word.text
        ).length
      );

      for (
        let startIndex = spokenCursor;
        startIndex < spokenTokens.length;
        startIndex += 1
      ) {
        const maximumWindow = Math.min(
          spokenTokens.length - startIndex,
          targetTokenCount + 1,
          3
        );

        for (
          let windowSize = 1;
          windowSize <= maximumWindow;
          windowSize += 1
        ) {
          const spokenWindow =
            spokenTokens
              .slice(
                startIndex,
                startIndex + windowSize
              )
              .join(" ");
          const comparison =
            isPronunciationCoachWordMatch(
              reference.word.text,
              spokenWindow
            );

          if (
            !comparison.success ||
            (
              bestMatch &&
              comparison.score <=
                bestMatch.score
            )
          ) {
            continue;
          }

          bestMatch = {
            score: comparison.score,
            endIndex:
              startIndex + windowSize
          };
        }
      }

      if (!bestMatch) {
        continue;
      }

      matchedKeys.add(reference.key);
      totalScore += bestMatch.score;
      spokenCursor = bestMatch.endIndex;
    }

    return {
      matchedKeys,
      totalScore
    };
  }

  function getPronunciationCoachProperNames() {
    const names = new Set();

    for (
      const segment of
        currentSentenceStudySegments
    ) {
      if (
        segment?.type !==
        "proper-name"
      ) {
        continue;
      }

      for (
        const token of
          getWordTokens(segment.text)
      ) {
        names.add(token);
      }
    }

    return names;
  }

  function createPronunciationCoachChunks(
    sentence,
    chunks
  ) {
    const properNames =
      getPronunciationCoachProperNames();
    let globalWordIndex = 0;
    let nextWordStartsSentence = true;
    const commonSentenceStarters =
      new Set([
        "a", "an", "and", "are", "as", "at",
        "because", "but", "can", "could", "did", "do",
        "does", "for", "from", "had", "has", "have",
        "he", "her", "here", "his", "how", "i", "if",
        "in", "is", "it", "its", "my", "no", "not",
        "of", "on", "or", "our", "she", "so", "that",
        "the", "their", "there", "these", "they", "this",
        "those", "to", "we", "were", "what", "when",
        "where", "which", "who", "why", "will", "with",
        "would", "you", "your"
      ]);

    return chunks.map(
      (chunkText, chunkIndex) => {
        const parts =
          createPronunciationCoachParts(
            chunkText
          ).map((part, partIndex) => {
            if (part.kind !== "word") {
              if (/[.!?…]/.test(part.text)) {
                nextWordStartsSentence =
                  true;
              }

              return {
                ...part,
                key:
                  `${chunkIndex}:p:${partIndex}`,
                state: "punctuation"
              };
            }

            const normalizedTokens =
              getWordTokens(part.text);
            const normalized =
              normalizedTokens.join("");
            const startsSentence =
              nextWordStartsSentence;
            nextWordStartsSentence = false;
            const isCapitalized =
              /^[A-Z][\p{L}'’-]*$/u.test(
                part.text
              );
            const isAllCaps =
              part.text.length > 1 &&
              part.text ===
                part.text.toUpperCase() &&
              /[A-Z]/.test(part.text);
            const looksLikeOpeningName =
              globalWordIndex === 0 &&
              isCapitalized &&
              normalizedTokens.length === 1 &&
              !commonSentenceStarters.has(
                normalizedTokens[0]
              );
            const isProperName =
              normalizedTokens.some(
                (token) =>
                  properNames.has(token)
              ) ||
              isAllCaps ||
              (
                globalWordIndex > 0 &&
                !startsSentence &&
                part.text !== "I" &&
                isCapitalized
              ) ||
              looksLikeOpeningName;
            const word = {
              ...part,
              key:
                `${chunkIndex}:w:${globalWordIndex}`,
              studyIndex:
                globalWordIndex,
              normalized,
              state: isProperName
                ? "proper"
                : "pending"
            };

            globalWordIndex += 1;
            return word;
          });

        return {
          text: chunkText,
          parts
        };
      }
    );
  }

  function getPronunciationCoachWordReferences(
    onlyCurrentChunk = false
  ) {
    const references = [];

    pronunciationCoachChunks.forEach(
      (chunk, chunkIndex) => {
        if (
          onlyCurrentChunk &&
          chunkIndex !==
            pronunciationCoachChunkIndex
        ) {
          return;
        }

        chunk.parts.forEach(
          (word, wordIndex) => {
            if (
              word.kind !== "word" ||
              word.state === "passed" ||
              word.state === "proper"
            ) {
              return;
            }

            references.push({
              key: word.key,
              word,
              wordIndex,
              chunkIndex
            });
          }
        );
      }
    );

    return references;
  }

  function findPronunciationCoachWord(
    key
  ) {
    for (
      const chunk of
        pronunciationCoachChunks
    ) {
      const word = chunk.parts.find(
        (part) => part.key === key
      );

      if (word) {
        return word;
      }
    }

    return null;
  }

  function getCurrentPronunciationCoachChunk() {
    return (
      pronunciationCoachChunks[
        pronunciationCoachChunkIndex
      ] || null
    );
  }

  function isPronunciationCoachChunkComplete(
    chunk
  ) {
    if (!chunk) {
      return false;
    }

    return chunk.parts
      .filter(
        (part) =>
          part.kind === "word"
      )
      .every(
        (word) =>
          word.state === "passed" ||
          word.state === "proper"
      );
  }

  function getPronunciationCoachRemainingCount() {
    const chunk =
      getCurrentPronunciationCoachChunk();

    if (!chunk) {
      return 0;
    }

    return chunk.parts.filter(
      (part) =>
        part.kind === "word" &&
        part.state !== "passed" &&
        part.state !== "proper"
    ).length;
  }

  function getPronunciationCoachTranslation() {
    const chunkTranslation = cleanText(
      currentSubtitleChunkTranslations[
        pronunciationCoachChunkIndex
      ] || ""
    );

    if (
      chunkTranslation &&
      chunkTranslation !== "Çevriliyor..."
    ) {
      return chunkTranslation;
    }

    const sentenceTranslation = cleanText(
      translationBox.textContent
    );

    if (
      sentenceTranslation &&
      !/^(Çevriliyor|İngilizce cümle tamamlandığında|Çeviri isteği|PauseSpeak sunucusuna|Çeviri alınamadı)/i.test(
        sentenceTranslation
      )
    ) {
      return sentenceTranslation;
    }

    return "Mevcut Türkçe çeviri hazırlanıyor…";
  }

  function isPronunciationCoachTranslationReady() {
    if (
      pronunciationCoachSentence !==
        cleanText(
          completedBox.textContent
        )
    ) {
      return false;
    }

    if (isChunkTranslationVisible) {
      return (
        currentSubtitleChunks.length > 0 &&
        currentSubtitleChunkTranslations.length >=
          currentSubtitleChunks.length &&
        currentSubtitleChunks.every(
          (_chunk, index) => {
            const translatedChunk =
              cleanText(
                currentSubtitleChunkTranslations[
                  index
                ] || ""
              );

            return Boolean(
              translatedChunk &&
              translatedChunk !==
                "Çevriliyor..."
            );
          }
        )
      );
    }

    const sentenceTranslation = cleanText(
      translationBox.textContent
    );

    return Boolean(
      sentenceTranslation &&
      !/^(Çevriliyor|İngilizce cümle tamamlandığında|Türkçe çeviri burada görünecek|Mevcut Türkçe çeviri hazırlanıyor)/i.test(
        sentenceTranslation
      )
    );
  }

  function tryStartPronunciationCoachAfterTranslation() {
    if (
      !isPronunciationCoachSessionActive ||
      !isPronunciationCoachOpen ||
      pronunciationCoachManualPause ||
      pronunciationCoachIsModelSpeaking ||
      pronunciationCoachRecognition ||
      pronunciationCoachListening ||
      !getCurrentPronunciationCoachChunk()
    ) {
      return false;
    }

    const video = getNetflixVideo();

    if (
      !video ||
      !video.paused ||
      !isPronunciationCoachTranslationReady()
    ) {
      pronunciationCoachWaitingForTranslation =
        true;
      pronunciationCoachStatus.textContent =
        video && video.paused
          ? "Çeviri tamamlanınca mikrofon otomatik açılacak"
          : "Video oynarken mikrofon kapalı";
      renderPronunciationCoach();
      return false;
    }

    pronunciationCoachWaitingForTranslation =
      false;
    pronunciationCoachStatus.textContent =
      "Çeviri hazır — mikrofon açılıyor";
    pronunciationCoachShouldRestart = true;
    renderPronunciationCoach();
    schedulePronunciationCoachRestart(220);
    return true;
  }

  function getPronunciationCoachStudyContext(
    word
  ) {
    const studyIndex = Number(
      word?.studyIndex
    );
    const mappedSegment =
      Number.isInteger(studyIndex)
        ? currentStudyTokenMappings[
            studyIndex
          ] || null
        : null;
    const selectedStudyIndexes =
      new Set([studyIndex]);

    if (mappedSegment) {
      const selectedText = cleanText(
        mappedSegment.text
      ).toLowerCase();
      const selectedType = cleanText(
        mappedSegment.type
      ).toLowerCase();
      const matchesMapping = (index) => {
        const mapping =
          currentStudyTokenMappings[index];

        return Boolean(
          mapping &&
          cleanText(
            mapping.text
          ).toLowerCase() ===
            selectedText &&
          cleanText(
            mapping.type
          ).toLowerCase() ===
            selectedType
        );
      };
      let firstIndex = studyIndex;
      let lastIndex = studyIndex;

      while (
        firstIndex > 0 &&
        matchesMapping(firstIndex - 1)
      ) {
        firstIndex -= 1;
      }

      while (
        lastIndex <
          currentStudyTokenMappings.length - 1 &&
        matchesMapping(lastIndex + 1)
      ) {
        lastIndex += 1;
      }

      for (
        let index = firstIndex;
        index <= lastIndex;
        index += 1
      ) {
        selectedStudyIndexes.add(index);
      }
    }

    return {
      selectedText:
        mappedSegment?.text ||
        word?.text ||
        "",
      segmentType:
        mappedSegment?.type ||
        "word",
      selectedStudyIndexes
    };
  }

  function openPronunciationCoachStudyMeaning(
    word
  ) {
    if (!word || word.kind !== "word") {
      return;
    }

    const context =
      getPronunciationCoachStudyContext(
        word
      );

    pronunciationCoachResumeAfterMeaning =
      isPronunciationCoachSessionActive &&
      isPronunciationCoachOpen &&
      !pronunciationCoachManualPause;
    pronunciationCoachManualPause = true;
    clearPronunciationCoachTimers();
    stopPronunciationCoachRecognition(false);
    pronunciationCoachStudySelection =
      context.selectedStudyIndexes;
    pronunciationCoachStatus.textContent =
      "Kelime ayrıntıları açık — ilerlemen korunuyor";
    renderPronunciationCoach();

    studyMeaningOverlay.classList.add(
      "ps-from-pronunciation-coach"
    );

    void loadStudyMeaning(
      context.selectedText,
      pronunciationCoachSentence,
      context.segmentType
    );
  }

  function resumePronunciationCoachAfterStudyMeaning() {
    const shouldResume =
      pronunciationCoachResumeAfterMeaning;

    pronunciationCoachResumeAfterMeaning =
      false;
    pronunciationCoachStudySelection.clear();
    studyMeaningOverlay.classList.remove(
      "ps-from-pronunciation-coach"
    );

    if (
      !isPronunciationCoachSessionActive ||
      !isPronunciationCoachOpen
    ) {
      return;
    }

    pronunciationCoachStatus.textContent =
      shouldResume
        ? "Kaldığın yerden devam edebilirsin"
        : "İlerlemen korunuyor";
    renderPronunciationCoach();

    if (shouldResume) {
      pronunciationCoachManualPause =
        false;
      pronunciationCoachShouldRestart =
        true;
      schedulePronunciationCoachRestart(
        260
      );
    }
  }

  function selectPronunciationCoachChunk(
    requestedIndex
  ) {
    const nextIndex = Math.max(
      0,
      Math.min(
        pronunciationCoachChunks.length - 1,
        Number(requestedIndex || 0)
      )
    );

    if (
      nextIndex ===
        pronunciationCoachChunkIndex ||
      pronunciationCoachVideoPreview
    ) {
      return;
    }

    const shouldResume =
      !pronunciationCoachManualPause;

    clearPronunciationCoachTimers();
    stopPronunciationCoachRecognition(false);
    pronunciationCoachChunkIndex =
      nextIndex;
    pronunciationCoachLiveMatches.clear();
    pronunciationCoachStudySelection.clear();
    pronunciationCoachActiveWordIndex = -1;
    pronunciationCoachLastHeard = "";
    pronunciationCoachHeard.textContent =
      "Seçtiğin parça hazır";
    pronunciationCoachStatus.textContent =
      isPronunciationCoachChunkComplete(
        getCurrentPronunciationCoachChunk()
      )
        ? "Bu parça tamamlandı — diğer parçaya geçebilirsin"
        : "Parçayı doğal biçimde söyle";
    renderPronunciationCoach();

    if (
      shouldResume &&
      !isPronunciationCoachChunkComplete(
        getCurrentPronunciationCoachChunk()
      )
    ) {
      pronunciationCoachShouldRestart =
        true;
      schedulePronunciationCoachRestart(
        300
      );
    }
  }

  function movePronunciationCoachChunk(
    offset
  ) {
    selectPronunciationCoachChunk(
      pronunciationCoachChunkIndex +
        Number(offset || 0)
    );
  }

  function createPronunciationCoachWordElement(
    part,
    wordIndex,
    chunkIndex
  ) {
    const element = document.createElement(
      part.kind === "word"
        ? "button"
        : "span"
    );

    element.textContent = part.text;

    if (part.kind === "punctuation") {
      element.className =
        "ps-coach-word ps-coach-word-punctuation";
      return element;
    }

    element.type = "button";
    element.className = "ps-coach-word";
    element.dataset.coachWordKey =
      part.key;
    element.title =
      "Bağlama göre anlamını aç";

    element.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        openPronunciationCoachStudyMeaning(
          part
        );
      }
    );

    if (
      pronunciationCoachStudySelection.has(
        part.studyIndex
      )
    ) {
      element.classList.add(
        "ps-coach-word-study-selected"
      );
    }

    if (part.state === "passed") {
      element.classList.add(
        "ps-coach-word-passed"
      );
    } else if (part.state === "proper") {
      element.classList.add(
        "ps-coach-word-proper"
      );
      element.title =
        "Özel isim — otomatik kabul edildi";
    } else if (part.state === "retry") {
      element.classList.add(
        "ps-coach-word-retry"
      );
    }

    if (
      pronunciationCoachLiveMatches.has(
        part.key
      )
    ) {
      element.classList.add(
        "ps-coach-word-live-passed"
      );
    }

    if (
      chunkIndex ===
        pronunciationCoachChunkIndex &&
      wordIndex ===
        pronunciationCoachActiveWordIndex &&
      part.state !== "passed" &&
      part.state !== "proper"
    ) {
      element.classList.add(
        "ps-coach-word-active"
      );
    }

    return element;
  }

  function applyPronunciationCoachStateToSubtitle() {
    if (
      !isPronunciationCoachOpen ||
      !isPronunciationCoachSessionActive
    ) {
      return;
    }

    subtitleBox.classList.add(
      "ps-inline-coach-active"
    );
    panel.classList.add(
      "ps-inline-coach-active"
    );
    const coachWords =
      pronunciationCoachChunks.flatMap(
        (chunk, chunkIndex) =>
          chunk.parts
            .map((part, partIndex) => ({
              part,
              partIndex,
              chunkIndex
            }))
            .filter(
              ({ part }) =>
                part.kind === "word"
            )
      );
    const studyButtons = Array.from(
      subtitleBox.querySelectorAll(
        "button[data-study-text]"
      )
    );

    studyButtons.forEach(
      (segmentButton, wordIndex) => {
        const reference =
          coachWords[wordIndex] || null;

        segmentButton.classList.add(
          "ps-inline-coach-segment"
        );
        segmentButton.classList.remove(
          "ps-coach-word-active",
          "ps-coach-word-passed",
          "ps-coach-word-proper",
          "ps-coach-word-retry",
          "ps-coach-word-live-passed"
        );

        if (!reference) {
          delete segmentButton.dataset
            .coachWordKey;
          return;
        }

        const {
          part,
          partIndex,
          chunkIndex
        } = reference;

        segmentButton.dataset.coachWordKey =
          part.key;

        if (part.state === "passed") {
          segmentButton.classList.add(
            "ps-coach-word-passed"
          );
        } else if (
          part.state === "proper"
        ) {
          segmentButton.classList.add(
            "ps-coach-word-proper"
          );
        } else if (
          part.state === "retry"
        ) {
          segmentButton.classList.add(
            "ps-coach-word-retry"
          );
        }

        if (
          pronunciationCoachLiveMatches.has(
            part.key
          )
        ) {
          segmentButton.classList.add(
            "ps-coach-word-live-passed"
          );
        }

        if (
          chunkIndex ===
            pronunciationCoachChunkIndex &&
          partIndex ===
            pronunciationCoachActiveWordIndex &&
          part.state !== "passed" &&
          part.state !== "proper"
        ) {
          segmentButton.classList.add(
            "ps-coach-word-active"
          );
        }
      }
    );
  }

  function createPronunciationCoachChunkCard(
    chunk,
    chunkIndex
  ) {
    const isActive =
      chunkIndex ===
      pronunciationCoachChunkIndex;
    const isComplete =
      isPronunciationCoachChunkComplete(
        chunk
      );
    const card = document.createElement(
      "section"
    );
    const header = document.createElement(
      "div"
    );
    const label = document.createElement(
      "span"
    );
    const selectButton =
      document.createElement("button");
    const words = document.createElement(
      "div"
    );

    card.className =
      "ps-coach-chunk-card";
    card.classList.toggle(
      "ps-active",
      isActive
    );
    card.classList.toggle(
      "ps-complete",
      isComplete
    );
    card.dataset.chunkIndex =
      String(chunkIndex);

    header.className =
      "ps-coach-chunk-card-header";
    label.className =
      "ps-coach-chunk-card-label";
    label.textContent =
      `${chunkIndex + 1}. parça`;

    selectButton.type = "button";
    selectButton.className =
      "ps-coach-chunk-select";
    selectButton.textContent = isActive
      ? isComplete
        ? "Tamamlandı"
        : "Çalışılıyor"
      : isComplete
        ? "Görüntüle"
        : "Bu parçayı seç";
    selectButton.disabled =
      isActive ||
      Boolean(
        pronunciationCoachVideoPreview
      );
    selectButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectPronunciationCoachChunk(
          chunkIndex
        );
      }
    );

    words.className =
      "ps-coach-chunk-card-words";
    chunk.parts.forEach(
      (part, wordIndex) => {
        words.appendChild(
          createPronunciationCoachWordElement(
            part,
            wordIndex,
            chunkIndex
          )
        );
      }
    );

    header.append(label, selectButton);
    card.append(header, words);

    return card;
  }

  function renderPronunciationCoach() {
    const chunk =
      getCurrentPronunciationCoachChunk();

    pronunciationCoachProgress.textContent =
      pronunciationCoachChunks.length
        ? `Parçalar · ${Math.min(
            pronunciationCoachChunkIndex + 1,
            pronunciationCoachChunks.length
          )} / ${pronunciationCoachChunks.length}`
        : "Parçalar";
    pronunciationCoachPreviousChunkButton.disabled =
      pronunciationCoachChunkIndex <= 0 ||
      Boolean(pronunciationCoachVideoPreview);
    pronunciationCoachNextChunkButton.disabled =
      pronunciationCoachChunkIndex >=
        pronunciationCoachChunks.length - 1 ||
      Boolean(pronunciationCoachVideoPreview);

    pronunciationCoachViewToggleButton.disabled =
      pronunciationCoachChunks.length < 2;
    pronunciationCoachViewToggleButton.classList.toggle(
      "ps-active",
      isPronunciationCoachAllChunksVisible
    );
    pronunciationCoachViewToggleButton.setAttribute(
      "aria-pressed",
      String(
        isPronunciationCoachAllChunksVisible
      )
    );
    setPauseSpeakButton(
      pronunciationCoachViewToggleButton,
      "parts",
      isPronunciationCoachAllChunksVisible
        ? "Tek parça"
        : "Tüm parçalar"
    );
    pronunciationCoachInstruction.textContent =
      isPronunciationCoachAllChunksVisible
        ? "İstediğin parçayı seç ve doğal biçimde söyle"
        : "Parçayı doğal biçimde söyle";

    pronunciationCoachWords.replaceChildren();
    pronunciationCoachWords.classList.toggle(
      "ps-all-chunks",
      isPronunciationCoachAllChunksVisible
    );

    if (!chunk) {
      pronunciationCoachWords.textContent =
        "Yeni cümle bekleniyor…";
      return;
    }

    if (
      isPronunciationCoachAllChunksVisible
    ) {
      pronunciationCoachChunks.forEach(
        (item, chunkIndex) => {
          pronunciationCoachWords.appendChild(
            createPronunciationCoachChunkCard(
              item,
              chunkIndex
            )
          );
        }
      );
    } else {
      chunk.parts.forEach(
        (part, wordIndex) => {
          pronunciationCoachWords.appendChild(
            createPronunciationCoachWordElement(
              part,
              wordIndex,
              pronunciationCoachChunkIndex
            )
          );
        }
      );
    }

    pronunciationCoachTranslation.textContent =
      getPronunciationCoachTranslation();

    pronunciationCoachListenButton.disabled =
      Boolean(pronunciationCoachVideoPreview);
    pronunciationCoachMicButton.disabled =
      Boolean(pronunciationCoachVideoPreview) ||
      !SpeechRecognitionClass;

    pronunciationCoachMicButton.classList.toggle(
      "ps-listening",
      pronunciationCoachListening
    );

    setPauseSpeakButton(
      pronunciationCoachMicButton,
      "coach",
      pronunciationCoachListening
        ? "Dinliyorum"
        : pronunciationCoachManualPause
          ? "Devam et"
          : pronunciationCoachWaitingForTranslation
            ? "Çeviri bekleniyor"
          : "Konuş"
    );

    pronunciationCoachButton.classList.toggle(
      "ps-listening",
      pronunciationCoachListening
    );
    pronunciationCoachButton.title =
      pronunciationCoachListening
        ? "Dinliyorum — duraklatmak için dokun"
        : pronunciationCoachManualPause
          ? "Telaffuza devam et"
          : pronunciationCoachWaitingForTranslation
            ? "Çeviri tamamlanınca mikrofon otomatik açılacak"
          : "Telaffuz Koçu";
    pronunciationCoachButton.setAttribute(
      "aria-label",
      pronunciationCoachButton.title
    );
    pronunciationCoachButton.setAttribute(
      "aria-pressed",
      String(
        isPronunciationCoachSessionActive
      )
    );

    applyPronunciationCoachStateToSubtitle();
  }

  function evaluatePronunciationCoachText(
    spokenText
  ) {
    const allReferences =
      getPronunciationCoachWordReferences(
        false
      );
    const currentReferences =
      getPronunciationCoachWordReferences(
        true
      );
    const allResult =
      collectPronunciationCoachMatches(
        allReferences,
        spokenText
      );
    const currentResult =
      collectPronunciationCoachMatches(
        currentReferences,
        spokenText
      );

    if (
      currentResult.matchedKeys.size >
        allResult.matchedKeys.size ||
      (
        currentResult.matchedKeys.size ===
          allResult.matchedKeys.size &&
        currentResult.totalScore >
          allResult.totalScore
      )
    ) {
      return currentResult;
    }

    return allResult;
  }

  function choosePronunciationCoachCandidate(
    candidates
  ) {
    let best = {
      text: "",
      matchedKeys: new Set(),
      totalScore: 0
    };

    for (const candidate of candidates) {
      const text = cleanText(candidate);

      if (!text) {
        continue;
      }

      const result =
        evaluatePronunciationCoachText(
          text
        );

      if (
        result.matchedKeys.size >
          best.matchedKeys.size ||
        (
          result.matchedKeys.size ===
            best.matchedKeys.size &&
          result.totalScore >
            best.totalScore
        )
      ) {
        best = {
          text,
          matchedKeys:
            result.matchedKeys,
          totalScore:
            result.totalScore
        };
      }
    }

    return best;
  }

  function clearPronunciationCoachTimers() {
    if (
      pronunciationCoachRestartTimeout
    ) {
      clearTimeout(
        pronunciationCoachRestartTimeout
      );
      pronunciationCoachRestartTimeout =
        null;
    }

    if (
      pronunciationCoachSilenceTimeout
    ) {
      clearTimeout(
        pronunciationCoachSilenceTimeout
      );
      pronunciationCoachSilenceTimeout =
        null;
    }

    if (
      pronunciationCoachAdvanceTimeout
    ) {
      clearTimeout(
        pronunciationCoachAdvanceTimeout
      );
      pronunciationCoachAdvanceTimeout =
        null;
    }
  }

  function schedulePronunciationCoachRestart(
    delayMs = 450
  ) {
    if (
      !isPronunciationCoachSessionActive ||
      !isPronunciationCoachOpen ||
      pronunciationCoachManualPause ||
      pronunciationCoachIsModelSpeaking
    ) {
      return;
    }

    if (
      pronunciationCoachRestartTimeout
    ) {
      clearTimeout(
        pronunciationCoachRestartTimeout
      );
    }

    pronunciationCoachRestartTimeout =
      setTimeout(() => {
        pronunciationCoachRestartTimeout =
          null;
        startPronunciationCoachRecognition();
      }, delayMs);
  }

  function stopPronunciationCoachRecognition(
    shouldRestart = false
  ) {
    if (
      pronunciationCoachSilenceTimeout
    ) {
      clearTimeout(
        pronunciationCoachSilenceTimeout
      );
      pronunciationCoachSilenceTimeout =
        null;
    }

    pronunciationCoachShouldRestart =
      shouldRestart;

    if (!pronunciationCoachRecognition) {
      pronunciationCoachListening = false;
      renderPronunciationCoach();

      if (shouldRestart) {
        schedulePronunciationCoachRestart();
      }

      return;
    }

    try {
      if (shouldRestart) {
        pronunciationCoachRecognition.stop();
      } else {
        pronunciationCoachRecognition.abort();
      }
    } catch (error) {
      console.warn(
        "PauseSpeak Telaffuz Koçu mikrofon durdurma uyarısı:",
        error
      );
    }
  }

  function finishPronunciationCoachSentence() {
    stopPronunciationCoachRecognition(false);
    pronunciationCoachWaitingForTranslation =
      true;
    pronunciationCoachLiveMatches.clear();
    pronunciationCoachActiveWordIndex = -1;
    pronunciationCoachStatus.textContent =
      "Cümle tamamlandı — video devam ediyor";
    pronunciationCoachHeard.textContent =
      "Tüm kelimeler tamamlandı";
    panel.classList.add(
      "ps-inline-coach-complete"
    );
    renderPronunciationCoach();

    pronunciationCoachAdvanceTimeout =
      setTimeout(async () => {
        pronunciationCoachAdvanceTimeout =
          null;
        isPronunciationCoachOpen = false;
        pronunciationCoachOverlay.classList.remove(
          "ps-open"
        );
        pronunciationCoachOverlay.setAttribute(
          "aria-hidden",
          "true"
        );
        panel.classList.remove(
          "ps-inline-coach-complete"
        );
        renderChunkedSubtitle();

        const video = getNetflixVideo();

        if (!video) {
          return;
        }

        try {
          await video.play();
          status.textContent =
            "▶️ Telaffuz Koçu yeni cümleyi bekliyor";
        } catch (error) {
          status.textContent =
            "Telaffuz tamamlandı — videoyu oynatabilirsin";
        }
      }, 850);
  }

  function advancePronunciationCoach() {
    const chunkCount =
      pronunciationCoachChunks.length;
    let nextChunkIndex = -1;

    for (
      let offset = 1;
      offset <= chunkCount;
      offset += 1
    ) {
      const candidateIndex =
        (
          pronunciationCoachChunkIndex +
          offset
        ) % chunkCount;

      if (
        !isPronunciationCoachChunkComplete(
          pronunciationCoachChunks[
            candidateIndex
          ]
        )
      ) {
        nextChunkIndex = candidateIndex;
        break;
      }
    }

    if (nextChunkIndex < 0) {
      renderPronunciationCoach();
      finishPronunciationCoachSentence();
      return true;
    }

    pronunciationCoachChunkIndex =
      nextChunkIndex;
    pronunciationCoachLiveMatches.clear();
    pronunciationCoachActiveWordIndex = -1;
    pronunciationCoachLastHeard = "";
    pronunciationCoachHeard.textContent =
      "Sıradaki parça hazır";
    pronunciationCoachStatus.textContent =
      "Parçayı doğal biçimde söyle";
    renderPronunciationCoach();
    schedulePronunciationCoachRestart(
      220
    );
    return false;
  }

  function commitPronunciationCoachResult(
    result
  ) {
    for (const key of result.matchedKeys) {
      const word =
        findPronunciationCoachWord(key);

      if (
        word &&
        word.state !== "proper"
      ) {
        word.state = "passed";
      }
    }

    const currentChunk =
      getCurrentPronunciationCoachChunk();

    if (currentChunk) {
      currentChunk.parts.forEach(
        (word) => {
          if (
            word.kind === "word" &&
            word.state === "pending"
          ) {
            word.state = "retry";
          }
        }
      );
    }

    pronunciationCoachLiveMatches.clear();
    pronunciationCoachActiveWordIndex = -1;

    if (
      isPronunciationCoachChunkComplete(
        currentChunk
      )
    ) {
      pronunciationCoachStatus.textContent =
        "Parça tamamlandı";
      pronunciationCoachHeard.textContent =
        result.text
          ? `Duyduğum: ${result.text}`
          : "Parça tamamlandı";
      renderPronunciationCoach();
      stopPronunciationCoachRecognition(
        false
      );
      pronunciationCoachAdvanceTimeout =
        setTimeout(() => {
          pronunciationCoachAdvanceTimeout =
            null;
          advancePronunciationCoach();
        }, 180);
      return;
    }

    const remaining =
      getPronunciationCoachRemainingCount();
    pronunciationCoachStatus.textContent =
      remaining === 1
        ? "1 kelime kaldı — kırmızı kelimeyi veya parçayı söyle"
        : `${remaining} kelime kaldı — sadece kırmızıları veya parçayı söyle`;
    pronunciationCoachHeard.textContent =
      result.text
        ? `Duyduğum: ${result.text}`
        : "Seni dinlemeye devam ediyorum";
    renderPronunciationCoach();
  }

  function applyPronunciationCoachCandidates(
    candidates,
    isFinal
  ) {
    const result =
      choosePronunciationCoachCandidate(
        candidates
      );

    if (!result.text) {
      return;
    }

    pronunciationCoachHadSpeech = true;
    pronunciationCoachRestartCount = 0;
    pronunciationCoachLastHeard =
      result.text;
    pronunciationCoachHeard.textContent =
      `Duyduğum: ${result.text}`;

    if (isFinal) {
      commitPronunciationCoachResult(
        result
      );
      return;
    }

    pronunciationCoachLiveMatches =
      result.matchedKeys;

    const currentChunk =
      getCurrentPronunciationCoachChunk();
    const liveWordIndexes = [];

    currentChunk?.parts.forEach(
      (word, wordIndex) => {
        if (
          result.matchedKeys.has(
            word.key
          )
        ) {
          liveWordIndexes.push(
            wordIndex
          );
        }
      }
    );

    pronunciationCoachActiveWordIndex =
      liveWordIndexes.length
        ? liveWordIndexes[
            liveWordIndexes.length - 1
          ]
        : -1;
    pronunciationCoachStatus.textContent =
      "Konuşmanı takip ediyorum";
    renderPronunciationCoach();
  }

  function startPronunciationCoachRecognition() {
    const video = getNetflixVideo();

    if (
      !SpeechRecognitionClass ||
      !isPronunciationCoachSessionActive ||
      !isPronunciationCoachOpen ||
      pronunciationCoachRecognition ||
      pronunciationCoachManualPause ||
      pronunciationCoachIsModelSpeaking ||
      !getCurrentPronunciationCoachChunk()
    ) {
      return;
    }

    if (
      !video ||
      !video.paused ||
      !isPronunciationCoachTranslationReady()
    ) {
      if (
        isPronunciationCoachSessionActive &&
        isPronunciationCoachOpen &&
        !pronunciationCoachManualPause &&
        !pronunciationCoachIsModelSpeaking
      ) {
        pronunciationCoachWaitingForTranslation =
          true;
        pronunciationCoachStatus.textContent =
          video && video.paused
            ? "Çeviri tamamlanınca mikrofon otomatik açılacak"
            : "Video oynarken mikrofon kapalı";
        renderPronunciationCoach();
      }
      return;
    }

    pronunciationCoachWaitingForTranslation =
      false;

    const recognition =
      new SpeechRecognitionClass();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    pronunciationCoachRecognition =
      recognition;
    pronunciationCoachShouldRestart =
      true;
    pronunciationCoachHadSpeech = false;
    const stopCoachForVideoPlayback = () => {
      if (
        pronunciationCoachRecognition !==
          recognition
      ) {
        return;
      }

      pronunciationCoachWaitingForTranslation =
        true;
      pronunciationCoachShouldRestart =
        false;
      pronunciationCoachStatus.textContent =
        "Video oynarken mikrofon kapalı";
      stopPronunciationCoachRecognition(
        false
      );
    };

    video.addEventListener(
      "play",
      stopCoachForVideoPlayback,
      { once: true }
    );

    recognition.onstart = () => {
      pronunciationCoachListening = true;
      pronunciationCoachStatus.textContent =
        "Seni dinliyorum";
      pronunciationCoachHeard.textContent =
        pronunciationCoachLastHeard
          ? `Duyduğum: ${pronunciationCoachLastHeard}`
          : "Konuşmaya başlayabilirsin";
      renderPronunciationCoach();
    };

    recognition.onresult = (event) => {
      const candidates = [];
      const resultCount =
        event.results.length;

      if (!resultCount) {
        return;
      }

      const latestIndex =
        resultCount - 1;
      const latestResult =
        event.results[latestIndex];
      const alternativeCount =
        Math.min(
          latestResult.length,
          5
        );

      for (
        let alternativeIndex = 0;
        alternativeIndex <
          alternativeCount;
        alternativeIndex += 1
      ) {
        const transcriptParts = [];

        for (
          let resultIndex = 0;
          resultIndex < resultCount;
          resultIndex += 1
        ) {
          const selectedAlternative =
            resultIndex === latestIndex
              ? alternativeIndex
              : 0;
          const transcript = cleanText(
            event.results[resultIndex][
              selectedAlternative
            ]?.transcript || ""
          );

          if (transcript) {
            transcriptParts.push(
              transcript
            );
          }
        }

        candidates.push(
          transcriptParts.join(" ")
        );
      }

      applyPronunciationCoachCandidates(
        candidates,
        latestResult.isFinal
      );

      if (
        pronunciationCoachSilenceTimeout
      ) {
        clearTimeout(
          pronunciationCoachSilenceTimeout
        );
      }

      pronunciationCoachSilenceTimeout =
        setTimeout(() => {
          pronunciationCoachSilenceTimeout =
            null;

          if (
            pronunciationCoachRecognition ===
              recognition &&
            pronunciationCoachListening
          ) {
            stopPronunciationCoachRecognition(
              true
            );
          }
        }, 3200);
    };

    recognition.onerror = (event) => {
      if (
        event.error === "aborted" &&
        !pronunciationCoachShouldRestart
      ) {
        return;
      }

      if (
        event.error === "not-allowed" ||
        event.error ===
          "service-not-allowed"
      ) {
        pronunciationCoachShouldRestart =
          false;
        pronunciationCoachManualPause =
          true;
        pronunciationCoachStatus.textContent =
          "Mikrofon iznini Chrome site ayarlarından aç";
        pronunciationCoachHeard.textContent =
          "İlerlemen korunuyor";
        return;
      }

      pronunciationCoachRestartCount += 1;
      pronunciationCoachShouldRestart =
        true;
      pronunciationCoachStatus.textContent =
        event.error === "no-speech"
          ? "Seni bekliyorum — ilerlemen korunuyor"
          : "Mikrofon yeniden bağlanıyor — ilerlemen korunuyor";
      pronunciationCoachHeard.textContent =
        "Bu teknik kesinti yanlış sayılmadı";
    };

    recognition.onend = () => {
      video.removeEventListener(
        "play",
        stopCoachForVideoPlayback
      );

      if (
        pronunciationCoachRecognition ===
        recognition
      ) {
        pronunciationCoachRecognition =
          null;
      }

      pronunciationCoachListening = false;
      renderPronunciationCoach();

      if (
        pronunciationCoachShouldRestart &&
        isPronunciationCoachSessionActive &&
        isPronunciationCoachOpen &&
        !pronunciationCoachManualPause &&
        !pronunciationCoachIsModelSpeaking
      ) {
        schedulePronunciationCoachRestart(
          Math.min(
            2200,
            420 +
              pronunciationCoachRestartCount *
                450
          )
        );
      }
    };

    try {
      recognition.start();
    } catch (error) {
      video.removeEventListener(
        "play",
        stopCoachForVideoPlayback
      );
      pronunciationCoachRecognition =
        null;
      pronunciationCoachListening = false;
      pronunciationCoachStatus.textContent =
        "Mikrofon hazırlanamadı — tekrar dokun";
      renderPronunciationCoach();
    }
  }

  function preparePronunciationCoachSentence(
    sentence
  ) {
    const cleanSentence =
      cleanText(sentence);
    const availableChunks =
      currentSubtitleChunks.length
        ? [...currentSubtitleChunks]
        : createFallbackSubtitleChunks(
            cleanSentence
          );
    const chunks =
      availableChunks.length
        ? availableChunks
        : [cleanSentence];

    pronunciationCoachSentence =
      cleanSentence;
    pronunciationCoachChunks =
      createPronunciationCoachChunks(
        cleanSentence,
        chunks
      );
    pronunciationCoachChunkIndex = 0;
    pronunciationCoachLiveMatches.clear();
    pronunciationCoachActiveWordIndex = -1;
    pronunciationCoachLastHeard = "";
    pronunciationCoachHeard.textContent =
      "Konuşmaya başlayabilirsin";
    pronunciationCoachStatus.textContent =
      "Parçayı doğal biçimde söyle";
    renderPronunciationCoach();
  }

  function synchronizePronunciationCoachChunks() {
    if (
      !pronunciationCoachChunks.length ||
      !currentSubtitleChunks.length ||
      pronunciationCoachSentence !==
        cleanText(
          completedBox.textContent
        )
    ) {
      return;
    }

    const currentTexts =
      pronunciationCoachChunks.map(
        (chunk) => cleanText(chunk.text)
      );
    const nextTexts =
      currentSubtitleChunks.map(
        (chunk) => cleanText(chunk)
      );

    if (
      currentTexts.length ===
        nextTexts.length &&
      currentTexts.every(
        (text, index) =>
          text === nextTexts[index]
      )
    ) {
      return;
    }

    const savedStates = new Map();

    pronunciationCoachChunks.forEach(
      (chunk) => {
        chunk.parts.forEach((word) => {
          if (word.kind === "word") {
            savedStates.set(
              word.studyIndex,
              word.state
            );
          }
        });
      }
    );

    const activeStudyIndex =
      getCurrentPronunciationCoachChunk()
        ?.parts.find(
          (part) => part.kind === "word"
        )?.studyIndex ?? 0;
    const synchronizedChunks =
      createPronunciationCoachChunks(
        pronunciationCoachSentence,
        nextTexts
      );

    synchronizedChunks.forEach(
      (chunk) => {
        chunk.parts.forEach((word) => {
          if (
            word.kind === "word" &&
            savedStates.has(
              word.studyIndex
            )
          ) {
            word.state = savedStates.get(
              word.studyIndex
            );
          }
        });
      }
    );

    pronunciationCoachChunks =
      synchronizedChunks;
    pronunciationCoachChunkIndex =
      Math.max(
        0,
        synchronizedChunks.findIndex(
          (chunk) =>
            chunk.parts.some(
              (part) =>
                part.kind === "word" &&
                part.studyIndex ===
                  activeStudyIndex
            )
        )
      );
    pronunciationCoachLiveMatches.clear();
    pronunciationCoachActiveWordIndex = -1;
  }

  function refreshPronunciationCoachProperNames() {
    if (
      !pronunciationCoachChunks.length ||
      pronunciationCoachSentence !==
        cleanText(
          completedBox.textContent
        )
    ) {
      return;
    }

    const properNames =
      getPronunciationCoachProperNames();

    pronunciationCoachChunks.forEach(
      (chunk) => {
        chunk.parts.forEach((word) => {
          if (
            word.kind !== "word" ||
            word.state === "passed"
          ) {
            return;
          }

          const tokens =
            getWordTokens(word.text);

          if (
            tokens.some((token) =>
              properNames.has(token)
            )
          ) {
            word.state = "proper";
          }
        });
      }
    );

    renderPronunciationCoach();

    if (
      isPronunciationCoachOpen &&
      isPronunciationCoachChunkComplete(
        getCurrentPronunciationCoachChunk()
      )
    ) {
      advancePronunciationCoach();
    }
  }

  function openPronunciationCoach(
    sentence,
    activateSession = true
  ) {
    const cleanSentence =
      cleanText(sentence);

    if (
      !cleanSentence ||
      cleanSentence ===
        "Henüz tamamlanan cümle yok."
    ) {
      status.textContent =
        "Telaffuz Koçu için önce bir cümle tamamlanmalı";
      return;
    }

    if (activateSession) {
      isPronunciationCoachSessionActive =
        true;
    }

    pronunciationCoachButton.classList.add(
      "ps-active"
    );
    pronunciationCoachButton.setAttribute(
      "aria-pressed",
      "true"
    );
    pronunciationCoachManualPause = false;
    pronunciationCoachWaitingForTranslation =
      true;
    pronunciationCoachRestartCount = 0;
    panel.classList.remove(
      "ps-inline-coach-complete"
    );
    isPronunciationCoachOpen = true;
    pronunciationCoachOverlay.classList.remove(
      "ps-open"
    );
    pronunciationCoachOverlay.setAttribute(
      "aria-hidden",
      "true"
    );

    stopPronunciationCoachRecognition(false);
    clearPronunciationCoachTimers();
    const shouldPreserveProgress =
      !activateSession &&
      pronunciationCoachSentence ===
        cleanSentence &&
      pronunciationCoachChunks.length > 0;

    if (shouldPreserveProgress) {
      renderPronunciationCoach();
    } else {
      preparePronunciationCoachSentence(
        cleanSentence
      );
    }

    renderPronunciationCoach();

    const video = getNetflixVideo();

    if (video && !video.paused) {
      video.pause();
    }

    if (!SpeechRecognitionClass) {
      pronunciationCoachStatus.textContent =
        "Bu tarayıcı canlı konuşma tanımayı desteklemiyor";
      pronunciationCoachMicButton.disabled =
        true;
      return;
    }

    pronunciationCoachMicButton.disabled =
      false;

    if (
      isPronunciationCoachChunkComplete(
        getCurrentPronunciationCoachChunk()
      )
    ) {
      advancePronunciationCoach();
      return;
    }

    tryStartPronunciationCoachAfterTranslation();
  }

  function closePronunciationCoach(
    endSession = true,
    resumeVideo = false
  ) {
    clearPronunciationCoachTimers();
    stopPronunciationCoachRecognition(false);

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    pronunciationCoachIsModelSpeaking =
      false;
    pronunciationCoachManualPause = false;
    pronunciationCoachWaitingForTranslation =
      false;
    isPronunciationCoachOpen = false;
    pronunciationCoachOverlay.classList.remove(
      "ps-open"
    );
    pronunciationCoachOverlay.setAttribute(
      "aria-hidden",
      "true"
    );
    panel.classList.remove(
      "ps-inline-coach-active",
      "ps-inline-coach-complete"
    );
    subtitleBox.classList.remove(
      "ps-inline-coach-active"
    );

    if (
      studyMeaningOverlay.classList.contains(
        "ps-from-pronunciation-coach"
      )
    ) {
      pronunciationCoachResumeAfterMeaning =
        false;
      closeStudyMeaningPanel(false);
    }

    pronunciationCoachStudySelection.clear();

    if (!resumeVideo) {
      const video = getNetflixVideo();

      if (video && !video.paused) {
        video.pause();
      }
    }

    if (endSession) {
      isPronunciationCoachSessionActive =
        false;
      pronunciationCoachButton.classList.remove(
        "ps-active"
      );
      pronunciationCoachButton.setAttribute(
        "aria-pressed",
        "false"
      );
    }

    pronunciationCoachButton.classList.remove(
      "ps-listening"
    );
    pronunciationCoachButton.title =
      "Telaffuz Koçu";
    pronunciationCoachButton.setAttribute(
      "aria-label",
      pronunciationCoachButton.title
    );
    renderChunkedSubtitle();

    if (pronunciationCoachVideoPreview) {
      pronunciationCoachVideoPreview
        .resumeRecognition = false;
      pronunciationCoachVideoPreview
        .resumeVideoAfterReturn =
        resumeVideo;

      if (
        pronunciationCoachVideoPreview.phase ===
        "starting"
      ) {
        pronunciationCoachVideoPreview
          .cancelRequested = true;
      } else if (
        pronunciationCoachVideoPreview.phase !==
        "returning"
      ) {
        beginPronunciationCoachVideoReturn();
      }

      return;
    }

    if (!resumeVideo) {
      return;
    }

    const video = getNetflixVideo();

    if (video) {
      void video.play();
    }
  }

  function getPronunciationCoachVideoRange() {
    const video = getNetflixVideo();

    if (
      !video ||
      completedStartTimeMs === null
    ) {
      return null;
    }

    const currentTimeMs =
      Number(video.currentTime) * 1000;
    const returnTimeMs =
      Number.isFinite(currentTimeMs)
        ? Math.max(0, currentTimeMs)
        : completedStartTimeMs;
    const sentenceEndTimeMs = Math.max(
      Number(completedEndTimeMs) || 0,
      completedStartTimeMs + 1200
    );

    return {
      startTimeMs:
        completedStartTimeMs,
      endTimeMs: sentenceEndTimeMs,
      returnTimeMs
    };
  }

  function finishPronunciationCoachVideoPreview(
    message
  ) {
    const preview =
      pronunciationCoachVideoPreview;

    if (!preview) {
      return;
    }

    pronunciationCoachVideoPreview = null;
    pronunciationCoachIsModelSpeaking =
      false;
    pronunciationCoachManualPause =
      !preview.resumeRecognition;

    if (isPronunciationCoachOpen) {
      pronunciationCoachStatus.textContent =
        message || "Şimdi sen söyle";
      pronunciationCoachHeard.textContent =
        "İlerlemen kaldığı yerden korunuyor";
      renderPronunciationCoach();

      if (preview.resumeRecognition) {
        schedulePronunciationCoachRestart(
          280
        );
      }
    }

    if (preview.resumeVideoAfterReturn) {
      const video = getNetflixVideo();

      if (video) {
        void video.play();
      }
    }
  }

  function beginPronunciationCoachVideoReturn() {
    const preview =
      pronunciationCoachVideoPreview;

    if (
      !preview ||
      preview.phase === "returning"
    ) {
      return;
    }

    const video = getNetflixVideo();

    if (video && !video.paused) {
      video.pause();
    }

    preview.phase = "returning";
    preview.requestId =
      `coach-return-${Date.now()}-${Math.random()}`;
    preview.requestedAt = Date.now();

    if (isPronunciationCoachOpen) {
      pronunciationCoachStatus.textContent =
        "Video konumu geri yükleniyor";
      renderPronunciationCoach();
    }

    window.postMessage(
      {
        source: "PAUSESPEAK_EXTENSION",
        type:
          "PAUSESPEAK_COACH_RETURN_REQUEST",
        requestId: preview.requestId,
        targetTimeMs:
          preview.returnTimeMs
      },
      "*"
    );
  }

  function playCurrentPronunciationCoachChunk() {
    if (pronunciationCoachVideoPreview) {
      return;
    }

    const range =
      getPronunciationCoachVideoRange();

    if (!range) {
      pronunciationCoachStatus.textContent =
        "Videodan dinlenecek cümle bulunamadı";
      return;
    }

    const resumeRecognition =
      !pronunciationCoachManualPause;

    clearPronunciationCoachTimers();
    stopPronunciationCoachRecognition(false);
    pronunciationCoachManualPause = true;
    pronunciationCoachIsModelSpeaking =
      true;
    pronunciationCoachVideoPreview = {
      ...range,
      phase: "starting",
      requestId:
        `coach-preview-${Date.now()}-${Math.random()}`,
      requestedAt: Date.now(),
      resumeRecognition,
      resumeVideoAfterReturn: false,
      cancelRequested: false
    };
    pronunciationCoachStatus.textContent =
      `${getPlaybackPlatformLabel()} videosundan cümle hazırlanıyor`;
    pronunciationCoachHeard.textContent =
      "Cümlenin özgün sesini dinle";
    renderPronunciationCoach();

    window.postMessage(
      {
        source: "PAUSESPEAK_EXTENSION",
        type:
          "PAUSESPEAK_COACH_PREVIEW_REQUEST",
        requestId:
          pronunciationCoachVideoPreview
            .requestId,
        targetTimeMs:
          range.startTimeMs
      },
      "*"
    );
  }

  function updatePronunciationCoachVideoPreview() {
    const preview =
      pronunciationCoachVideoPreview;

    if (!preview) {
      return;
    }

    if (
      preview.phase !== "playing" &&
      Date.now() - preview.requestedAt >
      6500
    ) {
      if (preview.phase === "returning") {
        finishPronunciationCoachVideoPreview(
          "Video konumu geri yüklenemedi — ilerlemen korunuyor"
        );
      } else {
        beginPronunciationCoachVideoReturn();
      }

      return;
    }

    if (preview.phase !== "playing") {
      return;
    }

    const video = getNetflixVideo();

    if (
      !video ||
      (
        video.paused &&
        Date.now() - preview.requestedAt >
          700
      ) ||
      Number(video.currentTime) * 1000 >=
        preview.endTimeMs - 60
    ) {
      beginPronunciationCoachVideoReturn();
    }
  }

  window.addEventListener(
    "message",
    (event) => {
      if (
        event.source !== window ||
        !pronunciationCoachVideoPreview
      ) {
        return;
      }

      const data = event.data;
      const preview =
        pronunciationCoachVideoPreview;

      if (
        !data ||
        data.source !== "PAUSESPEAK_PAGE" ||
        data.requestId !== preview.requestId
      ) {
        return;
      }

      if (
        data.type ===
        "PAUSESPEAK_COACH_PREVIEW_RESPONSE"
      ) {
        if (!data.success) {
          finishPronunciationCoachVideoPreview(
            data.message ||
              "Video parçası oynatılamadı — ilerlemen korunuyor"
          );
          return;
        }

        preview.phase = "playing";
        preview.requestedAt = Date.now();
        pronunciationCoachStatus.textContent =
          `${getPlaybackPlatformLabel()} videosundan cümleyi dinliyorsun`;
        renderPronunciationCoach();

        if (preview.cancelRequested) {
          beginPronunciationCoachVideoReturn();
        }

        return;
      }

      if (
        data.type ===
        "PAUSESPEAK_COACH_RETURN_RESPONSE"
      ) {
        finishPronunciationCoachVideoPreview(
          data.success
            ? "Şimdi sen söyle"
            : "Video konumu geri yüklenemedi — ilerlemen korunuyor"
        );
      }
    }
  );

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
  function createImmediateStudySegments(
  sentence
) {
  const pieces =
    String(sentence || "").match(
      /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*(?:-[\p{L}\p{N}]+)*|\s+|[^\s\p{L}\p{N}]+/gu
    ) || [];

  return pieces.map(
    (piece) => ({
      text: piece,
      type:
        /^\s+$/u.test(piece)
          ? "spacing"
          : /^[\p{L}\p{N}]/u.test(
              piece
            )
            ? "word"
            : "punctuation"
    })
  );
}
function createStudyTokenMappings(
  segments
) {
  const mappings = [];

  for (const segment of segments) {
    if (
      !segment ||
      segment.type === "punctuation" ||
      segment.type === "spacing"
    ) {
      continue;
    }

    const words =
      String(segment.text || "").match(
        /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*(?:-[\p{L}\p{N}]+)*/gu
      ) || [];

    for (const word of words) {
      mappings.push({
        word,
        text: segment.text,
        type: segment.type
      });
    }
  }

  return mappings;
}

function clearStudySelection() {
  subtitleBox
    .querySelectorAll(
      "button[data-study-text]"
    )
    .forEach((button) => {
      button.classList.remove(
        "ps-study-selected"
      );
      button.classList.remove(
        "ps-study-keyboard-target"
      );
      button.classList.remove(
        "ps-study-hovered"
      );
      button.removeAttribute(
        "aria-current"
      );
      delete button.dataset
        .studySelectionPosition;
      button.style.outline = "none";
      button.style.outlineOffset = "0";
      button.style.borderRadius = "0";
      button.style.backgroundColor =
        "transparent";
    });
}

function getStudySelectionButtons(
  studyButtons,
  buttonIndex,
  mappedSegment
) {
  if (
    buttonIndex < 0 ||
    !mappedSegment
  ) {
    return buttonIndex >= 0
      ? [studyButtons[buttonIndex]]
      : [];
  }

  const selectedText = cleanText(
    mappedSegment.text
  ).toLowerCase();
  const selectedType = cleanText(
    mappedSegment.type
  ).toLowerCase();

  const matchesMapping = (index) => {
    const mapping =
      currentStudyTokenMappings[index];

    return Boolean(
      mapping &&
      cleanText(
        mapping.text
      ).toLowerCase() === selectedText &&
      cleanText(
        mapping.type
      ).toLowerCase() === selectedType
    );
  };

  let firstIndex = buttonIndex;
  let lastIndex = buttonIndex;

  while (
    firstIndex > 0 &&
    matchesMapping(firstIndex - 1)
  ) {
    firstIndex -= 1;
  }

  while (
    lastIndex < studyButtons.length - 1 &&
    matchesMapping(lastIndex + 1)
  ) {
    lastIndex += 1;
  }

  return studyButtons.slice(
    firstIndex,
    lastIndex + 1
  );
}

function selectStudyExpression(
  studyButtons,
  buttonIndex,
  mappedSegment
) {
  const selectedButtons =
    getStudySelectionButtons(
      studyButtons,
      buttonIndex,
      mappedSegment
    );

  applyStudySelection(
    selectedButtons
  );

  return selectedButtons;
}

function applyStudySelection(
  selectedButtons
) {
  clearStudySelection();

  selectedButtons.forEach(
    (button, index) => {
      button.classList.add(
        "ps-study-selected"
      );

      button.dataset
        .studySelectionPosition =
        selectedButtons.length === 1
          ? "single"
          : index === 0
            ? "first"
            : index ===
                selectedButtons.length - 1
              ? "last"
              : "middle";
    }
  );
}

function clearKeyboardStudyMeaningTimer() {
  if (!keyboardStudyMeaningTimer) {
    return;
  }

  window.clearTimeout(
    keyboardStudyMeaningTimer
  );

  keyboardStudyMeaningTimer = null;
}

function clearStudyKeyboardTarget() {
  subtitleBox
    .querySelectorAll(
      ".ps-study-keyboard-target"
    )
    .forEach((button) => {
      button.classList.remove(
        "ps-study-keyboard-target"
      );
      button.removeAttribute(
        "aria-current"
      );
    });
}

function getStudyButtonContext(
  segmentButton
) {
  if (
    !(segmentButton instanceof
      HTMLButtonElement) ||
    !segmentButton.matches(
      "button[data-study-text]"
    )
  ) {
    return null;
  }

  const studyButtons = [
    ...subtitleBox.querySelectorAll(
      "button[data-study-text]"
    )
  ];

  const buttonIndex =
    studyButtons.indexOf(
      segmentButton
    );

  if (buttonIndex < 0) {
    return null;
  }

  const mappedSegment =
    currentStudyTokenMappings[
      buttonIndex
    ] || null;

  return {
    studyButtons,
    buttonIndex,
    mappedSegment,
    studyText:
      mappedSegment?.text ||
      segmentButton.dataset.studyText ||
      segmentButton.textContent ||
      "",
    studyType:
      mappedSegment?.type ||
      segmentButton.dataset.studyType ||
      "word"
  };
}

function openStudyMeaningForButton(
  segmentButton,
  activationSource = "pointer"
) {
  clearKeyboardStudyMeaningTimer();

  const context =
    getStudyButtonContext(
      segmentButton
    );

  if (!context) {
    return;
  }

  const video = getNetflixVideo();

  if (video && !video.paused) {
    video.pause();

    status.textContent =
      activationSource === "keyboard"
        ? "⏸️ Seçili kelime açılıyor"
        : "⏸️ Kelime inceleniyor";
  }

  remoteStudyButtonIndex =
    context.buttonIndex;

  selectStudyExpression(
    context.studyButtons,
    context.buttonIndex,
    context.mappedSegment
  );

  void speakTranslation(
    context.studyText,
    "en"
  );

  void loadStudyMeaning(
    context.studyText,
    completedBox.textContent,
    context.studyType
  );
}

function scheduleKeyboardStudyMeaning(
  segmentButton,
  expectedButtonIndex
) {
  clearKeyboardStudyMeaningTimer();

  const expectedSentence =
    completedBox.textContent;

  keyboardStudyMeaningTimer =
    window.setTimeout(
      () => {
        keyboardStudyMeaningTimer =
          null;

        if (
          !segmentButton.isConnected ||
          remoteStudyButtonIndex !==
            expectedButtonIndex ||
          completedBox.textContent !==
            expectedSentence
        ) {
          return;
        }

        openStudyMeaningForButton(
          segmentButton,
          "keyboard"
        );
      },
      keyboardStudyMeaningDelayMs
    );
}

function selectStudyExpressionByText(
  expressionText
) {
  const expressionWords =
    String(expressionText || "")
      .match(
        /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*(?:-[\p{L}\p{N}]+)*/gu
      ) || [];

  if (expressionWords.length < 2) {
    return;
  }

  const studyButtons = [
    ...subtitleBox.querySelectorAll(
      "button[data-study-text]"
    )
  ];
  const normalizedWords =
    expressionWords.map(
      (word) =>
        cleanText(word).toLowerCase()
    );
  const buttonWords = studyButtons.map(
    (button) =>
      cleanText(
        button.dataset.studyText ||
          button.textContent
      ).toLowerCase()
  );
  const matchingStarts = [];

  for (
    let startIndex = 0;
    startIndex <=
      buttonWords.length -
        normalizedWords.length;
    startIndex += 1
  ) {
    const matches =
      normalizedWords.every(
        (word, offset) =>
          buttonWords[
            startIndex + offset
          ] === word
      );

    if (matches) {
      matchingStarts.push(startIndex);
    }
  }

  const matchingStart =
    matchingStarts.find(
      (startIndex) =>
        remoteStudyButtonIndex >=
          startIndex &&
        remoteStudyButtonIndex <
          startIndex +
            normalizedWords.length
    ) ?? matchingStarts[0];

  if (!Number.isInteger(matchingStart)) {
    return;
  }

  applyStudySelection(
    studyButtons.slice(
      matchingStart,
      matchingStart +
        normalizedWords.length
    )
  );
}

function appendStudySegments(
  container,
  segments
) {
  for (const segment of segments) {
    if (segment.type === "spacing") {
      container.appendChild(
        document.createTextNode(
          segment.text
        )
      );
      continue;
    }

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

      container.appendChild(
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
    display: "inline",
    padding: "0",
    margin: "0",
    border: "none",
    borderRadius: "0",
    outline: "none",
    backgroundColor: "transparent",
    color: "#ffffff",
    font: "inherit",
    lineHeight: "1.35",
    cursor: "pointer",
    boxShadow: "none",
    verticalAlign: "baseline"
  }
);
    let lastDirectPointerActivationAt = 0;

    segmentButton.addEventListener(
      "pointerup",
      (event) => {
        if (
          event.pointerType === "mouse" ||
          event.isPrimary === false
        ) {
          return;
        }

        lastDirectPointerActivationAt =
          Date.now();
        event.preventDefault();
        event.stopPropagation();
        openStudyMeaningForButton(
          segmentButton,
          "pointer"
        );
      }
    );

    segmentButton.addEventListener(
      "mouseenter",
      () => {
        clearKeyboardStudyMeaningTimer();
        clearStudySelection();
        remoteStudyButtonIndex = -1;
        segmentButton.classList.add(
          "ps-study-hovered"
        );
      }
    );

    segmentButton.addEventListener(
      "mouseleave",
      () => {
        segmentButton.classList.remove(
          "ps-study-hovered"
        );
      }
    );

    segmentButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (
          Date.now() -
            lastDirectPointerActivationAt <
          700
        ) {
          return;
        }

        openStudyMeaningForButton(
          segmentButton,
          "pointer"
        );
      }
    );

    container.appendChild(
      segmentButton
    );
  }
}


function renderChunkedSubtitle() {
  clearKeyboardStudyMeaningTimer();
  const shouldDecoratePronunciationCoach =
    isPronunciationCoachOpen &&
    isPronunciationCoachSessionActive;

  subtitleBox.classList.toggle(
    "ps-inline-coach-active",
    shouldDecoratePronunciationCoach
  );
  panel.classList.toggle(
    "ps-inline-coach-active",
    shouldDecoratePronunciationCoach
  );
  panel.classList.remove(
    "ps-inline-coach-complete"
  );
  subtitleBox.replaceChildren();

  translationBox.style.display =
    isChunkTranslationVisible
      ? "none"
      : "block";

  remoteStudyButtonIndex = -1;
  Object.assign(
    subtitleBox.style,
    {
      display: "flex",
      flexDirection: "column",
      flexWrap: "nowrap",
      alignItems: "stretch",
      gap: "12px"
    }
  );

  if (
    currentSubtitleChunks.length === 0
  ) {
    subtitleBox.textContent =
      "Altyazı bekleniyor...";

    return;
  }

  currentSubtitleChunks.forEach(
    (chunk, index) => {
      const chunkRow =
        document.createElement(
          "div"
        );

      Object.assign(
        chunkRow.style,
        {
          width: "100%",
          textAlign: "center"
        }
      );

      const englishLine =
        document.createElement(
          "div"
        );

      Object.assign(
        englishLine.style,
        {
          display: "block",
          textAlign: "center",
          whiteSpace: "normal"
        }
      );

      appendStudySegments(
        englishLine,
        createImmediateStudySegments(
          chunk
        )
      );

      chunkRow.appendChild(
        englishLine
      );

      if (
        isChunkTranslationVisible
      ) {
        const translationLine =
          document.createElement(
            "div"
          );

        translationLine.textContent =
          currentSubtitleChunkTranslations[
            index
          ] ||
          "Çevriliyor...";

        Object.assign(
          translationLine.style,
          {
            marginTop: "4px",
            color: "#58c7e5",
            fontSize: "20px",
            lineHeight: "1.35"
          }
        );

        chunkRow.appendChild(
          translationLine
        );
      }

      subtitleBox.appendChild(
        chunkRow
      );
    }
  );

  if (shouldDecoratePronunciationCoach) {
    synchronizePronunciationCoachChunks();
    applyPronunciationCoachStateToSubtitle();
    tryStartPronunciationCoachAfterTranslation();
  }

}

async function loadStudyMeaning(
  selectedText,
  sentence,
  segmentType
) {
  const cacheKey = [
    cleanText(sentence).toLowerCase(),
    cleanText(selectedText).toLowerCase(),
    cleanText(segmentType).toLowerCase()
  ].join("::");

  if (studyMeaningAbortController) {
    studyMeaningAbortController.abort();

    studyMeaningAbortController =
      null;
  }

  const requestNumber =
    ++studyMeaningRequestNumber;

  const cachedMeaning =
    studyMeaningCache.get(
      cacheKey
    );

  if (cachedMeaning) {
    renderStudyMeaning(
      cachedMeaning
    );

    return;
  }

  renderStudyMeaningLoading(
    selectedText
  );

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

    studyMeaningCache.set(
      cacheKey,
      meaning
    );

    if (
      studyMeaningCache.size > 100
    ) {
      const oldestKey =
        studyMeaningCache
          .keys()
          .next()
          .value;

      studyMeaningCache.delete(
        oldestKey
      );
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

    renderStudyMeaningError(
      selectedText
    );
  }
}
function renderStudyMeaning(
  meaning
) {
  selectStudyExpressionByText(
    meaning.text
  );
  studyMeaningContent.replaceChildren();

  const title =
    document.createElement("h2");

  title.textContent =
    meaning.text;
  title.className =
    "ps-study-meaning-title";

  studyMeaningContent.appendChild(
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
  meanings.className =
    "ps-study-meaning-definitions";

  studyMeaningContent.appendChild(
    meanings
  );

  if (meaning.pronunciation) {
    const pronunciation =
      document.createElement(
        "div"
      );

    pronunciation.textContent =
      `Okunuş: ${meaning.pronunciation}`;
    pronunciation.className =
      "ps-study-meaning-pronunciation";

    studyMeaningContent.appendChild(
      pronunciation
    );
  }

  if (meaning.expansion) {
    const expansion =
      document.createElement(
        "div"
      );

    expansion.textContent =
      `Açılım: ${meaning.expansion}`;
    expansion.className =
      "ps-study-meaning-expansion";

    studyMeaningContent.appendChild(
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
    note.className =
      "ps-study-meaning-note";

    studyMeaningContent.appendChild(
      note
    );
  }

  studyMeaningOverlay.classList.add(
    "ps-open"
  );
  studyMeaningOverlay.setAttribute(
    "aria-hidden",
    "false"
  );
}

function renderStudyMeaningLoading(
  selectedText
) {
  studyMeaningContent.replaceChildren();

  const title =
    document.createElement("h2");
  title.className =
    "ps-study-meaning-title";
  title.textContent = selectedText;

  const loading =
    document.createElement("div");
  loading.className =
    "ps-study-meaning-loading";
  loading.textContent =
    "Bağlama göre ayrıntılar hazırlanıyor…";

  studyMeaningContent.append(
    title,
    loading
  );
  studyMeaningOverlay.classList.add(
    "ps-open"
  );
  studyMeaningOverlay.setAttribute(
    "aria-hidden",
    "false"
  );
}

function renderStudyMeaningError(
  selectedText
) {
  studyMeaningContent.replaceChildren();

  const title =
    document.createElement("h2");
  title.className =
    "ps-study-meaning-title";
  title.textContent = selectedText;

  const errorMessage =
    document.createElement("div");
  errorMessage.className =
    "ps-study-meaning-error";
  errorMessage.textContent =
    "Ayrıntılar alınamadı. Tekrar denemek için ifadeye yeniden dokun.";

  studyMeaningContent.append(
    title,
    errorMessage
  );
  studyMeaningOverlay.classList.add(
    "ps-open"
  );
  studyMeaningOverlay.setAttribute(
    "aria-hidden",
    "false"
  );
}

let blockNextNetflixTap = false;
let blockNextNetflixTapTimeout = null;

function closeStudyMeaningPanel(
  shouldBlockNetflixTap = true
) {
  clearKeyboardStudyMeaningTimer();

  if (
    !studyMeaningOverlay.classList
      .contains("ps-open")
  ) {
    return;
  }

  studyMeaningOverlay.classList.remove(
    "ps-open"
  );
  studyMeaningOverlay.setAttribute(
    "aria-hidden",
    "true"
  );
  studyMeaningContent.replaceChildren();

  if (studyMeaningAbortController) {
    studyMeaningAbortController.abort();
    studyMeaningAbortController = null;
  }

  studyMeaningRequestNumber += 1;
  remoteStudyButtonIndex = -1;
  clearStudySelection();
  resumePronunciationCoachAfterStudyMeaning();

  if (!shouldBlockNetflixTap) {
    return;
  }

  blockNextNetflixTap = true;

  if (blockNextNetflixTapTimeout) {
    clearTimeout(
      blockNextNetflixTapTimeout
    );
  }

  blockNextNetflixTapTimeout =
    setTimeout(() => {
      blockNextNetflixTap = false;
      blockNextNetflixTapTimeout =
        null;
    }, 700);
}

function closeStudyMeaningWithoutPlaying(
  event
) {
  if (
    !studyMeaningOverlay.classList
      .contains("ps-open")
  ) {
    return;
  }

  if (
    event.isPrimary === false ||
    (
      event.pointerType === "mouse" &&
      event.button !== 0
    )
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  closeStudyMeaningPanel(true);
}

function stopNetflixTapAfterMeaningClose(
  event
) {
  if (!blockNextNetflixTap) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (event.type === "click") {
    blockNextNetflixTap = false;

    if (blockNextNetflixTapTimeout) {
      clearTimeout(
        blockNextNetflixTapTimeout
      );

      blockNextNetflixTapTimeout =
        null;
    }
  }
}

document.addEventListener(
  "pointerdown",
  closeStudyMeaningWithoutPlaying,
  true
);

document.addEventListener(
  "pointerup",
  stopNetflixTapAfterMeaningClose,
  true
);

document.addEventListener(
  "click",
  stopNetflixTapAfterMeaningClose,
  true
);

document.addEventListener(
  "pointermove",
  (event) => {
    if (
      event.pointerType !== "mouse" ||
      !keyboardStudyMeaningTimer
    ) {
      return;
    }

    clearKeyboardStudyMeaningTimer();
    clearStudySelection();
    remoteStudyButtonIndex = -1;
  },
  true
);

studyMeaningCloseButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeStudyMeaningPanel(false);
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key !== "Escape" ||
      !studyMeaningOverlay.classList
        .contains("ps-open")
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    closeStudyMeaningPanel(false);
  },
  true
);

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

          headers:
            getUsageSyncHeaders(),

  body: JSON.stringify({
  selectedText,
  sentence,
  segmentType,
  analysisMode:
    "context-expression-luna-v1"
}),

          signal:
            abortController.signal
        }
      );

    const data =
      await response.json();

    if (
      response.ok &&
      data?.success === true &&
      typeof data.text ===
        "string" &&
      Array.isArray(data.meanings)
    ) {
      recordTextUsage(
        "study_meaning",
        data.model,
        data.usage
      );
    }

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

           pronunciation:
        typeof data.pronunciation ===
          "string"
          ? data.pronunciation.trim()
          : "",

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

        headers:
          getUsageSyncHeaders(),

   body: JSON.stringify({
  text: sentence,
  analysisMode:
    "context-expression-luna-v1"
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
      response.ok &&
      data?.success === true &&
      Array.isArray(data.segments)
    ) {
      recordTextUsage(
        "study_segments",
        data.model,
        data.usage
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

    type: segment.type,

    meanings:
      Array.isArray(
        segment.meanings
      )
        ? segment.meanings.map(
            (meaning) =>
              cleanText(meaning)
          )
        : [],

    pronunciation:
      typeof segment.pronunciation ===
        "string"
        ? cleanText(
            segment.pronunciation
          )
        : "",

    expansion:
      typeof segment.expansion ===
        "string"
        ? cleanText(
            segment.expansion
          )
        : "",

    note:
      typeof segment.note ===
        "string"
        ? cleanText(
            segment.note
          )
        : ""
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
async function loadSentenceStudyAnalysis(
  sentence
) {
  if (studySegmentsAbortController) {
    studySegmentsAbortController.abort();

    studySegmentsAbortController =
      null;
  }

  const requestNumber =
    ++studySegmentsRequestNumber;

  currentSentenceStudySegments = [];
  currentStudyTokenMappings = [];

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

    currentSentenceStudySegments =
      segments;

    currentStudyTokenMappings =
      createStudyTokenMappings(
        segments
      );

    refreshPronunciationCoachProperNames();

      for (const segment of segments) {
  if (
    segment.type === "punctuation" ||
    !Array.isArray(
      segment.meanings
    ) ||
    segment.meanings.length === 0
  ) {
    continue;
  }

  const cacheKey = [
    cleanText(sentence).toLowerCase(),
    cleanText(segment.text).toLowerCase(),
    cleanText(segment.type).toLowerCase()
  ].join("::");

  studyMeaningCache.set(
    cacheKey,
    {
      text: segment.text,
      meanings: segment.meanings,
      pronunciation:
        segment.pronunciation || "",
      expansion:
        segment.expansion || "",
      note:
        segment.note || ""
    }
  );
}
  } catch (error) {
    if (
      requestNumber !==
        studySegmentsRequestNumber ||
      error.name === "AbortError"
    ) {
      return;
    }

    console.error(
      "PauseSpeak cümle ifade analizi hatası:",
      error
    );
  }
}
function normalizeSubtitleChunkValidationText(
  text
) {
  return removeSubtitleDescriptions(
    text
  )
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+"/g, '"')
    .replace(/"\s+/g, '"')
    .replace(
      /\s+([,.;:!?…])/g,
      "$1"
    )
    .replace(
      /([—–-])\s+/g,
      "$1 "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function validateSubtitleChunks(
  originalSentence,
  chunks
) {
  if (
    !Array.isArray(chunks) ||
    chunks.length < 1 ||
    chunks.length > 8 ||
    chunks.some(
      (chunk) =>
        typeof chunk !== "string" ||
        cleanText(chunk) === ""
    )
  ) {
    return false;
  }

  const expected =
    normalizeSubtitleChunkValidationText(
      originalSentence
    );
  const recombined =
    normalizeSubtitleChunkValidationText(
      chunks.join(" ")
    );

  return (
    expected !== "" &&
    expected === recombined
  );
}

function createFallbackSubtitleChunks(
  sentence
) {
  const normalizedSentence =
    cleanText(sentence);

  if (!normalizedSentence) {
    return [];
  }

  const words =
    normalizedSentence.split(" ");

  const hasInternalSentenceEnd =
    words
      .slice(0, -1)
      .some(
        (word) =>
          /[.!?…]["'’”\)\]]*$/.test(
            word
          )
      );

  if (
    words.length < 8 &&
    !hasInternalSentenceEnd
  ) {
    return [normalizedSentence];
  }

  const normalizeWord = (word) =>
    String(word || "")
      .toLocaleLowerCase("en-US")
      .replace(/[’‘`]/g, "'")
      .replace(
        /^[^a-z0-9']+|[^a-z0-9']+$/g,
        ""
      );

  const candidates = new Map();

  const addCandidate = (
    index,
    score,
    type
  ) => {
    if (
      index < 2 ||
      words.length - index < 2
    ) {
      return;
    }

    const existing =
      candidates.get(index);

    if (
      !existing ||
      score > existing.score
    ) {
      candidates.set(
        index,
        {
          index,
          score,
          type
        }
      );
    }
  };

  const clauseStarts = new Set([
    "who",
    "which",
    "where",
    "when",
    "while",
    "because",
    "although",
    "though",
    "unless",
    "if",
    "but",
    "yet",
    "so",
    "whereas"
  ]);

  const subjectStarts = new Set([
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "there",
    "this",
    "that",
    "these",
    "those"
  ]);

  const protectedBeforeTo = new Set([
    "need",
    "needs",
    "needed",
    "want",
    "wants",
    "wanted",
    "have",
    "has",
    "had",
    "used",
    "going",
    "able",
    "supposed",
    "about",
    "try",
    "tries",
    "tried",
    "plan",
    "plans",
    "planned",
    "hope",
    "hopes",
    "hoped",
    "decide",
    "decides",
    "decided",
    "expect",
    "expects",
    "expected",
    "like",
    "likes",
    "liked",
    "love",
    "loves",
    "loved",
    "prefer",
    "prefers",
    "preferred",
    "start",
    "starts",
    "started",
    "begin",
    "begins",
    "began",
    "continue",
    "continues",
    "continued",
    "forward",
    "due",
    "according",
    "accustomed",
    "am",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "go",
    "goes",
    "went",
    "come",
    "comes",
    "came",
    "get",
    "gets",
    "got",
    "travel",
    "travels",
    "traveled",
    "return",
    "returns",
    "returned",
    "move",
    "moves",
    "moved",
    "walk",
    "walks",
    "walked",
    "drive",
    "drives",
    "drove",
    "fly",
    "flies",
    "flew",
    "head",
    "heads",
    "headed",
    "lead",
    "leads",
    "led",
    "belong",
    "belongs",
    "listen",
    "listens",
    "talk",
    "talks",
    "speak",
    "speaks"
  ]);

  const naturalPhraseStarts =
    new Set([
      "by",
      "on",
      "in",
      "at",
      "with",
      "without",
      "throughout",
      "around",
      "for",
      "from",
      "into",
      "over",
      "under",
      "as"
    ]);

  const protectedPhraseBoundaries =
    new Set([
      "depend on",
      "depends on",
      "rely on",
      "relies on",
      "focus on",
      "focuses on",
      "work on",
      "works on",
      "insist on",
      "insists on",
      "believe in",
      "believes in",
      "succeed in",
      "succeeds in",
      "participate in",
      "participates in",
      "result in",
      "results in",
      "deal with",
      "deals with",
      "agree with",
      "agrees with",
      "cope with",
      "copes with",
      "suffer from",
      "suffers from",
      "recover from",
      "recovers from",
      "ask for",
      "asks for",
      "look for",
      "looks for",
      "wait for",
      "waits for",
      "care for",
      "cares for"
    ]);

  const isNumericComma = (
    index
  ) => {
    const rawWord = words[index];

    if (!/,\s*$/.test(rawWord)) {
      return false;
    }

    const numberBefore =
      rawWord === ","
        ? words[index - 1]
        : rawWord.slice(0, -1);

    const numberAfter =
      words[index + 1];

    return (
      /\d$/.test(numberBefore || "") &&
      /^\d/.test(numberAfter || "")
    );
  };

  words.forEach(
    (rawWord, index) => {
      const word =
        normalizeWord(rawWord);

      const previousWord =
        normalizeWord(
          words[index - 1]
        );

      const nextWord =
        normalizeWord(
          words[index + 1]
        );

      if (
        index < words.length - 1 &&
        /[.!?…]["'’”\)\]]*$/.test(
          rawWord
        )
      ) {
        addCandidate(
          index + 1,
          140,
          "sentence"
        );
      } else if (
        /[,;:]["'’”\)\]]*$/.test(
          rawWord
        ) &&
        !isNumericComma(index)
      ) {
        addCandidate(
          index + 1,
          115,
          "punctuation"
        );
      }

      if (clauseStarts.has(word)) {
        addCandidate(
          index,
          120,
          "clause"
        );
      }

      if (
        word === "and" &&
        subjectStarts.has(nextWord)
      ) {
        addCandidate(
          index,
          105,
          "new-clause"
        );
      }

      if (
        word === "to" &&
        index >= 4 &&
        words.length - index >= 3 &&
        !protectedBeforeTo.has(
          previousWord
        )
      ) {
        addCandidate(
          index,
          85,
          "infinitive"
        );
      }

      if (
        naturalPhraseStarts.has(word) &&
        !protectedPhraseBoundaries.has(
          `${previousWord} ${word}`
        )
      ) {
        addCandidate(
          index,
          55,
          "phrase"
        );
      }
    }
  );

  const strongCandidates =
    [...candidates.values()]
      .filter(
        (candidate) =>
          candidate.score >= 80
      )
      .sort(
        (first, second) =>
          first.index - second.index
      );

  const selectedStrong = [];

  for (
    const candidate of strongCandidates
  ) {
    const minimumWords =
      candidate.type === "sentence"
        ? 2
        : 3;

    const previousBoundary =
      selectedStrong.length > 0
        ? selectedStrong[
            selectedStrong.length - 1
          ].index
        : 0;

    if (
      candidate.index -
        previousBoundary >=
          minimumWords &&
      words.length -
        candidate.index >=
          minimumWords
    ) {
      selectedStrong.push(candidate);
      continue;
    }

    const previousCandidate =
      selectedStrong[
        selectedStrong.length - 1
      ];

    const boundaryBeforePrevious =
      selectedStrong.length > 1
        ? selectedStrong[
            selectedStrong.length - 2
          ].index
        : 0;

    if (
      previousCandidate &&
      candidate.score >
        previousCandidate.score &&
      candidate.index -
        boundaryBeforePrevious >=
          minimumWords &&
      words.length -
        candidate.index >=
          minimumWords
    ) {
      selectedStrong[
        selectedStrong.length - 1
      ] = candidate;
    }
  }

  const unsafeBeforeSplit = new Set([
    "a",
    "an",
    "the",
    "my",
    "your",
    "his",
    "her",
    "its",
    "our",
    "their",
    "this",
    "that",
    "these",
    "those",
    "to",
    "of",
    "in",
    "on",
    "at",
    "for",
    "with",
    "without",
    "by",
    "from",
    "as",
    "and",
    "or",
    "but",
    "so",
    "not",
    "will",
    "would",
    "can",
    "could",
    "shall",
    "should",
    "may",
    "might",
    "must",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "is",
    "am",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being"
  ]);

  const findBalancedSplit = (
    start,
    end
  ) => {
    const phraseCandidates =
      [...candidates.values()]
        .filter(
          (candidate) =>
            candidate.score < 80 &&
            candidate.index - start >= 3 &&
            end - candidate.index >= 3
        )
        .sort(
          (first, second) => {
            const firstBalance =
              Math.abs(
                first.index - start -
                  (end - first.index)
              );

            const secondBalance =
              Math.abs(
                second.index - start -
                  (end - second.index)
              );

            return (
              second.score - first.score ||
              firstBalance - secondBalance
            );
          }
        );

    if (phraseCandidates.length > 0) {
      return phraseCandidates[0].index;
    }

    if (end - start < 14) {
      return null;
    }

    const midpoint =
      Math.round((start + end) / 2);

    const possibleSplits = [];

    for (
      let index = start + 4;
      index <= end - 4;
      index += 1
    ) {
      const previousWord =
        normalizeWord(
          words[index - 1]
        );

      const currentWord =
        normalizeWord(words[index]);

      if (
        !currentWord ||
        unsafeBeforeSplit.has(
          previousWord
        )
      ) {
        continue;
      }

      possibleSplits.push(index);
    }

    possibleSplits.sort(
      (first, second) =>
        Math.abs(first - midpoint) -
        Math.abs(second - midpoint)
    );

    return possibleSplits[0] ?? null;
  };

  const finalBoundaries = [0];

  const appendRefinedSegment = (
    start,
    end
  ) => {
    if (end - start <= 9) {
      finalBoundaries.push(end);
      return;
    }

    const splitIndex =
      findBalancedSplit(start, end);

    if (!splitIndex) {
      finalBoundaries.push(end);
      return;
    }

    appendRefinedSegment(
      start,
      splitIndex
    );

    appendRefinedSegment(
      splitIndex,
      end
    );
  };

  const primaryBoundaries = [
    0,
    ...selectedStrong.map(
      (candidate) => candidate.index
    ),
    words.length
  ];

  for (
    let index = 1;
    index < primaryBoundaries.length;
    index += 1
  ) {
    appendRefinedSegment(
      primaryBoundaries[index - 1],
      primaryBoundaries[index]
    );
  }

  const uniqueBoundaries =
    [...new Set(finalBoundaries)]
      .sort(
        (first, second) =>
          first - second
      );

  const chunks = [];

  for (
    let index = 1;
    index < uniqueBoundaries.length;
    index += 1
  ) {
    const chunk = words
      .slice(
        uniqueBoundaries[index - 1],
        uniqueBoundaries[index]
      )
      .join(" ")
      .trim();

    if (chunk) {
      chunks.push(chunk);
    }
  }

  if (
    chunks.length < 2 ||
    cleanText(chunks.join(" ")) !==
      normalizedSentence
  ) {
    return [normalizedSentence];
  }

  return chunks;
}

function getSubtitleChunkCache() {
  if (
    !(requestSubtitleChunks.chunkCache
      instanceof Map)
  ) {
    requestSubtitleChunks.chunkCache =
      new Map();
  }

  return requestSubtitleChunks.chunkCache;
}

function getCachedSubtitleChunks(
  sentence
) {
  const cacheKey =
    cleanText(sentence).toLowerCase();
  const chunkCache =
    getSubtitleChunkCache();
  const cachedChunks =
    chunkCache.get(cacheKey);

  if (
    validateSubtitleChunks(
      sentence,
      cachedChunks
    )
  ) {
    return [...cachedChunks];
  }

  if (Array.isArray(cachedChunks)) {
    chunkCache.delete(cacheKey);
  }

  return null;
}

function cacheSubtitleChunks(
  sentence,
  chunks
) {
  if (
    !validateSubtitleChunks(
      sentence,
      chunks
    )
  ) {
    return;
  }

  const cacheKey =
    cleanText(sentence).toLowerCase();
  const chunkCache =
    getSubtitleChunkCache();

  chunkCache.set(
    cacheKey,
    [...chunks]
  );

  if (chunkCache.size > 500) {
    chunkCache.delete(
      chunkCache.keys().next().value
    );
  }
}

async function fetchSubtitleChunks(
  sentence,
  signal
) {
  const cachedChunks =
    getCachedSubtitleChunks(sentence);

  if (
    cachedChunks &&
    getCachedSubtitleChunkTranslations(
      sentence,
      cachedChunks
    )
  ) {
    return cachedChunks;
  }

  const fallbackChunks = [
    cleanText(sentence)
  ].filter(Boolean);

  const response = await fetch(
    chunkApiUrl,
    {
      method: "POST",
      headers: getUsageSyncHeaders(),
      body: JSON.stringify({
        text: sentence
      }),
      signal
    }
  );
  const data = await response.json();

  if (
    response.ok &&
    data?.success &&
    Array.isArray(data.chunks) &&
    Array.isArray(data.translations)
  ) {
    recordTextUsage(
      "chunk_translation",
      data.model,
      data.usage
    );
  }

  if (
    !response.ok ||
    !data?.success ||
    !Array.isArray(data.chunks) ||
    !Array.isArray(data.translations)
  ) {
    throw new Error(
      data?.error ||
        "Altyazı parçaları alınamadı."
    );
  }

  const chunks = data.chunks
    .filter(
      (chunk) =>
        typeof chunk === "string" &&
        chunk.trim() !== ""
    )
    .map((chunk) => cleanText(chunk));
  const translations =
    data.translations.map(
      (translation) =>
        typeof translation === "string"
          ? cleanText(translation)
          : ""
    );

  if (
    validateSubtitleChunks(
      sentence,
      chunks
    ) &&
    translations.length ===
      chunks.length &&
    translations.every(Boolean)
  ) {
    cacheSubtitleChunks(
      sentence,
      chunks
    );
    cacheSubtitleChunkTranslations(
      sentence,
      chunks,
      translations
    );
    return chunks;
  }

  if (chunks.length > 1) {
    console.warn(
      "PauseSpeak çakışan veya eksik altyazı parçalarını reddetti.",
      {
        sentence,
        chunks
      }
    );
  }

  return fallbackChunks;
}

async function requestSubtitleChunks(
  sentence,
  requestNumber
) {
  const controller =
    new AbortController();

  subtitleChunkAbortController =
    controller;

  const timeoutId =
    setTimeout(() => {
      controller.abort();
    }, chunkTimeoutMs);

  try {
    const chunks =
      await fetchSubtitleChunks(
        sentence,
        controller.signal
      );

    if (
      requestNumber !==
      subtitleChunkRequestNumber
    ) {
      return null;
    }

    return chunks;
  } finally {
    clearTimeout(timeoutId);

    if (
      subtitleChunkAbortController ===
      controller
    ) {
      subtitleChunkAbortController =
        null;
    }
  }
}

function getSubtitleChunkTranslationCache() {
  if (
    !(requestSubtitleChunkTranslation
      .translationCache instanceof Map)
  ) {
    requestSubtitleChunkTranslation
      .translationCache = new Map();
  }

  return requestSubtitleChunkTranslation
    .translationCache;
}

function getSubtitleChunkTranslationCacheKey(
  text,
  previousText,
  fullText
) {
  return JSON.stringify([
    cleanText(text).toLowerCase(),
    cleanText(previousText).toLowerCase(),
    cleanText(fullText).toLowerCase()
  ]);
}

function getCachedSubtitleChunkTranslation(
  text,
  previousText,
  fullText
) {
  return getSubtitleChunkTranslationCache()
    .get(
      getSubtitleChunkTranslationCacheKey(
        text,
        previousText,
        fullText
      )
    ) || "";
}

function getCachedSubtitleChunkTranslations(
  sentence,
  chunks
) {
  const translations = [];
  let previousText = "";

  for (const chunk of chunks) {
    const translation =
      getCachedSubtitleChunkTranslation(
        chunk,
        previousText,
        sentence
      );

    if (!translation) {
      return null;
    }

    translations.push(translation);
    previousText = chunk;
  }

  return translations;
}

function cacheSubtitleChunkTranslations(
  sentence,
  chunks,
  translations
) {
  if (
    !validateSubtitleChunks(
      sentence,
      chunks
    ) ||
    !Array.isArray(translations) ||
    translations.length !== chunks.length ||
    translations.some(
      (translation) =>
        typeof translation !== "string" ||
        cleanText(translation) === ""
    )
  ) {
    return false;
  }

  const translationCache =
    getSubtitleChunkTranslationCache();
  let previousText = "";

  chunks.forEach((chunk, index) => {
    translationCache.set(
      getSubtitleChunkTranslationCacheKey(
        chunk,
        previousText,
        sentence
      ),
      cleanText(translations[index])
    );
    previousText = chunk;
  });

  while (translationCache.size > 500) {
    translationCache.delete(
      translationCache.keys().next().value
    );
  }

  return true;
}

async function requestSubtitleChunkTranslation(
  text,
  previousText,
  fullText,
  signal,
  improve = false
) {
  const cacheKey =
    getSubtitleChunkTranslationCacheKey(
      text,
      previousText,
      fullText
    );
  const translationCache =
    getSubtitleChunkTranslationCache();

  const cachedTranslation =
    translationCache.get(cacheKey);

  if (
    !improve &&
    typeof cachedTranslation ===
      "string" &&
    cachedTranslation !== ""
  ) {
    return cachedTranslation;
  }

  const response =
    await fetch(
      translationApiUrl,
      {
        method: "POST",

        headers:
          getUsageSyncHeaders(),

        body: JSON.stringify({
          text,
          previousText,
          fullText,
          translationMode: "chunk",
          improve
        }),

        signal
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data?.success ||
    typeof data.translation !==
      "string"
  ) {
    throw new Error(
      data?.error ||
        "Parça çevirisi alınamadı."
    );
  }

  recordTextUsage(
    improve
      ? "improve_chunk"
      : "chunk_translation",
    data.model,
    data.usage
  );

  const translation =
    cleanText(
      data.translation
    );

  translationCache.set(
    cacheKey,
    translation
  );

  if (
    translationCache.size > 500
  ) {
    translationCache.delete(
      translationCache.keys().next().value
    );
  }

  return translation;
}

async function loadSubtitleChunkTranslations(
  sentence
) {
  if (
    subtitleTranslationAbortController
  ) {
    subtitleTranslationAbortController
      .abort();

    subtitleTranslationAbortController =
      null;
  }

  const requestNumber =
    ++subtitleTranslationRequestNumber;

  if (
    !isChunkTranslationVisible ||
    currentSubtitleChunks.length === 0
  ) {
    return;
  }

  const chunks =
    [...currentSubtitleChunks];
  const cachedTranslations =
    getCachedSubtitleChunkTranslations(
      sentence,
      chunks
    );

  if (cachedTranslations) {
    currentSubtitleChunkTranslations =
      cachedTranslations;
    renderChunkedSubtitle();
    return;
  }

  const controller =
    new AbortController();

  subtitleTranslationAbortController =
    controller;

  const timeoutId =
    setTimeout(() => {
      controller.abort();
    }, translationTimeoutMs);

  let previousCachedText = "";

  currentSubtitleChunkTranslations =
    chunks.map((chunk) => {
      const translation =
        getCachedSubtitleChunkTranslation(
          chunk,
          previousCachedText,
          sentence
        );

      previousCachedText = chunk;
      return translation;
    });

  renderChunkedSubtitle();

  try {
    let previousText = "";

    for (
      let index = 0;
      index < chunks.length;
      index += 1
    ) {
      const translation =
        await requestSubtitleChunkTranslation(
          chunks[index],
          previousText,
          sentence,
          controller.signal
        );

      if (
        requestNumber !==
          subtitleTranslationRequestNumber ||
        !isChunkTranslationVisible ||
        completedBox.textContent !==
          sentence
      ) {
        return;
      }

      currentSubtitleChunkTranslations[
        index
      ] = translation;

      previousText =
        chunks[index];

      renderChunkedSubtitle();
    }
  } catch (error) {
    if (
      requestNumber !==
        subtitleTranslationRequestNumber ||
      error.name ===
        "AbortError"
    ) {
      return;
    }

    console.error(
      "PauseSpeak parça çevirisi hatası:",
      error
    );

    if (
      isChunkTranslationVisible &&
      cleanText(completedBox.textContent) ===
        cleanText(sentence)
    ) {
      currentSubtitleChunkTranslations =
        chunks.map(
          (chunk, index) =>
            currentSubtitleChunkTranslations[
              index
            ] ||
            "Çeviri alınamadı; yeniden deneyin."
        );
      renderChunkedSubtitle();
    }
  } finally {
    clearTimeout(timeoutId);

    if (
      subtitleTranslationAbortController ===
      controller
    ) {
      subtitleTranslationAbortController =
        null;
    }
  }
}

async function loadStudySegments(
  sentence
) {
  subtitleTranslationRequestNumber += 1;

  if (
    subtitleTranslationAbortController
  ) {
    subtitleTranslationAbortController
      .abort();

    subtitleTranslationAbortController =
      null;
  }

  if (subtitleChunkAbortController) {
    subtitleChunkAbortController.abort();

    subtitleChunkAbortController =
      null;
  }

  const requestNumber =
    ++subtitleChunkRequestNumber;

  const cachedChunks =
    getCachedSubtitleChunks(sentence);

  currentSubtitleChunks =
    cachedChunks ||
    createFallbackSubtitleChunks(
      sentence
    );

  currentSubtitleChunkTranslations =
    isChunkTranslationVisible &&
    cachedChunks
      ? getCachedSubtitleChunkTranslations(
          sentence,
          cachedChunks
        ) || []
      : [];

  renderChunkedSubtitle();

  if (!isChunkTranslationVisible) {
    return;
  }

  try {
    const chunks =
      await requestSubtitleChunks(
        sentence,
        requestNumber
      );

    if (
      !chunks ||
      requestNumber !==
        subtitleChunkRequestNumber ||
      completedBox.textContent !==
        sentence
    ) {
      return;
    }

    currentSubtitleChunks =
      chunks;

    currentSubtitleChunkTranslations =
      isChunkTranslationVisible
        ? getCachedSubtitleChunkTranslations(
            sentence,
            chunks
          ) || []
        : [];

    renderChunkedSubtitle();

    if (
      isChunkTranslationVisible
    ) {
      void loadSubtitleChunkTranslations(
        sentence
      );
    }
  } catch (error) {
    if (
      requestNumber !==
        subtitleChunkRequestNumber
    ) {
      return;
    }

    const safeChunk =
      cleanText(sentence);
    const cachedFullTranslation =
      getCachedCueTranslation(sentence);

    currentSubtitleChunks =
      safeChunk ? [safeChunk] : [];

    currentSubtitleChunkTranslations =
      cachedFullTranslation
        ? [cachedFullTranslation]
        : [];

    if (
      safeChunk &&
      cachedFullTranslation
    ) {
      cacheSubtitleChunks(
        sentence,
        currentSubtitleChunks
      );
      cacheSubtitleChunkTranslations(
        sentence,
        currentSubtitleChunks,
        currentSubtitleChunkTranslations
      );
    }

    renderChunkedSubtitle();

    if (
      isChunkTranslationVisible
    ) {
      if (!cachedFullTranslation) {
        void loadSubtitleChunkTranslations(
          sentence
        );
      }
    }

    if (
      error.name ===
      "AbortError"
    ) {
      return;
    }

    console.error(
      "PauseSpeak altyazı parçalama hatası:",
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

          headers:
            getUsageSyncHeaders(),

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

    pronunciationRetryWords = [];
    pronunciationRetryWordIndex = 0;

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
      "retry-word"
    ) {
      return (
        pronunciationRetryWords[
          pronunciationRetryWordIndex
        ] || ""
      );
    }

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

  function startPronunciationWordRetry(
    targetText,
    spokenText
  ) {
    const retryWords =
      getPronunciationRetryWords(
        targetText,
        spokenText
      );

    if (retryWords.length === 0) {
      return false;
    }

    pronunciationRetryWords =
      retryWords;

    pronunciationRetryWordIndex = 0;
    pronunciationMode = "retry-word";

    const firstWord =
      pronunciationRetryWords[0];

    nowSpeakBox.textContent =
      firstWord;

    nowSpeakBox.style.display =
      "block";

    pronunciationResultBox.textContent =
      `Yalnızca "${firstWord}" kelimesini tekrar söyle.`;

    status.textContent =
      "🎤 Yanlış kelimeyi söyle";

    speakButton.textContent =
      "🎤 Kelimeyi Söyle";

    scheduleAutomaticSpeechStart();

    return true;
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
      "retry-word"
    ) {
      const currentWord =
        getCurrentPronunciationTarget();

      if (!result.success) {
        pronunciationResultBox.textContent =
          `"${currentWord}" kelimesini tekrar söyle. ` +
          `Benzerlik: %${percentage}`;

        status.textContent =
          "🔁 Yanlış kelimeyi tekrar söyle";

        speakButton.textContent =
          "🎤 Kelimeyi Tekrar Söyle";

        scheduleAutomaticSpeechStart();

        return;
      }

      pronunciationRetryWordIndex += 1;

      if (
        pronunciationRetryWordIndex <
        pronunciationRetryWords.length
      ) {
        const nextWord =
          pronunciationRetryWords[
            pronunciationRetryWordIndex
          ];

        nowSpeakBox.textContent =
          nextWord;

        pronunciationResultBox.textContent =
          `✅ Doğru. Şimdi "${nextWord}" kelimesini söyle.`;

        status.textContent =
          "🎤 Sıradaki yanlış kelimeyi söyle";

        speakButton.textContent =
          "🎤 Kelimeyi Söyle";

        scheduleAutomaticSpeechStart();

        return;
      }

      pronunciationRetryWords = [];
      pronunciationRetryWordIndex = 0;

      void continueVideoAfterSuccess();

      return;
    }

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

        await startChunkPractice(true);

    return;

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

     await startChunkPractice(true);

    return;

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
 recognition.maxAlternatives = 5;

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

         spokenTitle.style.display =
        "block";

      spokenBox.style.display =
        "block";

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
                    const speechResult =
            event.results[index];

          let transcript =
            cleanText(
              speechResult[
                0
              ]?.transcript || ""
            );

          if (
            pronunciationMode ===
              "retry-word" &&
            speechResult.length > 1
          ) {
            const targetWord =
              getCurrentPronunciationTarget();

            let bestScore =
              comparePronunciation(
                targetWord,
                transcript
              ).score;

            for (
              let alternativeIndex = 1;
              alternativeIndex <
                speechResult.length;
              alternativeIndex += 1
            ) {
              const alternativeText =
                cleanText(
                  speechResult[
                    alternativeIndex
                  ]?.transcript || ""
                );

              if (!alternativeText) {
                continue;
              }

              const alternativeScore =
                comparePronunciation(
                  targetWord,
                  alternativeText
                ).score;

              if (
                alternativeScore >
                bestScore
              ) {
                transcript =
                  alternativeText;

                bestScore =
                  alternativeScore;
              }
            }
          }

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

        const currentTargetResult =
          pronunciationMode ===
            "retry-word" ||
          pronunciationMode ===
            "chunk"
            ? comparePronunciation(
                getCurrentPronunciationTarget(),
                recognizedText
              )
            : null;

        if (
          currentTargetResult?.success
        ) {
          clearSpeechSilenceTimeout();

          try {
            recognition.stop();
          } catch (error) {
            console.warn(
              "PauseSpeak doğru kelime sonrası durdurma uyarısı:",
              error
            );
          }

          return;
        }

        clearSpeechSilenceTimeout();

            const silenceDelayMs =
          pronunciationMode ===
          "retry-word"
            ? 450
            : pronunciationMode ===
                "chunk"
              ? 5000
              : 1800;

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
                }, silenceDelayMs);
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

  function closePauseSpeakMenus(
    exceptMenu = null
  ) {
    [
      settingsMenu,
      audioMenu,
      moreMenu
    ].forEach((menu) => {
      if (menu === exceptMenu) {
        return;
      }

      menu.classList.remove(
        "ps-open"
      );
      menu.style.display = "none";
    });
  }

  function togglePauseSpeakMenu(menu) {
    const shouldOpen =
      !menu.classList.contains(
        "ps-open"
      );

    closePauseSpeakMenus(
      shouldOpen ? menu : null
    );
    menu.classList.toggle(
      "ps-open",
      shouldOpen
    );
    menu.style.display =
      shouldOpen ? "flex" : "none";
    showInterfaceControls();
  }

  moreButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      togglePauseSpeakMenu(
        moreMenu
      );
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

  updateSentencePauseController(
    getNetflixVideo()
  );


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

return;
    }

    speakButton.disabled =
      completedStartTimeMs === null ||
      !SpeechRecognitionClass;

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
turkishTranslationSpeechToggleButton.addEventListener(
  "click",
  () => {
    isTurkishTranslationSpeechEnabled =
      !isTurkishTranslationSpeechEnabled;

    turkishTranslationSpeechToggleButton.textContent =
      isTurkishTranslationSpeechEnabled
        ? "Türkçe Ses: Açık"
        : "Türkçe Ses: Kapalı";
        if (!isTurkishTranslationSpeechEnabled) {
  stopTranslationSpeech();
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

    sentencePauseController.armed = null;
    updateSentencePauseController(
      getNetflixVideo()
    );
  }
);
  function finishSentence(
    video,
    sentenceSpan = null,
    pauseCommittedByController = false
  ) {
    const fullSentence =
      cleanText(
        sentenceSpan?.spokenText ||
          sentenceParts.join(" ")
      );

    if (!fullSentence) {
      return;
    }

    cancelTerraImprovement();

    if (
      !isReplayPlaybackActive &&
      completedStartTimeMs !== null
    ) {
      previousSentenceText =
        cleanText(
          completedBox.textContent
        );

      previousSentenceStartTimeMs =
        completedStartTimeMs;
      previousSentenceEndTimeMs =
        completedEndTimeMs;

      previousSentenceButton.disabled =
        !previousSentenceText;
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

  if (!isChunkTranslationVisible) {
    void speakTranslation(
      translationBox.textContent
    );
  }
} else {
      const previousText =
        previousCompletedSentence;

      currentTranslationPreviousText =
        previousText;

      previousCompletedSentence =
        fullSentence;

      if (isChunkTranslationVisible) {
        stopNormalTranslation();
      } else {
        void translateSentence(
          fullSentence,
          previousText
        );
      }
    }

    const currentTime =
      video
        ? Number(
            video.currentTime
          )
        : 0;

    if (
      sentenceSpan &&
      Number.isFinite(
        Number(
          sentenceSpan.startTimeMs
        )
      ) &&
      Number.isFinite(
        Number(
          sentenceSpan.endTimeMs
        )
      )
    ) {
      completedStartTimeMs =
        Math.max(
          0,
          Number(
            sentenceSpan.startTimeMs
          )
        );
      completedEndTimeMs = Math.max(
        completedStartTimeMs + 1,
        Number(
          sentenceSpan.endTimeMs
        )
      );
    } else {
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

      completedEndTimeMs = Math.max(
        completedStartTimeMs + 800,
        currentTime * 1000
      );
    }

updateTerraImproveButtonState();

pronunciationCoachButton.disabled =
  false;

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
const spokenWordCount =
  getWordTokens(
    fullSentence
  ).length;

const shouldStartPronunciation =
  spokenWordCount >= 3;

if (pauseCommittedByController) {
  status.textContent =
    "⏸️ Cümle bitti — video durduruldu";
} else if (
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
  isPronunciationEnabled &&
  shouldStartPronunciation
) {
  scheduleAutomaticSpeechStart();
}

if (
  isPronunciationCoachSessionActive &&
  shouldStartPronunciation
) {
  setTimeout(() => {
    openPronunciationCoach(
      fullSentence,
      false
    );
  }, 0);
}
  }

function setSubtitlePanelVisibility(
  shouldShow
) {
  isSubtitlePanelHidden =
    !shouldShow;
  subtitleHiddenAtSentence = "";
  panel.style.display =
    shouldShow ? "block" : "none";
  subtitleVisibilityButton.textContent =
    shouldShow
      ? "Çeviri kartını gizle"
      : "Çeviri kartını göster";
  transcriptButton.classList.toggle(
    "ps-active",
    shouldShow
  );
  transcriptButton.setAttribute(
    "aria-pressed",
    String(shouldShow)
  );
}

function setTranscriptPanelVisibility(
  shouldShow
) {
  transcriptOverlay.style.display =
    shouldShow ? "flex" : "none";
  panel.classList.toggle(
    "ps-panel-shifted",
    shouldShow
  );
  controlsPanel.classList.toggle(
    "ps-transcript-open",
    shouldShow
  );
  panelVisibilityButton.classList.toggle(
    "ps-active",
    shouldShow
  );
  panelVisibilityButton.title =
    shouldShow
      ? "Sağdaki altyazı geçmişini kapat"
      : "Sağdaki altyazı geçmişini göster";
  panelVisibilityButton.setAttribute(
    "aria-label",
    panelVisibilityButton.title
  );
  panelVisibilityButton.setAttribute(
    "aria-pressed",
    String(shouldShow)
  );

  if (!shouldShow) {
    exportMenu.classList.remove(
      "ps-open"
    );
    exportButton.classList.remove(
      "ps-active"
    );
  }

  window.requestAnimationFrame(
    updateOverlaySpacing
  );
}

function updateMediaTitle() {
  const titleText = String(
    document.title || ""
  )
    .replace(
      /\s*[-|]\s*(?:Netflix|YouTube).*$/i,
      ""
    )
    .trim();

  mediaTitle.textContent =
    titleText || "PauseSpeak";
}

function updateOverlaySpacing() {
  const playerRectangle =
    playerShell.getBoundingClientRect();

  if (
    playerRectangle.height <= 0 ||
    playerRectangle.top <= 0
  ) {
    return;
  }

  const reservedSpace = Math.max(
    72,
    Math.ceil(
      window.innerHeight -
        playerRectangle.top +
        28
    )
  );

  controlsPanel.style.setProperty(
    "--ps-card-bottom",
    `${reservedSpace}px`
  );
}

function updatePlayerChrome() {
  const video = getNetflixVideo();

  updateMediaTitle();
  updateOverlaySpacing();
  mediaSubtitle.textContent =
    status.textContent ||
    "PauseSpeak hazır";

  if (!video) {
    currentTimeLabel.textContent =
      "0:00";
    durationLabel.textContent =
      "0:00";
    progressRange.value = "0";
    progressRange.style.setProperty(
      "--ps-progress",
      "0%"
    );
    playPauseButton.disabled = true;
    seekBackwardButton.disabled = true;
    seekForwardButton.disabled = true;
    previousSentenceButton.disabled = true;
    nextSentenceButton.disabled = true;
    return;
  }

  const currentTime = Math.max(
    0,
    Number(video.currentTime) || 0
  );
  const cues = getTranscriptCues().cues;
  const cueDuration =
    cues.length > 0
      ? Math.max(
          0,
          Number(
            cues[cues.length - 1]
              .endTimeMs
          ) / 1000
        )
      : 0;
  const videoDuration = Number(
    video.duration
  );
  const duration =
    Number.isFinite(videoDuration) &&
    videoDuration > 0
      ? videoDuration
      : cueDuration;
  const progress = duration > 0
    ? Math.min(
        1000,
        Math.max(
          0,
          Math.round(
            currentTime / duration * 1000
          )
        )
      )
    : 0;

  currentTimeLabel.textContent =
    formatTranscriptTime(
      currentTime * 1000
    );
  durationLabel.textContent =
    formatTranscriptTime(
      duration * 1000
    );

  if (
    progressRange.dataset.dragging !==
    "true"
  ) {
    progressRange.value =
      String(progress);
  }

  progressRange.style.setProperty(
    "--ps-progress",
    `${Number(progressRange.value) /
      10}%`
  );

  setPauseSpeakButton(
    playPauseButton,
    video.paused ? "play" : "pause"
  );
  playPauseButton.setAttribute(
    "aria-label",
    video.paused
      ? "Videoyu oynat"
      : "Videoyu duraklat"
  );
  speedButton.textContent =
    `${Number(video.playbackRate || 1)
      .toFixed(2)
      .replace(/0$/, "")}x`;

  playPauseButton.disabled = false;
  seekBackwardButton.disabled =
    currentTime <= 0.05;
  seekForwardButton.disabled =
    duration > 0 &&
    currentTime >= duration - 0.05;

  const navigationReferenceTimeMs =
    getSentenceNavigationReferenceTimeMs(
      video
    );
  const previousTranscriptSentence =
    getAdjacentTranscriptSentence(
      cues,
      navigationReferenceTimeMs,
      -1
    );
  const nextTranscriptSentence =
    getAdjacentTranscriptSentence(
      cues,
      navigationReferenceTimeMs,
      1
    );

  previousSentenceButton.disabled =
    !previousTranscriptSentence &&
    !(
      previousSentenceText &&
      previousSentenceStartTimeMs !== null
    );
  nextSentenceButton.disabled =
    !nextTranscriptSentence;
}

function seekVideoRelative(seconds) {
  const video = getNetflixVideo();

  if (!video) {
    return;
  }

  const duration = Number(
    video.duration
  );
  const targetSeconds = Math.max(
    0,
    Number(video.currentTime) +
      seconds
  );
  const boundedTargetSeconds =
    Number.isFinite(duration) &&
    duration > 0
      ? Math.min(
          duration,
          targetSeconds
        )
      : targetSeconds;

  requestNetflixSeek(
    boundedTargetSeconds * 1000,
    seconds < 0
      ? "10 saniye geri gidiliyor…"
      : "10 saniye ileri gidiliyor…"
  );
  status.textContent =
    seconds < 0
      ? "↶ 10 saniye geri gidiliyor"
      : "↷ 10 saniye ileri gidiliyor";
  updatePlayerChrome();
}

function showInterfaceControls(
  allowReveal = false
) {
  if (isInterfaceHidden) {
    return;
  }

  if (
    controlsPanel.classList.contains(
      "ps-controls-hidden"
    ) &&
    !allowReveal
  ) {
    return;
  }

  controlsPanel.classList.remove(
    "ps-controls-hidden"
  );

  if (controlsHideTimeout) {
    clearTimeout(controlsHideTimeout);
    controlsHideTimeout = null;
  }

  controlsHideTimeout =
    window.setTimeout(() => {
      controlsHideTimeout = null;
      const video = getNetflixVideo();
      const hasOpenMenu = [
        settingsMenu,
        audioMenu,
        moreMenu
      ].some((menu) =>
        menu.classList.contains(
          "ps-open"
        )
      );
      const hasOpenWorkPanel =
        transcriptOverlay.style.display !==
          "none" ||
        usageOverlay.style.display !==
          "none" ||
        studyMeaningOverlay.classList.contains(
          "ps-open"
        ) ||
        isPronunciationCoachOpen;

      if (
        video &&
        !hasOpenMenu &&
        !hasOpenWorkPanel
      ) {
        controlsPanel.classList.add(
          "ps-controls-hidden"
        );
      }
    }, interfaceControlsHideDelayMs);
}

function updateVideoStatus() {
  const video = getNetflixVideo();

  if (!isSupportedWatchPage()) {
    if (sentencePauseController.video) {
      resetSentencePauseController();
    }

    controlsPanel.classList.add(
      "ps-interface-hidden"
    );
    subtitleOpenButton.style.display =
      "none";
    usageOverlay.style.display =
      "none";
    setTranscriptPanelVisibility(false);
    lastVideoFound = null;
    controlsPlaybackVideo = null;
    controlsPlaybackPausedState = null;
    return;
  }

  controlsPanel.classList.toggle(
    "ps-interface-hidden",
    isInterfaceHidden
  );
  subtitleOpenButton.style.display =
    isInterfaceHidden
      ? "block"
      : "none";
  panel.style.display =
    isSubtitlePanelHidden
      ? "none"
      : "block";

  const videoFound = Boolean(video);

  if (videoFound !== lastVideoFound) {
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

  const playbackPausedState = video
    ? Boolean(video.paused)
    : null;
  const playbackStateChanged =
    video !== controlsPlaybackVideo ||
    playbackPausedState !==
      controlsPlaybackPausedState;

  if (playbackStateChanged) {
    controlsPlaybackVideo = video;
    controlsPlaybackPausedState =
      playbackPausedState;

    if (video) {
      showInterfaceControls();
    }
  }

  updatePlayerChrome();
}

function updateSubtitle() {
  const video =
    getNetflixVideo();
  const independentlyVisibleSubtitle =
    removeSubtitleDescriptions(
      getSubtitleFromNativeTextTracks(
        video
      ) ||
        getSubtitleFromVisibleDom()
    );

  if (independentlyVisibleSubtitle) {
    lastIndependentVisibleSubtitle =
      independentlyVisibleSubtitle;
    lastIndependentVisibleSubtitleAt =
      Date.now();
    chooseBestSubtitleTrack(
      independentlyVisibleSubtitle
    );
  }

  const usesTimedSentenceController =
    getTranscriptCues().source ===
    "captured_track";

panel.style.backgroundColor =
  "#1d2a30";
  let newSubtitle =
  removeSubtitleDescriptions(
    getNetflixSubtitle()
  );

  if (
    independentlyVisibleSubtitle &&
    newSubtitle
  ) {
    const normalizedIndependent =
      normalizeSpeechText(
        independentlyVisibleSubtitle
      );
    const normalizedCandidate =
      normalizeSpeechText(newSubtitle);
    const candidateMatchesVisible =
      normalizedCandidate.includes(
        normalizedIndependent
      ) ||
      normalizedIndependent.includes(
        normalizedCandidate
      );

    if (!candidateMatchesVisible) {
      newSubtitle =
        independentlyVisibleSubtitle;
    }
  }

  captureVisibleSubtitleCue(
    independentlyVisibleSubtitle ||
      newSubtitle,
    video
  );

  if (pronunciationCoachVideoPreview) {
    return;
  }

  if (
  newSubtitle ===
  currentSubtitle
) {
  return;
}

stopTranslationSpeech();

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
    let didFinishSentence = false;

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
      !replayGuardActive &&
      !usesTimedSentenceController
    ) {
      addSentencePart(
        previousSubtitle
      );

      if (
        hasDefiniteSentenceEnding(
          previousSubtitle
        )
      ) {
        finishSentence(video);
        didFinishSentence = true;
      }
    }

    if (newSubtitle) {
      if (
        !usesTimedSentenceController &&
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

      const shouldKeepCompletedSentence =
        didFinishSentence &&
        Boolean(video?.paused);

      if (!shouldKeepCompletedSentence) {
        subtitleBox.textContent =
          newSubtitle;
      }
    } else if (
      !previousSubtitle
    ) {
      subtitleBox.textContent =
        "Altyazı bekleniyor...";
    }

    scheduleSentenceTranslationPrefetch(
      video
    );
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
    replayPauseGeneration += 1;

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

    sentencePauseController.armed = null;
    updateSentencePauseController(
      getNetflixVideo()
    );
  }
function playStoredPreviousSentence() {
    if (
      !previousSentenceText ||
      previousSentenceStartTimeMs ===
        null
    ) {
      status.textContent =
        "Önceki cümle bulunamadı";

      return;
    }

    completedBox.textContent =
      previousSentenceText;

    nowSpeakBox.textContent =
      previousSentenceText;

    completedStartTimeMs =
      previousSentenceStartTimeMs;
    completedEndTimeMs =
      previousSentenceEndTimeMs;

    previousSentenceText = "";

    previousSentenceStartTimeMs =
      null;
    previousSentenceEndTimeMs = null;

    previousSentenceButton.disabled =
      true;

    replayButton.disabled =
      false;

    pronunciationCoachButton.disabled =
      false;

    resetPronunciationPractice();

    currentTranslationPreviousText =
      "";

    void loadStudySegments(
      completedBox.textContent
    );

    if (isChunkTranslationVisible) {
      stopNormalTranslation();
    } else {
      void translateSentence(
        completedBox.textContent,
        currentTranslationPreviousText
      );
    }

    replayButton.click();
}

previousSentenceButton.addEventListener(
  "click",
  () => {
    navigateToAdjacentSentence(-1);
  }
);

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
            "Video oynatıcıdan cevap alınamadı"
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
setPauseSpeakButton(
  interfaceCloseButton,
  "close"
);
setPauseSpeakButton(
  settingsButton,
  "sliders"
);
setPauseSpeakButton(
  panelVisibilityButton,
  "panel"
);
panelVisibilityButton.setAttribute(
  "aria-label",
  panelVisibilityButton.title
);
setPauseSpeakButton(
  improveTranslationButton,
  "waveSpark",
  "AI Çeviri+"
);
setPauseSpeakButton(
  pronunciationCoachButton,
  "coach"
);
setPauseSpeakButton(
  studyMeaningCloseButton,
  "close"
);
setPauseSpeakButton(
  pronunciationCoachCloseButton,
  "close"
);
setPauseSpeakButton(
  pronunciationCoachPreviousChunkButton,
  "previous"
);
setPauseSpeakButton(
  pronunciationCoachNextChunkButton,
  "next"
);
setPauseSpeakButton(
  pronunciationCoachViewToggleButton,
  "parts",
  "Tüm parçalar"
);
setPauseSpeakButton(
  pronunciationCoachListenButton,
  "replay",
  "Dinle"
);
setPauseSpeakButton(
  pronunciationCoachMicButton,
  "coach",
  "Konuş"
);

moreButton.className =
  "ps-icon-button";
moreButton.title = "Diğer seçenekler";
setPauseSpeakButton(
  moreButton,
  "more"
);

previousSentenceButton.className =
  "ps-side-nav ps-previous";
previousSentenceButton.title =
  "Önceki cümleyi tekrar oynat";
setPauseSpeakButton(
  previousSentenceButton,
  "previous",
  "Önceki cümle"
);

setPauseSpeakButton(
  nextSentenceButton,
  "next",
  "Sonraki cümle"
);

[
  replayButton,
  transcriptButton
].forEach((button) => {
  button.className =
    "ps-command-button";
});

setPauseSpeakButton(
  replayButton,
  "replay",
  "Cümleyi tekrarla"
);
setPauseSpeakButton(
  seekBackwardButton,
  "rewind",
  "10 sn geri"
);
setPauseSpeakButton(
  playPauseButton,
  "pause"
);
setPauseSpeakButton(
  seekForwardButton,
  "forward",
  "10 sn ileri"
);
setPauseSpeakButton(
  transcriptButton,
  "subtitles",
  "Altyazılar"
);
transcriptButton.title =
  "Ana altyazı kartını göster veya gizle";
transcriptButton.setAttribute(
  "aria-label",
  transcriptButton.title
);
setPauseSpeakButton(
  audioSubtitleButton,
  "audio",
  "Ses ve altyazı"
);
setPauseSpeakButton(
  playerShellToggleButton,
  "chevronDown"
);

const settingsMenuTitle =
  document.createElement("div");
settingsMenuTitle.className =
  "ps-menu-title";
settingsMenuTitle.textContent =
  "PauseSpeak ayarları";

const audioMenuTitle =
  document.createElement("div");
audioMenuTitle.className =
  "ps-menu-title";
audioMenuTitle.textContent =
  "Ses ve altyazı";

const moreMenuTitle =
  document.createElement("div");
moreMenuTitle.className =
  "ps-menu-title";
moreMenuTitle.textContent =
  "Diğer seçenekler";

fontScaleSetting.append(
  fontScaleLabel,
  fontScaleRange
);
opacitySetting.append(
  opacityLabel,
  opacityRange
);

settingsMenu.append(
  settingsMenuTitle,
  fontScaleSetting,
  opacitySetting
);

audioMenu.append(
  audioMenuTitle,
  turkishTranslationSpeechToggleButton,
  automaticPauseToggleButton,
  subtitleVisibilityButton
);

moreMenu.replaceChildren(
  moreMenuTitle,
  usageButton,
  helpButton
);

  mediaCopy.append(
    mediaTitle
  );
topLeft.append(
  interfaceCloseButton,
  brandMark
);
topActions.append(
  settingsButton,
  speedButton,
  panelVisibilityButton,
  moreButton
);
topBar.append(
  topLeft,
  topActions
);

panel.replaceChildren(
  subtitleCloseButton,
  subtitleBox,
  translationBox,
  subtitleActionsRow,
  title,
  status,
  subtitleTitle,
  completedTitle,
  completedBox,
  translationTitle
);

subtitleActionsRow.replaceChildren(
  improveTranslationButton,
  pronunciationCoachButton
);

const translationRevealObserver =
  new MutationObserver(() => {
    translationBox.classList.remove(
      "ps-translation-reveal"
    );
    void translationBox.offsetWidth;
    translationBox.classList.add(
      "ps-translation-reveal"
    );
  });

translationRevealObserver.observe(
  translationBox,
  {
    childList: true,
    characterData: true,
    subtree: true
  }
);

progressRow.append(
  currentTimeLabel,
  progressRange,
  durationLabel
);
commandRow.append(
  replayButton,
  seekBackwardButton,
  playPauseButton,
  seekForwardButton,
  transcriptButton,
  audioSubtitleButton
);
playerShell.append(
  playerShellToggleButton,
  progressRow,
  commandRow
);

setPauseSpeakButton(
  exportButton,
  "export"
);
transcriptCloseButton.className =
  "ps-transcript-action";
setPauseSpeakButton(
  transcriptCloseButton,
  "close"
);

for (const [format, label] of [
  ["srt", "SRT (.srt)"],
  ["vtt", "VTT (.vtt)"],
  ["timed-txt", "Zamanlı TXT"],
  ["plain-txt", "Sadece altyazı (.txt)"]
]) {
  const formatButton =
    document.createElement("button");
  formatButton.type = "button";
  formatButton.textContent = label;
  formatButton.dataset.exportFormat =
    format;

  if (format === selectedExportFormat) {
    formatButton.classList.add(
      "ps-selected"
    );
  }

  exportFormats.appendChild(
    formatButton
  );
}

exportFormats.appendChild(
  diagnosticExportButton
);

for (const [language, label] of [
  ["en", "İngilizce"],
  ["tr", "Türkçe · çevrilen satırlar"],
  ["bilingual", "İki dilli"]
]) {
  const languageButton =
    document.createElement("button");
  languageButton.type = "button";
  languageButton.textContent = label;
  languageButton.dataset.exportLanguage =
    language;
  exportLanguages.appendChild(
    languageButton
  );
}

exportMenu.append(
  exportFormatsLabel,
  exportFormats,
  exportLanguagesLabel,
  exportLanguages
);
transcriptHeaderActions.append(
  exportButton,
  transcriptCloseButton
);
transcriptHeader.replaceChildren(
  transcriptTitle,
  transcriptSearchInput,
  transcriptHeaderActions
);
transcriptPanel.replaceChildren(
  transcriptHeader,
  exportMenu,
  transcriptStatus,
  transcriptList,
  transcriptSettingsButton
);

controlsPanel.replaceChildren(
  topBar,
  panel,
  previousSentenceButton,
  nextSentenceButton,
  playerShell,
  settingsMenu,
  audioMenu,
  moreMenu
);
improveTranslationButton.addEventListener(
  "click",
  () => {
    void improveCurrentWithTerra(
      "translation"
    );
  }
);

const pronunciationCoachTranslationObserver =
  new MutationObserver(() => {
    if (isPronunciationCoachOpen) {
      renderPronunciationCoach();
      tryStartPronunciationCoachAfterTranslation();
    }
  });

pronunciationCoachTranslationObserver.observe(
  translationBox,
  {
    childList: true,
    characterData: true,
    subtree: true
  }
);

pronunciationCoachButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    closePauseSpeakMenus();

    if (
      isPronunciationCoachSessionActive &&
      isPronunciationCoachOpen
    ) {
      closePronunciationCoach(
        true,
        false
      );
      return;
    }

    openPronunciationCoach(
      completedBox.textContent,
      true
    );
  }
);

pronunciationCoachCloseButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    closePronunciationCoach(
      true,
      false
    );
  }
);

pronunciationCoachListenButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    playCurrentPronunciationCoachChunk();
  }
);

pronunciationCoachPreviousChunkButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    movePronunciationCoachChunk(-1);
  }
);

pronunciationCoachNextChunkButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    movePronunciationCoachChunk(1);
  }
);

pronunciationCoachViewToggleButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    isPronunciationCoachAllChunksVisible =
      !isPronunciationCoachAllChunksVisible;

    try {
      localStorage.setItem(
        pronunciationCoachViewStorageKey,
        isPronunciationCoachAllChunksVisible
          ? "all"
          : "single"
      );
    } catch (error) {
      console.debug(
        "PauseSpeak Telaffuz Koçu görünümü kaydedilemedi.",
        error
      );
    }

    renderPronunciationCoach();
  }
);

pronunciationCoachOverlay.addEventListener(
  "click",
  (event) => {
    if (
      event.target !==
      pronunciationCoachOverlay
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    closePronunciationCoach(
      true,
      false
    );
  }
);

pronunciationCoachMicButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      pronunciationCoachIsModelSpeaking
    ) {
      window.speechSynthesis?.cancel();
      pronunciationCoachIsModelSpeaking =
        false;
    }

    if (pronunciationCoachListening) {
      pronunciationCoachManualPause =
        true;
      pronunciationCoachStatus.textContent =
        "Mikrofon duraklatıldı — ilerlemen korunuyor";
      stopPronunciationCoachRecognition(
        false
      );
      return;
    }

    pronunciationCoachManualPause =
      false;
    pronunciationCoachStatus.textContent =
      "Mikrofon hazırlanıyor";
    startPronunciationCoachRecognition();
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.defaultPrevented ||
      event.key !== "Escape" ||
      !isPronunciationCoachOpen
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    closePronunciationCoach(
      true,
      false
    );
  },
  true
);

interfaceCloseButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    isInterfaceHidden = true;
    closePauseSpeakMenus();
    closeStudyMeaningPanel(false);
    closePronunciationCoach(
      true,
      false
    );
    controlsPanel.classList.add(
      "ps-interface-hidden"
    );
    subtitleOpenButton.textContent =
      "PauseSpeak'i Göster";
    subtitleOpenButton.style.display =
      "block";
  },
  true
);

settingsButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePauseSpeakMenu(
      settingsMenu
    );
  }
);

audioSubtitleButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePauseSpeakMenu(audioMenu);
  }
);

playerShellToggleButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    isPlayerShellCollapsed =
      !isPlayerShellCollapsed;
    playerShell.classList.toggle(
      "ps-collapsed",
      isPlayerShellCollapsed
    );
    controlsPanel.classList.toggle(
      "ps-player-shell-collapsed",
      isPlayerShellCollapsed
    );
    setPauseSpeakButton(
      playerShellToggleButton,
      isPlayerShellCollapsed
        ? "chevronUp"
        : "chevronDown"
    );
    playerShellToggleButton.title =
      isPlayerShellCollapsed
        ? "Oynatıcı çubuğunu aç"
        : "Oynatıcı çubuğunu küçült";
    playerShellToggleButton.setAttribute(
      "aria-label",
      playerShellToggleButton.title
    );
    window.requestAnimationFrame(
      updateOverlaySpacing
    );
    showInterfaceControls();
  }
);

panelVisibilityButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    const shouldShow =
      transcriptOverlay.style.display !==
      "flex";

    if (shouldShow) {
      renderTranscriptPanel();
      closePauseSpeakMenus();
      showInterfaceControls();

      window.postMessage(
        {
          source: "PAUSESPEAK_EXTENSION",
          type:
            "PAUSESPEAK_SUBTITLE_TRACKS_REQUEST"
        },
        "*"
      );
    }

    setTranscriptPanelVisibility(
      shouldShow
    );
  }
);

subtitleVisibilityButton.addEventListener(
  "click",
  () => {
    setSubtitlePanelVisibility(
      isSubtitlePanelHidden
    );
  }
);

speedButton.addEventListener(
  "click",
  () => {
    const video = getNetflixVideo();

    if (!video) {
      return;
    }

    const currentIndex =
      playbackRates.findIndex(
        (rate) =>
          Math.abs(
            rate - video.playbackRate
          ) < 0.01
      );
    const nextIndex =
      (currentIndex + 1) %
      playbackRates.length;

    video.playbackRate =
      playbackRates[nextIndex];
    speedButton.textContent =
      `${playbackRates[nextIndex]}x`;
    status.textContent =
      `Oynatma hızı: ${playbackRates[nextIndex]}x`;
  }
);

nextSentenceButton.addEventListener(
  "click",
  () => {
    navigateToAdjacentSentence(1);
  }
);

seekBackwardButton.addEventListener(
  "click",
  () => {
    seekVideoRelative(-10);
  }
);

seekForwardButton.addEventListener(
  "click",
  () => {
    seekVideoRelative(10);
  }
);

playPauseButton.addEventListener(
  "click",
  async () => {
    const video = getNetflixVideo();

    if (!video) {
      return;
    }

    stopSpeechRecognition();

    if (video.paused) {
      try {
        await video.play();
        status.textContent =
          "▶️ Video oynatılıyor";
      } catch (error) {
        status.textContent =
          "Video başlatılamadı";
      }
    } else {
      video.pause();
      status.textContent =
        "⏸️ Video durduruldu";
    }

    updatePlayerChrome();
    showInterfaceControls();
  }
);

progressRange.addEventListener(
  "pointerdown",
  () => {
    progressRange.dataset.dragging =
      "true";
  }
);

progressRange.addEventListener(
  "input",
  () => {
    const video = getNetflixVideo();
    const duration = Number(
      video?.duration
    );

    progressRange.style.setProperty(
      "--ps-progress",
      `${Number(progressRange.value) /
        10}%`
    );

    if (
      video &&
      Number.isFinite(duration)
    ) {
      currentTimeLabel.textContent =
        formatTranscriptTime(
          duration *
            Number(progressRange.value) /
            1000 * 1000
        );
    }
  }
);

progressRange.addEventListener(
  "change",
  () => {
    const video = getNetflixVideo();
    const duration = Number(
      video?.duration
    );

    if (
      video &&
      Number.isFinite(duration)
    ) {
      requestNetflixSeek(
        duration *
          Number(progressRange.value),
        "Seçilen zamana gidiliyor…"
      );
    }

    progressRange.dataset.dragging =
      "false";
    updatePlayerChrome();
  }
);

progressRange.addEventListener(
  "pointerup",
  () => {
    progressRange.dataset.dragging =
      "false";
  }
);

function getSubtitleCardLayout(
  percentage
) {
  const boundedPercentage = Math.min(
    140,
    Math.max(60, Number(percentage) || 100)
  );
  const textScale =
    boundedPercentage / 100;
  const widthScale = Math.min(
    1.15,
    Math.max(
      0.85,
      0.625 +
        boundedPercentage * 0.00375
    )
  );
  const densityScale = Math.min(
    1.15,
    Math.max(0.6, textScale)
  );
  const actionScale = Math.min(
    1,
    Math.max(0.9, textScale)
  );
  const toUnit = (value, unit) =>
    `${Number(value.toFixed(2))}${unit}`;

  return {
    "--ps-subtitle-card-width-vw":
      toUnit(52 * widthScale, "vw"),
    "--ps-subtitle-card-width-compact-vw":
      toUnit(68 * widthScale, "vw"),
    "--ps-subtitle-card-max-width":
      toUnit(680 * widthScale, "px"),
    "--ps-subtitle-card-compact-max-width":
      toUnit(650 * widthScale, "px"),
    "--ps-subtitle-card-padding-top":
      toUnit(36 * densityScale, "px"),
    "--ps-subtitle-card-padding-inline":
      toUnit(48 * densityScale, "px"),
    "--ps-subtitle-card-padding-bottom":
      toUnit(30 * densityScale, "px"),
    "--ps-subtitle-card-compact-padding-top":
      toUnit(21 * densityScale, "px"),
    "--ps-subtitle-card-compact-padding-inline":
      toUnit(28 * densityScale, "px"),
    "--ps-subtitle-card-compact-padding-bottom":
      toUnit(25 * densityScale, "px"),
    "--ps-subtitle-card-mobile-padding-top":
      toUnit(15 * densityScale, "px"),
    "--ps-subtitle-card-mobile-padding-inline":
      toUnit(18 * densityScale, "px"),
    "--ps-subtitle-card-mobile-padding-bottom":
      toUnit(18 * densityScale, "px"),
    "--ps-subtitle-card-translation-gap":
      toUnit(13 * densityScale, "px"),
    "--ps-subtitle-card-actions-gap":
      toUnit(14 * densityScale, "px"),
    "--ps-subtitle-card-action-height":
      toUnit(40 * actionScale, "px"),
    "--ps-subtitle-card-action-icon-size":
      toUnit(42 * actionScale, "px")
  };
}

fontScaleRange.addEventListener(
  "input",
  () => {
    const percentage = Number(
      fontScaleRange.value
    );
    controlsPanel.style.setProperty(
      "--ps-subtitle-scale",
      String(percentage / 100)
    );
    const cardLayout =
      getSubtitleCardLayout(
        percentage
      );

    for (const [property, value] of
      Object.entries(cardLayout)) {
      controlsPanel.style.setProperty(
        property,
        value
      );
    }
    fontScaleLabel.querySelector(
      "strong"
    ).textContent = `${percentage}%`;
    localStorage.setItem(
      "pausespeak-subtitle-scale",
      String(percentage)
    );
  }
);

opacityRange.addEventListener(
  "input",
  () => {
    const percentage = Number(
      opacityRange.value
    );
    const opacity = String(
      percentage / 100
    );

    document.documentElement.style.setProperty(
      "--ps-ui-opacity",
      opacity
    );
    document.documentElement.style.setProperty(
      "--ps-card-opacity",
      opacity
    );
    controlsPanel.style.setProperty(
      "--ps-ui-opacity",
      opacity
    );
    controlsPanel.style.setProperty(
      "--ps-card-opacity",
      opacity
    );
    opacityLabel.querySelector(
      "strong"
    ).textContent = `${percentage}%`;
    localStorage.setItem(
      "pausespeak-ui-opacity",
      String(percentage)
    );
  }
);

for (const formatButton of
  exportFormats.querySelectorAll(
    "button[data-export-format]"
  )) {
  formatButton.addEventListener(
    "click",
    () => {
      selectedExportFormat =
        formatButton.dataset
          .exportFormat;
      exportFormats
        .querySelectorAll("button")
        .forEach((button) => {
          button.classList.toggle(
            "ps-selected",
            button === formatButton
          );
        });
    }
  );
}

for (const languageButton of
  exportLanguages.querySelectorAll(
    "button[data-export-language]"
  )) {
  languageButton.addEventListener(
    "click",
    () => {
      downloadSubtitleExport(
        selectedExportFormat,
        languageButton.dataset
          .exportLanguage
      );
    }
  );
}

diagnosticExportButton.addEventListener(
  "click",
  () => {
    downloadCaptionDiagnostic();
  }
);

exportButton.addEventListener(
  "click",
  () => {
    exportMenu.classList.toggle(
      "ps-open"
    );
    exportButton.classList.toggle(
      "ps-active",
      exportMenu.classList.contains(
        "ps-open"
      )
    );
  }
);

transcriptSettingsButton.addEventListener(
  "click",
  () => {
    setTranscriptPanelVisibility(false);
    togglePauseSpeakMenu(
      settingsMenu
    );
  }
);

helpButton.addEventListener(
  "click",
  () => {
    status.textContent =
      "Kısayollar: ←/→ 10 sn · Enter oynat/duraklat · ↑/↓ kelime seç";
    closePauseSpeakMenus();
    showInterfaceControls();
  }
);

try {
  const savedScale = Number(
    localStorage.getItem(
      "pausespeak-subtitle-scale"
    )
  );
  const savedOpacityValue =
    localStorage.getItem(
      "pausespeak-ui-opacity"
    ) ??
    localStorage.getItem(
      "pausespeak-card-opacity"
    );
  const savedOpacity = Number(
    savedOpacityValue
  );

  if (
    savedScale >= 60 &&
    savedScale <= 140
  ) {
    fontScaleRange.value =
      String(savedScale);
    fontScaleRange.dispatchEvent(
      new Event("input")
    );
  }

  if (
    savedOpacity >= 25 &&
    savedOpacity <= 98
  ) {
    opacityRange.value =
      String(savedOpacity);
    opacityRange.dispatchEvent(
      new Event("input")
    );
  }
} catch (error) {
  console.debug(
    "PauseSpeak görünüm ayarları okunamadı.",
    error
  );
}

setSubtitlePanelVisibility(true);

transcriptButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    setSubtitlePanelVisibility(
      isSubtitlePanelHidden
    );
  },
  true
);

transcriptCloseButton.addEventListener(
  "click",
  () => {
    setTranscriptPanelVisibility(false);
  }
);

transcriptSearchInput.addEventListener(
  "input",
  () => {
    renderTranscriptPanel();
  }
);

transcriptOverlay.addEventListener(
  "click",
  (event) => {
    if (event.target === transcriptOverlay) {
      setTranscriptPanelVisibility(false);
    }
  }
);

usageButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    void refreshUsagePanel();
    usageOverlay.style.display =
      "flex";
    closePauseSpeakMenus();
    showInterfaceControls();
  },
  true
);

usageCloseButton.addEventListener(
  "click",
  () => {
    usageOverlay.style.display =
      "none";
  }
);

usageCounterButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    void startNewUsageCounter();
  }
);

window.setInterval(
  () => {
    if (
      usageSyncCode &&
      usageOverlay.style.display ===
        "flex"
    ) {
      void refreshUsagePanel();
    }
  },
  30000
);

usageOverlay.addEventListener(
  "click",
  (event) => {
    if (event.target === usageOverlay) {
      usageOverlay.style.display =
        "none";
    }
  }
);
subtitleCloseButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    setSubtitlePanelVisibility(false);
  },
  true
);

subtitleOpenButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    isInterfaceHidden = false;
    controlsPanel.classList.remove(
      "ps-interface-hidden"
    );
    subtitleOpenButton.style.display =
      "none";
    showInterfaceControls();
  },
  true
);
document.documentElement.appendChild(
  controlsPanel
);
document.documentElement.appendChild(
  subtitleOpenButton
);
document.documentElement.appendChild(
  usageOverlay
);
document.documentElement.appendChild(
  transcriptOverlay
);
document.documentElement.appendChild(
  studyMeaningOverlay
);
document.documentElement.appendChild(
  pronunciationCoachOverlay
);
document.documentElement.appendChild(
  privacyCurtain
);

document.addEventListener(
  "pointerup",
  handlePrivacyCurtainPointerUp,
  true
);

document.addEventListener(
  "click",
  (event) => {
    if (
      !isPrivacyCurtainActive &&
      Date.now() >
        privacySuppressClickUntil
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  },
  true
);

privacyCurtain.addEventListener(
  "contextmenu",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
  }
);

document.addEventListener(
  "freeze",
  clearPrivacyCurtainAfterSleep
);
document.addEventListener(
  "resume",
  clearPrivacyCurtainAfterSleep
);
window.addEventListener(
  "pageshow",
  (event) => {
    if (event.persisted) {
      clearPrivacyCurtainAfterSleep();
    }
  }
);
document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState ===
      "visible"
    ) {
      privacyHeartbeatAt = Date.now();
    }
  }
);
window.setInterval(
  () => {
    const now = Date.now();
    const elapsed =
      now - privacyHeartbeatAt;

    privacyHeartbeatAt = now;

    if (
      isPrivacyCurtainActive &&
      document.visibilityState ===
        "visible" &&
      elapsed > 15000
    ) {
      clearPrivacyCurtainAfterSleep();
    }
  },
  1000
);

function handleInterfacePointerActivity(
  event
) {
  if (
    event.type === "pointermove" &&
    event.pointerType &&
    event.pointerType !== "mouse"
  ) {
    return;
  }

  showInterfaceControls(true);
}

[
  "pointermove",
  "pointerdown",
  "touchstart"
].forEach((eventName) => {
  document.addEventListener(
    eventName,
    handleInterfacePointerActivity,
    {
      capture: true,
      passive: true
    }
  );
});

document.addEventListener(
  "click",
  (event) => {
    if (
      !controlsPanel.contains(
        event.target
      )
    ) {
      closePauseSpeakMenus();
    }
  },
  true
);

function movePauseSpeakPanelsForFullscreen() {
  const fullscreenContainer =
    document.fullscreenElement;

  const targetContainer =
    fullscreenContainer ||
    document.documentElement;

  targetContainer.appendChild(
    controlsPanel
  );
  targetContainer.appendChild(
    subtitleOpenButton
  );
  targetContainer.appendChild(
    usageOverlay
  );
  targetContainer.appendChild(
    transcriptOverlay
  );
  targetContainer.appendChild(
    studyMeaningOverlay
  );
  targetContainer.appendChild(
    pronunciationCoachOverlay
  );
  targetContainer.appendChild(
    privacyCurtain
  );

  showInterfaceControls();
}

document.addEventListener(
  "fullscreenchange",
  movePauseSpeakPanelsForFullscreen
);

window.addEventListener(
  "resize",
  movePauseSpeakPanelsForFullscreen
);

movePauseSpeakPanelsForFullscreen();

function resetPlaybackMediaContext(
  mediaKey
) {
  resetSentencePauseController();
  lastPlaybackMediaKey = mediaKey;
  currentSubtitle = "";
  sentenceParts = [];
  sentenceStartTime = null;
  completedStartTimeMs = null;
  completedEndTimeMs = null;
  previousCompletedSentence = "";
  previousSentenceText = "";
  previousSentenceStartTimeMs = null;
  previousSentenceEndTimeMs = null;
  activeSubtitleTrackId = "";
  activeTranscriptCueIndex = -1;
  visibleSubtitleCueStartMs = null;
  visibleSubtitleCueText = "";
  lastIndependentVisibleSubtitle = "";
  lastIndependentVisibleSubtitleAt = 0;
  capturedSubtitleTracks.clear();
  visibleSubtitleCues.length = 0;
  currentSubtitleChunks = [];
  currentSubtitleChunkTranslations = [];
  currentSentenceStudySegments = [];
  currentStudyTokenMappings = [];
  lastVideoFound = null;
  activeTranscriptSeekRequestId = "";
  isReplayStarting = false;
  activeReplayRequestId = null;
  replayGuardUntilVideoTime = null;
  isReplayPlaybackActive = false;
  replayPauseGeneration += 1;
  pronunciationCoachVideoPreview = null;

  if (replayTimeout) {
    clearTimeout(replayTimeout);
    replayTimeout = null;
  }

  stopTranslationSpeech();
  stopNormalTranslation();
  cancelTerraImprovement();
  cancelSentenceTranslationPrefetch();
  stopSpeechRecognition();
  closeStudyMeaningPanel(false);
  closePronunciationCoach(true, false);

  subtitleBox.textContent =
    "Altyazı bekleniyor...";
  completedBox.textContent =
    "Henüz tamamlanan cümle yok.";
  translationBox.textContent =
    "Türkçe çeviri burada görünecek.";
  transcriptStatus.textContent =
    `${getPlaybackPlatformLabel()} altyazı verisi bekleniyor…`;
  replayButton.disabled = true;
  previousSentenceButton.disabled = true;
  pronunciationCoachButton.disabled = true;

  if (
    transcriptOverlay.style.display !==
    "none"
  ) {
    renderTranscriptPanel();
  }

  requestPageSubtitleTracks();
}

function refreshPlaybackMediaContext() {
  const mediaKey = getPlaybackMediaKey();

  if (mediaKey === lastPlaybackMediaKey) {
    return;
  }

  resetPlaybackMediaContext(mediaKey);
}

const runPauseSpeakUpdate = () => {
  if (isPrivacyCurtainActive) {
    const privacyVideo =
      getNetflixVideo();

    if (
      privacyVideo &&
      !privacyVideo.paused
    ) {
      privacyVideo.pause();
    }
  }

  if (!isSupportedWatchPage()) {
    if (sentencePauseController.video) {
      resetSentencePauseController();
    }

    subtitleOpenButton.style.display =
      "none";
    controlsPanel.classList.add(
      "ps-interface-hidden"
    );
    usageOverlay.style.display =
      "none";
    setTranscriptPanelVisibility(false);
    closePronunciationCoach(
      true,
      false
    );

    lastVideoFound = null;
    return;
  }

  refreshPlaybackMediaContext();

  const pronunciationCoachVideo =
    getNetflixVideo();

  if (
    isPronunciationCoachSessionActive &&
    pronunciationCoachVideo &&
    !pronunciationCoachVideo.paused &&
    (
      pronunciationCoachRecognition ||
      pronunciationCoachListening
    )
  ) {
    pronunciationCoachWaitingForTranslation =
      true;
    pronunciationCoachShouldRestart = false;
    stopPronunciationCoachRecognition(false);
    pronunciationCoachStatus.textContent =
      "Video oynarken mikrofon kapalı";
  }

  if (
    capturedSubtitleTracks.size === 0 &&
    Date.now() -
      lastSubtitleTrackRequestAt >
      5000
  ) {
    requestPageSubtitleTracks();
  }

  updateVideoStatus();
  updatePronunciationCoachVideoPreview();
  updateSubtitle();
  updateSentencePauseController(
    pronunciationCoachVideo
  );
  updateTranscriptActiveCue();
};

requestPageSubtitleTracks();

runPauseSpeakUpdate();

setInterval(
  runPauseSpeakUpdate,
  400
);
})();
