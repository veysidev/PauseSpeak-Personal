const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const content = read("content.js");
const css = read("pausespeak-ui.css");
const manifest = JSON.parse(read("manifest.json"));

function block(pattern, label) {
  const match = content.match(pattern);
  assert.ok(match, `${label} was not found`);
  return match[0];
}

test("pronunciation master defaults off in More, persists only the feature preference, and does not own Auto Pause", () => {
  assert.match(content, /let isPronunciationPracticeEnabled\s*=\s*false/);
  assert.match(content, /pronunciationPracticeStorageKey[\s\S]*?localStorage\.getItem/s);

  const handler = block(
    /pronunciationPracticeToggleButton\.addEventListener\([\s\S]*?\r?\n\);\s*(?=pronunciationToggleButton\.addEventListener)/,
    "pronunciation master handler"
  );
  const settings = block(/settingsMenu\.append\([\s\S]*?\);/, "settings menu assembly");
  const moreMenu = block(/moreMenu\.replaceChildren\([\s\S]*?\);/, "more menu assembly");
  assert.match(settings, /fontScaleSetting[\s\S]*?opacitySetting/);
  assert.doesNotMatch(settings, /pronunciationPracticeToggleButton/);
  assert.match(moreMenu, /pronunciationPracticeToggleButton[\s\S]*?turkishTranslationSpeechToggleButton[\s\S]*?automaticPauseToggleButton/);
  assert.match(handler, /localStorage\.setItem\([\s\S]*?pronunciationPracticeStorageKey/s);
  assert.doesNotMatch(handler, /isAutomaticPauseEnabled|automaticPauseToggleButton|\.play\(|\.pause\(|recognition\.start|startPronunciationCoachRecognition/);
  const autoPauseHandler = block(
    /automaticPauseToggleButton\.addEventListener\([\s\S]*?\r?\n\);(?=\r?\n\s*function finishSentence)/,
    "Auto Pause handler"
  );
  assert.doesNotMatch(autoPauseHandler, /isPronunciationPracticeEnabled|pronunciationPracticeToggleButton/);
  assert.doesNotMatch(content, /localStorage\.setItem\([^)]*(?:activePronunciationSentence|activePronunciationAttempt|pronunciationPracticeState|pronunciationCoachRecognition)/s);
});

test("legacy pronunciation remains isolated after the pronunciation popover is removed", () => {
  const dock = block(/pronunciationDock\.append\([\s\S]*?\);/, "pronunciation dock");
  const legacyScheduler = block(
    /function scheduleAutomaticSpeechStart\([\s\S]*?\r?\n\}/,
    "legacy automatic speech scheduler"
  );
  assert.match(dock, /pronunciationMenuButton/);
  assert.doesNotMatch(dock, /pronunciationPracticeToggleButton|pronunciationPracticeContinuousButton/);
  assert.doesNotMatch(content, /pronunciationPopover|pronunciationContinuousPolicyButton|pronunciationContinuousSuccessPolicy/);
  assert.doesNotMatch(content, /audioMenu\.append\(/);
  assert.doesNotMatch(legacyScheduler, /startSpeechRecognition\(|startPronunciationCoachRecognition\(|\.start\(/);
  assert.match(legacyScheduler, /Automatic microphone starts remain disabled here/);
});

test("finalized sentence identity is immutable, media-scoped, and text is not the identity", () => {
  const helper = block(
    /function createFinalizedSentenceIdentity\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function rememberFinalizedSentence)/,
    "finalized sentence identity helper"
  );
  const sandbox = {
    finalizedSentenceGeneration: 0,
    cleanText: (value) => String(value || "").trim(),
    getPlaybackMediaKey: () => "youtube:abc",
    first: null,
    second: null
  };
  vm.runInNewContext(
    `${helper}\nfirst = createFinalizedSentenceIdentity("Same sentence.", 1000, 2000);\nsecond = createFinalizedSentenceIdentity("Same sentence.", 3000, 4000);`,
    sandbox
  );
  assert.equal(Object.isFrozen(sandbox.first), true);
  assert.equal(sandbox.first.mediaKey, "youtube:abc");
  assert.equal(sandbox.first.text, sandbox.second.text);
  assert.notEqual(sandbox.first.id, sandbox.second.id);
  assert.notEqual(sandbox.first.startTimeMs, sandbox.second.startTimeMs);
});

test("sentenceId and attemptId are independent generations and stale attempts are rejected", () => {
  const helpers = block(
    /function invalidatePronunciationAttempt\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function allowPronunciationControlledMedia)/,
    "attempt generation helpers"
  );
  const sandbox = {
    pronunciationAttemptGeneration: 0,
    activePronunciationAttempt: null,
    activePronunciationSentence: { id: "sentence-1" },
    pronunciationCoachShouldRestart: true,
    pronunciationCoachRecognition: null,
    first: null,
    second: null,
    firstCurrent: null,
    staleAfterSecond: null,
    secondCurrent: null
  };
  vm.runInNewContext(
    `${helpers}\n` +
      `first = beginPronunciationAttempt();\n` +
      `firstCurrent = isPronunciationAttemptCurrent("sentence-1", first.id);\n` +
      `second = beginPronunciationAttempt();\n` +
      `staleAfterSecond = isPronunciationAttemptCurrent("sentence-1", first.id);\n` +
      `secondCurrent = isPronunciationAttemptCurrent("sentence-1", second.id);`,
    sandbox
  );
  assert.equal(sandbox.first.sentenceId, "sentence-1");
  assert.notEqual(sandbox.first.id, sandbox.second.id);
  assert.equal(sandbox.firstCurrent, true);
  assert.equal(sandbox.staleAfterSecond, false);
  assert.equal(sandbox.secondCurrent, true);
});

test("recognition callbacks are sentence-and-attempt guarded and recognition.start stays behind the existing Speak action", () => {
  const starter = block(
    /function startPronunciationCoachRecognition\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function handlePronunciationSpeakAction)/,
    "recognition starter"
  );
  const say = block(
    /function handlePronunciationSpeakAction\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function maybeAutoStartPronunciationContinuousTarget)/,
    "Say action"
  );
  assert.match(starter, /userActionToken !== pronunciationExplicitUserActionToken/);
  assert.match(starter, /const sentenceId = attempt\.sentenceId/);
  assert.match(starter, /const attemptId = attempt\.id/);
  assert.ok((starter.match(/isPronunciationAttemptCurrent\(sentenceId, attemptId, recognition\)/g) || []).length >= 4);
  assert.equal((content.match(/\.start\(\);/g) || []).length, 1);
  assert.equal((content.match(/\brecognition\.start\(\)/g) || []).length, 1);
  assert.match(say, /beginPronunciationAttempt\(\)/);
  assert.match(say, /startPronunciationCoachRecognition\(attempt, pronunciationExplicitUserActionToken\)/);
});

test("translation completion, onend, no-speech, preview completion, and Study Meaning close cannot restart the microphone", () => {
  const translationObserver = block(
    /const pronunciationCoachTranslationObserver\s*=[\s\S]*?pronunciationCoachTranslationObserver\.observe\([\s\S]*?\);/,
    "translation observer"
  );
  const resume = block(
    /function resumePronunciationCoachAfterStudyMeaning\(\) \{[\s\S]*?\r?\n  \}/,
    "Study Meaning resume helper"
  );
  const previewEnd = block(
    /function finishPronunciationCoachVideoPreview\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function beginPronunciationCoachVideoReturn)/,
    "preview completion helper"
  );
  const starter = block(
    /function startPronunciationCoachRecognition\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function handlePronunciationSpeakAction)/,
    "recognition starter"
  );
  assert.doesNotMatch(translationObserver, /startPronunciationCoachRecognition|recognition\.start|schedulePronunciationCoachRestart/);
  assert.doesNotMatch(resume, /startPronunciationCoachRecognition|recognition\.start|schedulePronunciationCoachRestart/);
  assert.doesNotMatch(previewEnd, /startPronunciationCoachRecognition|recognition\.start|schedulePronunciationCoachRestart/);
  assert.match(starter, /event\.error === "no-speech"[\s\S]*?"Bir kez daha deneyelim"/s);
  assert.doesNotMatch(starter.match(/recognition\.onend[\s\S]*?(?=\n\s*try \{)/)?.[0] || "", /\.start\(|schedulePronunciationCoachRestart/);
});

test("opening single practice may pause but never starts mic, continuous mode, or autoplay", () => {
  const open = block(
    /function openPronunciationCoach\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function closePronunciationCoach)/,
    "coach open helper"
  );
  assert.match(open, /mode = "single"/);
  assert.match(open, /pauseVideoForPronunciation\(video\)/);
  assert.doesNotMatch(open, /startPronunciationCoachRecognition|recognition\.start|\.play\(/);
  assert.doesNotMatch(open, /isPronunciationContinuousSessionActive\s*=\s*true/);
});

test("single cancel, Escape, feature-off, and practice close do not issue media commands", () => {
  const close = block(
    /function closePronunciationCoach\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function getPronunciationCoachVideoRange)/,
    "coach close helper"
  );
  const featureToggle = block(
    /pronunciationPracticeToggleButton\.addEventListener\([\s\S]*?\r?\n\);\s*(?=pronunciationToggleButton\.addEventListener)/,
    "feature toggle"
  );
  const escapeHandler = block(
    /document\.addEventListener\(\s*"keydown",[\s\S]*?event\.key !== "Escape"[\s\S]*?\n\);/,
    "practice Escape handler"
  );
  assert.doesNotMatch(close, /video\.play|video\.pause|\.play\(|\.pause\(|requestNetflixSeek|PAUSESPEAK_COACH_/);
  assert.doesNotMatch(featureToggle, /\.play\(|\.pause\(|requestNetflixSeek/);
  assert.doesNotMatch(escapeHandler, /\.play\(|\.pause\(|requestNetflixSeek/);
});

test("continuous session starts only from the practice area and auto-Speak is gated by the next finalized target", () => {
  const handler = block(
    /pronunciationPracticeContinuousButton\.addEventListener\([\s\S]*?\r?\n\}\);\s*(?=pronunciationPracticeSkipButton\.addEventListener)/,
    "practice continuous toggle"
  );
  const finishTail = block(
    /if \(\s*isPronunciationPracticeEnabled\s*&&\s*isPronunciationContinuousSessionActive[\s\S]*?\n\}/,
    "continuous finalized-sentence handoff"
  );
  assert.match(handler, /isPronunciationContinuousSessionActive = !isPronunciationContinuousSessionActive/);
  assert.match(handler, /isPronunciationContinuousSessionActive[\s\S]*?isPronunciationCoachOpen[\s\S]*?activePronunciationSentence[\s\S]*?pronunciationPracticeMode = "continuous"/);
  assert.doesNotMatch(handler, /\.play\(|\.pause\(|startPronunciationCoachRecognition|recognition\.start|openPronunciationCoach\(/);
  assert.match(finishTail, /finalizedSentence/);
  assert.match(finishTail, /currentFinalizedSentence\?\.id === finalizedSentence\.id/);
  assert.match(finishTail, /openPronunciationCoach\(finalizedSentence, "continuous"\)/);
  assert.match(finishTail, /continuousMediaGeneration === mediaInteractionGeneration/);
  assert.match(finishTail, /continuousAutoSpeakPending = pronunciationContinuousAutoSpeakPending/);
  assert.match(finishTail, /maybeAutoStartPronunciationContinuousTarget\([\s\S]*?finalizedSentence/);
  assert.doesNotMatch(finishTail, /recognition\.start|startPronunciationCoachRecognition/);
});

test("enabling continuous on an already-open single sentence promotes that same target and unlocks one-shot auto Continue", async () => {
  const handler = block(
    /pronunciationPracticeContinuousButton\.addEventListener\([\s\S]*?\r?\n\}\);\s*(?=pronunciationPracticeSkipButton\.addEventListener)/,
    "practice continuous toggle"
  );
  const success = block(
    /function finishPronunciationCoachSentence\([^)]*\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function advancePronunciationCoach)/,
    "continuous success helper"
  );
  const continueAction = block(
    /function handlePronunciationContinueAction\(\) \{[\s\S]*?\r?\n  \}/,
    "existing Continue action"
  );

  const sentence = {
    id: "sentence-existing",
    mediaKey: "youtube:existing",
    text: "Keep this exact finalized sentence.",
    startTimeMs: 1000,
    endTimeMs: 4000
  };
  const initialAttempt = Object.freeze({ id: 70, sentenceId: sentence.id });
  const sandbox = {
    isPronunciationPracticeEnabled: true,
    isPronunciationContinuousSessionActive: false,
    pronunciationContinuousSessionGeneration: 4,
    pronunciationContinuousResumeBoundary: { sentenceId: "old" },
    pronunciationContinuousAutoSpeakPending: { sourceSentenceId: "old" },
    pronunciationContinuousAutoSpeakSentenceId: "old",
    pronunciationContinuousAutoContinueAttemptId: 0,
    pronunciationPracticeMode: "single",
    isPronunciationCoachOpen: true,
    activePronunciationSentence: sentence,
    activePronunciationAttempt: initialAttempt,
    pronunciationPracticeState: "listening",
    pronunciationCoachLiveMatches: new Set(),
    pronunciationCoachActiveWordIndex: 0,
    pronunciationCoachStatus: { textContent: "" },
    pronunciationCoachHeard: { textContent: "" },
    panel: { classList: { add() {} } },
    mediaInteractionGeneration: 8,
    pronunciationPracticeContinuousButton: {
      addEventListener(_type, callback) { sandbox.toggleContinuous = callback; }
    },
    video: { playCount: 0 },
    closeCount: 0,
    boundaryCount: 0,
    window: { setTimeout },
    updatePronunciationFeatureUI() {},
    renderPronunciationCoach() {},
    stopPronunciationCoachRecognition() {},
    invalidatePronunciationAttempt() { sandbox.activePronunciationAttempt = null; },
    getNetflixVideo() { return sandbox.video; },
    markPronunciationContinuousResumeBoundary() { sandbox.boundaryCount += 1; },
    closePronunciationCoach() {
      sandbox.closeCount += 1;
      sandbox.isPronunciationCoachOpen = false;
      sandbox.pronunciationPracticeState = "idle";
    },
    playVideoForPronunciation(video) {
      video.playCount += 1;
      return Promise.resolve(true);
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${success}\n${continueAction}\n${handler}`, sandbox);

  // Normal single success remains manual before continuous is enabled.
  vm.runInContext("finishPronunciationCoachSentence()", sandbox);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(sandbox.video.playCount, 0);
  assert.equal(sandbox.closeCount, 0);

  // Restore the same displayed finalized sentence and a fresh attempt, then enable continuous on it.
  const promotedAttempt = Object.freeze({ id: 71, sentenceId: sentence.id });
  sandbox.activePronunciationSentence = sentence;
  sandbox.activePronunciationAttempt = promotedAttempt;
  sandbox.pronunciationPracticeState = "listening";
  sandbox.isPronunciationCoachOpen = true;
  sandbox.toggleContinuous({ preventDefault() {}, stopPropagation() {} });

  assert.equal(sandbox.isPronunciationContinuousSessionActive, true);
  assert.equal(sandbox.pronunciationPracticeMode, "continuous");
  assert.equal(sandbox.activePronunciationSentence, sentence);
  assert.equal(sandbox.activePronunciationSentence.id, "sentence-existing");
  assert.equal(sandbox.activePronunciationAttempt, promotedAttempt);
  assert.equal(sandbox.pronunciationContinuousSessionGeneration, 5);

  vm.runInContext("finishPronunciationCoachSentence()", sandbox);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(sandbox.video.playCount, 1);
  assert.equal(sandbox.closeCount, 1);
  assert.equal(sandbox.boundaryCount, 1);
  assert.equal(sandbox.isPronunciationContinuousSessionActive, true);

  // A duplicate callback for the same promoted sentence/attempt cannot Continue twice.
  sandbox.activePronunciationSentence = sentence;
  sandbox.activePronunciationAttempt = promotedAttempt;
  sandbox.pronunciationPracticeState = "listening";
  sandbox.isPronunciationCoachOpen = true;
  vm.runInContext("finishPronunciationCoachSentence()", sandbox);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(sandbox.video.playCount, 1);
  assert.equal(sandbox.closeCount, 1);
  assert.equal(sandbox.boundaryCount, 1);
});

test("single success still waits for user action while continuous success reuses the existing Continue action", () => {
  const success = block(
    /function finishPronunciationCoachSentence\([^)]*\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function advancePronunciationCoach)/,
    "success helper"
  );
  const continueAction = block(
    /function handlePronunciationContinueAction\(\) \{[\s\S]*?\r?\n  \}/,
    "explicit continue action"
  );
  const render = block(
    /function renderPronunciationCoach\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function isPronunciationCoachEvaluationBetter)/,
    "coach render helper"
  );
  assert.doesNotMatch(content, /pronunciationContinuousSuccessPolicy|pronunciationContinuousPolicyStorageKey|Başarıdan sonra/);
  assert.doesNotMatch(success, /playVideoForPronunciation|\.play\(|\.pause\(/);
  assert.match(success, /pronunciationPracticeMode === "continuous"/);
  assert.match(success, /isPronunciationContinuousSessionActive/);
  assert.match(success, /handlePronunciationContinueAction\(\)/);
  assert.doesNotMatch(success, /pronunciationPracticeContinueButton\.click\(\)/);
  assert.match(success, /pronunciationContinuousAutoContinueAttemptId !== completedAttempt\.id/);
  assert.match(success, /continuousSessionGeneration === pronunciationContinuousSessionGeneration/);
  assert.match(success, /pronunciationContinuousAutoSpeakPending = Object\.freeze/);
  assert.match(render, /pronunciationPracticeState === "retry"[\s\S]*?"Tekrar söyle"/s);
  assert.match(render, /pronunciationPracticeSpeakButton\.hidden = pronunciationPracticeState === "success"/);
  assert.match(render, /pronunciationPracticeRestartButton[\s\S]*?"Baştan al"/s);
  assert.match(render, /pronunciationPracticeContinueButton\.hidden = pronunciationPracticeState !== "success"/);
  assert.match(continueAction, /closePronunciationCoach\(true, false\)/);
  assert.match(continueAction, /playVideoForPronunciation\(video\)/);
  assert.doesNotMatch(continueAction, /isPronunciationContinuousSessionActive\s*=\s*false/);
});



test("terminal punctuation is normalized away and continuous success auto-continues exactly once through the existing Continue action", async () => {
  const normalizer = block(
    /function normalizeSpeechText\(text\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function getWordTokens)/,
    "speech normalizer"
  );
  const success = block(
    /function finishPronunciationCoachSentence\([^)]*\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function advancePronunciationCoach)/,
    "continuous success helper"
  );
  const continueAction = block(
    /function handlePronunciationContinueAction\(\) \{[\s\S]*?\r?\n  \}/,
    "existing Continue action"
  );

  const normalized = vm.runInNewContext(
    `${normalizer}\nnormalizeSpeechText("I'm a Marketing major here at the University of Idaho.")`,
    {}
  );
  assert.equal(
    normalized,
    "i am a marketing major here at the university of idaho"
  );

  const sandbox = {
    pronunciationPracticeMode: "continuous",
    isPronunciationContinuousSessionActive: true,
    pronunciationContinuousSessionGeneration: 3,
    pronunciationContinuousAutoContinueAttemptId: 0,
    pronunciationContinuousAutoSpeakPending: null,
    mediaInteractionGeneration: 7,
    activePronunciationAttempt: Object.freeze({ id: 44, sentenceId: "sentence-44" }),
    activePronunciationSentence: {
      id: "sentence-44",
      mediaKey: "youtube:abc",
      text: "I'm a Marketing major here at the University of Idaho.",
      startTimeMs: 1000,
      endTimeMs: 5200
    },
    isPronunciationCoachOpen: true,
    pronunciationPracticeState: "listening",
    pronunciationCoachLiveMatches: new Set(),
    pronunciationCoachActiveWordIndex: 0,
    pronunciationCoachStatus: { textContent: "" },
    pronunciationCoachHeard: { textContent: "" },
    panel: { classList: { add() {} } },
    closeCount: 0,
    video: { playCount: 0 },
    window: { setTimeout },
    renderPronunciationCoach() {},
    stopPronunciationCoachRecognition() {},
    invalidatePronunciationAttempt() {
      sandbox.activePronunciationAttempt = null;
    },
    getNetflixVideo() {
      return sandbox.video;
    },
    markPronunciationContinuousResumeBoundary() {},
    closePronunciationCoach() {
      sandbox.closeCount += 1;
      sandbox.isPronunciationCoachOpen = false;
      sandbox.activePronunciationSentence = null;
      sandbox.pronunciationPracticeState = "idle";
    },
    playVideoForPronunciation(video) {
      video.playCount += 1;
      return Promise.resolve(true);
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${success}\n${continueAction}`, sandbox);

  vm.runInContext("finishPronunciationCoachSentence()", sandbox);
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(sandbox.closeCount, 1);
  assert.equal(sandbox.video.playCount, 1);
  assert.equal(sandbox.isPronunciationContinuousSessionActive, true);
  assert.equal(sandbox.pronunciationContinuousAutoSpeakPending.sourceSentenceId, "sentence-44");
  assert.equal(sandbox.pronunciationContinuousAutoSpeakPending.sourceAttemptId, 44);
  assert.equal(sandbox.pronunciationContinuousAutoSpeakPending.sessionGeneration, 3);

  // Simulate a duplicate success callback for the same guarded attempt.
  sandbox.activePronunciationAttempt = Object.freeze({ id: 44, sentenceId: "sentence-44" });
  sandbox.activePronunciationSentence = { id: "sentence-44", mediaKey: "youtube:abc", text: "Same sentence." };
  sandbox.isPronunciationCoachOpen = true;
  sandbox.pronunciationPracticeState = "listening";
  vm.runInContext("finishPronunciationCoachSentence()", sandbox);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(sandbox.closeCount, 1);
  assert.equal(sandbox.video.playCount, 1);

  // Single practice remains manual even if the continuous-session flag is active.
  sandbox.pronunciationPracticeMode = "single";
  sandbox.isPronunciationContinuousSessionActive = true;
  sandbox.activePronunciationAttempt = Object.freeze({ id: 45, sentenceId: "sentence-45" });
  sandbox.activePronunciationSentence = { id: "sentence-45", mediaKey: "youtube:abc", text: "Single practice." };
  sandbox.isPronunciationCoachOpen = true;
  sandbox.pronunciationPracticeState = "listening";
  vm.runInContext("finishPronunciationCoachSentence()", sandbox);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(sandbox.closeCount, 1);
  assert.equal(sandbox.video.playCount, 1);

  // A continuous session that was ended/restarted before the queued Continue fires is stale.
  sandbox.pronunciationPracticeMode = "continuous";
  sandbox.isPronunciationContinuousSessionActive = true;
  sandbox.pronunciationContinuousSessionGeneration = 10;
  sandbox.activePronunciationAttempt = Object.freeze({ id: 46, sentenceId: "sentence-46" });
  sandbox.activePronunciationSentence = { id: "sentence-46", mediaKey: "youtube:abc", text: "Stale transition." };
  sandbox.isPronunciationCoachOpen = true;
  sandbox.pronunciationPracticeState = "listening";
  vm.runInContext("finishPronunciationCoachSentence()", sandbox);
  sandbox.pronunciationContinuousSessionGeneration = 11;
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(sandbox.closeCount, 1);
  assert.equal(sandbox.video.playCount, 1);
});


test("real recognition success keeps the completed attempt identity and repeats the hands-free continuous loop", async () => {
  const finish = block(
    /function finishPronunciationCoachSentence\([^)]*\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function advancePronunciationCoach)/,
    "continuous success finisher"
  );
  const advance = block(
    /function advancePronunciationCoach\([^)]*\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function activatePronunciationCoachChunkHelp)/,
    "pronunciation advance helper"
  );
  const commit = block(
    /function commitPronunciationCoachResult\(result\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function applyPronunciationCoachCandidates)/,
    "real recognition commit helper"
  );
  const continueAction = block(
    /function handlePronunciationContinueAction\(\) \{[\s\S]*?\r?\n  \}/,
    "existing Continue action"
  );
  const autoSpeak = block(
    /function maybeAutoStartPronunciationContinuousTarget\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function markPronunciationContinuousResumeBoundary)/,
    "continuous auto-Speak helper"
  );

  assert.match(commit, /const completedAttempt = activePronunciationAttempt/);
  assert.match(commit, /advancePronunciationCoach\(completedAttempt\)/);
  assert.match(finish, /completedAttempt = activePronunciationAttempt/);

  const sentenceA = { id: "sentence-A", mediaKey: "youtube:abc", text: "Sentence A." };
  const sentenceB = { id: "sentence-B", mediaKey: "youtube:abc", text: "Sentence B." };
  const sentenceC = { id: "sentence-C", mediaKey: "youtube:abc", text: "Sentence C." };
  const video = { paused: true, playCount: 0 };
  const sandbox = {
    pronunciationPracticeMode: "continuous",
    isPronunciationContinuousSessionActive: true,
    pronunciationContinuousSessionGeneration: 9,
    pronunciationContinuousAutoContinueAttemptId: 0,
    pronunciationContinuousAutoSpeakPending: null,
    pronunciationContinuousAutoSpeakSentenceId: "",
    mediaInteractionGeneration: 4,
    activePronunciationAttempt: Object.freeze({ id: 101, sentenceId: sentenceA.id }),
    activePronunciationSentence: sentenceA,
    currentFinalizedSentence: sentenceA,
    isPronunciationCoachOpen: true,
    isPronunciationPracticeEnabled: true,
    pronunciationPracticeState: "listening",
    pronunciationCoachChunkHelpActive: false,
    pronunciationCoachChunks: [],
    pronunciationCoachChunkIndex: 0,
    pronunciationCoachLiveMatches: new Set(),
    pronunciationCoachActiveWordIndex: 0,
    pronunciationCoachStatus: { textContent: "" },
    pronunciationCoachHeard: { textContent: "" },
    pronunciationCoachFailedAttemptCount: 0,
    pronunciationCoachListening: true,
    pronunciationCoachRecognition: { sentence: "A" },
    panel: { classList: { add() {} } },
    window: { setTimeout },
    video,
    stopCount: 0,
    invalidateCount: 0,
    continueCount: 0,
    speakCount: 0,
    renderPronunciationCoach() {},
    preservePronunciationCoachProgress() {},
    getCurrentPronunciationCoachChunk() { return { text: "complete", parts: [] }; },
    isPronunciationCoachChunkComplete() { return true; },
    invalidatePronunciationAttempt() {
      sandbox.invalidateCount += 1;
      sandbox.activePronunciationAttempt = null;
    },
    stopPronunciationCoachRecognition() {
      sandbox.stopCount += 1;
      sandbox.pronunciationCoachRecognition = null;
      sandbox.pronunciationCoachListening = false;
    },
    getNetflixVideo() { return video; },
    markPronunciationContinuousResumeBoundary() {},
    closePronunciationCoach() {
      sandbox.continueCount += 1;
      sandbox.isPronunciationCoachOpen = false;
      sandbox.activePronunciationSentence = null;
      sandbox.pronunciationPracticeState = "idle";
    },
    playVideoForPronunciation(targetVideo) {
      targetVideo.playCount += 1;
      targetVideo.paused = false;
      return Promise.resolve(true);
    },
    handlePronunciationSpeakAction() {
      sandbox.speakCount += 1;
      sandbox.pronunciationCoachListening = true;
      sandbox.pronunciationCoachRecognition = { sentence: sandbox.activePronunciationSentence.id };
      sandbox.pronunciationPracticeState = "listening";
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${finish}\n${advance}\n${commit}\n${continueAction}\n${autoSpeak}`, sandbox);

  // Sentence A completes through the real recognition commit path.
  vm.runInContext(`commitPronunciationCoachResult({ matchedKeys: new Set(), text: "Sentence A" })`, sandbox);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(sandbox.pronunciationContinuousAutoContinueAttemptId, 101);
  assert.equal(sandbox.continueCount, 1);
  assert.equal(video.playCount, 1);
  assert.equal(sandbox.isPronunciationContinuousSessionActive, true);
  assert.equal(sandbox.pronunciationCoachRecognition, null);
  const pendingB = sandbox.pronunciationContinuousAutoSpeakPending;
  assert.equal(pendingB.sourceSentenceId, sentenceA.id);
  assert.equal(pendingB.sourceAttemptId, 101);

  // Sentence B becomes the displayed active finalized target, then reuses Speak once.
  video.paused = true;
  sandbox.activePronunciationSentence = sentenceB;
  sandbox.currentFinalizedSentence = sentenceB;
  sandbox.isPronunciationCoachOpen = true;
  sandbox.pronunciationPracticeMode = "continuous";
  sandbox.pronunciationPracticeState = "ready";
  sandbox.pronunciationCoachListening = false;
  sandbox.pronunciationCoachRecognition = null;
  sandbox.pendingB = pendingB;
  sandbox.sentenceB = sentenceB;
  vm.runInContext("maybeAutoStartPronunciationContinuousTarget(sentenceB, pendingB)", sandbox);
  assert.equal(sandbox.speakCount, 1);

  // B success repeats the same Continue transition instead of stopping after one sentence.
  sandbox.activePronunciationAttempt = Object.freeze({ id: 102, sentenceId: sentenceB.id });
  vm.runInContext(`commitPronunciationCoachResult({ matchedKeys: new Set(), text: "Sentence B" })`, sandbox);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(sandbox.pronunciationContinuousAutoContinueAttemptId, 102);
  assert.equal(sandbox.continueCount, 2);
  assert.equal(video.playCount, 2);
  const pendingC = sandbox.pronunciationContinuousAutoSpeakPending;
  assert.equal(pendingC.sourceSentenceId, sentenceB.id);
  assert.equal(pendingC.sourceAttemptId, 102);

  video.paused = true;
  sandbox.activePronunciationSentence = sentenceC;
  sandbox.currentFinalizedSentence = sentenceC;
  sandbox.isPronunciationCoachOpen = true;
  sandbox.pronunciationPracticeState = "ready";
  sandbox.pronunciationCoachListening = false;
  sandbox.pronunciationCoachRecognition = null;
  sandbox.pendingC = pendingC;
  sandbox.sentenceC = sentenceC;
  vm.runInContext("maybeAutoStartPronunciationContinuousTarget(sentenceC, pendingC)", sandbox);
  assert.equal(sandbox.speakCount, 2);

  // Duplicate handoff for C cannot create a second microphone start.
  vm.runInContext("maybeAutoStartPronunciationContinuousTarget(sentenceC, pendingC)", sandbox);
  assert.equal(sandbox.speakCount, 2);
});

test("continuous next finalized target calls the existing Speak action once and rejects stale or unsafe starts", () => {
  const helper = block(
    /function maybeAutoStartPronunciationContinuousTarget\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function markPronunciationContinuousResumeBoundary)/,
    "continuous auto-Speak helper"
  );
  assert.match(helper, /handlePronunciationSpeakAction\(\)/);
  assert.doesNotMatch(helper, /pronunciationPracticeSpeakButton\.click\(\)/);
  assert.doesNotMatch(helper, /recognition\.start|startPronunciationCoachRecognition/);
  assert.match(helper, /pendingTransition\.sourceSentenceId === sentence\.id/);
  assert.match(helper, /pendingTransition\.sessionGeneration !== pronunciationContinuousSessionGeneration/);
  assert.match(helper, /pendingTransition\.mediaGeneration !== mediaInteractionGeneration/);
  assert.match(helper, /!video\.paused/);
  assert.match(helper, /pronunciationCoachListening/);
  assert.match(helper, /pronunciationCoachRecognition/);
  assert.match(helper, /pronunciationPracticeMode !== "continuous"/);

  const sentence = {
    id: "sentence-2",
    mediaKey: "youtube:abc",
    text: "This is the next finalized sentence."
  };
  const pending = Object.freeze({
    sourceSentenceId: "sentence-1",
    sourceAttemptId: 44,
    mediaKey: "youtube:abc",
    mediaGeneration: 7,
    sessionGeneration: 3
  });
  const sandbox = {
    pronunciationContinuousAutoSpeakPending: pending,
    pronunciationContinuousAutoSpeakSentenceId: "",
    isPronunciationPracticeEnabled: true,
    isPronunciationContinuousSessionActive: true,
    pronunciationContinuousSessionGeneration: 3,
    mediaInteractionGeneration: 7,
    pronunciationContinuousAutoContinueAttemptId: 44,
    isPronunciationCoachOpen: true,
    pronunciationPracticeMode: "continuous",
    activePronunciationSentence: sentence,
    currentFinalizedSentence: sentence,
    pronunciationPracticeState: "ready",
    pronunciationCoachListening: false,
    pronunciationCoachRecognition: null,
    video: { paused: true },
    speakCount: 0,
    handlePronunciationSpeakAction() { sandbox.speakCount += 1; },
    getNetflixVideo() { return sandbox.video; }
  };
  vm.createContext(sandbox);
  vm.runInContext(helper, sandbox);

  sandbox.pending = pending;
  sandbox.sentence = sentence;
  vm.runInContext("maybeAutoStartPronunciationContinuousTarget(sentence, pending)", sandbox);
  assert.equal(sandbox.speakCount, 1);
  assert.equal(sandbox.pronunciationContinuousAutoSpeakPending, null);
  assert.equal(sandbox.pronunciationContinuousAutoSpeakSentenceId, "sentence-2");

  // Re-render/state callbacks cannot re-open the same target microphone.
  vm.runInContext("maybeAutoStartPronunciationContinuousTarget(sentence, pending)", sandbox);
  assert.equal(sandbox.speakCount, 1);

  // A target identified while video is still playing is consumed safely without starting mic.
  const playingTarget = { id: "sentence-3", mediaKey: "youtube:abc", text: "Not paused yet." };
  const playingPending = Object.freeze({
    sourceSentenceId: "sentence-2",
    sourceAttemptId: 45,
    mediaKey: "youtube:abc",
    mediaGeneration: 7,
    sessionGeneration: 3
  });
  sandbox.pronunciationContinuousAutoSpeakPending = playingPending;
  sandbox.pronunciationContinuousAutoSpeakSentenceId = "sentence-2";
  sandbox.pronunciationContinuousAutoContinueAttemptId = 45;
  sandbox.activePronunciationSentence = playingTarget;
  sandbox.currentFinalizedSentence = playingTarget;
  sandbox.video.paused = false;
  sandbox.playingTarget = playingTarget;
  sandbox.playingPending = playingPending;
  vm.runInContext("maybeAutoStartPronunciationContinuousTarget(playingTarget, playingPending)", sandbox);
  assert.equal(sandbox.speakCount, 1);
  assert.equal(sandbox.pronunciationContinuousAutoSpeakPending, null);
  sandbox.video.paused = true;
  vm.runInContext("maybeAutoStartPronunciationContinuousTarget(playingTarget, playingPending)", sandbox);
  assert.equal(sandbox.speakCount, 1);

  // Continuous session off blocks auto-Speak even when the target is otherwise current.
  const offTarget = { id: "sentence-off", mediaKey: "youtube:abc", text: "Session ended." };
  const offPending = Object.freeze({
    sourceSentenceId: "sentence-3",
    sourceAttemptId: 46,
    mediaKey: "youtube:abc",
    mediaGeneration: 7,
    sessionGeneration: 3
  });
  sandbox.pronunciationContinuousAutoSpeakPending = offPending;
  sandbox.pronunciationContinuousAutoContinueAttemptId = 46;
  sandbox.pronunciationContinuousSessionGeneration = 3;
  sandbox.isPronunciationContinuousSessionActive = false;
  sandbox.activePronunciationSentence = offTarget;
  sandbox.currentFinalizedSentence = offTarget;
  sandbox.offTarget = offTarget;
  sandbox.offPending = offPending;
  vm.runInContext("maybeAutoStartPronunciationContinuousTarget(offTarget, offPending)", sandbox);
  assert.equal(sandbox.speakCount, 1);

  sandbox.isPronunciationContinuousSessionActive = true;

  // Off/on session generation changes invalidate an old successful transition.
  const staleTarget = { id: "sentence-4", mediaKey: "youtube:abc", text: "Stale session." };
  const stalePending = Object.freeze({
    sourceSentenceId: "sentence-3",
    sourceAttemptId: 46,
    mediaKey: "youtube:abc",
    mediaGeneration: 7,
    sessionGeneration: 3
  });
  sandbox.pronunciationContinuousAutoSpeakPending = stalePending;
  sandbox.pronunciationContinuousAutoSpeakSentenceId = "sentence-3";
  sandbox.pronunciationContinuousAutoContinueAttemptId = 46;
  sandbox.pronunciationContinuousSessionGeneration = 5;
  sandbox.activePronunciationSentence = staleTarget;
  sandbox.currentFinalizedSentence = staleTarget;
  sandbox.staleTarget = staleTarget;
  sandbox.stalePending = stalePending;
  vm.runInContext("maybeAutoStartPronunciationContinuousTarget(staleTarget, stalePending)", sandbox);
  assert.equal(sandbox.speakCount, 1);

  // Single practice never consumes the continuous auto-Speak path.
  const singlePending = Object.freeze({
    sourceSentenceId: "sentence-4",
    sourceAttemptId: 47,
    mediaKey: "youtube:abc",
    mediaGeneration: 7,
    sessionGeneration: 5
  });
  const singleTarget = { id: "sentence-5", mediaKey: "youtube:abc", text: "Single practice." };
  sandbox.pronunciationContinuousAutoSpeakPending = singlePending;
  sandbox.pronunciationContinuousAutoContinueAttemptId = 47;
  sandbox.pronunciationPracticeMode = "single";
  sandbox.activePronunciationSentence = singleTarget;
  sandbox.currentFinalizedSentence = singleTarget;
  sandbox.singlePending = singlePending;
  sandbox.singleTarget = singleTarget;
  vm.runInContext("maybeAutoStartPronunciationContinuousTarget(singleTarget, singlePending)", sandbox);
  assert.equal(sandbox.speakCount, 1);
});

test("continuous cancellation clears the pending auto-Speak transition", () => {
  const toggle = block(
    /pronunciationPracticeContinuousButton\.addEventListener\([\s\S]*?\r?\n\}\);\s*(?=pronunciationPracticeSkipButton\.addEventListener)/,
    "continuous toggle"
  );
  const skip = block(
    /function handlePronunciationSkipAction\(\) \{[\s\S]*?\r?\n  \}/,
    "practice skip/cancel action"
  );
  const featureToggle = block(
    /pronunciationPracticeToggleButton\.addEventListener\([\s\S]*?\r?\n\);\s*(?=pronunciationToggleButton\.addEventListener)/,
    "feature toggle"
  );
  const reset = block(
    /function resetPlaybackMediaContext\([\s\S]*?\r?\n\}\r?\n(?=\r?\nfunction refreshPlaybackMediaContext)/,
    "media reset helper"
  );

  assert.match(toggle, /pronunciationContinuousSessionGeneration \+= 1/);
  assert.match(toggle, /pronunciationContinuousAutoSpeakPending = null/);
  assert.match(skip, /cancelContinuous/);
  assert.match(skip, /isPronunciationContinuousSessionActive = false/);
  assert.match(skip, /pronunciationContinuousSessionGeneration \+= 1/);
  assert.match(skip, /pronunciationContinuousAutoSpeakPending = null/);
  assert.match(featureToggle, /pronunciationContinuousSessionGeneration \+= 1/);
  assert.match(featureToggle, /pronunciationContinuousAutoSpeakPending = null/);
  assert.match(reset, /pronunciationContinuousSessionGeneration \+= 1/);
  assert.match(reset, /pronunciationContinuousAutoSpeakPending = null/);
});

test("continuous Continue resumes past the practiced sentence and keeps the session active", async () => {
  const resumeHelpers = block(
    /function markPronunciationContinuousResumeBoundary\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function handlePronunciationSkipAction)/,
    "continuous resume helpers"
  );
  const continueAction = block(
    /function handlePronunciationContinueAction\(\) \{[\s\S]*?\r?\n  \}/,
    "continuous Continue action"
  );
  const finishTail = block(
    /if \(\s*isPronunciationPracticeEnabled\s*&&\s*isPronunciationContinuousSessionActive[\s\S]*?openPronunciationCoach\(finalizedSentence, "continuous"\);[\s\S]*?\n\}/,
    "continuous finalized-sentence handoff"
  );
  const open = block(
    /function openPronunciationCoach\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function closePronunciationCoach)/,
    "coach open helper"
  );

  const sandbox = {
    isPronunciationContinuousSessionActive: true,
    activePronunciationSentence: {
      id: "sentence-1",
      mediaKey: "youtube:abc",
      text: "We do not stop here.",
      startTimeMs: 1000,
      endTimeMs: 4200
    },
    pronunciationContinuousResumeBoundary: null,
    pronunciationPracticeMode: "continuous",
    cleanText: (value) => String(value || "").trim(),
    video: { played: 0 }
  };
  sandbox.getNetflixVideo = () => sandbox.video;
  sandbox.closePronunciationCoach = () => { sandbox.activePronunciationSentence = null; };
  sandbox.playVideoForPronunciation = (video) => { video.played += 1; return Promise.resolve(true); };
  vm.createContext(sandbox);
  vm.runInContext(`${resumeHelpers}\n${continueAction}\nhandlePronunciationContinueAction();`, sandbox);

  assert.equal(sandbox.isPronunciationContinuousSessionActive, true);
  assert.equal(sandbox.video.played, 1);
  assert.equal(sandbox.pronunciationContinuousResumeBoundary.text, "We do not stop here.");
  assert.equal(
    vm.runInContext(`isPronunciationContinuousResumeDuplicate({ mediaKey: "youtube:abc", text: "We do not stop here.", startTimeMs: 4300, endTimeMs: 5200 })`, sandbox),
    true
  );
  assert.equal(
    vm.runInContext(`isPronunciationContinuousResumeDuplicate({ mediaKey: "youtube:abc", text: "Now we move on.", startTimeMs: 5200, endTimeMs: 7600 })`, sandbox),
    false
  );

  assert.match(finishTail, /!isContinuousResumeDuplicate/);
  assert.match(finishTail, /pronunciationContinuousResumeBoundary = null/);
  assert.match(finishTail, /openPronunciationCoach\(finalizedSentence, "continuous"\)/);
  assert.match(content, /isAutomaticPauseEnabled[\s\S]*?shouldPauseForSentence &&[\s\S]*?!isContinuousResumeDuplicate/);
  assert.doesNotMatch(continueAction, /isPronunciationContinuousSessionActive\s*=\s*false/);
  assert.doesNotMatch(open, /startPronunciationCoachRecognition|recognition\.start/);
});

test("manual play and seek invalidate attempts while stale preview callbacks are generation guarded", () => {
  const media = block(
    /function markPronunciationMediaInteraction\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function ensurePronunciationMediaSafetyListeners)/,
    "media interaction helper"
  );
  const seek = block(
    /function requestNetflixSeek\([\s\S]*?\r?\n\}/,
    "seek helper"
  );
  const preview = block(
    /function updatePronunciationCoachVideoPreview\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  window\.addEventListener)/,
    "preview update helper"
  );
  assert.match(media, /mediaInteractionGeneration \+= 1/);
  assert.match(media, /invalidatePronunciationAttempt\(\)/);
  assert.match(media, /reason === "play" \|\| reason === "seek"/);
  assert.match(seek, /markPronunciationMediaInteraction\("seek"\)/);
  assert.match(preview, /preview\.mediaGeneration !== mediaInteractionGeneration/);
  assert.match(preview, /activePronunciationSentence\?\.id !== preview\.sentenceId/);
});

test("failed controlled media operations clear their pending event token", async () => {
  const tokenHelpers = block(
    /function createPronunciationControlledMediaEventToken\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function allowPronunciationControlledMedia)/,
    "controlled media event token helpers"
  );
  const play = block(
    /async function playVideoForPronunciation\(video\) \{[\s\S]*?\r?\n  \}/,
    "controlled pronunciation play helper"
  );
  const pause = block(
    /function pauseVideoForPronunciation\(video\) \{[\s\S]*?\r?\n  \}/,
    "controlled pronunciation pause helper"
  );
  const listeners = block(
    /function ensurePronunciationMediaSafetyListeners\(video\) \{[\s\S]*?\r?\n  \}/,
    "pronunciation media safety listeners"
  );
  const sandbox = {
    pronunciationControlledMediaEventGeneration: 0,
    pronunciationControlledMediaEventTokens: new Map(),
    token: null,
    consumedAfterClear: null,
    consumedOnce: null,
    consumedTwice: null
  };
  vm.runInNewContext(
    `${tokenHelpers}\n` +
      `token = createPronunciationControlledMediaEventToken("play", 1400);\n` +
      `clearPronunciationControlledMediaEventToken(token);\n` +
      `consumedAfterClear = consumePronunciationControlledMediaEventToken("play");\n` +
      `token = createPronunciationControlledMediaEventToken("play", 1400);\n` +
      `consumedOnce = consumePronunciationControlledMediaEventToken("play");\n` +
      `consumedTwice = consumePronunciationControlledMediaEventToken("play");`,
    sandbox
  );
  assert.equal(sandbox.consumedAfterClear, false);
  assert.equal(sandbox.consumedOnce, true);
  assert.equal(sandbox.consumedTwice, false);

  sandbox.failedPlayTokenStillPending = null;
  await vm.runInNewContext(
    `${tokenHelpers}\n${play}\n` +
      `playVideoForPronunciation({ play: () => Promise.reject(new Error("blocked")) })` +
      `.then(() => { failedPlayTokenStillPending = consumePronunciationControlledMediaEventToken("play"); });`,
    sandbox
  );
  assert.equal(sandbox.failedPlayTokenStillPending, false);
  assert.match(play, /createPronunciationControlledMediaEventToken\("play", 1400\)/);
  assert.match(play, /catch \(error\)[\s\S]*?clearPronunciationControlledMediaEventToken\(controlledPlayToken\)/s);
  assert.match(pause, /createPronunciationControlledMediaEventToken\("pause"\)/);
  assert.match(pause, /catch \(error\)[\s\S]*?clearPronunciationControlledMediaEventToken\(controlledPauseToken\)/s);
  assert.match(listeners, /consumePronunciationControlledMediaEventToken\(reason\)/);
});

test("media change invalidates pronunciation state without issuing pronunciation play or pause", () => {
  const reset = block(
    /function resetPlaybackMediaContext\([\s\S]*?\r?\n\}\r?\n(?=\r?\nfunction refreshPlaybackMediaContext)/,
    "media reset helper"
  );
  assert.match(reset, /mediaInteractionGeneration \+= 1/);
  assert.match(reset, /invalidatePronunciationAttempt\(\)/);
  assert.match(reset, /isPronunciationContinuousSessionActive = false/);
  assert.match(reset, /currentFinalizedSentence = null/);
  assert.match(reset, /finalizedSentenceHistory\.length = 0/);
  assert.match(reset, /closePronunciationCoach\(true, false\)/);
  assert.doesNotMatch(reset, /playVideoForPronunciation|pauseVideoForPronunciation|video\.play|video\.pause/);
});

test("weighted intelligibility blocks missing negation, tolerates a low-weight article, and requires proper names", () => {
  const completion = block(
    /function isPronunciationCoachChunkComplete\(chunk\) \{[\s\S]*?\r?\n  \}/,
    "chunk completion helper"
  );
  const sandbox = { pronunciationSuccessThreshold: 0.78, result: null };

  const evaluate = (parts) => {
    sandbox.chunk = { parts };
    vm.runInNewContext(`${completion}\nresult = isPronunciationCoachChunkComplete(chunk);`, sandbox);
    return sandbox.result;
  };

  assert.equal(evaluate([
    { kind: "word", weight: 1, state: "passed" },
    { kind: "word", weight: 2.5, state: "retry" },
    { kind: "word", weight: 1, state: "passed" }
  ]), false);

  assert.equal(evaluate([
    { kind: "word", weight: 1, state: "passed" },
    { kind: "word", weight: 0.4, state: "retry" },
    { kind: "word", weight: 1, state: "passed" }
  ]), true);

  assert.equal(evaluate([
    { kind: "word", weight: 1.15, isProperName: true, state: "retry" },
    { kind: "word", weight: 1, state: "passed" },
    { kind: "word", weight: 1, state: "passed" }
  ]), false);
});

test("proper-name phonetic evidence accepts supported spelling variants", () => {
  const matcher = block(
    /function getPronunciationCoachCharacterDistance\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function getPronunciationCoachProperNames)/,
    "word matching helpers"
  );
  const sandbox = {
    getWordTokens: (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean),
    sean: null,
    geoff: null,
    siobhan: null,
    tolerant: null,
    normal: null
  };
  vm.runInNewContext(
    `${matcher}\n` +
      `sean = isPronunciationCoachWordMatch("Sean", "Shawn", true);\n` +
      `geoff = isPronunciationCoachWordMatch("Geoff", "Jeff", true);\n` +
      `siobhan = isPronunciationCoachWordMatch("Siobhan", "Shivon", true);\n` +
      `tolerant = isPronunciationCoachWordMatch("Kristi", "Kristy", true);\n` +
      `normal = isPronunciationCoachWordMatch("Kristi", "Kristy", false);`,
    sandbox
  );
  assert.equal(sandbox.sean.success, true);
  assert.equal(sandbox.geoff.success, true);
  assert.equal(sandbox.siobhan.success, true);
  assert.equal(sandbox.tolerant.success, true);
  assert.match(content, /recognition\.maxAlternatives\s*=\s*5/);
  assert.match(content, /const alternativeCount = Math\.min\(latestResult\.length, 5\)/);
});

test("proper-name phonetic collisions and omitted names do not auto-pass", () => {
  const matcher = block(
    /function getPronunciationCoachCharacterDistance\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function getPronunciationCoachProperNames)/,
    "word matching helpers"
  );
  const sandbox = {
    getWordTokens: (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean),
    collision: null,
    missing: null,
    sameKey: null
  };
  vm.runInNewContext(
    `${matcher}\n` +
      `collision = isPronunciationCoachWordMatch("John", "Jane", true);\n` +
      `missing = isPronunciationCoachWordMatch("John", "", true);\n` +
      `sameKey = getPronunciationCoachPhoneticKey("John") === getPronunciationCoachPhoneticKey("Jane");`,
    sandbox
  );
  assert.equal(sandbox.sameKey, true, "fixture must exercise a phonetic-key collision");
  assert.equal(sandbox.collision.success, false);
  assert.equal(sandbox.missing.success, false);
  assert.match(matcher, /phoneticMatch\s*&&[\s\S]*?lengthRatio\s*>=\s*0\.72[\s\S]*?fuzzyScore\s*>=\s*fuzzyFloor/s);
});

test("inline UI reuses PauseSpeak SVGs, keeps practice visible, and preserves idle auto-hide", () => {
  assert.equal(manifest.version, "1.1.29");
  assert.match(content, /setPauseSpeakButton\(pronunciationPracticeSpeakButton, "coach", "Söyle"\)/);
  assert.match(content, /setPauseSpeakButton\(pronunciationPracticeListenButton, "speaker", "Dinle"\)/);
  assert.match(content, /setPauseSpeakButton\(pronunciationPracticeSkipButton, "close", "Vazgeç"\)/);
  assert.doesNotMatch(content, /(?:FontAwesome|Material Icons|lucide|heroicons)/i);
  assert.match(css, /\.ps-pronunciation-practice-row/);

  const autoHide = block(
    /function showInterfaceControls\([\s\S]*?\r?\n\}/,
    "control auto-hide helper"
  );
  assert.match(autoHide, /isPronunciationCoachOpen/);
  assert.match(autoHide, /interfaceControlsHideDelayMs/);
  assert.doesNotMatch(autoHide, /isPronunciationPracticeEnabled/);
});

test("transcript pronunciation action appears once on the finalized sentence last cue and stays separate from row seek", () => {
  const transcript = block(
    /function renderTranscriptPanel\(\) \{[\s\S]*?\r?\n\}/,
    "transcript render helper"
  );
  const resolver = block(
    /function findFinalizedSentenceForTranscriptCue\(cue\) \{[\s\S]*?\r?\n  \}/,
    "transcript finalized-sentence resolver"
  );
  assert.match(transcript, /const pronunciationTargetByCueIndex = new Map\(\)/);
  assert.match(transcript, /const pronunciationLastCueIndexBySentenceId = new Map\(\)/);
  assert.match(transcript, /pronunciationLastCueIndexBySentenceId\.set\(target\.id, cueIndex\)/);
  assert.match(transcript, /pronunciationLastCueIndexBySentenceId\.get\(pronunciationTarget\.id\) === index/);
  assert.doesNotMatch(transcript, /renderedPronunciationSentenceIds/);
  assert.match(transcript, /getPauseSpeakIcon\("coach"\)/);
  assert.match(transcript, /event\.stopPropagation\(\)/);
  assert.match(transcript, /openPronunciationCoach\(pronunciationTarget, "single"\)/);
  assert.doesNotMatch(transcript, /openPronunciationCoach\(cue/);
  assert.match(transcript, /rowShell\.append\(row, transcriptPronunciationAction\)/);
  assert.doesNotMatch(transcript, /row\.appendChild\(transcriptPronunciationAction\)/);
  assert.match(transcript, /row\.addEventListener\([\s\S]*?seekToTranscriptCue\(cue\)/s);
  assert.match(resolver, /finalizedSentenceHistory/);
  assert.match(resolver, /sentence\.mediaKey !== mediaKey/);
});

test("pronunciation practice locks the visible work sentence to the active finalized target", () => {
  const lock = block(
    /function isPronunciationTargetDisplayLocked\(\) \{[\s\S]*?\r?\n  \}/,
    "pronunciation target display lock"
  );
  const identity = block(
    /function isActivePronunciationSentenceDisplayed\(\) \{[\s\S]*?\r?\n  \}/,
    "main-card pronunciation identity guard"
  );
  const targetRenderer = block(
    /function renderActivePronunciationSentenceInSubtitle\(\) \{[\s\S]*?\r?\n  \}/,
    "finalized target renderer"
  );
  const chunkRender = block(
    /function renderChunkedSubtitle\(\) \{[\s\S]*?\r?\n\}/,
    "subtitle chunk renderer"
  );
  const updateSubtitle = block(
    /function updateSubtitle\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function finishReplay)/,
    "subtitle update helper"
  );
  const render = block(
    /function renderPronunciationCoach\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function isPronunciationCoachEvaluationBetter)/,
    "pronunciation coach render helper"
  );
  const close = block(
    /function closePronunciationCoach\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function getPronunciationCoachVideoRange)/,
    "coach close helper"
  );
  const sandbox = {
    activePronunciationSentence: { id: "sentence-old" },
    subtitleBox: { dataset: { finalizedSentenceId: "sentence-old" } },
    first: null,
    second: null
  };
  vm.runInNewContext(`${identity}\nfirst = isActivePronunciationSentenceDisplayed();\nsubtitleBox.dataset.pronunciationTargetSentenceId = "sentence-old";\nsecond = isActivePronunciationSentenceDisplayed();`, sandbox);
  assert.equal(sandbox.first, false);
  assert.equal(sandbox.second, true);
  assert.match(lock, /isPronunciationCoachOpen/);
  assert.match(lock, /isPronunciationCoachSessionActive/);
  assert.match(lock, /activePronunciationSentence\?\.id/);
  assert.match(identity, /subtitleBox\.dataset\.pronunciationTargetSentenceId/);
  assert.match(targetRenderer, /subtitleBox\.dataset\.finalizedSentenceId = sentence\.id/);
  assert.match(targetRenderer, /subtitleBox\.dataset\.pronunciationTargetSentenceId = sentence\.id/);
  assert.match(targetRenderer, /createImmediateStudySegments\(sentence\.text\)/);
  assert.match(targetRenderer, /appendStudySegments/);
  assert.match(chunkRender, /if \(isPronunciationTargetDisplayLocked\(\)\) \{[\s\S]*?renderActivePronunciationSentenceInSubtitle\(\)[\s\S]*?return;/);
  assert.match(updateSubtitle, /!isPronunciationTargetDisplayLocked\(\)/);
  assert.match(render, /renderActivePronunciationSentenceInSubtitle\(\)/);
  assert.match(close, /renderChunkedSubtitle\(\)/);
  assert.doesNotMatch(content, /pronunciationPracticeTarget|ps-pronunciation-practice-target/);
  assert.doesNotMatch(css, /ps-pronunciation-practice-target/);
});

test("ASR candidate ranking prioritizes critical words, required proper names, then weighted intelligibility", () => {
  const comparator = block(
    /function isPronunciationCoachEvaluationBetter\(candidate, current\) \{[\s\S]*?\r?\n  \}/,
    "weighted ASR candidate comparator"
  );
  const chooser = block(
    /function choosePronunciationCoachCandidate\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function clearPronunciationCoachTimers)/,
    "ASR candidate chooser"
  );
  const evaluations = {
    critical: {
      matchedKeys: new Set(["dont", "go"]),
      criticalMatchedCount: 1,
      properNameMatchedCount: 0,
      weightedCoverage: 0.52,
      weightedScore: 0.49,
      totalScore: 2.4
    },
    functionHeavy: {
      matchedKeys: new Set(["the", "to", "a", "go"]),
      criticalMatchedCount: 0,
      properNameMatchedCount: 0,
      weightedCoverage: 0.92,
      weightedScore: 0.88,
      totalScore: 3.6
    },
    proper: {
      matchedKeys: new Set(["sean", "go"]),
      criticalMatchedCount: 0,
      properNameMatchedCount: 1,
      weightedCoverage: 0.54,
      weightedScore: 0.5,
      totalScore: 2.1
    },
    noProper: {
      matchedKeys: new Set(["the", "to", "go"]),
      criticalMatchedCount: 0,
      properNameMatchedCount: 0,
      weightedCoverage: 0.9,
      weightedScore: 0.86,
      totalScore: 3.2
    }
  };
  const sandbox = {
    cleanText: (value) => String(value || "").trim(),
    evaluatePronunciationCoachText: (text) => evaluations[text],
    criticalWinner: null,
    properWinner: null
  };
  vm.runInNewContext(
    `${comparator}\n${chooser}\n` +
      `criticalWinner = choosePronunciationCoachCandidate(["functionHeavy", "critical"]);\n` +
      `properWinner = choosePronunciationCoachCandidate(["noProper", "proper"]);`,
    sandbox
  );
  assert.equal(sandbox.criticalWinner.text, "critical");
  assert.equal(sandbox.properWinner.text, "proper");
  assert.match(comparator, /criticalMatchedCount[\s\S]*properNameMatchedCount[\s\S]*weightedCoverage[\s\S]*weightedScore[\s\S]*matchedKeys/s);
  assert.match(content, /weightedCoverage:\s*totalWeight > 0 \? matchedWeight \/ totalWeight : 0/);
});


test("Tekrar söyle preserves passed words across a new attempt and only matches the unresolved tail", () => {
  const attemptHelpers = block(
    /function invalidatePronunciationAttempt\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function allowPronunciationControlledMedia)/,
    "attempt helpers"
  );
  const matcher = block(
    /function getPronunciationCoachCharacterDistance\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function getPronunciationCoachProperNames)/,
    "ordered pronunciation matcher"
  );
  const references = block(
    /function getPronunciationCoachWordReferences\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function findPronunciationCoachWord)/,
    "word reference helper"
  );
  const finder = block(
    /function findPronunciationCoachWord\([\s\S]*?\r?\n  \}/,
    "word finder"
  );
  const preserve = block(
    /function preservePronunciationCoachProgress\([\s\S]*?\r?\n  \}/,
    "passed-word retention helper"
  );

  const sentence = { id: "sentence-long" };
  const chunks = [{
    parts: [
      { kind: "word", key: "0:w:0", text: "In", weight: 1, state: "passed" },
      { kind: "word", key: "0:w:1", text: "your", weight: 1, state: "passed" },
      { kind: "word", key: "0:w:2", text: "twenties", weight: 1, state: "passed" },
      { kind: "word", key: "0:w:3", text: "endless", weight: 1, state: "pending" },
      { kind: "word", key: "0:w:4", text: "possibilities", weight: 1, state: "pending" }
    ]
  }];
  const sandbox = {
    pronunciationAttemptGeneration: 4,
    activePronunciationAttempt: null,
    activePronunciationSentence: sentence,
    pronunciationCoachShouldRestart: false,
    pronunciationCoachRecognition: null,
    pronunciationCoachChunks: chunks,
    pronunciationCoachChunkHelpActive: false,
    pronunciationCoachChunkIndex: 0,
    getWordTokens: (value) => String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, " ")
      .replace(/'/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean),
    before: null,
    afterBegin: null,
    unresolvedKeys: null,
    result: null,
    finalStates: null
  };

  vm.runInNewContext(
    `${attemptHelpers}\n${matcher}\n${references}\n${finder}\n${preserve}\n` +
      `before = pronunciationCoachChunks[0].parts.map((word) => word.state);\n` +
      `const retryAttempt = beginPronunciationAttempt();\n` +
      `afterBegin = pronunciationCoachChunks[0].parts.map((word) => word.state);\n` +
      `const unresolved = getPronunciationCoachWordReferences();\n` +
      `unresolvedKeys = unresolved.map((reference) => reference.key);\n` +
      `result = collectPronunciationCoachMatches(unresolved, "endless possibilities");\n` +
      `preservePronunciationCoachProgress(result);\n` +
      `finalStates = pronunciationCoachChunks[0].parts.map((word) => word.state);`,
    sandbox
  );

  assert.deepEqual(Array.from(sandbox.before), ["passed", "passed", "passed", "pending", "pending"]);
  assert.deepEqual(Array.from(sandbox.afterBegin), Array.from(sandbox.before));
  assert.deepEqual(Array.from(sandbox.unresolvedKeys), ["0:w:3", "0:w:4"]);
  assert.deepEqual(Array.from(sandbox.result.matchedKeys), ["0:w:3", "0:w:4"]);
  assert.deepEqual(Array.from(sandbox.finalStates), ["passed", "passed", "passed", "passed", "passed"]);
  assert.equal(sandbox.activePronunciationAttempt.sentenceId, sentence.id);
});


test("opening a different finalized sentence starts with fresh pronunciation progress", () => {
  const prepare = block(
    /function preparePronunciationCoachSentence\(sentence\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function synchronizePronunciationCoachChunks)/,
    "prepare coach sentence helper"
  );
  const sandbox = {
    activePronunciationSentence: { id: "sentence-new", text: "Fresh target" },
    currentFinalizedSentence: { id: "sentence-new", text: "Fresh target" },
    currentSubtitleChunks: [],
    pronunciationCoachChunks: [{ parts: [{ kind: "word", state: "passed" }] }],
    pronunciationCoachSentence: "Old target",
    pronunciationCoachChunkIndex: 4,
    pronunciationCoachFailedAttemptCount: 2,
    pronunciationCoachChunkHelpActive: true,
    pronunciationCoachLiveMatches: new Set(["old"]),
    pronunciationCoachActiveWordIndex: 3,
    pronunciationCoachLastHeard: "old speech",
    pronunciationCoachHeard: { textContent: "" },
    pronunciationCoachStatus: { textContent: "" },
    pronunciationPracticeState: "retry",
    cleanText: (value) => String(value || "").trim(),
    createFallbackSubtitleChunks: (value) => [value],
    createPronunciationCoachChunks: (sentence, chunks) => [{
      text: chunks[0],
      parts: [{ kind: "word", key: "new", text: sentence, state: "pending" }]
    }],
    renderPronunciationCoach() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(`${prepare}\npreparePronunciationCoachSentence("Fresh target");`, sandbox);

  assert.equal(sandbox.pronunciationCoachSentence, "Fresh target");
  assert.deepEqual(
    Array.from(sandbox.pronunciationCoachChunks[0].parts, (word) => word.state),
    ["pending"]
  );
  assert.equal(sandbox.pronunciationCoachFailedAttemptCount, 0);
  assert.equal(sandbox.pronunciationCoachChunkHelpActive, false);
  assert.equal(sandbox.pronunciationCoachLiveMatches.size, 0);
  assert.equal(sandbox.pronunciationPracticeState, "ready");
});

test("Baştan al resets only the current sentence progress without changing its sentenceId", () => {
  const restart = block(
    /function handlePronunciationRestartAction\(\) \{[\s\S]*?\r?\n  \}/,
    "restart pronunciation action"
  );
  const sentence = { id: "sentence-reset", text: "Keep the same finalized sentence." };
  const sandbox = {
    isPronunciationPracticeEnabled: true,
    isPronunciationCoachOpen: true,
    activePronunciationSentence: sentence,
    pronunciationCoachChunks: [{ parts: [
      { kind: "word", key: "a", state: "passed" },
      { kind: "word", key: "b", state: "pending" }
    ] }],
    getNetflixVideo: () => ({ paused: true }),
    invalidateCount: 0,
    clearCount: 0,
    stopCount: 0,
    prepareCount: 0,
    preparedText: ""
  };
  sandbox.invalidatePronunciationAttempt = () => { sandbox.invalidateCount += 1; };
  sandbox.clearPronunciationCoachTimers = () => { sandbox.clearCount += 1; };
  sandbox.stopPronunciationCoachRecognition = () => { sandbox.stopCount += 1; };
  sandbox.preparePronunciationCoachSentence = (text) => {
    sandbox.prepareCount += 1;
    sandbox.preparedText = text;
    sandbox.pronunciationCoachChunks = [{ parts: [
      { kind: "word", key: "a", state: "pending" },
      { kind: "word", key: "b", state: "pending" }
    ] }];
  };
  vm.createContext(sandbox);
  vm.runInContext(`${restart}\nhandlePronunciationRestartAction();`, sandbox);

  assert.equal(sandbox.activePronunciationSentence, sentence);
  assert.equal(sandbox.activePronunciationSentence.id, "sentence-reset");
  assert.equal(sandbox.preparedText, sentence.text);
  assert.deepEqual(
    Array.from(sandbox.pronunciationCoachChunks[0].parts, (word) => word.state),
    ["pending", "pending"]
  );
  assert.equal(sandbox.invalidateCount, 1);
  assert.equal(sandbox.clearCount, 1);
  assert.equal(sandbox.stopCount, 1);
  assert.equal(sandbox.prepareCount, 1);
});

test("optional filler words do not block ordered matching while negation remains required", () => {
  const matcher = block(
    /function getPronunciationCoachCharacterDistance\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function getPronunciationCoachProperNames)/,
    "ordered pronunciation matcher"
  );
  const weighting = block(
    /function isPronunciationCoachOptionalFiller\([\s\S]*?\r?\n  \}\r?\n\r?\n  function getPronunciationCoachWordWeight\([\s\S]*?\r?\n  \}/,
    "filler and weighting helpers"
  );
  const chunkBuilder = block(
    /function createPronunciationCoachChunks\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function getPronunciationCoachWordReferences)/,
    "coach chunk builder"
  );
  const completion = block(
    /function isPronunciationCoachChunkComplete\([\s\S]*?\r?\n  \}/,
    "coach completion helper"
  );
  const sentence = "I was never worried about anything, um, happening.";
  const sandbox = {
    pronunciationSuccessThreshold: 0.78,
    getWordTokens: (value) => String(value || "")
      .toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/[^a-z0-9'\s]/g, " ")
      .replace(/'/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean),
    getPronunciationCoachProperNames: () => new Set(),
    createPronunciationCoachParts: (value) => {
      const pieces = String(value || "").match(/[A-Za-z]+|[^\sA-Za-z]+/g) || [];
      return pieces.map((piece) => ({
        text: piece,
        kind: /^[A-Za-z]/.test(piece) ? "word" : "punctuation"
      }));
    },
    sentence,
    chunk: null,
    filler: null,
    withoutFiller: null,
    withFiller: null,
    missingNever: null,
    completesWithoutFiller: null,
    completesWithFiller: null,
    completesMissingNever: null
  };

  vm.runInNewContext(
    `${matcher}\n${weighting}\n${chunkBuilder}\n${completion}\n` +
      `chunk = createPronunciationCoachChunks(sentence, [sentence])[0];\n` +
      `filler = chunk.parts.find((word) => word.kind === "word" && word.normalized === "um");\n` +
      `const references = chunk.parts.filter((word) => word.kind === "word").map((word) => ({ key: word.key, word }));\n` +
      `withoutFiller = collectPronunciationCoachMatches(references, "I was never worried about anything happening");\n` +
      `chunk.parts.forEach((word) => { if (word.kind === "word") word.state = withoutFiller.matchedKeys.has(word.key) ? "passed" : "pending"; });\n` +
      `completesWithoutFiller = isPronunciationCoachChunkComplete(chunk);\n` +
      `withFiller = collectPronunciationCoachMatches(references, "I was never worried about anything um happening");\n` +
      `chunk.parts.forEach((word) => { if (word.kind === "word") word.state = withFiller.matchedKeys.has(word.key) ? "passed" : "pending"; });\n` +
      `completesWithFiller = isPronunciationCoachChunkComplete(chunk);\n` +
      `missingNever = collectPronunciationCoachMatches(references, "I was worried about anything happening");\n` +
      `chunk.parts.forEach((word) => { if (word.kind === "word") word.state = missingNever.matchedKeys.has(word.key) ? "passed" : "pending"; });\n` +
      `completesMissingNever = isPronunciationCoachChunkComplete(chunk);`,
    sandbox
  );

  assert.equal(sandbox.filler.isOptionalFiller, true);
  assert.equal(sandbox.filler.isProperName, false);
  assert.equal(sandbox.filler.weight, 0.05);
  assert.equal(sandbox.withoutFiller.matchedKeys.has(sandbox.filler.key), false);
  assert.equal(sandbox.withoutFiller.matchedKeys.size >= 7, true);
  assert.equal(sandbox.completesWithoutFiller, true);
  assert.equal(sandbox.withFiller.matchedKeys.has(sandbox.filler.key), true);
  assert.equal(sandbox.completesWithFiller, true);
  const neverWord = sandbox.chunk.parts.find((word) => word.kind === "word" && word.normalized === "never");
  assert.equal(neverWord.weight, 2.5);
  assert.equal(sandbox.missingNever.matchedKeys.has(neverWord.key), false);
  assert.equal(sandbox.completesMissingNever, false);
});

test("progressive help waits one retry, highlights important misses on the second, and enables chunks on the third", () => {
  const helpers = block(
    /function activatePronunciationCoachChunkHelp\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function applyPronunciationCoachCandidates)/,
    "progressive pronunciation help helpers"
  );
  const critical = { kind: "word", key: "critical", state: "pending", weight: 2.5, isProperName: false };
  const normal = { kind: "word", key: "normal", state: "pending", weight: 1, isProperName: false };
  const low = { kind: "word", key: "low", state: "pending", weight: 0.4, isProperName: false };
  const chunks = [
    { text: "first natural part", parts: [critical, normal, low] },
    { text: "second natural part", parts: [{ kind: "word", key: "later", state: "pending", weight: 1 }] }
  ];
  const sandbox = {
    pronunciationCoachChunkHelpActive: false,
    pronunciationCoachFailedAttemptCount: 0,
    pronunciationCoachChunks: chunks,
    pronunciationCoachChunkIndex: 0,
    pronunciationCoachSentence: "whole sentence",
    pronunciationCoachLiveMatches: new Set(),
    pronunciationCoachActiveWordIndex: -1,
    activePronunciationAttempt: null,
    pronunciationCoachHeard: { textContent: "" },
    getCurrentPronunciationCoachChunk: () => sandbox.pronunciationCoachChunkHelpActive
      ? sandbox.pronunciationCoachChunks[sandbox.pronunciationCoachChunkIndex]
      : { text: sandbox.pronunciationCoachSentence, parts: sandbox.pronunciationCoachChunks.flatMap((chunk) => chunk.parts) },
    isPronunciationCoachChunkComplete: () => false,
    findPronunciationCoachWord: () => null,
    invalidatePronunciationAttempt: () => {},
    stopPronunciationCoachRecognition: () => {},
    advancePronunciationCoach: () => false,
    setPronunciationPracticeState: (state, message) => {
      sandbox.state = state;
      sandbox.message = message;
    },
    state: null,
    message: null,
    first: null,
    second: null,
    third: null
  };
  vm.runInNewContext(
    `${helpers}\n` +
      `commitPronunciationCoachResult({ matchedKeys: new Set(), text: "one" });\n` +
      `first = { count: pronunciationCoachFailedAttemptCount, chunk: pronunciationCoachChunkHelpActive, critical: pronunciationCoachChunks[0].parts[0].state, normal: pronunciationCoachChunks[0].parts[1].state, low: pronunciationCoachChunks[0].parts[2].state, message };\n` +
      `commitPronunciationCoachResult({ matchedKeys: new Set(), text: "two" });\n` +
      `second = { count: pronunciationCoachFailedAttemptCount, chunk: pronunciationCoachChunkHelpActive, critical: pronunciationCoachChunks[0].parts[0].state, normal: pronunciationCoachChunks[0].parts[1].state, low: pronunciationCoachChunks[0].parts[2].state, message };\n` +
      `commitPronunciationCoachResult({ matchedKeys: new Set(), text: "three" });\n` +
      `third = { count: pronunciationCoachFailedAttemptCount, chunk: pronunciationCoachChunkHelpActive, critical: pronunciationCoachChunks[0].parts[0].state, low: pronunciationCoachChunks[0].parts[2].state, message };`,
    sandbox
  );
  assert.equal(sandbox.first.count, 1);
  assert.equal(sandbox.first.chunk, false);
  assert.equal(sandbox.first.critical, "pending");
  assert.equal(sandbox.first.normal, "pending");
  assert.equal(sandbox.first.low, "pending");
  assert.equal(sandbox.first.message, "Bir kez daha deneyelim");
  assert.equal(sandbox.second.count, 2);
  assert.equal(sandbox.second.chunk, false);
  assert.equal(sandbox.second.critical, "retry");
  assert.equal(sandbox.second.low, "pending");
  assert.equal(sandbox.third.count, 3);
  assert.equal(sandbox.third.chunk, true);
  assert.match(sandbox.third.message, /doğal parçalara/);
  assert.match(content, /pronunciationPracticeListenButton\.hidden = pronunciationPracticeState === "success"/);
  assert.match(content, /pronunciationPracticeSkipButton\.hidden = pronunciationPracticeState === "success"/);
  assert.match(content, /pronunciationPracticeState === "retry" && pronunciationCoachChunkHelpActive && chunk[\s\S]*?`Parça \$\{pronunciationCoachChunkIndex \+ 1\}/s);
  assert.doesNotMatch(helpers, /fetch\(|chunkApiUrl|requestSubtitleChunks/);
});


test("short natural pauses preserve passed words and do not end an incomplete final ASR segment", () => {
  const apply = block(
    /function applyPronunciationCoachCandidates\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function startPronunciationCoachRecognition)/,
    "candidate application helper"
  );
  const sandbox = {
    choosePronunciationCoachCandidate: () => ({ text: "I really", matchedKeys: new Set(["w0", "w1"]) }),
    preservePronunciationCoachProgress: (result) => { sandbox.preserved = [...result.matchedKeys]; },
    isPronunciationCoachChunkComplete: () => false,
    getCurrentPronunciationCoachChunk: () => ({}),
    commitPronunciationCoachResult: () => { sandbox.committed = true; },
    renderPronunciationCoach: () => { sandbox.rendered += 1; },
    pronunciationCoachHadSpeech: false,
    pronunciationCoachRestartCount: 3,
    pronunciationCoachLastHeard: "",
    pronunciationCoachHeard: { textContent: "" },
    pronunciationCoachLiveMatches: new Set(),
    pronunciationPracticeState: "listening",
    pronunciationCoachStatus: { textContent: "" },
    pronunciationCoachChunkHelpActive: false,
    pronunciationCoachChunkIndex: 0,
    pronunciationCoachActiveWordIndex: -1,
    getCurrentPronunciationCoachChunk: () => ({ parts: [] }),
    rendered: 0,
    committed: false,
    preserved: []
  };
  vm.runInNewContext(`${apply}\napplyPronunciationCoachCandidates(["I really"], true);`, sandbox);
  assert.deepEqual(sandbox.preserved, ["w0", "w1"]);
  assert.equal(sandbox.committed, false);
  assert.equal(sandbox.pronunciationPracticeState, "listening");
  assert.equal(sandbox.pronunciationCoachStatus.textContent, "Seni dinliyorum");
  assert.ok(sandbox.rendered >= 1);
});

test("pronunciation listening uses a long technical inactivity guard and preserves progress at attempt end", () => {
  const starter = block(
    /function startPronunciationCoachRecognition\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function handlePronunciationSpeakAction)/,
    "recognition starter"
  );
  assert.match(content, /const pronunciationCoachInactivityTimeoutMs\s*=\s*9000/);
  assert.doesNotMatch(starter, /\},\s*3200\s*\)/);
  assert.match(starter, /setTimeout\([\s\S]*?commitPronunciationCoachResult\([\s\S]*?matchedKeys:\s*pronunciationCoachLiveMatches[\s\S]*?pronunciationCoachInactivityTimeoutMs/s);
  assert.match(starter, /recognition\.onend[\s\S]*?commitPronunciationCoachResult\([\s\S]*?matchedKeys:\s*pronunciationCoachLiveMatches/s);
  assert.doesNotMatch(starter.match(/recognition\.onend[\s\S]*?(?=\n\s*try \{)/)?.[0] || "", /recognition\.start|schedulePronunciationCoachRestart/);
});

test("subtitle-card and player-bar pronunciation entries share the same lifecycle while More owns the master toggle", () => {
  const subtitleActions = block(/subtitleActionsRow\.replaceChildren\([\s\S]*?\);/, "subtitle action assembly");
  const pronunciationDock = block(/pronunciationDock\.append\([\s\S]*?\);/, "pronunciation dock assembly");
  const playbackGroup = block(/playbackCommandGroup\.append\([\s\S]*?\);/, "playback control assembly");
  const utilityGroup = block(/utilityCommandGroup\.append\([\s\S]*?\);/, "utility control assembly");
  const commandRow = block(/commandRow\.append\([\s\S]*?\);/, "command row assembly");
  const settings = block(/settingsMenu\.append\([\s\S]*?\);/, "settings menu assembly");
  const practiceActions = block(/pronunciationPracticeActions\.append\([\s\S]*?\);/, "practice actions assembly");
  assert.match(subtitleActions, /pronunciationCoachButton/);
  assert.match(pronunciationDock, /pronunciationMenuButton[\s\S]*?replayButton/);
  assert.doesNotMatch(settings, /pronunciationPracticeToggleButton/);
  assert.match(practiceActions, /pronunciationPracticeContinuousButton/);
  assert.match(playbackGroup, /previousSentenceButton[\s\S]*playPauseButton[\s\S]*nextSentenceButton/);
  assert.doesNotMatch(playbackGroup, /replayButton|seekBackwardButton|seekForwardButton/);
  assert.match(utilityGroup, /transcriptButton/);
  assert.doesNotMatch(utilityGroup, /turkishTranslationSpeechToggleButton|automaticPauseToggleButton/);
  const moreMenu = block(/moreMenu\.replaceChildren\([\s\S]*?\);/, "more menu assembly");
  assert.match(moreMenu, /pronunciationPracticeToggleButton[\s\S]*turkishTranslationSpeechToggleButton[\s\S]*automaticPauseToggleButton[\s\S]*usageButton[\s\S]*helpButton/);
  assert.match(commandRow, /pronunciationDock[\s\S]*playbackCommandGroup[\s\S]*utilityCommandGroup/);
  assert.doesNotMatch(content, /pronunciationPopover|pronunciationContinuousPolicyButton/);
});

test("main subtitle-card coach still opens single practice without changing microphone or Settings behavior", () => {
  const mainCoach = block(
    /pronunciationCoachButton\.addEventListener\([\s\S]*?\r?\n\);\r?\n(?=\r?\npronunciationCoachCloseButton\.addEventListener)/,
    "main pronunciation coach action"
  );
  const masterHandler = block(
    /pronunciationPracticeToggleButton\.addEventListener\([\s\S]*?\r?\n\);\s*(?=pronunciationToggleButton\.addEventListener)/,
    "pronunciation master handler"
  );
  assert.match(mainCoach, /openPronunciationCoach\(currentFinalizedSentence, "single"\)/);
  assert.doesNotMatch(mainCoach, /recognition\.start|startPronunciationCoachRecognition/);
  assert.doesNotMatch(masterHandler, /recognition\.start|startPronunciationCoachRecognition|video\.(?:play|pause)/);
  assert.doesNotMatch(content, /pronunciationPopover/);
  assert.doesNotMatch(css, /ps-pronunciation-popover/);
});



test("pronunciation success keeps evaluation state but hides the separate Anlaşıldı feedback line", () => {
  assert.match(content, /pronunciationPracticeFeedback\.hidden\s*=\s*[\s\S]*?pronunciationPracticeState === "success"/);
  assert.doesNotMatch(content, /Anlaşıldı/);
  const finisher = block(
    /function finishPronunciationCoachSentence\([^)]*\)[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function advancePronunciationCoach)/,
    "pronunciation success finisher"
  );
  assert.match(finisher, /pronunciationPracticeState = "success"/);
  assert.match(finisher, /pronunciationCoachStatus\.textContent = ""/);
  assert.match(finisher, /pronunciationCoachHeard\.textContent = ""/);
});
