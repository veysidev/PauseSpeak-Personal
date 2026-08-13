const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) =>
  fs.readFileSync(path.join(root, file), "utf8");

const content = read("content.js");
const bridge = read("player-bridge.js");
const css = read("pausespeak-ui.css");
const popup = read("popup.html");
const server = read("server/index.js");
const usageStore = read("server/usage-store.js");
const manifest = JSON.parse(read("manifest.json"));

test("manifest uses the Netflix and YouTube release version", () => {
  assert.equal(manifest.version, "1.1.20");
});

test("normal mode completes a subtitle without calling the chunk API", () => {
  const finishSentence = content.match(
    /function finishSentence\(video\)[\s\S]*?\r?\n  }\r?\n(?=\r?\nfunction setSubtitlePanelVisibility)/
  );
  const loadStudySegments = content.match(
    /async function loadStudySegments\([\s\S]*?\r?\n}\r?\n(?=\s*async function requestSmartChunks)/
  );

  assert.ok(finishSentence, "finishSentence was not found");
  assert.ok(loadStudySegments, "loadStudySegments was not found");
  assert.match(
    finishSentence[0],
    /loadStudySegments\(\s*fullSentence\s*\)/s
  );
  assert.match(
    finishSentence[0],
    /isChunkTranslationVisible[\s\S]*?stopNormalTranslation\(\)[\s\S]*?else\s*\{[\s\S]*?translateSentence\(\s*fullSentence,\s*previousText\s*\)/s
  );
  assert.match(
    loadStudySegments[0],
    /createFallbackSubtitleChunks\(\s*sentence\s*\)[\s\S]*?renderChunkedSubtitle\(\)/s
  );

  const normalModeExit =
    loadStudySegments[0].indexOf(
      "if (!isChunkTranslationVisible)"
    );
  const chunkRequest =
    loadStudySegments[0].indexOf(
      "await requestSubtitleChunks"
    );

  assert.ok(
    normalModeExit >= 0,
    "normal mode exit was not found"
  );
  assert.ok(
    chunkRequest > normalModeExit,
    "chunk request must be after the normal mode exit"
  );
});

test("opening chunk mode requests combined AI chunks and translations", () => {
  const handler = content.match(
    /chunkPracticeButton\.addEventListener\([\s\S]*?\r?\n\);\r?\n(?=\s*function finishSentence)/
  );

  assert.ok(handler, "chunk mode handler was not found");
  assert.match(
    handler[0],
    /if \(\s*!isChunkTranslationVisible\s*\)[\s\S]*?return;[\s\S]*?loadStudySegments\(\s*completedBox\.textContent\s*\)/s
  );
  assert.match(
    content,
    /async function fetchSubtitleChunks[\s\S]*?fetch\(\s*chunkApiUrl/s
  );
  assert.match(
    content,
    /async function fetchSubtitleChunks[\s\S]*?data\.translations[\s\S]*?cacheSubtitleChunkTranslations/s
  );
});

test("the chunk loader skips the network in normal mode and uses it in chunk mode", async () => {
  const helper = content.match(
    /async function loadStudySegments\([\s\S]*?\r?\n}\r?\n(?=\s*async function requestSmartChunks)/
  );

  assert.ok(helper, "loadStudySegments was not found");

  const sandbox = {
    subtitleTranslationRequestNumber: 0,
    subtitleTranslationAbortController: null,
    subtitleChunkAbortController: null,
    subtitleChunkRequestNumber: 0,
    getCachedSubtitleChunks: () => null,
    createFallbackSubtitleChunks: () => [
      "Local safe chunks."
    ],
    currentSubtitleChunks: [],
    currentSubtitleChunkTranslations: [],
    isChunkTranslationVisible: false,
    getCachedSubtitleChunkTranslations: () => null,
    renderCount: 0,
    renderChunkedSubtitle: () => {
      sandbox.renderCount += 1;
    },
    chunkRequestCount: 0,
    requestSubtitleChunks: async () => {
      sandbox.chunkRequestCount += 1;
      return ["AI chunks."];
    },
    translationLoadCount: 0,
    loadSubtitleChunkTranslations: () => {
      sandbox.translationLoadCount += 1;
    },
    completedBox: {
      textContent: "A completed sentence."
    },
    console,
    normalResult: null,
    chunkResult: null
  };

  vm.runInNewContext(
    `${helper[0]}\n` +
      `normalResult = loadStudySegments("A completed sentence.");`,
    sandbox
  );
  await sandbox.normalResult;

  assert.equal(sandbox.chunkRequestCount, 0);
  assert.equal(sandbox.translationLoadCount, 0);
  assert.deepEqual(
    Array.from(sandbox.currentSubtitleChunks),
    ["Local safe chunks."]
  );

  sandbox.isChunkTranslationVisible = true;
  vm.runInNewContext(
    `chunkResult = loadStudySegments("A completed sentence.");`,
    sandbox
  );
  await sandbox.chunkResult;

  assert.equal(sandbox.chunkRequestCount, 1);
  assert.equal(sandbox.translationLoadCount, 1);
  assert.deepEqual(
    Array.from(sandbox.currentSubtitleChunks),
    ["AI chunks."]
  );
});

test("chunk endpoint uses one Luna structured response for English and Turkish parts", () => {
  const generator = server.match(
    /async function generateSmartChunkDecision\([\s\S]*?\r?\n}\r?\n(?=async function generateStudyMeaning)/
  );
  const route = server.match(
    /app\.post\(\s*"\/chunk"[\s\S]*?\r?\n\);\r?\n(?=\r?\napp\.listen)/
  );

  assert.ok(generator, "combined chunk generator was not found");
  assert.ok(route, "chunk endpoint was not found");
  assert.match(generator[0], /model\s*=\s*openAIModel/);
  assert.match(generator[0], /responses\.create\(\{[\s\S]*?model,/s);
  assert.match(generator[0], /effort:\s*"none"/);
  assert.match(generator[0], /parts:[\s\S]*?english:[\s\S]*?turkish:/s);
  assert.doesNotMatch(generator[0], /openAIChunkModel|effort:\s*"medium"/);
  assert.match(
    route[0],
    /chunks:[\s\S]*?part\.english[\s\S]*?translations:[\s\S]*?part\.turkish/s
  );
  assert.match(
    route[0],
    /selectedModel\s*=\s*improve\s*\?\s*openAITerraModel\s*:\s*openAIModel/s
  );
  assert.match(
    server,
    /maximumAttempts\s*=\s*improve\s*\?\s*1\s*:\s*2/s
  );
  assert.match(
    route[0],
    /improvementType === "translation"[\s\S]*?"improve_translation"[\s\S]*?"improve_chunk"/s
  );
  assert.match(
    generator[0],
    /yalnızca mevcut parçaların Türkçe çevirilerini iyileştirmek[\s\S]*?parça sınırlarını kesinlikle değiştirme/s
  );
  assert.match(
    generator[0],
    /yalnızca parça sınırlarını iyileştirmeyi[\s\S]*?ayrıca çeviri iyileştirmesi yapma/s
  );
});

test("combined chunk decisions preserve the full sentence and every translation", () => {
  const parser = server.match(
    /function parseChunkDecision\([\s\S]*?\r?\n}\r?\n(?=function parseStudyMeaning)/
  );
  const normalizer = server.match(
    /function normalizeForChunkValidation\([\s\S]*?\r?\n}\r?\n(?=\r?\nfunction parseChunkArray)/
  );
  const validator = server.match(
    /function getChunkWordTokens\([\s\S]*?\r?\n}\r?\n(?=\r?\nasync function generateValidatedChunkDecision)/
  );

  assert.ok(parser, "chunk decision parser was not found");
  assert.ok(normalizer, "server chunk normalizer was not found");
  assert.ok(validator, "combined chunk validator was not found");

  const sandbox = {
    cleanText: (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim(),
    removeSubtitleDescriptions: (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim(),
    validateChunks: (sentence, chunks) =>
      chunks.join(" ") === sentence,
    valid: null,
    single: null,
    invalid: null,
    missing: null,
    added: null,
    repeated: null,
    negation: null,
    phrasalVerb: null,
    naturalSingles: null,
    unnecessarySingle: null,
    preservedTranslationParts: null,
    changedTranslationParts: null,
    malformedJsonRejected: false
  };

  vm.runInNewContext(
    `${normalizer[0]}\n${parser[0]}\n${validator[0]}\n` +
      `valid = validateChunkDecision("I am ready, but I need time.", parseChunkDecision(${JSON.stringify(JSON.stringify({ suitable: true, parts: [{ english: "I am ready,", turkish: "Hazırım," }, { english: "but I need time.", turkish: "ama zamana ihtiyacım var." }] }))}));\n` +
      `single = validateChunkDecision("Give it up.", parseChunkDecision(${JSON.stringify(JSON.stringify({ suitable: false, parts: [{ english: "Give it up.", turkish: "Vazgeç." }] }))}));\n` +
      `invalid = validateChunkDecision("Give it up.", parseChunkDecision(${JSON.stringify(JSON.stringify({ suitable: false, parts: [{ english: "Give it up.", turkish: "" }] }))}));\n` +
      `missing = validateChunkDecision("I am ready, but I need time.", ${JSON.stringify({ suitable: true, parts: [{ english: "I am ready,", turkish: "Hazırım," }, { english: "but need time.", turkish: "ama zamana ihtiyacım var." }] })});\n` +
      `added = validateChunkDecision("I am ready, but I need time.", ${JSON.stringify({ suitable: true, parts: [{ english: "I am really ready,", turkish: "Gerçekten hazırım," }, { english: "but I need time.", turkish: "ama zamana ihtiyacım var." }] })});\n` +
      `repeated = validateChunkDecision("I am ready, but I need time.", ${JSON.stringify({ suitable: true, parts: [{ english: "I am ready,", turkish: "Hazırım," }, { english: "ready, but I need time.", turkish: "ama zamana ihtiyacım var." }] })});\n` +
      `negation = validateChunkDecision("I do not know.", ${JSON.stringify({ suitable: true, parts: [{ english: "I do", turkish: "Ben" }, { english: "not know.", turkish: "bilmiyorum." }] })});\n` +
      `phrasalVerb = validateChunkDecision("Please give up now.", ${JSON.stringify({ suitable: true, parts: [{ english: "Please give", turkish: "Lütfen" }, { english: "up now.", turkish: "şimdi vazgeç." }] })});\n` +
      `naturalSingles = validateChunkDecision("Why? Stop!", ${JSON.stringify({ suitable: true, parts: [{ english: "Why?", turkish: "Neden?" }, { english: "Stop!", turkish: "Dur!" }] })});\n` +
      `unnecessarySingle = validateChunkDecision("Today we leave.", ${JSON.stringify({ suitable: true, parts: [{ english: "Today", turkish: "Bugün" }, { english: "we leave.", turkish: "gidiyoruz." }] })});\n` +
      `preservedTranslationParts = getChunkTranslationValidationErrors("I am ready, but I need time.", ${JSON.stringify({ suitable: true, parts: [{ english: "I am ready,", turkish: "Ben hazırım," }, { english: "but I need time.", turkish: "ancak zamana ihtiyacım var." }] })}, ["I am ready,", "but I need time."]).length === 0;\n` +
      `changedTranslationParts = getChunkTranslationValidationErrors("I am ready, but I need time.", ${JSON.stringify({ suitable: true, parts: [{ english: "I am ready, but", turkish: "Hazırım ama" }, { english: "I need time.", turkish: "zamana ihtiyacım var." }] })}, ["I am ready,", "but I need time."]).length > 0;\n` +
      `try { parseChunkDecision("{broken json"); } catch (error) { malformedJsonRejected = true; }`,
    sandbox
  );

  assert.equal(sandbox.valid, true);
  assert.equal(sandbox.single, true);
  assert.equal(sandbox.invalid, false);
  assert.equal(sandbox.missing, false);
  assert.equal(sandbox.added, false);
  assert.equal(sandbox.repeated, false);
  assert.equal(sandbox.negation, false);
  assert.equal(sandbox.phrasalVerb, false);
  assert.equal(sandbox.naturalSingles, true);
  assert.equal(sandbox.unnecessarySingle, false);
  assert.equal(
    sandbox.preservedTranslationParts,
    true
  );
  assert.equal(
    sandbox.changedTranslationParts,
    true
  );
  assert.equal(sandbox.malformedJsonRejected, true);
});

test("Luna chunk validation retries once and never falls through to the improvement model", async () => {
  const helper = server.match(
    /async function generateValidatedChunkDecision\([\s\S]*?\r?\n}\r?\n(?=app\.get)/
  );

  assert.ok(helper, "validated chunk flow was not found");

  const sandbox = {
    openAIModel: "gpt-5.6-luna",
    calls: [],
    queue: [],
    emptyOpenAIUsage: () => ({ requests: 0 }),
    mergeOpenAIUsage: (total, usage) => ({
      requests:
        Number(total?.requests || 0) +
        Number(usage?.requests || 0)
    }),
    finalizeOpenAIUsage: (usage, extra) => ({
      ...usage,
      retryCount: Math.max(
        0,
        Number(usage?.requests || 0) - 1
      ),
      errorCount: extra?.errorCount || 0
    }),
    getChunkDecisionValidationErrors: (sentence, decision) =>
      decision?.valid ? [] : ["invalid parts"],
    generateSmartChunkDecision: async (
      openAI,
      sentence,
      options
    ) => {
      sandbox.calls.push({
        model: options.model,
        correctionNotes: [
          ...options.correctionNotes
        ]
      });
      return {
        decision: sandbox.queue.shift(),
        usage: { requests: 1 }
      };
    },
    console: {
      warn() {}
    },
    first: null,
    corrected: null,
    safe: null,
    terra: null
  };

  vm.runInNewContext(helper[0], sandbox);

  sandbox.queue = [
    { valid: true, parts: [{ english: "Ready.", turkish: "Hazır." }] }
  ];
  sandbox.first = await sandbox.generateValidatedChunkDecision(
    {},
    "Ready.",
    { model: "gpt-5.6-luna" }
  );
  assert.equal(sandbox.calls.length, 1);
  assert.equal(sandbox.first.usage.requests, 1);

  sandbox.calls = [];
  sandbox.queue = [
    { valid: false, parts: [{ english: "Bad", turkish: "Kötü" }] },
    { valid: true, parts: [{ english: "Ready.", turkish: "Hazır." }] }
  ];
  sandbox.corrected = await sandbox.generateValidatedChunkDecision(
    {},
    "Ready.",
    { model: "gpt-5.6-luna" }
  );
  assert.equal(sandbox.calls.length, 2);
  assert.deepEqual(
    Array.from(sandbox.calls[1].correctionNotes),
    ["invalid parts"]
  );
  assert.equal(sandbox.corrected.usage.retryCount, 1);

  sandbox.calls = [];
  sandbox.queue = [
    { valid: false, parts: [{ english: "Bad", turkish: "Kötü" }] },
    { valid: false, parts: [{ english: "Bad", turkish: "Kötü" }] }
  ];
  sandbox.safe = await sandbox.generateValidatedChunkDecision(
    {},
    "Ready.",
    { model: "gpt-5.6-luna" }
  );
  assert.equal(sandbox.calls.length, 2);
  assert.deepEqual(
    sandbox.calls.map((call) => call.model),
    ["gpt-5.6-luna", "gpt-5.6-luna"]
  );
  assert.equal(sandbox.safe.decision, null);

  sandbox.calls = [];
  sandbox.queue = [
    { valid: false, parts: [{ english: "Bad", turkish: "Kötü" }] }
  ];
  sandbox.terra = await sandbox.generateValidatedChunkDecision(
    {},
    "Ready.",
    {
      model: "gpt-5.6-terra",
      improve: true
    }
  );
  assert.equal(sandbox.calls.length, 1);
  assert.equal(sandbox.calls[0].model, "gpt-5.6-terra");
  assert.equal(sandbox.terra.decision, null);
});

test("separate improvement actions update translation or segmentation with one request", async () => {
  const helper = content.match(
    /async function requestTerraImprovement\([\s\S]*?\r?\n}\r?\n(?=\r?\nasync function improveCurrentWithTerra)/
  );

  assert.ok(helper, "Terra request helper was not found");

  const sandbox = {
    translationApiUrl: "https://example.test/translate",
    chunkApiUrl: "https://example.test/chunk",
    cleanText: (value) =>
      String(value || "").replace(/\s+/g, " ").trim(),
    getUsageSyncHeaders: () => ({
      "Content-Type": "application/json"
    }),
    validateSubtitleChunks: (sentence, chunks) =>
      chunks.join(" ") === sentence,
    requests: [],
    usageOperations: [],
    fetch: async (url, options) => {
      sandbox.requests.push({
        url,
        body: JSON.parse(options.body)
      });

      return {
        ok: true,
        async json() {
          if (
            url.endsWith("/chunk") &&
            sandbox.requests.at(-1).body
              .improvementType ===
                "translation"
          ) {
            return {
              success: true,
              chunks: ["I am ready,", "but I need time."],
              translations: ["Ben hazırım,", "ancak biraz zamana ihtiyacım var."],
              model: "gpt-5.6-terra",
              usage: { requests: 1 }
            };
          }

          if (url.endsWith("/chunk")) {
            return {
              success: true,
              chunks: ["I am ready, but", "I need time."],
              translations: ["Hazırım ama", "zamana ihtiyacım var."],
              model: "gpt-5.6-terra",
              usage: { requests: 1 }
            };
          }

          return {
            success: true,
            translation: "Geliştirilmiş çeviri.",
            model: "gpt-5.6-terra",
            usage: { requests: 1 }
          };
        }
      };
    },
    recordTextUsage: (operation) => {
      sandbox.usageOperations.push(operation);
    },
    normalTranslation: null,
    chunkTranslation: null,
    segmentation: null
  };

  vm.runInNewContext(helper[0], sandbox);

  sandbox.normalTranslation = await sandbox.requestTerraImprovement(
    "translation",
    "normal",
    "I am ready.",
    "",
    [],
    [],
    undefined
  );
  assert.equal(sandbox.requests.length, 1);
  assert.equal(
    sandbox.requests[0].url,
    "https://example.test/translate"
  );
  assert.equal(sandbox.requests[0].body.improve, true);
  assert.equal(sandbox.usageOperations[0], "improve_translation");

  sandbox.requests = [];
  sandbox.usageOperations = [];
  sandbox.chunkTranslation = await sandbox.requestTerraImprovement(
    "translation",
    "chunk",
    "I am ready, but I need time.",
    "",
    ["I am ready,", "but I need time."],
    ["Hazırım,", "ama zamana ihtiyacım var."],
    undefined
  );
  assert.equal(sandbox.requests.length, 1);
  assert.equal(
    sandbox.requests[0].url,
    "https://example.test/chunk"
  );
  assert.equal(sandbox.requests[0].body.improve, true);
  assert.equal(
    sandbox.requests[0].body.improvementType,
    "translation"
  );
  assert.equal(sandbox.requests[0].body.currentParts.length, 2);
  assert.equal(sandbox.usageOperations[0], "improve_translation");
  assert.deepEqual(
    Array.from(sandbox.chunkTranslation.chunks),
    ["I am ready,", "but I need time."]
  );

  sandbox.requests = [];
  sandbox.usageOperations = [];
  sandbox.segmentation = await sandbox.requestTerraImprovement(
    "segmentation",
    "chunk",
    "I am ready, but I need time.",
    "",
    ["I am ready,", "but I need time."],
    ["Hazırım,", "ama zamana ihtiyacım var."],
    undefined
  );
  assert.equal(sandbox.requests.length, 1);
  assert.equal(
    sandbox.requests[0].url,
    "https://example.test/chunk"
  );
  assert.equal(
    sandbox.requests[0].body.improvementType,
    "segmentation"
  );
  assert.equal(sandbox.usageOperations[0], "improve_chunk");
  assert.ok(
    sandbox.requests.every(
      (request) => !request.url.endsWith("/translate")
    ),
    "chunk improvement must not translate each part separately"
  );
});

test("improvement controls are mode-aware, guarded and ignore stale results", () => {
  const controller = content.match(
    /async function improveCurrentWithTerra\([\s\S]*?\r?\n}\r?\n(?=\s*function normalizeSpeechText)/
  );
  const buttonState = content.match(
    /function updateTerraImproveButtonState\([\s\S]*?\r?\n}\r?\n(?=\r?\nfunction cancelTerraImprovement)/
  );

  assert.ok(controller, "Terra controller was not found");
  assert.ok(buttonState, "Terra button state helper was not found");
  assert.match(
    buttonState[0],
    /AI Çeviri\+[\s\S]*?AI Parçalama\+/s
  );
  assert.match(controller[0], /if \(isTerraImprovePending\)\s*\{\s*return;/s);
  assert.match(
    controller[0],
    /requestNumber !==\s*terraImproveRequestNumber[\s\S]*?completedBox\.textContent[\s\S]*?isChunkTranslationVisible/s
  );
  assert.match(
    controller[0],
    /catch \(error\)[\s\S]*?console\.error[\s\S]*?finally/s
  );
  const catchSection = controller[0].match(
    /catch \(error\) \{[\s\S]*?\n  } finally/
  );
  assert.ok(catchSection);
  assert.doesNotMatch(
    catchSection[0],
    /translationBox\.textContent|currentSubtitleChunkTranslations\s*=/
  );
  assert.equal(
    (content.match(/\brequestTerraImprovement\(/g) || []).length,
    2,
    "Terra helper must only be declared and called by the click controller"
  );
  assert.match(
    content,
    /improveTranslationButton\.addEventListener\([\s\S]*?improveCurrentWithTerra\(\s*"translation"\s*\)[\s\S]*?improveSegmentationButton\.addEventListener\([\s\S]*?improveCurrentWithTerra\(\s*"segmentation"\s*\)/s
  );
  assert.match(
    controller[0],
    /action === "segmentation"[\s\S]*?mode !== "chunk"[\s\S]*?return;/s
  );
  assert.doesNotMatch(
    controller[0],
    /action === "segmentation"[\s\S]*?isChunkTranslationVisible = true/s
  );
  assert.match(
    buttonState[0],
    /action !== "segmentation" \|\|[\s\S]*?mode === "chunk"[\s\S]*?ps-action-hidden/s
  );
  assert.match(
    css,
    /\.ps-terra-action\.ps-action-hidden\s*\{[^}]*display:\s*none !important/s
  );
});

test("both improvement actions and microphone occupy a responsive action row", () => {
  assert.match(
    content,
    /panel\.replaceChildren\([\s\S]*?translationBox,\s*subtitleActionsRow/s
  );
  assert.match(
    content,
    /subtitleActionsRow\.replaceChildren\(\s*improveTranslationButton,\s*improveSegmentationButton,\s*pronunciationCoachButton\s*\)/s
  );
  assert.match(
    content,
    /improveSegmentationButton\.className\s*=\s*"ps-terra-action ps-action-hidden"/s
  );
  assert.match(
    css,
    /#pausespeak-status-panel \.ps-subtitle-actions\s*\{[^}]*position:\s*static !important[^}]*display:\s*flex !important[^}]*gap:\s*8px !important/s
  );
  assert.match(
    css,
    /\.ps-subtitle-actions[\s\S]*?\.ps-terra-action,[\s\S]*?#pausespeak-pronunciation-coach-button\s*\{[^}]*position:\s*static !important/s
  );
  assert.match(
    css,
    /@media \(max-width:\s*900px\)[\s\S]*?\.ps-subtitle-actions\s*\{[^}]*gap:\s*8px !important[^}]*flex-wrap:\s*wrap !important/s
  );
  assert.match(
    css,
    /#pausespeak-subtitle-english,[\s\S]*?#pausespeak-subtitle-turkish\s*\{[^}]*padding-right:\s*clamp\(/s
  );
});

test("combined chunk response fills translation cache without extra translate fetches", async () => {
  const normalizer = content.match(
    /function normalizeSubtitleChunkValidationText\([\s\S]*?\r?\n}\r?\n(?=\r?\nfunction validateSubtitleChunks)/
  );
  const validator = content.match(
    /function validateSubtitleChunks\([\s\S]*?\r?\n}\r?\n(?=\r?\nfunction createFallbackSubtitleChunks)/
  );
  const cacheHelpers = content.match(
    /function getSubtitleChunkCache\([\s\S]*?\r?\n}\r?\n(?=\r?\nasync function loadSubtitleChunkTranslations)/
  );

  assert.ok(normalizer, "client chunk normalizer was not found");
  assert.ok(validator, "client chunk validator was not found");
  assert.ok(cacheHelpers, "combined chunk cache helpers were not found");

  const sentence =
    "I am ready, but I need time.";
  const sandbox = {
    cleanText: (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim(),
    removeSubtitleDescriptions: (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim(),
    createFallbackSubtitleChunks: (value) => [value],
    chunkApiUrl: "https://example.test/chunk",
    translationApiUrl: "https://example.test/translate",
    getUsageSyncHeaders: () => ({
      "Content-Type": "application/json"
    }),
    fetchCount: 0,
    fetch: async () => {
      sandbox.fetchCount += 1;
      return {
        ok: true,
        async json() {
          return {
            success: true,
            chunks: [
              "I am ready,",
              "but I need time."
            ],
            translations: [
              "Hazırım,",
              "ama zamana ihtiyacım var."
            ],
            model: "gpt-5.6-luna",
            usage: { requests: 1 }
          };
        }
      };
    },
    usageOperation: "",
    recordTextUsage: (operation) => {
      sandbox.usageOperation = operation;
    },
    chunkTimeoutMs: 20000,
    AbortController,
    setTimeout,
    clearTimeout,
    console,
    chunksResult: null,
    cachedTranslationResult: null
  };

  vm.runInNewContext(
    `${normalizer[0]}\n${validator[0]}\n${cacheHelpers[0]}\n` +
      `chunksResult = fetchSubtitleChunks(${JSON.stringify(sentence)});`,
    sandbox
  );
  const chunks = await sandbox.chunksResult;

  vm.runInNewContext(
    `cachedTranslationResult = requestSubtitleChunkTranslation("I am ready,", "", ${JSON.stringify(sentence)}, undefined);`,
    sandbox
  );
  const translation =
    await sandbox.cachedTranslationResult;

  assert.deepEqual(
    Array.from(chunks),
    ["I am ready,", "but I need time."]
  );
  assert.equal(translation, "Hazırım,");
  assert.equal(sandbox.fetchCount, 1);
  assert.equal(
    sandbox.usageOperation,
    "chunk_translation"
  );
});

test("every active OpenAI route records model and usage observability", () => {
  for (const operation of [
    "normal_translation",
    "chunk_translation",
    "improve_translation",
    "improve_chunk",
    "study_meaning",
    "study_segments",
    "tts_english",
    "tts_turkish"
  ]) {
    assert.match(
      server + usageStore,
      new RegExp(`"${operation}"`)
    );
  }

  assert.match(
    server,
    /cacheWriteTokens:[\s\S]*?retryCount:[\s\S]*?cacheMisses:[\s\S]*?errorCount:/s
  );
  assert.match(
    server,
    /operation:\s*"study_segments"[\s\S]*?model:\s*usageModel[\s\S]*?usage/s
  );
  assert.match(
    content,
    /recordTextUsage\(\s*"study_segments",\s*data\.model,\s*data\.usage\s*\)/s
  );
  assert.match(
    server,
    /operation:\s*usageOperation[\s\S]*?model:\s*selectedModel[\s\S]*?usage/s
  );
  assert.match(
    server,
    /getTranslationUsageOperation\(\s*translationMode,\s*improve\s*\)[\s\S]*?model:\s*selectedModel[\s\S]*?errorCount:\s*1/s
  );
  assert.match(
    server,
    /operation:\s*usageOperation,[\s\S]*?model:\s*selectedModel,[\s\S]*?error\?\.openAIUsage[\s\S]*?errorCount:\s*1/s
  );
});

test("the main microphone button closes the active inline coach on its second click", () => {
  const handler = content.match(
    /pronunciationCoachButton\.addEventListener\([\s\S]*?\r?\n\);\r?\n(?=\r?\npronunciationCoachCloseButton\.addEventListener)/
  );

  assert.ok(handler, "main microphone handler was not found");
  assert.match(
    handler[0],
    /isPronunciationCoachSessionActive\s*&&[\s\S]*?isPronunciationCoachOpen[\s\S]*?closePronunciationCoach\(\s*true,\s*false\s*\)/s
  );
  assert.match(
    handler[0],
    /openPronunciationCoach\(\s*completedBox\.textContent,\s*true\s*\)/s
  );
  assert.doesNotMatch(
    handler[0],
    /startPronunciationCoachRecognition\(/
  );
});

test("only the selected translation mode prefetches the sentence currently entering playback", () => {
  const scheduler = content.match(
    /function scheduleSentenceTranslationPrefetch\([\s\S]*?\r?\n}\r?\n(?=\r?\nfunction formatTranscriptTime)/
  );

  assert.ok(scheduler, "translation prefetch scheduler was not found");
  assert.match(
    scheduler[0],
    /isChunkTranslationVisible\s*\?\s*"chunk"\s*:\s*"normal"/s
  );
  assert.match(
    scheduler[0],
    /mode === "chunk"[\s\S]*?prefetchChunkedSentenceTranslation[\s\S]*?: prefetchNormalSentenceTranslation/s
  );
  assert.match(
    content,
    /isChunkTranslationVisible\s*=\s*!isChunkTranslationVisible;[\s\S]*?cancelSentenceTranslationPrefetch\(\)/s
  );
  assert.match(
    content,
    /function prefetchNormalSentenceTranslation[\s\S]*?cacheCueTranslation\(/s
  );
  assert.match(
    content,
    /function prefetchChunkedSentenceTranslation[\s\S]*?fetchSubtitleChunks\(/s
  );
  assert.doesNotMatch(
    content.match(
      /function prefetchChunkedSentenceTranslation[\s\S]*?\r?\n}/
    )?.[0] || "",
    /requestSubtitleChunkTranslation\(/
  );
});

test("prefetch lookahead assembles rolling cues and advances past the completed sentence", () => {
  const helpers = content.match(
    /function collectTranscriptSentence\([\s\S]*?\r?\n}\r?\n(?=\r?\nfunction cancelSentenceTranslationPrefetch)/
  );

  assert.ok(helpers, "prefetch sentence lookahead helpers were not found");

  const cues = [
    {
      startTimeMs: 0,
      endTimeMs: 900,
      text: "I am"
    },
    {
      startTimeMs: 800,
      endTimeMs: 1800,
      text: "I am ready."
    },
    {
      startTimeMs: 1900,
      endTimeMs: 3000,
      text: "Next sentence."
    }
  ];
  const sandbox = {
    completedEndTimeMs: null,
    getTranscriptCues: () => ({ cues }),
    findTranscriptCueIndex: (items, timeMs) =>
      items.findIndex(
        (cue) =>
          cue.startTimeMs <= timeMs &&
          cue.endTimeMs >= timeMs
      ),
    removeSubtitleDescriptions: (value) =>
      String(value || "").trim(),
    cleanText: (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim(),
    endsSentence: (value) =>
      /[.!?]$/.test(String(value || "").trim()),
    mergeOverlappingSubtitleText: (current, incoming) =>
      incoming.includes(current)
        ? incoming
        : `${current} ${incoming}`.trim(),
    first: null,
    second: null
  };

  vm.runInNewContext(
    `${helpers[0]}\n` +
      `first = getSentenceForTranslationPrefetch({ currentTime: 0.4 });\n` +
      `completedEndTimeMs = 1800;\n` +
      `second = getSentenceForTranslationPrefetch({ currentTime: 1.7 });`,
    sandbox
  );

  assert.equal(sandbox.first.text, "I am ready.");
  assert.equal(sandbox.second.text, "Next sentence.");
});

test("sentence navigation moves by complete sentences in both directions", () => {
  const helpers = content.match(
    /function collectTranscriptSentence\([\s\S]*?\r?\n}\r?\n(?=\r?\nfunction getSentenceForTranslationPrefetch)/
  );

  assert.ok(helpers, "sentence navigation helpers were not found");

  const cues = [
    { startTimeMs: 0, endTimeMs: 900, text: "I am" },
    { startTimeMs: 800, endTimeMs: 1800, text: "I am ready." },
    { startTimeMs: 1900, endTimeMs: 3000, text: "Next sentence." },
    { startTimeMs: 3100, endTimeMs: 4000, text: "Last line." }
  ];
  const sandbox = {
    findTranscriptCueIndex: (items, timeMs) =>
      items.findIndex(
        (cue) =>
          cue.startTimeMs <= timeMs &&
          cue.endTimeMs >= timeMs
      ),
    removeSubtitleDescriptions: (value) =>
      String(value || "").trim(),
    cleanText: (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim(),
    endsSentence: (value) =>
      /[.!?]$/.test(String(value || "").trim()),
    mergeOverlappingSubtitleText: (current, incoming) =>
      incoming.includes(current)
        ? incoming
        : `${current} ${incoming}`.trim(),
    next: null,
    previous: null
  };

  vm.runInNewContext(
    `${helpers[0]}\n` +
      `next = getAdjacentTranscriptSentence(${JSON.stringify(cues)}, 1000, 1);\n` +
      `previous = getAdjacentTranscriptSentence(${JSON.stringify(cues)}, 2200, -1);`,
    sandbox
  );

  assert.equal(sandbox.next.text, "Next sentence.");
  assert.equal(sandbox.next.startTimeMs, 1900);
  assert.equal(sandbox.previous.text, "I am ready.");
  assert.equal(sandbox.previous.startTimeMs, 0);
});

test("prefetched normal and chunk translations render from cache without another network wait", () => {
  assert.match(
    content,
    /async function translateSentence[\s\S]*?getCachedCueTranslation\([\s\S]*?translationBox\.textContent\s*=\s*cachedTranslation/s
  );
  assert.match(
    content,
    /async function loadStudySegments[\s\S]*?getCachedSubtitleChunks\(sentence\)[\s\S]*?getCachedSubtitleChunkTranslations/s
  );
  assert.match(
    content,
    /async function loadSubtitleChunkTranslations[\s\S]*?if \(cachedTranslations\)[\s\S]*?renderChunkedSubtitle\(\);\s*return;/s
  );
});

test("Netflix and YouTube both load the content and MAIN-world bridge", () => {
  const contentEntry = manifest.content_scripts.find(
    (entry) => entry.js?.includes("content.js")
  );
  const bridgeEntry = manifest.content_scripts.find(
    (entry) => entry.js?.includes("player-bridge.js")
  );

  assert.ok(contentEntry);
  assert.ok(bridgeEntry);
  assert.equal(bridgeEntry.world, "MAIN");

  for (const pattern of [
    "https://www.netflix.com/*",
    "https://www.youtube.com/*",
    "https://youtube.com/*"
  ]) {
    assert.ok(contentEntry.matches.includes(pattern));
  }

  assert.ok(
    bridgeEntry.matches.includes(
      "https://www.netflix.com/watch/*"
    )
  );
  assert.ok(
    bridgeEntry.matches.includes(
      "https://www.youtube.com/*"
    )
  );
});

test("YouTube visible captions, full tracks and SPA video changes are supported", () => {
  assert.match(content, /\.ytp-caption-segment/);
  assert.match(content, /function isSupportedWatchPage/);
  assert.match(content, /function getYouTubeVideoId/);
  assert.match(
    content,
    /function refreshPlaybackMediaContext[\s\S]*?resetPlaybackMediaContext/s
  );
  assert.match(
    content,
    /capturedSubtitleTracks\.clear\(\)[\s\S]*?requestPageSubtitleTracks\(\)/s
  );
  assert.match(
    bridge,
    /ytInitialPlayerResponse/
  );
  assert.match(
    bridge,
    /playerCaptionsTracklistRenderer/
  );
  assert.match(
    bridge,
    /searchParams\.set\(\s*"fmt",\s*"json3"/s
  );
  assert.match(
    bridge,
    /parseYouTubeJson3[\s\S]*?tStartMs[\s\S]*?dDurationMs/s
  );
});

test("YouTube bridge publishes JSON3 cues and seeks the real player", async () => {
  const pageMessages = [];
  const listeners = new Map();
  const captionData = {
    events: [
      {
        tStartMs: 1200,
        dDurationMs: 1800,
        segs: [{ utf8: "Hello there." }]
      },
      {
        tStartMs: 3100,
        dDurationMs: 1600,
        segs: [{ utf8: "How are you?" }]
      }
    ]
  };
  const video = {
    currentTime: 0,
    paused: true,
    pause() {
      this.paused = true;
    },
    async play() {
      this.paused = false;
    }
  };
  let playCount = 0;
  const playerResponse = {
    captions: {
      playerCaptionsTracklistRenderer: {
        captionTracks: [
          {
            baseUrl: "https://www.youtube.com/api/timedtext?v=abc123&lang=en",
            languageCode: "en",
            vssId: ".en",
            name: { simpleText: "English" }
          }
        ]
      }
    }
  };
  const player = {
    getPlayerResponse: () => playerResponse,
    pauseVideo() {
      video.paused = true;
    },
    seekTo(seconds) {
      video.currentTime = seconds;
    },
    playVideo() {
      playCount += 1;
      video.paused = false;
    }
  };
  const createResponse = () => ({
    ok: true,
    url: "https://www.youtube.com/api/timedtext?v=abc123&lang=en&fmt=json3",
    headers: {
      get: (name) =>
        name === "content-type"
          ? "application/json"
          : ""
    },
    clone() {
      return createResponse();
    },
    async text() {
      return JSON.stringify(captionData);
    },
    async json() {
      return captionData;
    }
  });
  const documentStub = {
    getElementById: (id) =>
      id === "movie_player" ? player : null,
    querySelector: (selector) =>
      selector.includes("video") ? video : null,
    createElement: () => {
      const element = { textContent: "" };

      Object.defineProperty(element, "innerHTML", {
        set(value) {
          this.textContent = String(value)
            .replace(/<[^>]+>/g, " ");
        }
      });

      return element;
    }
  };
  const windowStub = {
    location: {
      hostname: "www.youtube.com",
      pathname: "/watch",
      search: "?v=abc123",
      href: "https://www.youtube.com/watch?v=abc123"
    },
    document: documentStub,
    async fetch() {
      return createResponse();
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    postMessage(message) {
      pageMessages.push(message);
    }
  };

  vm.runInNewContext(bridge, {
    window: windowStub,
    document: documentStub,
    URL,
    URLSearchParams,
    Map,
    Set,
    Math,
    Number,
    String,
    Array,
    Object,
    Promise,
    Reflect,
    JSON,
    setTimeout,
    clearTimeout,
    console
  });

  const onMessage = listeners.get("message");
  assert.ok(onMessage);

  onMessage({
    source: windowStub,
    data: {
      source: "PAUSESPEAK_EXTENSION",
      type: "PAUSESPEAK_SUBTITLE_TRACKS_REQUEST"
    }
  });
  await new Promise((resolve) =>
    setTimeout(resolve, 20)
  );

  const trackMessage = pageMessages.find(
    (message) =>
      message.type ===
      "PAUSESPEAK_SUBTITLE_TRACK"
  );

  assert.equal(trackMessage.track.language, "en");
  assert.equal(trackMessage.track.cues.length, 2);
  assert.equal(
    trackMessage.track.cues[0].text,
    "Hello there."
  );

  onMessage({
    source: windowStub,
    data: {
      source: "PAUSESPEAK_EXTENSION",
      type: "PAUSESPEAK_SEEK_REQUEST",
      requestId: "youtube-seek",
      targetTimeMs: 3100
    }
  });
  await new Promise((resolve) =>
    setTimeout(resolve, 20)
  );

  assert.equal(video.currentTime, 3.1);
  assert.equal(playCount, 1);
  assert.ok(
    pageMessages.some(
      (message) =>
        message.type ===
          "PAUSESPEAK_SEEK_RESPONSE" &&
        message.requestId ===
          "youtube-seek" &&
        message.success === true
    )
  );
});

test("the continuous dock keeps all seven actions", () => {
  for (const label of [
    "Parçalar",
    "Cümleyi tekrarla",
    "10 sn geri",
    "10 sn ileri",
    "Altyazılar",
    "Ses ve altyazı"
  ]) {
    assert.match(content, new RegExp(label));
  }

  assert.doesNotMatch(
    content,
    /ps-(?:study|playback|tools)-group/
  );
  assert.match(
    css,
    /\.ps-command-row\s*\{[^}]*grid-template-columns:\s*repeat\(2,[^}]*66px 72px 66px/s
  );
});

test("Mist Ocean uses one calm low-glare surface system", () => {
  assert.match(
    css,
    /PauseSpeak Mist Ocean/
  );
  assert.match(css, /--ps-blue:\s*#58c7e5/i);
  assert.match(css, /--ps-blue-strong:\s*#7bd7ea/i);
  assert.match(
    css,
    /PauseSpeak Mist Ocean[\s\S]*?#pausespeak-status-panel,[\s\S]*?background:\s*rgba\(29, 42, 48, var\(--ps-card-opacity\)\)/s
  );
  assert.match(
    css,
    /PauseSpeak Mist Ocean[\s\S]*?\.ps-player-shell,[\s\S]*?background:\s*rgba\(20, 33, 39, 0\.86\)/s
  );
  assert.match(
    css,
    /PauseSpeak Mist Ocean[\s\S]*?#pausespeak-status-panel #pausespeak-subtitle-english\s*\{[^}]*color:\s*#f1f4f5/s
  );
  assert.match(content, /Arayüz opaklığı/);
  assert.match(popup, /#1b282e/i);
  assert.match(popup, /#58c7e5/i);
});

test("local fallback creates natural chunks for the photographed subtitles", () => {
  const helper = content.match(
    /function createFallbackSubtitleChunks\([\s\S]*?\r?\n}\r?\n(?=\r?\nasync function requestSubtitleChunks)/
  );

  assert.ok(
    helper,
    "fallback chunk helper was not found"
  );

  const sandbox = {
    cleanText: (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim()
  };

  vm.runInNewContext(
    helper[0],
    sandbox
  );

  const examples = [
    {
      sentence:
        "On this project, I will be supported by a team of Nepalese climbers, who would climb with me on different mountains throughout the expedition.",
      chunks: [
        "On this project,",
        "I will be supported",
        "by a team of Nepalese climbers,",
        "who would climb with me",
        "on different mountains throughout the expedition."
      ]
    },
    {
      sentence:
        "I would need to be the first climber in history to summit six 8 , 000-meter peaks in the spring season.",
      chunks: [
        "I would need to be the first climber in history",
        "to summit six 8 , 000-meter peaks",
        "in the spring season."
      ]
    },
    {
      sentence:
        "The climbing community of Nepal have always been the pioneers of eight-thousanders, but they never got the respect they deserve.",
      chunks: [
        "The climbing community of Nepal have always been the pioneers of eight-thousanders,",
        "but they never got the respect they deserve."
      ]
    },
    {
      sentence:
        "When a climber gets into trouble without other strong climbers around them to help, they're usually left to die.",
      chunks: [
        "When a climber gets into trouble",
        "without other strong climbers around them to help,",
        "they're usually left to die."
      ]
    }
  ];

  for (const example of examples) {
    const chunks = Array.from(
      sandbox
        .createFallbackSubtitleChunks(
          example.sentence
        )
    );

    assert.deepEqual(
      chunks,
      example.chunks
    );

    assert.equal(
      chunks.join(" "),
      example.sentence
    );
  }

  assert.deepEqual(
    Array.from(
      sandbox
        .createFallbackSubtitleChunks(
          "I want to go to the store because we need to buy some food."
        )
    ),
    [
      "I want to go to the store",
      "because we need to buy some food."
    ]
  );

  assert.deepEqual(
    Array.from(
      sandbox
        .createFallbackSubtitleChunks(
          "Come here. Sit down."
        )
    ),
    [
      "Come here.",
      "Sit down."
    ]
  );
});

test("failed AI chunking falls back to one safe full-sentence translation", () => {
  assert.match(
    content,
    /const fallbackChunks\s*=\s*\[\s*cleanText\(sentence\)\s*\]\.filter\(Boolean\)/s
  );
  assert.match(
    content,
    /validateSubtitleChunks\(\s*sentence,\s*chunks\s*\)[\s\S]*?chunkCache\.set/s
  );
  assert.doesNotMatch(
    content,
    /cachedChunks\.length > 0/
  );

  assert.match(
    content,
    /currentSubtitleChunks\s*=\s*cachedChunks\s*\|\|\s*createFallbackSubtitleChunks\(\s*sentence\s*\)/s,
    "initial render must prefer a prepared result and retain the local fallback"
  );
  assert.match(
    content,
    /catch \(error\)[\s\S]*?currentSubtitleChunks\s*=\s*safeChunk\s*\?\s*\[safeChunk\]\s*:\s*\[\][\s\S]*?cachedFullTranslation/s,
    "request failure must use one full sentence and reuse a verified translation"
  );
  assert.match(
    content,
    /if \(!cachedFullTranslation\)[\s\S]*?loadSubtitleChunkTranslations\(\s*sentence\s*\)/s,
    "a missing full translation must be requested instead of fabricated"
  );
});

test("fullscreen playback hides controls after five seconds while translations remain", () => {
  const showControlsFunction = content.match(
    /function showInterfaceControls\(\) \{[\s\S]*?\r?\n\}/
  );
  const hiddenControls = css.match(
    /#pausespeak-controls-panel\.ps-controls-hidden \.ps-topbar,[\s\S]*?#pausespeak-controls-panel\.ps-controls-hidden \.ps-player-shell\s*\{[^}]*\}/s
  );
  const hiddenSubtitleActions = css.match(
    /#pausespeak-controls-panel\.ps-controls-hidden\s+\.ps-subtitle-actions\s*\{[^}]*\}/s
  );
  const bottomDockedSubtitles = css.match(
    /#pausespeak-controls-panel\.ps-controls-hidden\s+#pausespeak-status-panel,[\s\S]*?#pausespeak-controls-panel\.ps-player-shell-collapsed\s+#pausespeak-status-panel\.ps-panel-shifted\s*\{[^}]*\}/s
  );

  assert.ok(showControlsFunction, "controls visibility function was not found");
  assert.match(
    showControlsFunction[0],
    /if \(!document\.fullscreenElement\) \{\s*return;\s*\}/,
    "controls must not auto-hide outside fullscreen"
  );
  assert.match(
    content,
    /const fullscreenControlsHideDelayMs\s*=\s*5000;/,
    "fullscreen controls must wait five seconds"
  );
  assert.match(
    showControlsFunction[0],
    /document\.fullscreenElement\s*&&[\s\S]*?!video\.paused[\s\S]*?classList\.add\(\s*"ps-controls-hidden"/,
    "only active fullscreen playback may hide the controls"
  );
  assert.ok(hiddenControls, "hidden controls rule was not found");
  assert.match(
    hiddenControls[0],
    /\.ps-side-nav/
  );
  assert.match(
    hiddenControls[0],
    /opacity:\s*0 !important/
  );
  assert.match(
    hiddenControls[0],
    /pointer-events:\s*none !important/
  );
  assert.doesNotMatch(
    hiddenControls[0],
    /pausespeak-status-panel/
  );
  assert.ok(
    hiddenSubtitleActions,
    "subtitle action buttons must hide with the other controls"
  );
  assert.match(
    hiddenSubtitleActions[0],
    /opacity:\s*0 !important/
  );
  assert.match(
    hiddenSubtitleActions[0],
    /pointer-events:\s*none !important/
  );
  assert.match(
    hiddenSubtitleActions[0],
    /display:\s*none !important/,
    "hidden actions must not leave empty space in the subtitle card"
  );
  assert.ok(
    bottomDockedSubtitles,
    "fullscreen-only subtitles must move to the bottom edge"
  );
  assert.match(
    bottomDockedSubtitles[0],
    /bottom:\s*calc\([\s\S]*?env\(safe-area-inset-bottom,\s*0px\)[\s\S]*?clamp\(16px,\s*2\.8vh,\s*40px\)[\s\S]*?\)\s*!important/,
    "bottom spacing must adapt to screen height and safe areas"
  );
});

test("manually collapsing the player also docks subtitles at the bottom", () => {
  const playerShellToggleHandler = content.match(
    /playerShellToggleButton\.addEventListener\([\s\S]*?\r?\n\);/
  );
  const collapsedSubtitleDock = css.match(
    /#pausespeak-controls-panel\.ps-player-shell-collapsed\s+#pausespeak-status-panel,[\s\S]*?#pausespeak-status-panel\.ps-panel-shifted\s*\{[^}]*\}/s
  );

  assert.ok(
    playerShellToggleHandler,
    "player collapse handler was not found"
  );
  assert.match(
    playerShellToggleHandler[0],
    /controlsPanel\.classList\.toggle\(\s*"ps-player-shell-collapsed",\s*isPlayerShellCollapsed\s*\)/,
    "manual player state must also be exposed to subtitle layout"
  );
  assert.ok(
    collapsedSubtitleDock,
    "collapsed player must share the bottom subtitle position"
  );
  assert.match(
    collapsedSubtitleDock[0],
    /bottom:\s*calc\([\s\S]*?safe-area-inset-bottom[\s\S]*?clamp\(16px,\s*2\.8vh,\s*40px\)/,
    "manual collapse must use the adaptive safe bottom spacing"
  );
});

test("rolling Netflix captions merge their shared suffix and prefix once", () => {
  const helper = content.match(
    /function mergeOverlappingSubtitleText\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function addSentencePart)/
  );

  assert.ok(
    helper,
    "subtitle overlap helper was not found"
  );

  const sandbox = {
    cleanText: (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim()
  };

  vm.runInNewContext(
    helper[0],
    sandbox
  );

  const merged =
    sandbox.mergeOverlappingSubtitleText(
      "The coroner called me and confirmed to us that Maddie and Kaylee were in bed together,",
      "that Maddie and Kaylee were in bed together, and that a very large knife with a seven-inch blade was used."
    );

  assert.equal(
    merged,
    "The coroner called me and confirmed to us that Maddie and Kaylee were in bed together, and that a very large knife with a seven-inch blade was used."
  );

  assert.equal(
    sandbox.mergeOverlappingSubtitleText(
      "I know that",
      "that was unusual."
    ),
    "I know that that was unusual."
  );

  const visibleNodes = [
    "When you get",
    "When you get into something like this where it just isn't happening,",
    "When you get into something like this where it just isn't happening, this is what in law enforcement we refer to as the whodunit."
  ];
  const mergedVisibleNodes =
    visibleNodes.reduce(
      (combined, visible) =>
        sandbox.mergeOverlappingSubtitleText(
          combined,
          visible
        ),
      ""
    );

  assert.equal(
    mergedVisibleNodes,
    visibleNodes[2]
  );
  assert.match(
    content,
    /uniqueTexts\.reduce\([\s\S]*?mergeOverlappingSubtitleText/s
  );

  const photographedDuplicate =
    "Law enforcement's latest efforts have been sifting through Law enforcement's latest efforts have been sifting through surveillance videos from downtown and any doorbell cameras in the area of the crime scene.";
  const photographedExpected =
    "Law enforcement's latest efforts have been sifting through surveillance videos from downtown and any doorbell cameras in the area of the crime scene.";

  assert.equal(
    sandbox.mergeOverlappingSubtitleText(
      "",
      photographedDuplicate
    ),
    photographedExpected
  );

  assert.equal(
    sandbox.mergeOverlappingSubtitleText(
      "Tonight investigators said Law enforcement's latest efforts have been sifting through",
      "Law enforcement’s latest efforts have been sifting through surveillance videos."
    ),
    "Tonight investigators said Law enforcement's latest efforts have been sifting through surveillance videos."
  );
});

test("timed subtitle cues are preferred over rolling DOM text and real spaces are preserved", () => {
  const subtitleReader = content.match(
    /function getNetflixSubtitle\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function endsSentence)/
  );
  const segmenter = content.match(
    /function createImmediateStudySegments\([\s\S]*?\r?\n\}\r?\n(?=function createStudyTokenMappings)/
  );

  assert.ok(subtitleReader, "subtitle reader was not found");
  assert.ok(segmenter, "immediate segmenter was not found");
  assert.match(
    subtitleReader[0],
    /getSubtitleFromCapturedTrack\(video\)[\s\S]*?return capturedTrackSubtitle[\s\S]*?getSubtitleFromNativeTextTracks/s
  );
  assert.match(
    content,
    /function getSubtitleFromNativeTextTracks[\s\S]*?track\.activeCues[\s\S]*?mergeOverlappingSubtitleText/s
  );
  assert.match(
    content,
    /segment\.type === "spacing"[\s\S]*?document\.createTextNode\(\s*segment\.text/s
  );
  assert.match(
    content,
    /createImmediateStudySegments\([\s\S]*?display: "block"[\s\S]*?whiteSpace: "normal"/s
  );

  const sandbox = { result: null };

  vm.runInNewContext(
    `${segmenter[0]}\nresult = createImmediateStudySegments("doorbell cameras in the area.");`,
    sandbox
  );

  assert.equal(
    Array.from(
      sandbox.result,
      (segment) => segment.text
    ).join(""),
    "doorbell cameras in the area."
  );
  assert.deepEqual(
    Array.from(
      sandbox.result,
      (segment) => segment.type
    ),
    [
      "word",
      "spacing",
      "word",
      "spacing",
      "word",
      "spacing",
      "word",
      "spacing",
      "word",
      "punctuation"
    ]
  );
});

test("Netflix TTML run and line boundaries cannot fuse neighboring words", () => {
  const helper = bridge.match(
    /function shouldSeparateTtmlRuns[\s\S]*?\r?\n  }\r?\n(?=\r?\n  function parseTtml)/
  );

  assert.ok(helper, "TTML text extractor was not found");
  assert.match(
    bridge,
    /text:\s*extractTtmlParagraphText\(\s*paragraph\s*\)/s
  );
  assert.doesNotMatch(
    bridge,
    /text:\s*paragraph\.textContent/
  );

  const textNode = (value) => ({
    nodeType: 3,
    nodeValue: value,
    childNodes: []
  });
  const element = (localName, ...children) => ({
    nodeType: 1,
    localName,
    childNodes: children
  });
  const span = (value) =>
    element("span", textNode(value));
  const sandbox = { result: "", resultTwo: "" };

  Object.assign(sandbox, {
      paragraph: element(
        "p",
        span("[news anchor 2] Law"),
        element("br"),
        span("enforcement's latest efforts have been"),
        element("br"),
        span("sifting through surveillance videos from downtown"),
        span("and any doorbell cameras"),
        span("in the area of the crime scene"),
        span(".")
      ),
      paragraphTwo: element(
        "p",
        span("they"),
        span("'re"),
        span("usually left to die"),
        span(";"),
        span("eight"),
        span("-"),
        span("thousanders")
      )
  });

  vm.runInNewContext(
    `${helper[0]}\n` +
      `result = extractTtmlParagraphText(paragraph);\n` +
      `resultTwo = extractTtmlParagraphText(paragraphTwo);`,
    sandbox
  );

  assert.equal(
    sandbox.result,
    "[news anchor 2] Law enforcement's latest efforts have been sifting through surveillance videos from downtown and any doorbell cameras in the area of the crime scene."
  );
  assert.equal(
    sandbox.resultTwo,
    "they're usually left to die; eight-thousanders"
  );
});

test("overlapping server chunks are rejected before caching or coaching", () => {
  const normalizer = content.match(
    /function normalizeSubtitleChunkValidationText\([\s\S]*?\r?\n\}\r?\n(?=\r?\nfunction validateSubtitleChunks)/
  );
  const validator = content.match(
    /function validateSubtitleChunks\([\s\S]*?\r?\n\}\r?\n(?=\r?\nfunction createFallbackSubtitleChunks)/
  );

  assert.ok(normalizer, "chunk normalizer was not found");
  assert.ok(validator, "chunk validator was not found");

  const sandbox = {
    cleanText: (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim(),
    removeSubtitleDescriptions: (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim()
  };

  vm.runInNewContext(
    `${normalizer[0]}\n${validator[0]}`,
    sandbox
  );

  const sentence =
    "The coroner called me and confirmed to us that Maddie and Kaylee were in bed together, and that a very large knife with a seven-inch blade was used.";
  const validChunks = [
    "The coroner called me and confirmed to us",
    "that Maddie and Kaylee were in bed together,",
    "and that a very large knife with a seven-inch blade was used."
  ];
  const overlappingChunks = [
    "The coroner called me and confirmed to us that Maddie and Kaylee were in bed together,",
    "that Maddie and Kaylee were in bed together,",
    "and that a very large knife with a seven-inch blade was used."
  ];

  assert.equal(
    sandbox.validateSubtitleChunks(
      sentence,
      validChunks
    ),
    true
  );
  assert.equal(
    sandbox.validateSubtitleChunks(
      sentence,
      overlappingChunks
    ),
    false
  );
  assert.match(
    content,
    /if \(Array\.isArray\(cachedChunks\)\) \{[\s\S]*?chunkCache\.delete/s
  );
});

test("voice mark remains while card progress lines are removed", () => {
  assert.match(content, /waveSpark/);
  assert.doesNotMatch(content, /ps-speech-pulse/);
  assert.doesNotMatch(content, /ps-sentence-progress/);
  assert.doesNotMatch(css, /\.ps-speech-pulse/);
  assert.doesNotMatch(css, /\.ps-sentence-progress/);
  assert.match(css, /#58c7e5/i);
  assert.match(css, /#7bd7ea/i);
  assert.match(popup, /class="brand-mark"/);
});

test("word and phrase details use a centered dismissible panel", () => {
  assert.match(content, /pausespeak-study-meaning-overlay/);
  assert.match(content, /renderStudyMeaningLoading/);
  assert.match(content, /closeStudyMeaningPanel/);
  assert.match(
    content,
    /targetContainer\.appendChild\(\s*studyMeaningOverlay\s*\)/s
  );
  assert.match(
    content,
    /function closeStudyMeaningWithoutPlaying\([\s\S]*?closeStudyMeaningPanel\(true\)/s
  );
  assert.doesNotMatch(
    content,
    /function closeStudyMeaningWithoutPlaying\([\s\S]*?studyMeaningPanel\.contains/s
  );
  assert.match(css, /#pausespeak-study-meaning-panel/);
  assert.match(css, /align-items:\s*center/);
  assert.match(css, /justify-content:\s*center/);
});

test("multi-word expression selection uses the Mist Ocean highlight", () => {
  assert.match(content, /getStudySelectionButtons/);
  assert.match(content, /selectStudyExpression/);
  assert.match(content, /selectStudyExpressionByText/);
  assert.match(css, /\.ps-study-selected/);
  assert.doesNotMatch(content, /#facc15/i);
});

test("mouse and arrow-key word interactions stay intentionally different", () => {
  const hoverHandler = content.match(
    /segmentButton\.addEventListener\(\s*"mouseenter",[\s\S]*?(?=segmentButton\.addEventListener\(\s*"mouseleave")/
  );

  assert.ok(hoverHandler, "mouse hover handler was not found");
  assert.match(hoverHandler[0], /ps-study-hovered/);
  assert.doesNotMatch(
    hoverHandler[0],
    /openStudyMeaningForButton|loadStudyMeaning/
  );
  assert.match(
    content,
    /openStudyMeaningForButton\(\s*segmentButton,\s*"pointer"\s*\)/s
  );
  assert.match(
    content,
    /keyboardStudyMeaningDelayMs\s*=\s*1800/
  );
  assert.match(
    content,
    /scheduleKeyboardStudyMeaning\(\s*selectedButton,\s*remoteStudyButtonIndex\s*\)/s
  );
  assert.match(
    content,
    /openStudyMeaningForButton\(\s*segmentButton,\s*"keyboard"\s*\)/s
  );
  assert.doesNotMatch(content, /selectedButton\.click\(\)/);
  assert.match(content, /event\.pointerType !== "mouse"/);
  assert.match(css, /\.ps-study-hovered/);
  assert.match(css, /\.ps-study-keyboard-target/);
  assert.match(css, /ps-study-keyboard-dwell 1800ms/);
});

test("remote keeps the original previous, play-pause and replay layout", () => {
  const remoteHandler = content.match(
    /window\.addEventListener\(\s*"keydown",[\s\S]*?\r?\n\);\r?\n(?=\s*const panelId)/
  );

  assert.ok(remoteHandler, "remote key handler was not found");
  assert.match(
    remoteHandler[0],
    /isPreviousWordKey\s*=\s*remoteKey === "ArrowUp"/s
  );
  assert.match(
    remoteHandler[0],
    /isNextWordKey\s*=\s*remoteKey === "ArrowDown"/s
  );
  assert.match(
    remoteHandler[0],
    /remoteKey === "ArrowLeft"[\s\S]*?navigateToAdjacentSentence\(-1\)/s
  );
  assert.match(
    remoteHandler[0],
    /remoteKey === "ArrowRight"[\s\S]*?replayButton\.click\(\)/s
  );
  assert.match(
    remoteHandler[0],
    /isMeaningOpen[\s\S]*?remoteKey === "Confirm"[\s\S]*?closeStudyMeaningPanel\(false\)/s
  );
  assert.match(
    remoteHandler[0],
    /remoteKey === "Confirm"[\s\S]*?if \(video\.paused\)[\s\S]*?video\.play\(\)[\s\S]*?video\.pause\(\)/s
  );
  assert.doesNotMatch(
    remoteHandler[0],
    /openStudyMeaningForButton\(\s*selectedButton,\s*"keyboard"\s*\)/s
  );
  assert.doesNotMatch(
    remoteHandler[0],
    /input, textarea, select, button/
  );
});

test("touching a study word opens its detail panel without waiting for click", () => {
  const segmentBuilder = content.match(
    /function appendStudySegments\([\s\S]*?\r?\n}\r?\n(?=\r?\n\r?\nfunction renderChunkedSubtitle)/
  );

  assert.ok(segmentBuilder, "study segment builder was not found");
  assert.match(
    segmentBuilder[0],
    /"pointerup"[\s\S]*?event\.pointerType === "mouse"[\s\S]*?openStudyMeaningForButton\(\s*segmentButton,\s*"pointer"\s*\)/s
  );
  assert.match(css, /touch-action:\s*manipulation/);
});

test("a newly completed paused sentence keeps its interactive word buttons", () => {
  const updater = content.match(
    /function updateSubtitle\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function finishReplay)/
  );

  assert.ok(updater, "subtitle updater was not found");
  assert.match(
    updater[0],
    /finishSentence\(video\);\s*didFinishSentence = true;/s
  );
  assert.match(
    updater[0],
    /shouldKeepCompletedSentence\s*=\s*didFinishSentence\s*&&\s*Boolean\(video\?\.paused\)/s
  );
  assert.match(
    updater[0],
    /if \(!shouldKeepCompletedSentence\) \{\s*subtitleBox\.textContent\s*=\s*newSubtitle;/s
  );
});

test("interface opacity controls every PauseSpeak glass surface", () => {
  assert.match(content, /Arayüz opaklığı/);
  assert.match(
    content,
    /document\.documentElement\.style\.setProperty\(\s*"--ps-ui-opacity"/s
  );
  assert.match(
    content,
    /controlsPanel\.style\.setProperty\(\s*"--ps-ui-opacity"/s
  );
  assert.match(content, /pausespeak-ui-opacity/);
  assert.match(
    content,
    /localStorage\.getItem\(\s*"pausespeak-card-opacity"\s*\)/s
  );
  assert.match(css, /PauseSpeak Unified Interface Opacity/);
  assert.match(css, /--ps-ui-opacity:\s*0\.88/);

  for (const selector of [
    "#pausespeak-status-panel",
    ".ps-player-shell",
    ".ps-top-button",
    ".ps-side-nav",
    ".ps-popup-menu",
    "#pausespeak-transcript-panel",
    "#pausespeak-study-meaning-panel",
    "#pausespeak-pronunciation-coach-panel",
    "#pausespeak-usage-overlay > div"
  ]) {
    const escapedSelector = selector.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    assert.match(
      css,
      new RegExp(
        `${escapedSelector}[\\s\\S]*?var\\(--ps-ui-opacity\\)`,
        "s"
      )
    );
  }

  assert.doesNotMatch(
    css,
    /#pausespeak-controls-panel\s*\{[^}]*opacity:\s*var\(--ps-ui-opacity\)/s
  );
});

test("Pronunciation Coach replaces the old two-control pronunciation UI", () => {
  const settingsAppend = content.match(
    /settingsMenu\.append\([\s\S]*?\);/
  );
  const panelChildren = content.match(
    /panel\.replaceChildren\([\s\S]*?\);/
  );

  assert.ok(settingsAppend, "settings menu assembly was not found");
  assert.ok(panelChildren, "subtitle panel assembly was not found");
  assert.doesNotMatch(
    settingsAppend[0],
    /pronunciationToggleButton|speakButton/
  );
  assert.doesNotMatch(
    panelChildren[0],
    /pronunciationTitle|spokenBox|pronunciationResultBox|chunkBox/
  );
  assert.match(
    panelChildren[0],
    /subtitleActionsRow/
  );
  assert.match(
    content,
    /subtitleActionsRow\.replaceChildren\(\s*improveTranslationButton,\s*improveSegmentationButton,\s*pronunciationCoachButton\s*\)/s
  );
  assert.match(
    content,
    /pausespeak-pronunciation-coach-overlay/
  );
  assert.match(
    content,
    /currentSubtitleChunks\.length[\s\S]*?createFallbackSubtitleChunks/s
  );
  assert.match(
    content,
    /word\.state\s*=\s*"passed"/
  );
  assert.match(
    content,
    /word\.state === "pending"[\s\S]*?word\.state = "retry"/s
  );
  assert.match(content, /"proper-name"/);
  assert.match(content, /looksLikeOpeningName/);
  assert.match(
    content,
    /"no-speech"[\s\S]*?ilerlemen korunuyor/s
  );
  assert.match(content, /}, 3200\);/);
  assert.match(
    content,
    /isPronunciationCoachSessionActive[\s\S]*?openPronunciationCoach\(\s*fullSentence,\s*false/s
  );
  assert.match(
    content,
    /if \(isPronunciationCoachOpen\) \{\s*return;/s
  );
  assert.match(
    css,
    /PauseSpeak Pronunciation Coach/
  );
  assert.match(css, /\.ps-coach-word-active/);
  assert.match(css, /\.ps-coach-word-passed/);
  assert.match(css, /\.ps-coach-word-retry/);
  assert.match(css, /#8bd3ad/i);
  assert.match(css, /#e2a0a0/i);
});

test("Pronunciation Coach accepts a remaining word without resetting earlier words", () => {
  const helper = content.match(
    /function getPronunciationCoachCharacterDistance\([\s\S]*?\r?\n  }\r?\n(?=\r?\n  function getPronunciationCoachProperNames)/
  );

  assert.ok(helper, "coach word matcher was not found");

  const sandbox = {
    getWordTokens: (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[’‘`]/g, "'")
        .replace(/[^a-z0-9'\s]/g, " ")
        .replace(/'/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean),
    references: [
      { key: "looking", word: { text: "looking" } },
      { key: "forward", word: { text: "forward" } },
      { key: "seeing", word: { text: "seeing" } }
    ],
    remaining: null,
    phrase: null,
    tolerant: null,
    shortMismatch: null
  };

  vm.runInNewContext(
    `${helper[0]}\n` +
      `remaining = collectPronunciationCoachMatches(references, "forward");\n` +
      `phrase = collectPronunciationCoachMatches(references, "looking forward seeing");\n` +
      `tolerant = isPronunciationCoachWordMatch("forward", "forword");\n` +
      `shortMismatch = isPronunciationCoachWordMatch("the", "they");`,
    sandbox
  );

  assert.deepEqual(
    Array.from(sandbox.remaining.matchedKeys),
    ["forward"]
  );
  assert.deepEqual(
    Array.from(sandbox.phrase.matchedKeys),
    ["looking", "forward", "seeing"]
  );
  assert.equal(sandbox.tolerant.success, true);
  assert.equal(sandbox.shortMismatch.success, false);
});

test("Pronunciation Coach auto-passes names without treating a new sentence as a name", () => {
  const helper = content.match(
    /function createPronunciationCoachParts\([\s\S]*?\r?\n  }\r?\n(?=\r?\n  function getPronunciationCoachWordReferences)/
  );

  assert.ok(helper, "coach name classifier was not found");

  const sandbox = {
    currentSentenceStudySegments: [
      { text: "Kristi", type: "proper-name" }
    ],
    getWordTokens: (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[’‘`]/g, "'")
        .replace(/[^a-z0-9'\s]/g, " ")
        .replace(/'/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean),
    result: null,
    openingName: null
  };

  vm.runInNewContext(
    `${helper[0]}\n` +
      `result = createPronunciationCoachChunks("On this project, Kristi works. Sit down.", ["On this project, Kristi works.", "Sit down."]);\n` +
      `openingName = createPronunciationCoachChunks("Everest is high.", ["Everest is high."]);`,
    sandbox
  );

  const states = Object.fromEntries(
    sandbox.result
      .flatMap((chunk) => chunk.parts)
      .filter((part) => part.kind === "word")
      .map((part) => [part.text, part.state])
  );

  assert.equal(states.On, "pending");
  assert.equal(states.Kristi, "proper");
  assert.equal(states.Sit, "pending");
  assert.equal(
    sandbox.openingName[0].parts[0].state,
    "proper"
  );
});

test("Pronunciation Coach opens contextual word details and resumes progress", () => {
  assert.match(
    content,
    /part\.kind === "word"[\s\S]*?document\.createElement/s
  );
  assert.match(content, /data\.coachWordKey|dataset\.coachWordKey/);
  assert.match(
    content,
    /openPronunciationCoachStudyMeaning\([\s\S]*?loadStudyMeaning\(/s
  );
  assert.match(
    content,
    /pronunciationCoachResumeAfterMeaning\s*=[\s\S]*?!pronunciationCoachManualPause/s
  );
  assert.match(
    content,
    /function resumePronunciationCoachAfterStudyMeaning\([\s\S]*?schedulePronunciationCoachRestart\(/s
  );
  assert.match(
    content,
    /closeStudyMeaningPanel\([\s\S]*?resumePronunciationCoachAfterStudyMeaning\(\)/s
  );
  assert.match(css, /\.ps-coach-word-study-selected/);
});

test("Pronunciation Coach reuses translation, navigates chunks and previews platform audio", () => {
  assert.match(
    content,
    /getPronunciationCoachTranslation\([\s\S]*?currentSubtitleChunkTranslations[\s\S]*?translationBox\.textContent/s
  );
  assert.doesNotMatch(
    content.match(
      /function getPronunciationCoachTranslation\([\s\S]*?\n  }\n(?=\n  function getPronunciationCoachStudyContext)/
    )?.[0] || "",
    /fetch\(/
  );
  assert.match(
    content,
    /movePronunciationCoachChunk\(-1\)/
  );
  assert.match(
    content,
    /movePronunciationCoachChunk\(1\)/
  );
  assert.match(
    content,
    /function synchronizePronunciationCoachChunks\([\s\S]*?savedStates[\s\S]*?word\.state\s*=\s*savedStates\.get/s
  );
  assert.match(
    content,
    /PAUSESPEAK_COACH_PREVIEW_REQUEST/
  );
  assert.match(
    content,
    /PAUSESPEAK_COACH_RETURN_REQUEST/
  );
  assert.match(
    bridge,
    /PAUSESPEAK_COACH_PREVIEW_REQUEST[\s\S]*?shouldPlay:\s*true/s
  );
  assert.match(
    bridge,
    /PAUSESPEAK_COACH_RETURN_REQUEST[\s\S]*?shouldPlay:\s*false/s
  );
  assert.match(
    content,
    /event\.target !==\s*pronunciationCoachOverlay[\s\S]*?closePronunciationCoach\(/s
  );
  assert.match(css, /\.ps-pronunciation-coach-translation/);
  assert.match(css, /\.ps-pronunciation-coach-chunk-navigation/);
});

test("Coach Listen replays the whole sentence and closing keeps video paused", () => {
  const rangeHelper = content.match(
    /function getPronunciationCoachVideoRange\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function finishPronunciationCoachVideoPreview)/
  );

  assert.ok(
    rangeHelper,
    "coach video range helper was not found"
  );

  const sandbox = {
    completedStartTimeMs: 2200,
    completedEndTimeMs: 6800,
    getNetflixVideo: () => ({
      currentTime: 9.25
    }),
    result: null
  };

  vm.runInNewContext(
    `${rangeHelper[0]}\nresult = getPronunciationCoachVideoRange();`,
    sandbox
  );

  assert.equal(
    sandbox.result.startTimeMs,
    2200
  );
  assert.equal(
    sandbox.result.endTimeMs,
    6800
  );
  assert.equal(
    sandbox.result.returnTimeMs,
    9250
  );

  assert.match(content, /Cümleyi baştan dinle/);
  assert.match(
    content,
    /if \(!resumeVideo\)[\s\S]*?video\.pause\(\)/s
  );
  assert.doesNotMatch(
    content,
    /closePronunciationCoach\(\s*true,\s*true\s*\)/
  );
  assert.match(
    css,
    /#pausespeak-pronunciation-coach-overlay button\.ps-coach-word\s*\{[^}]*background:\s*transparent !important/s
  );
  assert.match(
    css,
    /#pausespeak-pronunciation-coach-overlay button\.ps-coach-word:hover[\s\S]*?background:\s*rgba\(88, 199, 229,/s
  );
});

test("Pronunciation Coach stays inside the unchanged subtitle card", () => {
  const openHelper = content.match(
    /function openPronunciationCoach\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function closePronunciationCoach)/
  );

  assert.ok(openHelper, "coach open helper was not found");
  assert.match(
    openHelper[0],
    /isPronunciationCoachOpen\s*=\s*true/
  );
  assert.match(
    openHelper[0],
    /pronunciationCoachOverlay\.classList\.remove\(\s*"ps-open"\s*\)/s
  );
  assert.doesNotMatch(
    openHelper[0],
    /pronunciationCoachOverlay\.classList\.add\(\s*"ps-open"\s*\)/s
  );
  const decorator = content.match(
    /function applyPronunciationCoachStateToSubtitle\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function createPronunciationCoachChunkCard)/
  );

  assert.ok(decorator, "inline coach decorator was not found");
  assert.match(
    decorator[0],
    /querySelectorAll\(\s*"button\[data-study-text\]"\s*\)/s
  );
  assert.match(
    decorator[0],
    /segmentButton\.classList\.remove\([\s\S]*?ps-coach-word-passed[\s\S]*?segmentButton\.classList\.add/s
  );
  assert.doesNotMatch(
    decorator[0],
    /replaceChildren|createElement|createTextNode/
  );
  assert.match(
    content,
    /function renderChunkedSubtitle\([\s\S]*?appendStudySegments\([\s\S]*?applyPronunciationCoachStateToSubtitle\(\)/s
  );
  assert.match(
    css,
    /Inline Pronunciation Coach/
  );
  assert.match(
    css,
    /button\[data-study-text\]\.ps-inline-coach-segment[\s\S]*?white-space:\s*normal !important/s
  );
  assert.match(
    css,
    /button\[data-study-text\]\.ps-coach-word-passed[\s\S]*?color:\s*#8bd3ad !important/s
  );
  assert.match(
    css,
    /button\[data-study-text\]\.ps-coach-word-retry[\s\S]*?color:\s*#e2a0a0 !important/s
  );

  const makeButton = (text) => {
    const classes = new Set();

    return {
      textContent: text,
      dataset: { studyText: text },
      classes,
      classList: {
        add: (...names) =>
          names.forEach((name) =>
            classes.add(name)
          ),
        remove: (...names) =>
          names.forEach((name) =>
            classes.delete(name)
          )
      }
    };
  };
  const buttons = [
    makeButton("When"),
    makeButton("you"),
    makeButton("speak")
  ];
  const sandbox = {
    isPronunciationCoachOpen: true,
    isPronunciationCoachSessionActive: true,
    pronunciationCoachChunks: [
      {
        parts: [
          { kind: "word", key: "0", state: "passed" },
          { kind: "word", key: "1", state: "pending" },
          { kind: "word", key: "2", state: "retry" }
        ]
      }
    ],
    pronunciationCoachChunkIndex: 0,
    pronunciationCoachActiveWordIndex: 1,
    pronunciationCoachLiveMatches:
      new Set(["1"]),
    subtitleBox: {
      classList: { add: () => {} },
      querySelectorAll: () => buttons
    },
    panel: {
      classList: { add: () => {} }
    }
  };

  vm.runInNewContext(
    `${decorator[0]}\napplyPronunciationCoachStateToSubtitle();`,
    sandbox
  );

  assert.deepEqual(
    buttons.map((button) =>
      button.textContent
    ),
    ["When", "you", "speak"]
  );
  assert.equal(
    buttons[0].classes.has(
      "ps-coach-word-passed"
    ),
    true
  );
  assert.equal(
    buttons[1].classes.has(
      "ps-coach-word-live-passed"
    ),
    true
  );
  assert.equal(
    buttons[1].classes.has(
      "ps-coach-word-active"
    ),
    true
  );
  assert.equal(
    buttons[2].classes.has(
      "ps-coach-word-retry"
    ),
    true
  );
});

test("Pronunciation Coach waits for translation and never listens while video plays", () => {
  const readyHelper = content.match(
    /function isPronunciationCoachTranslationReady\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function tryStartPronunciationCoachAfterTranslation)/
  );
  const startHelper = content.match(
    /function startPronunciationCoachRecognition\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function preparePronunciationCoachSentence)/
  );
  const openHelper = content.match(
    /function openPronunciationCoach\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function closePronunciationCoach)/
  );

  assert.ok(readyHelper, "translation readiness helper was not found");
  assert.ok(startHelper, "coach recognition starter was not found");
  assert.ok(openHelper, "coach open helper was not found");
  assert.match(
    readyHelper[0],
    /translationBox\.textContent[\s\S]*?Çevriliyor/s
  );
  assert.match(
    startHelper[0],
    /!video\.paused[\s\S]*?!isPronunciationCoachTranslationReady\(\)/s
  );
  assert.match(
    startHelper[0],
    /const stopCoachForVideoPlayback[\s\S]*?stopPronunciationCoachRecognition\(\s*false\s*\)/s
  );
  assert.match(
    startHelper[0],
    /video\.addEventListener\(\s*"play",\s*stopCoachForVideoPlayback/s
  );
  assert.match(
    content,
    /pronunciationCoachTranslationObserver[\s\S]*?tryStartPronunciationCoachAfterTranslation\(\)/s
  );
  assert.match(
    content,
    /const runPauseSpeakUpdate = \(\) => \{[\s\S]*?!pronunciationCoachVideo\.paused[\s\S]*?stopPronunciationCoachRecognition\(false\)/s
  );
  assert.doesNotMatch(
    openHelper[0],
    /schedulePronunciationCoachRestart\(\s*220\s*\)/s
  );
});

test("subtitle card and right transcript controls use their nearby buttons", () => {
  const topHandler = content.match(
    /panelVisibilityButton\.addEventListener\([\s\S]*?\r?\n\);\r?\n(?=\r?\nsubtitleVisibilityButton\.addEventListener)/
  );
  const dockHandler = content.match(
    /transcriptButton\.addEventListener\([\s\S]*?\r?\n\);\r?\n(?=\r?\ntranscriptCloseButton\.addEventListener)/
  );

  assert.ok(topHandler, "top transcript handler was not found");
  assert.ok(dockHandler, "dock subtitle handler was not found");
  assert.match(
    topHandler[0],
    /setTranscriptPanelVisibility/
  );
  assert.doesNotMatch(
    topHandler[0],
    /setSubtitlePanelVisibility/
  );
  assert.match(
    dockHandler[0],
    /setSubtitlePanelVisibility/
  );
  assert.doesNotMatch(
    dockHandler[0],
    /setTranscriptPanelVisibility/
  );
  assert.match(
    content,
    /function setSubtitlePanelVisibility[\s\S]*?transcriptButton\.classList\.toggle/s
  );
  assert.match(
    content,
    /function setTranscriptPanelVisibility[\s\S]*?panelVisibilityButton\.classList\.toggle/s
  );
});

test("three mouse clicks or taps toggle a black privacy curtain and keep video paused", () => {
  const visibilityHelper = content.match(
    /function setPrivacyCurtainVisibility\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function handlePrivacyCurtainPointerUp)/
  );
  const gestureHelper = content.match(
    /function handlePrivacyCurtainPointerUp\([\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function clearPrivacyCurtainAfterSleep)/
  );

  assert.ok(visibilityHelper, "privacy visibility helper was not found");
  assert.ok(gestureHelper, "privacy gesture helper was not found");
  assert.match(
    gestureHelper[0],
    /privacyTapCount < 3/
  );
  assert.match(
    gestureHelper[0],
    /setPrivacyCurtainVisibility\(\s*!isPrivacyCurtainActive\s*\)/s
  );
  assert.match(
    visibilityHelper[0],
    /video\.pause\(\)/
  );
  assert.doesNotMatch(
    visibilityHelper[0],
    /video\.play\(/
  );
  assert.match(
    content,
    /const runPauseSpeakUpdate = \(\) => \{[\s\S]*?if \(isPrivacyCurtainActive\)[\s\S]*?privacyVideo\.pause\(\)/s
  );
  assert.match(
    content,
    /document\.addEventListener\(\s*"freeze",\s*clearPrivacyCurtainAfterSleep/s
  );
  assert.match(
    content,
    /document\.addEventListener\(\s*"resume",\s*clearPrivacyCurtainAfterSleep/s
  );
  assert.match(
    css,
    /#pausespeak-privacy-curtain\s*\{[\s\S]*?background:\s*#000000 !important[\s\S]*?pointer-events:\s*none !important/s
  );
  assert.match(
    css,
    /#pausespeak-privacy-curtain\.ps-open\s*\{[^}]*pointer-events:\s*auto !important/s
  );
});

test("a completed selected chunk immediately advances to the next unfinished chunk", () => {
  const helper = content.match(
    /function advancePronunciationCoach\(\) \{[\s\S]*?\r?\n  \}\r?\n(?=\r?\n  function commitPronunciationCoachResult)/
  );

  assert.ok(helper);

  const sandbox = {
    pronunciationCoachChunks: [
      { complete: false },
      { complete: false },
      { complete: true }
    ],
    pronunciationCoachChunkIndex: 2,
    pronunciationCoachLiveMatches:
      new Set(),
    pronunciationCoachActiveWordIndex: 4,
    pronunciationCoachLastHeard: "done",
    pronunciationCoachHeard: {
      textContent: ""
    },
    pronunciationCoachStatus: {
      textContent: ""
    },
    isPronunciationCoachChunkComplete:
      (chunk) => chunk.complete,
    renderPronunciationCoach: () => {},
    finishPronunciationCoachSentence:
      () => {},
    schedulePronunciationCoachRestart:
      (delay) => {
        sandbox.restartDelay = delay;
      },
    restartDelay: null,
    result: null
  };

  vm.runInNewContext(
    `${helper[0]}\nresult = advancePronunciationCoach();`,
    sandbox
  );

  assert.equal(
    sandbox.pronunciationCoachChunkIndex,
    0
  );
  assert.equal(sandbox.restartDelay, 220);
  assert.equal(sandbox.result, false);
  assert.match(
    content,
    /advancePronunciationCoach\(\);\s*\}, 180\)/s
  );
});

test("clicking the middle of a phrase selects its full contiguous range", () => {
  const helper = content.match(
    /function getStudySelectionButtons\([\s\S]*?\r?\n}\r?\n(?=\r?\nfunction selectStudyExpression)/
  );

  assert.ok(helper, "selection helper was not found");

  const sandbox = {
    cleanText: (value) => String(value || "").trim(),
    currentStudyTokenMappings: [
      { text: "out of here", type: "expression" },
      { text: "out of here", type: "expression" },
      { text: "out of here", type: "expression" },
      { text: "now", type: "word" }
    ],
    studyButtons: [
      { id: "out" },
      { id: "of" },
      { id: "here" },
      { id: "now" }
    ],
    result: null
  };

  vm.runInNewContext(
    `${helper[0]}\nresult = getStudySelectionButtons(studyButtons, 1, currentStudyTokenMappings[1]);`,
    sandbox
  );

  assert.deepEqual(
    Array.from(
      sandbox.result,
      (button) => button.id
    ),
    ["out", "of", "here"]
  );
});

test("both improvement icons survive their loading state", () => {
  assert.match(content, /aria-busy/);
  assert.match(
    content,
    /buttonSettings[\s\S]*?icon:\s*"waveSpark"[\s\S]*?icon:\s*"parts"[\s\S]*?setPauseSpeakButton\(\s*button,\s*icon,[\s\S]*?"Yükleniyor"/s
  );
});

test("transcript drawer uses a subtle active-line treatment", () => {
  assert.match(content, /row\.dataset\.active/);
  assert.match(css, /button\[data-active="true"\]/);
  assert.match(
    css,
    /PauseSpeak Mist Ocean[\s\S]*?button\[data-active="true"\][\s\S]*?border-left-color:\s*var\(--ps-blue-strong\)/s
  );
});

test("motion has an accessibility fallback", () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(content, /prefers-reduced-motion:\s*reduce/);
});

test("Netflix and YouTube seeking remain on the page bridge", () => {
  assert.match(content, /PAUSESPEAK_SEEK_REQUEST/);
  assert.doesNotMatch(content, /\bvideo\.currentTime\s*=/);
  assert.match(bridge, /getNetflixPlayer/);
  assert.match(bridge, /seekYouTubePlayer/);
  assert.match(
    bridge,
    /player\?\.seekTo|video\.fastSeek|Reflect\.set/
  );
});

test("all subtitle export choices remain available", () => {
  for (const value of [
    '"srt"',
    '"vtt"',
    '"timed-txt"',
    '"plain-txt"',
    '"bilingual"'
  ]) {
    assert.match(content, new RegExp(value));
  }

  assert.match(content, /replace\(\/\\\[[^\n]+\\\]/);
});
