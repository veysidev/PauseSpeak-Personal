const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const {
  UsageStore,
  hashSyncCode,
  normalizeDate,
  normalizeSyncCode
} = require("./usage-store");
const {
  emptyOpenAIUsage,
  estimateTextUsageCost,
  finalizeOpenAIUsage,
  mergeOpenAIUsage,
  normalizeOpenAIUsage
} = require("./usage-metrics");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1);

const port =
  Number(process.env.PORT) || 3000;
  const pauseSpeakAccessKey =
  process.env.PAUSESPEAK_ACCESS_KEY || "";

const openAIModel =
  process.env.OPENAI_LUNA_MODEL ||
  "gpt-5.6-luna";

const openAITerraModel =
  process.env.OPENAI_TERRA_MODEL ||
  "gpt-5.6-terra";

const openAITtsModel =
  "gpt-4o-mini-tts";

const openAITtsVoice =
  "marin";
let openAIClientPromise = null;

const usageStore = new UsageStore({
  databaseUrl:
    process.env.DATABASE_URL || "",
  useSsl:
    process.env.DATABASE_SSL !== "false"
});

app.use(
  cors({
    exposedHeaders: [
      "X-PauseSpeak-Usage-Event"
    ]
  })
);

app.use(
  express.json({
    limit: "256kb"
  })
);
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (request) =>
    request.method !== "POST",
  message: {
    success: false,
    error:
      "Çok fazla istek gönderildi. Lütfen kısa bir süre sonra tekrar deneyin."
  }
});

app.use(apiLimiter);
function requirePauseSpeakAccessKey(
  request,
  response,
  next
) {
  if (
    request.method !== "POST" ||
    !pauseSpeakAccessKey
  ) {
    next();
    return;
  }

  const providedAccessKey =
    request.get(
      "x-pausespeak-access-key"
    ) || "";

  if (
    providedAccessKey !==
    pauseSpeakAccessKey
  ) {
    response.status(401).json({
      success: false,
      error: "Yetkisiz istek."
    });
    return;
  }

  next();
}

app.use(
  requirePauseSpeakAccessKey
);
async function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY bulunamadı."
    );
  }

  if (!openAIClientPromise) {
    openAIClientPromise = import(
      "openai"
    ).then(({ default: OpenAI }) => {
      return new OpenAI({
        apiKey:
          process.env.OPENAI_API_KEY
      });
    });
  }

  return openAIClientPromise;
}

function getOpenAIErrorMessage(
  error,
  operationName
) {
  if (error?.status === 401) {
    return (
      "OpenAI API anahtarı geçersiz " +
      "veya kullanılamıyor."
    );
  }

  if (error?.status === 403) {
    return (
      "OpenAI API anahtarının bu " +
      "işlem için yetkisi yok."
    );
  }

  if (error?.status === 404) {
    return (
      "Seçilen OpenAI modeli " +
      "bulunamadı veya bu hesaba " +
      "açık değil."
    );
  }

  if (error?.status === 429) {
    return (
      "OpenAI kullanım limiti veya " +
      "API bakiyesi yetersiz."
    );
  }

  if (error?.status >= 500) {
    return (
      "OpenAI hizmetine şu anda " +
      "ulaşılamıyor."
    );
  }

  return (
    `${operationName} sırasında ` +
    "hata oluştu."
  );
}

function getStatusCode(error) {
  if (
    [
      401,
      403,
      404,
      429
    ].includes(error?.status) ||
    error?.status >= 500
  ) {
    return error.status;
  }

  return 500;
}

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseOpenAIResponse(
  openAIResponse,
  parser
) {
  const usage = normalizeOpenAIUsage(
    openAIResponse?.usage
  );

  try {
    return {
      value: parser(
        openAIResponse?.output_text
      ),
      usage
    };
  } catch (error) {
    error.openAIUsage = usage;
    throw error;
  }
}
function getUsageAccountHash(request) {
  return hashSyncCode(
    request.get(
      "x-pausespeak-sync-code"
    )
  );
}

function getUsageLocalDate(request) {
  return normalizeDate(
    request.get(
      "x-pausespeak-local-date"
    )
  ) || new Date()
    .toISOString()
    .slice(0, 10);
}

function getTranslationUsageOperation(
  translationMode,
  improve
) {
  if (translationMode === "chunk") {
    return improve
      ? "improve_chunk"
      : "chunk_translation";
  }

  return improve
    ? "improve_translation"
    : "normal_translation";
}

async function recordSynchronizedUsage(
  request,
  {
    operation,
    model,
    usage,
    ttsCharacters = 0
  }
) {
  const finalizedUsage =
    finalizeOpenAIUsage(usage, {
      errorCount:
        Number(usage?.errorCount) || 0
    });
  const normalizedUsage = {
    ...finalizedUsage,
    ttsCharacters,
    estimatedUsd:
      operation.startsWith("tts_")
        ? (
            ttsCharacters / 4 * 0.6
          ) / 1000000
        : estimateTextUsageCost(
            model,
            finalizedUsage
          )
  };

  console.info(
    "PauseSpeak OpenAI kullanım gözlemi:",
    {
      operation,
      model,
      requests:
        normalizedUsage.requests,
      inputTokens:
        normalizedUsage.inputTokens,
      cachedInputTokens:
        normalizedUsage.cachedInputTokens,
      cacheWriteTokens:
        normalizedUsage.cacheWriteTokens,
      outputTokens:
        normalizedUsage.outputTokens,
      reasoningTokens:
        normalizedUsage.reasoningTokens,
      retryCount:
        normalizedUsage.retryCount,
      cacheHits:
        normalizedUsage.cacheHits,
      cacheMisses:
        normalizedUsage.cacheMisses,
      errorCount:
        normalizedUsage.errorCount,
      estimatedUsd:
        normalizedUsage.estimatedUsd
    }
  );

  const accountHash =
    getUsageAccountHash(request);

  if (
    !accountHash ||
    !usageStore.isConfigured()
  ) {
    return "";
  }

  try {
    return await usageStore.recordEvent(
      accountHash,
      {
        localDate:
          getUsageLocalDate(request),
        operation,
        model,
        usage: normalizedUsage
      }
    );
  } catch (error) {
    console.error(
      "PauseSpeak ortak sayaç yazma hatası:",
      error?.message
    );

    return "";
  }
}

function requireUsageAccount(
  request,
  response
) {
  const syncCode = normalizeSyncCode(
    request.get(
      "x-pausespeak-sync-code"
    )
  );

  if (!syncCode) {
    response.status(401).json({
      success: false,
      error:
        "Geçerli bir senkronizasyon kodu gönderilmedi."
    });
    return "";
  }

  if (!usageStore.isConfigured()) {
    response.status(503).json({
      success: false,
      error:
        "Ortak sayaç veritabanı henüz yapılandırılmadı."
    });
    return "";
  }

  return hashSyncCode(syncCode);
}

function removeSubtitleDescriptions(
  text
) {
  return cleanText(
    String(text || "")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\([^)]*\)/g, " ")
      .replace(/♪[^♪]*♪/g, " ")
      .replace(/[♪♫]/g, " ")
  );
}

function normalizeForChunkValidation(
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

function parseChunkArray(
  outputText
) {
  const cleanedOutput =
    String(outputText || "")
      .trim()
      .replace(
        /^```(?:json)?\s*/i,
        ""
      )
      .replace(
        /\s*```$/,
        ""
      )
      .trim();

  const firstBracket =
    cleanedOutput.indexOf("[");

  const lastBracket =
    cleanedOutput.lastIndexOf("]");

  if (
    firstBracket === -1 ||
    lastBracket === -1
  ) {
    throw new Error(
      "Chunk cevabında JSON dizisi bulunamadı."
    );
  }

  const parsed =
    JSON.parse(
      cleanedOutput.slice(
        firstBracket,
        lastBracket + 1
      )
    );

  if (!Array.isArray(parsed)) {
    throw new Error(
      "Chunk cevabı bir dizi değil."
    );
  }

  return parsed.map(
    (chunk) => cleanText(chunk)
  );
}
function parseChunkDecision(
  outputText
) {
  const cleanedOutput =
    String(outputText || "")
      .trim()
      .replace(
        /^```(?:json)?\s*/i,
        ""
      )
      .replace(
        /\s*```$/,
        ""
      )
      .trim();

  const firstBrace =
    cleanedOutput.indexOf("{");

  const lastBrace =
    cleanedOutput.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace === -1
  ) {
    throw new Error(
      "Chunk cevabında JSON nesnesi bulunamadı."
    );
  }

  const parsed =
    JSON.parse(
      cleanedOutput.slice(
        firstBrace,
        lastBrace + 1
      )
    );

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    typeof parsed.suitable !==
      "boolean" ||
    !Array.isArray(parsed.parts) ||
    parsed.parts.some(
      (part) =>
        !part ||
        typeof part !== "object" ||
        Array.isArray(part) ||
        typeof part.english !== "string" ||
        typeof part.turkish !== "string"
    )
  ) {
    throw new Error(
      "Chunk cevabı geçerli bir karar nesnesi değil."
    );
  }

  return {
    suitable: parsed.suitable,

    parts: parsed.parts.map(
      (part) => ({
        english: cleanText(
          part.english
        ),
        turkish: cleanText(
          part.turkish
        )
      })
    )
  };
}
function parseStudyMeaning(
  outputText
) {
  const cleanedOutput =
    String(outputText || "")
      .trim()
      .replace(
        /^```(?:json)?\s*/i,
        ""
      )
      .replace(
        /\s*```$/,
        ""
      )
      .trim();

  const firstBrace =
    cleanedOutput.indexOf("{");

  const lastBrace =
    cleanedOutput.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace === -1
  ) {
    throw new Error(
      "Kelime anlamı cevabında JSON nesnesi bulunamadı."
    );
  }

  const parsed =
    JSON.parse(
      cleanedOutput.slice(
        firstBrace,
        lastBrace + 1
      )
    );

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    typeof parsed.text !==
      "string" ||
    parsed.text.trim() === "" ||
    !Array.isArray(
      parsed.meanings
    ) ||
    parsed.meanings.length === 0 ||
    parsed.meanings.length > 5 ||
    parsed.meanings.some(
      (meaning) =>
        typeof meaning !==
          "string" ||
        meaning.trim() === ""
    ) ||
    (
      parsed.expansion !==
        undefined &&
      typeof parsed.expansion !==
        "string"
    ) ||
        (
      parsed.pronunciation !==
        undefined &&
      typeof parsed.pronunciation !==
        "string"
    ) ||
    (
      parsed.note !==
        undefined &&
      typeof parsed.note !==
        "string"
    )
  ) {
    throw new Error(
      "Kelime anlamı cevabı geçerli değil."
    );
  }

  return {
    text: cleanText(
      parsed.text
    ),

    meanings:
      parsed.meanings.map(
        (meaning) =>
          cleanText(meaning)
      ),

    expansion:
      cleanText(
        parsed.expansion || ""
      ),

      pronunciation:
      cleanText(
        parsed.pronunciation || ""
      ),

    note:
      cleanText(
        parsed.note || ""
      )
  };
}
function parseStudySegments(
  outputText,
  analysisMode
) {
  const isContextExpressionMode =
    analysisMode ===
    "context-expression-v1";
  const cleanedOutput =
    String(outputText || "")
      .trim()
      .replace(
        /^```(?:json)?\s*/i,
        ""
      )
      .replace(
        /\s*```$/,
        ""
      )
      .trim();

  const firstBrace =
    cleanedOutput.indexOf("{");

  const lastBrace =
    cleanedOutput.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace === -1
  ) {
    throw new Error(
      "Kelime analizi cevabında JSON nesnesi bulunamadı."
    );
  }

  const parsed =
    JSON.parse(
      cleanedOutput.slice(
        firstBrace,
        lastBrace + 1
      )
    );

  const allowedTypes =
    new Set([
      "word",
      "contraction",
      "phrasal-verb",
      "idiom",
      "spoken-pattern",
      "fixed-expression",
      "collocation",
      "verb-pattern",
      "grammar-pattern",
      "compound-noun",
      "proper-name",
      "multiword-preposition",
      "conjunction-pattern",
     "number-expression",
"natural-expression",
"punctuation"
    ]);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    !Array.isArray(parsed.segments) ||
    parsed.segments.length === 0
  ) {
    throw new Error(
      "Kelime analizi cevabı geçerli bir segments nesnesi değil."
    );
  }

  const segments =
    parsed.segments.map(
      (segment) => {
        if (
          !segment ||
          typeof segment !== "object" ||
          Array.isArray(segment) ||
          typeof segment.text !==
            "string" ||
          segment.text.trim() === "" ||
          typeof segment.type !==
            "string" ||
          !allowedTypes.has(
            segment.type
          )
        ) {
          throw new Error(
            "Kelime analizi geçersiz bir parça içeriyor."
          );
        }

const cleanedSegment = {
  text: cleanText(
    segment.text
  ),

  type: segment.type
};

if (!isContextExpressionMode) {
  return cleanedSegment;
}

const meanings =
  Array.isArray(segment.meanings)
    ? segment.meanings
        .filter(
          (meaning) =>
            typeof meaning ===
              "string" &&
            meaning.trim() !== ""
        )
        .slice(0, 5)
        .map(
          (meaning) =>
            cleanText(meaning)
        )
    : [];

return {
  ...cleanedSegment,

  meanings,

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
};
      }
    );
if (
  isContextExpressionMode &&
  segments.some(
    (segment) =>
      segment.type !==
        "punctuation" &&
      (
        !Array.isArray(
          segment.meanings
        ) ||
        segment.meanings.length === 0 ||
        !segment.pronunciation
      )
  )
) {
  throw new Error(
    "Personal kelime analizi eksik anlam veya okunuş içeriyor."
  );
}
  return {
    segments
  };
}
function validateStudySegments(
  originalSentence,
  segments
) {
  if (
    !Array.isArray(segments) ||
    segments.length === 0 ||
    segments.length > 50 ||
    segments.some(
      (segment) =>
        !segment ||
        typeof segment !== "object" ||
        typeof segment.text !==
          "string" ||
        segment.text.trim() === ""
    )
  ) {
    return false;
  }

  const expected =
    normalizeForChunkValidation(
      originalSentence
    );

  const recombined =
    normalizeForChunkValidation(
      segments
        .map(
          (segment) =>
            segment.text
        )
        .join(" ")
    );

  return (
    expected !== "" &&
    expected === recombined
  );
}
function validateChunks(
  originalSentence,
  chunks
) {
  if (
    !Array.isArray(chunks) ||
    chunks.length < 2 ||
    chunks.length > 8 ||
    chunks.some(
      (chunk) =>
        typeof chunk !== "string" ||
        chunk.trim() === ""
    )
  ) {
    return false;
  }

  const expected =
    normalizeForChunkValidation(
      originalSentence
    );

  const recombined =
    normalizeForChunkValidation(
      chunks.join(" ")
    );

  return (
    expected !== "" &&
    expected === recombined
  );
}

async function generateSmartChunks(
  openAI,
  sentence
) {
  const openAIResponse =
    await openAI.responses.create({
      model: openAIModel,

      reasoning: {
        effort: "none"
      },

      instructions: [
        "Sen İngilizce telaffuz",
        "çalışması için doğal",
        "konuşma parçaları",
        "oluşturan bir uzmansın.",

        "Sana verilen İngilizce",
        "cümleyi doğal nefes ve",
        "anlam gruplarına ayır.",

        "Yalnızca geçerli bir JSON",
        "string dizisi döndür.",

        "Açıklama, başlık, Markdown",
        "veya kod bloğu ekleme.",

        "Cümledeki hiçbir kelimeyi,",
        "noktalama işaretini veya",
        "kısaltmayı değiştirme.",

        "Hiçbir kelimeyi silme,",
        "ekleme, düzeltme veya",
        "yeniden sıralama.",

        "Phrasal verbleri, deyimleri,",
        "kalıpları, collocation",
        "yapılarını ve fiil",
        "örüntülerini bölme.",

        "Olumsuzluk yapısını",
        "yardımcı fiilden ayırma.",

        "Özne ile çok kısa yüklemi",
        "gereksiz yere ayırma.",

        "Edatlı tamamlayıcıyı doğal",
        "konuşmada ayrı bir nefes",
        "grubuysa ayrı parça",
        "yapabilirsin.",

        "Her parça mümkünse 2 ile",
        "7 kelime arasında olsun.",

        "Tek kelimelik parça üretme;",
        "yalnızca kaçınılmazsa üret.",

        "Bütün parçalar boşlukla",
        "birleştirildiğinde orijinal",
        "cümle aynen oluşmalıdır."
      ].join(" "),

      input: [
        "Cümleyi telaffuz çalışması",
        "için doğal parçalara ayır.",

        `Cümle: ${sentence}`,

        "Yalnızca JSON dizisini ver."
      ].join("\n"),

      max_output_tokens: 250
    });

  return parseChunkArray(
    openAIResponse.output_text
  );
}
async function generateSmartChunkDecision(
  openAI,
  sentence,
  {
    model = openAIModel,
    improve = false,
    improvementType = "segmentation",
    correctionNotes = [],
    previousParts = []
  } = {}
) {
  const improvesTranslationsOnly =
    improve &&
    improvementType === "translation";

  if (improvesTranslationsOnly) {
    const openAIResponse =
      await openAI.responses.create({
        model,
        reasoning: {
          effort: "none"
        },
        instructions: [
          "Sen profesyonel bir İngilizce-Türkçe altyazı çevirmenisin.",
          "Kullanıcı yalnızca mevcut parçaların Türkçe çevirilerini iyileştirmek istiyor.",
          "Parça sayısını, sırasını, english alanlarını ve parça sınırlarını kesinlikle değiştirme.",
          "Her turkish alanını yalnızca kendi english parçasının bütün cümle bağlamındaki doğal, akıcı ve güncel Türkçe karşılığıyla yeniden yaz.",
          "Anlam ekleme, çıkarma, açıklama, başlık, alternatif veya Markdown ekleme.",
          "suitable değeri parça sayısı birden fazlaysa true, tek parçaysa false olmalıdır.",
          "Yalnızca geçerli JSON nesnesi döndür."
        ].join(" "),
        input: [
          `Cümle: ${sentence}`,
          `Aynen korunacak parçalar: ${JSON.stringify(
            previousParts
          )}`,
          "Yalnızca turkish alanlarını iyileştir."
        ].join("\n"),
        text: {
          format: {
            type: "json_schema",
            name:
              "chunk_translation_improvement",
            strict: true,
            schema: {
              type: "object",
              properties: {
                suitable: {
                  type: "boolean"
                },
                parts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      english: {
                        type: "string"
                      },
                      turkish: {
                        type: "string"
                      }
                    },
                    required: [
                      "english",
                      "turkish"
                    ],
                    additionalProperties:
                      false
                  }
                }
              },
              required: [
                "suitable",
                "parts"
              ],
              additionalProperties: false
            }
          }
        },
        max_output_tokens: 1200
      });
    const parsed = parseOpenAIResponse(
      openAIResponse,
      parseChunkDecision
    );

    return {
      decision: parsed.value,
      usage: parsed.usage
    };
  }

  const openAIResponse =
    await openAI.responses.create({
      model,
reasoning: {
  effort: "none"
},

      instructions: [
        "Sen İngilizce telaffuz ve",
        "akıcı konuşma çalışması için",
        "öğrenmeye değer doğal",
        "konuşma parçaları belirleyen ve",
        "bunları doğal Türkçeye çeviren",
        "bir uzmansın.",

        improvesTranslationsOnly
          ? "Kullanıcı yalnızca Türkçe çevirileri iyileştirmeyi istedi. Önceki parçaların sayısını, sırasını ve english alanlarını kesinlikle değiştirme; yalnızca turkish alanlarını yeniden yaz."
          : improve
            ? "Kullanıcı yalnızca parça sınırlarını iyileştirmeyi açıkça istedi. En doğal konuşma sınırlarını yeniden değerlendir. Yeni parçalara ekranda gösterilmesi için gerekli, sadık Türkçe karşılıkları ver; ayrıca çeviri iyileştirmesi yapma."
            : "",

        correctionNotes.length > 0
          ? "Önceki cevap sunucu doğrulamasından geçmedi. Bildirilen ihlalleri düzelt ve eksiksiz yeni bir sonuç üret."
          : "",

        "Önce verilen cümlenin doğal",
        "ve faydalı biçimde en az iki",
        "anlamlı konuşma parçasına",
        "ayrılıp ayrılamayacağına",
        "karar ver.",

        "Cümleyi yalnızca kelime",
        "sayısına göre bölme.",

        "Doğal ve öğrenmeye değer",
        "bir ayrım yoksa zorla bölme.",

   "Phrasal verbler, deyimler,",
"doğal konuşma kalıpları,",
"B1 ve üzeri gramer yapıları,",
"vurgu yapıları, şart",
"cümleleri, duygusal ifadeler,",
"clause yapıları, relative",
"clauses, nominal clauses,",
"reduced clauses, collocations,",
"verb patterns ve akademik",
"veya soyut yapılar öğrenmeye",
"değer kabul edilir.",

"Uzun cümlelerde amaç cümleyi",
"olabildiğince çok parçaya",
"bölmek değil, İngilizce öğrenen",
"kişinin tekrar edip hatırlayacağı",
"doğal anlam ve gramer",
"birimlerini ortaya çıkarmaktır.",

"Cümlede iki veya daha fazla",
"doğal ve öğrenmeye değer birim",
"varsa suitable true tercih et.",

"Bir chunk'ın mutlaka bağımsız",
"tam cümle olması gerekmez.",
"Doğal subordinate clause,",
"participial phrase, discourse",
"phrase, prepositional phrase",
"ve verb phrase de öğrenilebilir",
"bir chunk olabilir.",

"Uzun bir chunk içinde iki veya",
"daha fazla açık öğrenme birimi",
"bulunuyorsa bunları doğal anlam",
"sınırlarından ayırmayı tercih et.",

"Bağımsız clause'ları ve yeni",
"bir düşünce başlatan açık",
"subject-verb yapılarını ayrı",
"chunk yapmayı tercih et.",

'"and", "but", "so" gibi',
"bağlaçlardan sonra yeni bir",
"özne ve yüklemle yeni düşünce",
"başlıyorsa doğal bir chunk",
"sınırı olabilir.",

'"when", "while", "because", "if",',
'"although", "even though" ve',
"benzeri subordinate clause'lar",
"tek başına doğal bir öğrenme",
"birimi oluşturuyorsa ayrı",
"chunk yapmayı tercih et.",

"Tamamlanmış doğal bir ifadeden",
"sonra gelen zaman clause'unu,",
"özellikle ardından yeni bir",
"subject-verb yapısı başlıyorsa",
"önceki ifadeye gereksiz yere",
"birleştirme.",

"Bu durumda önceki doğal ifade,",
"zaman clause'u ve ardından",
"başlayan yeni clause ayrı",
"öğrenme birimleri olabilir.",

"Cümle başındaki doğal",
"participial veya yön-konum",
"ifadesi kendi başına anlamlı",
"bir öğrenme birimiyse ayrı",
"chunk olabilir.",

"Konuşma dilinde öznesi tekrar",
"edilmeden art arda söylenen",
"farklı eylem aşamalarını sırf",
"tam clause değiller diye reddetme.",

"Her biri doğal bir verb phrase",
"oluşturuyorsa bu ardışık",
"eylemleri ayrı chunk yapabilirsin.",

"Phrasal verb, collocation,",
"idiom, verb pattern ve birlikte",
"öğrenilmesi gereken sabit",
"ifadelerin ortasına chunk",
"sınırı koyma.",

'"coming and going", "have a hard',
'time with", "succumb to" gibi',
"birlikte anlam oluşturan",
"yapıları kendi içinde bölme.",

"Relative clause'u nitelediği",
"isimden kopararak anlamı",
"zayıflatacak şekilde bölme.",

"Bir isim ve onu tamamlayan",
"relative clause birlikte doğal",
"bir öğrenme birimi oluşturuyorsa",
"aynı chunk içinde tut.",

'"It is/was + adjective + that"',
"gibi gramer kalıplarında",
'"that" yapının doğal bir',
"parçasıysa önceki kalıpla",
"birlikte tut.",

"Cümle sonunda ana düşünceden",
"doğal olarak ayrılabilen",
"öğrenilebilir açıklama, yer,",
"yön veya işlev ifadelerini",
"ayrı chunk yapabilirsin.",

'"with + noun phrase" ve',
'"as + noun phrase" gibi',
"yapıları önceki ana yapı",
"tamamlanmışsa ve kendi başına",
"doğal bir öğrenme birimiyse",
"ayrı chunk yapmayı tercih et.",

"Tek kelimelik filler veya",
"basit tepki sözlerini tek",
"başına chunk yapma.",

"Ancak birden fazla discourse",
"marker birlikte doğal bir kısa",
"konuşma birimi oluşturuyorsa",
"bunu otomatik olarak reddetme.",

'"Um... yeah," gibi kısa bir',
"discourse grubu ardından ayrı",
"ve anlamlı bir yapı geliyorsa",
"ilk grup ayrı chunk olabilir.",

'"Um... yeah, I guess we should',
'head back." gibi bir girişte',
'"Um... yeah," ve',
'"I guess we should head back."',
"iki doğal chunk olabilir.",

'"you know" önceki düşüncenin',
"sonunda parenthetical discourse",
"marker olarak kullanılmışsa",
"önceki ifadeyle birlikte tut.",

'"you know" sonrasında yeni açık',
"bir subject-verb yapısı",
"başlıyorsa chunk sınırını",
'"you know" sonrasına koy.',

"Ancak yalnızca bir veya iki",
"basit kelimeden oluşan ve",
"öğrenme değeri olmayan",
"anlamsız micro chunk üretme.",

"Kaynak altyazı konuşma diline",
"özgü eksiltili veya düzensiz",
"olduğu için tek başına",
"suitable false döndürme.",

"Kelime eklemeden, silmeden,",
"düzeltmeden veya yeniden",
"sıralamadan doğal öğrenme",
"birimleri çıkarılabiliyorsa",
"suitable true kullan.",

"Yalnızca kaynak metin belirgin",
"biçimde bozuksa ve mevcut",
"kelimeleri aynen koruyarak",
"güvenilir en az iki doğal",
"chunk üretilemiyorsa",
"suitable false döndür.",
"Tek bir basit A1-A2 cümlesini",
"sırf kısa olduğu için bölme.",

"Ancak giriş iki veya daha",
"fazla tam ve bağımsız",
"cümleden oluşuyorsa ve her",
"cümle tek başına anlamlıysa",
"suitable true döndür.",

"Bu durumda her tam cümleyi",
"ayrı bir doğal chunk yap.",

"Bu kural, ayrı cümleler",
"A1-A2 düzeyinde olsa bile",
"geçerlidir.",

"Nokta, soru işareti veya",
"ünlemle ayrılmış anlamlı tam",
"cümleleri tek chunk içinde",
"birleştirme.",

        "Sahne açıklamalarını tek",
        "başına bir chunk yapma; doğal",
        "olarak komşu konuşmayla",
        "birlikte tut.",

        "Uygunsa suitable true ve",
        "2 ile 8 arasında part döndür.",

        "Uygun değilse suitable false",
        "ve İngilizce cümlenin tamamını",
        "tek part olarak döndür.",

      "Fiil ile nesnesini bölme.",
"Phrasal verb bölme.",
"Deyim bölme.",
"Collocation bölme.",
"Verb pattern bölme.",

"Edatlı yapıları anlamı",
"bozacak şekilde ayırma.",

"Cümle sonunda ana yapıdan",
"doğal olarak ayrılabilen ve",
"tek başına öğrenilebilir bir",
"açıklama veya işlev bildiren",
'"as + noun phrase" yapıları',
"ayrı bir chunk olabilir.",

'"succumb to" gibi fiille',
"birlikte anlam oluşturan",
"edatlı yapıları ise bölme.",

'Örneğin "all four had succumbed',
'to stab wounds as a likely',
'cause of death." ifadesini',
'"all four had succumbed to stab wounds"',
've "as a likely cause of death."',
"olarak ayır.",

        "Zamir ile yüklemi doğal",
        "olmayan şekilde ayırma.",

        "Hiçbir kelimeyi veya",
        "noktalama işaretini silme,",
        "ekleme, düzeltme ya da",
        "yeniden sıralama.",

        "Partların english alanları",
        "boşlukla yeniden",
        "birleştirildiğinde orijinal",
        "cümle aynen oluşmalıdır.",

        "Her part için english alanında",
        "orijinal İngilizce parçayı ve",
        "turkish alanında yalnız o parçanın",
        "cümle bağlamındaki doğal Türkçe",
        "karşılığını ver.",

        improvesTranslationsOnly
          ? "Önceki parçaları birebir koru. suitable değeri önceki parça sayısı birden fazlaysa true, tek parçaysa false olmalıdır."
          : "",

        "Türkçe çeviriler doğal, akıcı ve",
        "film altyazısına uygun olsun.",

        "Deyimleri, argoyu, esprileri ve",
        "kalıpları bağlama göre çevir.",

        "Türkçe alana açıklama, başlık,",
        "tırnak veya alternatif ekleme.",

    "Yalnızca geçerli bir JSON",
    "nesnesi döndür.",

    "Açıklama, analiz, başlık,",
    "Markdown veya kod bloğu",
    "ekleme."
  ].join(" "),

  input: [
    `Cümle: ${sentence}`,

    ...(improve
      ? [
          improvesTranslationsOnly
            ? "İyileştirme türü: yalnızca Türkçe çeviriler"
            : "İyileştirme türü: parça sınırları ve bunlara bağlı çeviriler"
        ]
      : []),

    ...(previousParts.length > 0
      ? [
          `Önceki parçalar: ${JSON.stringify(
            previousParts
          )}`
        ]
      : []),

    ...(correctionNotes.length > 0
      ? [
          `Düzeltilecek ihlaller: ${correctionNotes.join(
            "; "
          )}`
        ]
      : []),

    "Yalnızca şu iki biçimden",
    "birini döndür:",

    '{"suitable":true,"parts":[{"english":"birinci parça","turkish":"birinci çeviri"},{"english":"ikinci parça","turkish":"ikinci çeviri"}]}',

    '{"suitable":false,"parts":[{"english":"cümlenin tamamı","turkish":"doğal Türkçe çeviri"}]}'
  ].join("\n"),

  text: {
    format: {
      type: "json_schema",
      name: "chunk_decision",
      strict: true,
      schema: {
        type: "object",
        properties: {
          suitable: {
            type: "boolean"
          },
          parts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                english: {
                  type: "string"
                },
                turkish: {
                  type: "string"
                }
              },
              required: [
                "english",
                "turkish"
              ],
              additionalProperties: false
            }
          }
        },
        required: [
          "suitable",
          "parts"
        ],
        additionalProperties: false
      }
    }
  },

  max_output_tokens: 1200
});

const parsed = parseOpenAIResponse(
  openAIResponse,
  parseChunkDecision
);

return {
  decision: parsed.value,
  usage: parsed.usage
};
}
async function generateStudyMeaning(
  openAI,
  selectedText,
  sentence,
  segmentType,
  analysisMode
) {
  const isContextExpressionMode =
  analysisMode ===
  "context-expression-v1";
  const openAIResponse =
    await openAI.responses.create({
      model: isContextExpressionMode
        ? openAITerraModel
        : openAIModel,

      reasoning: {
        effort: "none"
      },

      instructions: [
        "Sen İngilizce öğrenen Türk",
        "kullanıcılar için bağlama",
        "uygun kelime ve ifade",
        "anlamları hazırlayan bir",
        "uzmansın.",

        "Sana seçilen İngilizce metin,",
        "bu metnin geçtiği tam cümle",
        "ve segment türü verilecek.",

        "Öncelikle seçilen metnin bu",
        "cümledeki gerçek Türkçe",
        "anlamını belirle.",

        "meanings dizisinin ilk öğesi",
        "mutlaka bu cümlede kullanılan",
        "en doğal Türkçe karşılık",
        "olmalıdır.",

        "Gerekliyse en fazla dört kısa",
        "ve yaygın Türkçe anlam ver.",

        "Bağlamla ilgisiz, nadir veya",
        "sözlükte bulunan bütün",
        "anlamları sıralama.",

        "Phrasal verb, deyim, kalıp,",
        "collocation veya doğal ifade",
        "ise bütün yapının anlamını ver;",

        "kelimeleri ayrı ayrı çevirme.",

        "Contraction ise expansion",
        "alanında İngilizce açılımını",
        "yaz.",

        "Örneğin I've için expansion",
        "I have veya bağlama göre",
        "I am olabilir.",

      "meanings dizisinde aynı veya",
"birbirine çok yakın Türkçe",
"karşılıkları tekrarlama.",

"Yalnızca seçilen metnin",
"anlamlarını ver; tam cümlenin",
"Türkçe çevirisini meanings veya",
"note alanına yazma.",

"Ek açıklama gerçekten",
"öğreticiyse note alanında kısa",
"bir dilbilgisi veya kullanım",
"notu ver.",

"Note alanında tam cümleyi",
"çevirme ve yeni bağlam",
"uydurma.",

"Gerekli bir öğretici not yoksa",
"note alanını boş bırak.",

        "Gereksiz açıklama yapma.",

        "pronunciation alanında seçilen",
        "İngilizce kelime veya ifadenin",
        "Türkçe harflerle yaklaşık",
        "okunuşunu yaz.",

        "IPA veya fonetik sembol kullanma.",

        "Okunuş başlangıç seviyesindeki",
        "Türk kullanıcı için kolay",
        "anlaşılır olmalıdır.",

        "pronunciation alanına anlam,",
        "çeviri veya açıklama yazma.",

 ...(isContextExpressionMode
  ? [
      "text alanında yalnızca seçilen",
      "kelimeyi vermek zorunda değilsin.",

   "Seçilen kelime cümlede bir deyim,",
"phrasal verb, kalıplaşmış ifade,",
"verb pattern, collocation, edatlı",
"yapı veya doğal konuşma kalıbının",
"parçasıysa text alanında cümlede",
"geçen bütün ifadeyi göster.",

"Böyle bir bütün ifade tespit",
"edilmişse text alanında yalnızca",
"seçilen tek kelimeyi döndürme.",

"Daha geniş doğal ifadeyi yalnızca",
"note alanında açıklayıp text",
"alanını tek kelime bırakma.",

"Note alanında daha geniş bir",
"kalıptan söz ediyorsan text alanı",
"da o kalıbın cümlede geçen gerçek",
"biçimi olmalıdır.",

"Kullanıcı kalıbın hangi kelimesini",
"seçmiş olursa olsun aynı bütün",
"ifadeyi belirle.",

'Örneğin "She probably didn\'t make',
'a peep." cümlesinde peep seçilirse',
'text alanı "make a peep" olmalıdır.',

"Örneğin cut veya off seçilmişse",
"ve cümlede cut me off geçiyorsa",
"text alanı cut me off olmalıdır.",

"Give, up veya on seçilmişse ve",
"cümlede give up on yourself",
"geçiyorsa bütün yapıyı göster.",

"Look, forward veya to seçilmişse",
"look forward to yapısını bölme.",

      "Seçim önceliği sırasıyla deyim,",
      "phrasal verb, kalıplaşmış ifade,",
      "verb pattern, collocation, anlamlı",
      "clause grubu ve tek kelimedir.",

      "En uzun ifadeyi otomatik seçme.",
      "Cümlede özel ve bütüncül anlam",
      "taşıyan en doğru ifadeyi seç.",

      "Cümlede bulunmayan kelime veya",
      "kalıp ekleme. text alanındaki ifade",
      "tam cümlede gerçekten bulunmalıdır."
    ]
  : [
      "text alanında seçilen İngilizce",
      "metni değiştirmeden koru."
    ]),

        "Yalnızca geçerli bir JSON",
        "nesnesi döndür.",

        "Markdown, kod bloğu, başlık",
        "veya JSON dışında metin ekleme."
      ].join(" "),

      input: [
        `Tam cümle: ${sentence}`,

        `Seçilen metin: ${selectedText}`,

        `Segment türü: ${segmentType}`,

        "Şu biçimde yanıt ver:",

      '{"text":"find out","meanings":["öğrenmek","ortaya çıkarmak"],"pronunciation":"faynd aut","expansion":"","note":"Phrasal verb."}'
      ].join("\n"),

      max_output_tokens: 300
    });

  const parsed = parseOpenAIResponse(
    openAIResponse,
    parseStudyMeaning
  );

  return {
    meaning: parsed.value,
    usage: parsed.usage
  };
}
async function generateStudySegments(
  openAI,
  sentence,
  analysisMode
) {
const isContextExpressionMode =
  analysisMode ===
  "context-expression-v1";

const openAIResponse =
  await openAI.responses.create({
    model: isContextExpressionMode
      ? openAITerraModel
      : openAIModel,

    reasoning: {
      effort: "none"
    },

      instructions: [
        "Sen İngilizce öğrenenler için",
        "bir cümledeki tıklanabilir",
        "kelime ve doğal ifadeleri",
        "belirleyen bir uzmansın.",

        "Cümleyi soldan sağa, bütün",
        "metni eksiksiz koruyan",
        "segmentlere ayır.",

        "Normal tek kelimeleri word",
        "olarak işaretle.",

        "Ancak aşağıdaki yapıları",
        "kesinlikle bölme:",

        "contractions, phrasal verbs,",
        "idioms, doğal konuşma",
        "kalıpları, fixed expressions,",
        "collocations, verb patterns,",
        "grammar patterns, compound",
        "nouns, proper names, çok",
        "kelimeli edatlar, bağlaç",
        "kalıpları ve sayı ifadeleri.",

        "Örneğin find out, give up,",
        "turn it off, hose myself off,",
        "by the way, have to, used to,",
        "credit card ve New York tek",
        "segment olmalıdır.",

        "Contractionları bölme.",
        "I've, don't ve we're gibi",
        "yapılar tek segment olmalıdır.",

        "En uzun doğal ve anlamlı",
        "ifadeyi tercih et fakat tüm",
        "cümleyi gereksiz yere tek",
        "segment yapma.",
        ...(isContextExpressionMode
  ? [
      "Personal modunda kullanıcı",
      "ifadenin hangi kelimesine",
      "tıklarsa tıklasın aynı bütün",
      "segment belirlenebilmelidir.",

      "Bir kelime birden fazla yapının",
      "parçası olabiliyorsa seçim",
      "önceliği sırasıyla idiom,",
      "phrasal-verb, fixed-expression,",
      "verb-pattern, collocation,",
      "natural-expression ve word",
      "olmalıdır.",

      "En uzun segmenti otomatik",
      "olarak seçme. Bağlamda özel",
      "ve bütüncül anlam taşıyan en",
      "doğru yapıyı seç.",

      "Ayrılabilen phrasal verblerde",
      "arada nesne veya zamir varsa",
      "onu yapının içinde tut.",

      "Örneğin cut me off tek segment,",
      "give up on yourself tek segment",
      "ve look forward to tek segment",
      "olmalıdır.",

      "İfadenin parçası olmayan özne,",
      "zarf veya komşu kelimeleri",
      "gereksiz yere segmente katma."
    ]
  : []),
"Zorunlu tamamlayıcısı olan",
"konuşma kalıplarını eksik",
"bırakma.",

`"I've gotta go" ifadesini`,
"tek natural-expression yap.",

`"I've gotta" ve "go find"`,
"şeklinde yapay bir ayrım",
"oluşturma.",

"Bir fiili önceki kalıptan",
"koparıp sonraki fiille",
"gereksiz yere birleştirme.",

`"I've gotta go find somewhere`,
`to hose myself off." cümlesi`,
"için tercih edilen segmentler:",
`"I've gotta go", "find",`,
`"somewhere",`,
`"to hose myself off", "."`,
        "Her segment özgün cümledeki",
        "metni ve noktalamasını",
        "korumalıdır.",
...(isContextExpressionMode
  ? [
      "Personal modunda punctuation",
      "dışındaki her segment için",
      "meanings, pronunciation,",
      "expansion ve note alanlarını",
      "da doldur.",

      "meanings dizisinin ilk öğesi",
      "segmentin bu cümledeki en doğal",
      "Türkçe karşılığı olmalıdır.",

      "Bağlamla ilgisiz anlamları",
      "sıralama ve en fazla beş kısa",
      "Türkçe anlam ver.",

      "Phrasal verb, deyim, collocation,",
      "verb pattern veya sabit ifade",
      "ise kelimeleri ayrı ayrı değil,",
      "bütün ifadenin anlamını ver.",

      "pronunciation alanında İngilizce",
      "kelime veya ifadenin Türkçe",
      "harflerle yaklaşık okunuşunu ver.",

      "Contraction değilse expansion",
      "alanını boş bırak.",

      "note alanında yalnızca kısa ve",
      "öğretici bir bağlam veya kullanım",
      "açıklaması ver. Gerekli değilse",
      "boş bırak.",

      "Punctuation segmentlerinde",
      "meanings boş dizi; pronunciation,",
      "expansion ve note boş metin olsun."
    ]
  : []),
        "Hiçbir kelimeyi veya",
        "noktalama işaretini silme,",
        "ekleme, düzeltme ya da",
        "yeniden sıralama.",

        "Segmentler boşlukla yeniden",
        "birleştirildiğinde özgün cümle",
        "aynen oluşmalıdır.",

        "Yalnızca geçerli JSON nesnesi",
        "döndür.",

        "Açıklama, çeviri, anlam,",
        "Markdown veya kod bloğu",
        "ekleme."
      ].join(" "),

      input: [
        `Cümle: ${sentence}`,

        "Şu biçimde yanıt ver:",

        ...(isContextExpressionMode
  ? [
      '{"segments":[{"text":"I","type":"word","meanings":["ben"],"pronunciation":"ay","expansion":"","note":""},{"text":"need to","type":"verb-pattern","meanings":["-mek zorunda olmak"],"pronunciation":"niid tu","expansion":"","note":"Gereklilik bildirir."},{"text":"find out","type":"phrasal-verb","meanings":["öğrenmek"],"pronunciation":"faynd aut","expansion":"","note":"Bütün yapı birlikte anlam taşır."}]}'
    ]
  : [
      '{"segments":[{"text":"I","type":"word"},{"text":"need to","type":"verb-pattern"},{"text":"find out","type":"phrasal-verb"}]}'
    ]),
      ].join("\n"),

     max_output_tokens:
  isContextExpressionMode
    ? 2200
    : 700
    });

const parsed = parseOpenAIResponse(
  openAIResponse,
  (outputText) =>
    parseStudySegments(
      outputText,
      analysisMode
    )
);

return {
  segments: parsed.value.segments,
  usage: parsed.usage
};
}

function getChunkWordTokens(text) {
  return String(text || "")
    .replace(/[’‘`]/g, "'")
    .match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)*/g) || [];
}

function getChunkBoundaryWord(
  text,
  fromEnd = false
) {
  const words = getChunkWordTokens(text)
    .map((word) => word.toLowerCase());

  return fromEnd
    ? words[words.length - 1] || ""
    : words[0] || "";
}

function isNaturalSingleWordChunk(text) {
  const cleanedText = cleanText(text);
  const words = getChunkWordTokens(
    cleanedText
  );

  if (words.length !== 1) {
    return false;
  }

  if (/[?!…]["'’”\)\]]*$/.test(cleanedText)) {
    return true;
  }

  const discourseWords = new Set([
    "actually",
    "anyway",
    "however",
    "instead",
    "meanwhile",
    "no",
    "okay",
    "otherwise",
    "please",
    "sorry",
    "therefore",
    "well",
    "yes"
  ]);
  const normalizedWord =
    words[0].toLowerCase();

  return (
    discourseWords.has(normalizedWord) &&
    /[,;:]["'’”\)\]]*$/.test(cleanedText)
  );
}

function getChunkDecisionValidationErrors(
  originalSentence,
  decision
) {
  const errors = [];

  if (
    !decision ||
    typeof decision.suitable !==
      "boolean" ||
    !Array.isArray(decision.parts) ||
    decision.parts.length < 1 ||
    decision.parts.length > 8 ||
    decision.parts.some(
      (part) =>
        !part ||
        typeof part.english !== "string" ||
        typeof part.turkish !== "string" ||
        !cleanText(part.english) ||
        !cleanText(part.turkish)
    )
  ) {
    return [
      "parts 1-8 öğe içermeli ve her english/turkish alanı dolu olmalı"
    ];
  }

  if (
    decision.suitable &&
    decision.parts.length < 2
  ) {
    errors.push(
      "suitable true için en az iki parça gerekli"
    );
  }

  if (
    !decision.suitable &&
    decision.parts.length !== 1
  ) {
    errors.push(
      "suitable false için özgün cümle tek parça olmalı"
    );
  }

  const expected =
    normalizeForChunkValidation(
      originalSentence
    );
  const recombined =
    normalizeForChunkValidation(
      decision.parts
        .map((part) => part.english)
        .join(" ")
    );

  if (
    expected === "" ||
    expected !== recombined
  ) {
    errors.push(
      "İngilizce parçalar özgün cümleyi eksiksiz ve doğru sırada oluşturmuyor"
    );
  }

  if (decision.suitable) {
    const unnecessarySingleWord =
      decision.parts.find(
        (part) =>
          getChunkWordTokens(
            part.english
          ).length === 1 &&
          !isNaturalSingleWordChunk(
            part.english
          )
      );

    if (unnecessarySingleWord) {
      errors.push(
        `gereksiz tek kelimelik parça: ${cleanText(
          unnecessarySingleWord.english
        )}`
      );
    }

    const protectedBeforeTo = new Set([
      "able", "about", "begin", "continue",
      "decide", "expect", "going", "got",
      "have", "hope", "like", "love",
      "need", "plan", "prefer", "start",
      "supposed", "try", "used", "want"
    ]);
    const protectedPairs = new Set([
      "because of", "break down", "break up",
      "bring up", "carry on", "come back",
      "come on", "end up", "figure out",
      "find out", "get away", "get back",
      "get over", "get up", "give in",
      "give up", "go back", "go on",
      "go out", "hold on", "in order",
      "keep on", "kind of", "look after",
      "look at", "look for", "make up",
      "out of", "pick out", "pick up",
      "put off", "put on", "put up",
      "run away", "run out", "set up",
      "show up", "sort of", "take care",
      "take off", "take over", "turn down",
      "turn off", "turn on", "turn up",
      "work out"
    ]);

    for (
      let index = 0;
      index < decision.parts.length - 1;
      index += 1
    ) {
      const previousWord =
        getChunkBoundaryWord(
          decision.parts[index].english,
          true
        );
      const nextWord =
        getChunkBoundaryWord(
          decision.parts[index + 1].english
        );
      const boundaryPair =
        `${previousWord} ${nextWord}`;
      const previousChunkEndsThought =
        /[.!?…]["'’”\)\]]*$/.test(
          cleanText(
            decision.parts[index].english
          )
        );
      const splitsNegation =
        previousWord === "not" ||
        (
          nextWord === "not" &&
          !previousChunkEndsThought
        );
      const splitsProtectedTo =
        nextWord === "to" &&
        protectedBeforeTo.has(previousWord);

      if (
        splitsNegation ||
        splitsProtectedTo ||
        protectedPairs.has(boundaryPair)
      ) {
        errors.push(
          `korunması gereken ifade bölündü: ${boundaryPair}`
        );
      }
    }
  }

  return errors;
}

function validateChunkDecision(
  originalSentence,
  decision
) {
  return getChunkDecisionValidationErrors(
    originalSentence,
    decision
  ).length === 0;
}

function getChunkTranslationValidationErrors(
  originalSentence,
  decision,
  expectedEnglishParts
) {
  if (
    !decision ||
    typeof decision.suitable !==
      "boolean" ||
    !Array.isArray(decision.parts) ||
    decision.parts.length !==
      expectedEnglishParts.length ||
    decision.parts.some(
      (part) =>
        !part ||
        typeof part.english !== "string" ||
        typeof part.turkish !== "string" ||
        !cleanText(part.english) ||
        !cleanText(part.turkish)
    )
  ) {
    return [
      "çeviri iyileştirmesi bütün mevcut parçaları ve dolu çevirileri içermeli"
    ];
  }

  const errors = [];
  const expectedSuitable =
    expectedEnglishParts.length > 1;

  if (
    decision.suitable !==
    expectedSuitable
  ) {
    errors.push(
      "suitable değeri mevcut parça sayısıyla uyumlu değil"
    );
  }

  if (
    !validateChunks(
      originalSentence,
      decision.parts.map(
        (part) => part.english
      )
    )
  ) {
    errors.push(
      "İngilizce parçalar özgün cümleyi oluşturmuyor"
    );
  }

  const preservesEnglishParts =
    expectedEnglishParts.every(
      (part, index) =>
        cleanText(part) ===
        cleanText(
          decision.parts[index].english
        )
    );

  if (!preservesEnglishParts) {
    errors.push(
      "yalnızca çeviri iyileştirmesinde İngilizce parça sınırları değiştirilemez"
    );
  }

  return errors;
}

async function generateValidatedChunkDecision(
  openAI,
  sentence,
  {
    model = openAIModel,
    improve = false,
    improvementType = "segmentation",
    previousParts = []
  } = {}
) {
  const maximumAttempts = improve
    ? 1
    : 2;
  let decision = null;
  let validationErrors = [];
  let correctionParts =
    previousParts;
  let usage = emptyOpenAIUsage();

  for (
    let attempt = 1;
    attempt <= maximumAttempts;
    attempt += 1
  ) {
    try {
      const generated =
        await generateSmartChunkDecision(
          openAI,
          sentence,
          {
            model,
            improve,
            improvementType,
            correctionNotes:
              validationErrors,
            previousParts:
              correctionParts
          }
        );

      usage = mergeOpenAIUsage(
        usage,
        generated.usage
      );
      validationErrors =
        improve &&
        improvementType === "translation"
          ? getChunkTranslationValidationErrors(
              sentence,
              generated.decision,
              previousParts.map(
                (part) => part.english
              )
            )
          : getChunkDecisionValidationErrors(
              sentence,
              generated.decision
            );

      if (validationErrors.length === 0) {
        decision = generated.decision;
        break;
      }

      correctionParts =
        generated.decision.parts;

      console.warn(
        `PauseSpeak chunk kararı ${attempt}. denemede doğrulanamadı.`,
        {
          validationErrors
        }
      );
    } catch (error) {
      usage = mergeOpenAIUsage(
        usage,
        error?.openAIUsage
      );

      if (error?.status) {
        error.openAIUsage = usage;
        throw error;
      }

      validationErrors = [
        "cevap geçerli yapılandırılmış JSON değil"
      ];
      correctionParts = [];

      console.warn(
        `PauseSpeak chunk kararı ${attempt}. denemede ayrıştırılamadı.`,
        {
          validationErrors
        }
      );
    }
  }

  return {
    decision,
    validationErrors,
    usage: finalizeOpenAIUsage(
      usage,
      {
        errorCount: decision ? 0 : 1
      }
    )
  };
}
app.get(
  "/health",
  (request, response) => {
    response.json({
      success: true,

      message:
        "PauseSpeak sunucusu çalışıyor.",

      model: openAIModel,

      apiKeyConfigured: Boolean(
        process.env.OPENAI_API_KEY
      ),

      usageDatabaseConfigured:
        usageStore.isConfigured()
    });
  }
);

app.get(
  "/usage/summary",
  async (request, response) => {
    const accountHash =
      requireUsageAccount(
        request,
        response
      );

    if (!accountHash) {
      return;
    }

    const today = normalizeDate(
      request.query?.today
    );

    if (!today) {
      return response.status(400).json({
        success: false,
        error:
          "Geçerli bir yerel tarih gönderilmedi."
      });
    }

    try {
      const store =
        await usageStore.getSummary(
          accountHash,
          today
        );

      return response.json({
        success: true,
        store
      });
    } catch (error) {
      console.error(
        "PauseSpeak ortak sayaç okuma hatası:",
        error?.message
      );

      return response.status(503).json({
        success: false,
        error:
          "Ortak sayaç şu anda okunamadı."
      });
    }
  }
);

app.post(
  "/usage/import",
  async (request, response) => {
    const accountHash =
      requireUsageAccount(
        request,
        response
      );

    if (!accountHash) {
      return;
    }

    try {
      const imported =
        await usageStore.importLegacy(
          accountHash,
          request.body?.deviceId,
          request.body?.days
        );

      return response.json({
        success: true,
        imported
      });
    } catch (error) {
      console.error(
        "PauseSpeak geçmiş kullanım aktarım hatası:",
        error?.message
      );

      return response.status(400).json({
        success: false,
        error:
          "Geçmiş kullanım sunucuya aktarılamadı."
      });
    }
  }
);

app.post(
  "/usage/counter/start",
  async (request, response) => {
    const accountHash =
      requireUsageAccount(
        request,
        response
      );

    if (!accountHash) {
      return;
    }

    try {
      const startedAt =
        await usageStore.startCounter(
          accountHash
        );

      return response.json({
        success: true,
        startedAt
      });
    } catch (error) {
      console.error(
        "PauseSpeak ortak sayaç başlatma hatası:",
        error?.message
      );

      return response.status(503).json({
        success: false,
        error:
          "Ortak sayaç şu anda başlatılamadı."
      });
    }
  }
);

app.post(
  "/usage/tts-duration",
  async (request, response) => {
    const accountHash =
      requireUsageAccount(
        request,
        response
      );

    if (!accountHash) {
      return;
    }

    try {
      const updated =
        await usageStore.updateTtsDuration(
          accountHash,
          request.body?.eventId,
          request.body?.seconds
        );

      if (!updated) {
        return response.status(404).json({
          success: false,
          error:
            "Ses kullanım kaydı bulunamadı."
        });
      }

      return response.json({
        success: true
      });
    } catch (error) {
      console.error(
        "PauseSpeak ses süresi sayaç hatası:",
        error?.message
      );

      return response.status(503).json({
        success: false,
        error:
          "Ses süresi ortak sayaca eklenemedi."
      });
    }
  }
);

app.post(
  "/translate",
  async (request, response) => {
    const text =
      request.body?.text;

    const previousText =
      request.body?.previousText;

    const fullText =
      request.body?.fullText;

    const translationMode =
      request.body?.translationMode;

    const isChunkTranslation =
      translationMode === "chunk";

    const improve =
      request.body?.improve === true;

    const selectedModel =
      improve
        ? openAITerraModel
        : openAIModel;

    if (
      typeof text !== "string" ||
      text.trim() === ""
    ) {
      return response
        .status(400)
        .json({
          success: false,

          error:
            "Çevrilecek İngilizce " +
            "cümle gönderilmedi."
        });
    }

    const cleanedText =
      text.trim();

    const cleanedPreviousText =
      typeof previousText === "string"
        ? previousText.trim()
        : "";

    const cleanedFullText =
      isChunkTranslation &&
      typeof fullText === "string" &&
      fullText.trim() !== ""
        ? fullText.trim()
        : cleanedText;

    const contextText =
      cleanedPreviousText ||
      (
        isChunkTranslation
          ? "Önceki parça yok."
          : "Önceki altyazı yok."
      );

    try {
      const openAI =
        await getOpenAIClient();

      const openAIResponse =
        await openAI.responses.create({
           model: selectedModel,

          reasoning: {
            effort: "none"
          },

          instructions: [
            "Sen profesyonel bir",
            "İngilizce-Türkçe dizi ve",
            "film altyazı çevirmenisin.",

            isChunkTranslation
              ? "Yalnızca hedef İngilizce"
              : "Yalnızca mevcut İngilizce",

            isChunkTranslation
              ? "parçayı Türkçeye çevir."
              : "cümleyi Türkçeye çevir.",

            isChunkTranslation
              ? "Hedef parça tam bir cümle"
              : "",

            isChunkTranslation
              ? "olmayabilir. Cümlenin tamamını"
              : "",

            isChunkTranslation
              ? "anlam ve ton bağlamı olarak kullan;"
              : "",

            isChunkTranslation
              ? "tam cümleyi yeniden çevirme."
              : "",

            "Çeviri doğal, akıcı,",
            "güncel ve konuşma diline",
            "uygun olsun.",

            "İngilizce söz dizimini",
            "birebir Türkçeye taşıma;",

            "bir Türk izleyicinin",
            "sahnede doğal bulacağı",
            "karşılığı seç.",

            "Deyimleri, argoyu,",
            "esprileri, kelime",
            "oyunlarını ve hitapları",
            "bağlama uygun biçimde",
            "aktar.",

            "Anlam ekleme, anlam",
            "çıkarma veya açıklama",
            "yapma.",

            isChunkTranslation
              ? "Önceki parçayı yalnızca"
              : "Önceki altyazıyı yalnızca",

            isChunkTranslation
              ? "çeviri akışı için kullan;"
              : "bağlam olarak kullan;",

            "onu yeniden çevirme.",

            "Cevapta yalnızca Türkçe",
            "çeviriyi ver.",

            "Başlık, tırnak, seçenek,",
            "not veya ek bilgi ekleme.",

            improve
              ? "Çeviriyi özellikle doğallık,"
              : "",

            improve
              ? "anlam doğruluğu ve bağlama"
              : "",

            improve
              ? "uygunluk açısından yeniden değerlendir."
              : ""
          ].filter(Boolean).join(" "),

          input: [
            isChunkTranslation
              ? `Önceki parça: ${contextText}`
              : `Önceki altyazı: ${contextText}`,

            isChunkTranslation
              ? `Cümlenin tamamı: ${cleanedFullText}`
              : "",

            isChunkTranslation
              ? `Çevrilecek parça: ${cleanedText}`
              : `Mevcut cümle: ${cleanedText}`
          ].filter(Boolean).join("\n"),

          max_output_tokens: 150
        });

      const translation =
        openAIResponse
          .output_text
          ?.trim();

      if (!translation) {
        throw new Error(
          "OpenAI boş çeviri döndürdü."
        );
      }

      const usage = normalizeOpenAIUsage(
        openAIResponse.usage
      );

      await recordSynchronizedUsage(
        request,
        {
          operation:
            getTranslationUsageOperation(
              translationMode,
              improve
            ),
          model: selectedModel,
          usage
        }
      );

return response.json({
  success: true,

  translation,

  provider: "openai",

  model: selectedModel,

  cached: false,

  usage
});
    } catch (error) {
      await recordSynchronizedUsage(
        request,
        {
          operation:
            getTranslationUsageOperation(
              translationMode,
              improve
            ),
          model: selectedModel,
          usage: finalizeOpenAIUsage(
            error?.openAIUsage ||
              emptyOpenAIUsage(),
            { errorCount: 1 }
          )
        }
      );

      console.error(
        "PauseSpeak çeviri hatası:",
        {
          message: error?.message,
          status: error?.status,
          code: error?.code
        }
      );

      return response
        .status(
          getStatusCode(error)
        )
        .json({
          success: false,

          error:
            getOpenAIErrorMessage(
              error,
              "Çeviri"
            )
        });
    }
  }
);
app.post(
  "/study-meaning",
  async (request, response) => {
    const selectedText =
      request.body?.selectedText;

    const sentence =
      request.body?.sentence;

    const segmentType =
      request.body?.segmentType;
const analysisMode =
  request.body?.analysisMode;
    if (
      typeof selectedText !==
        "string" ||
      selectedText.trim() === "" ||
      typeof sentence !==
        "string" ||
      sentence.trim() === "" ||
      typeof segmentType !==
        "string" ||
      segmentType.trim() === ""
    ) {
      return response
        .status(400)
        .json({
          success: false,

          error:
            "Kelime anlamı için gerekli " +
            "bilgiler gönderilmedi."
        });
    }

    const cleanedSelectedText =
      cleanText(selectedText);

    const cleanedSentence =
      cleanText(sentence);

    const cleanedSegmentType =
      cleanText(segmentType);
const usesContextExpressionMode =
  analysisMode ===
  "context-expression-v1";
    const usageModel =
      usesContextExpressionMode
        ? openAITerraModel
        : openAIModel;
    if (
      cleanedSelectedText.length >
        200 ||
      cleanedSentence.length >
        1000 ||
      cleanedSegmentType.length >
        50
    ) {
      return response
        .status(400)
        .json({
          success: false,

          error:
            "Kelime anlamı isteği " +
            "izin verilen uzunluğu aşıyor."
        });
    }

    try {
      const openAI =
        await getOpenAIClient();

      let meaning = null;
      let usage =
        emptyOpenAIUsage();

      for (
        let attempt = 1;
        attempt <= 2;
        attempt += 1
      ) {
        try {
          const generated =
      await generateStudyMeaning(
  openAI,
  cleanedSelectedText,
  cleanedSentence,
  cleanedSegmentType,
  analysisMode
);
usage = mergeOpenAIUsage(
  usage,
  generated.usage
);
const candidate =
  generated.meaning;
if (
  cleanedSegmentType ===
  "contraction"
) {
  candidate.note = "";
}
const normalizeMeaningText = (
  value
) =>
  cleanText(value)
    .replace(
      /^[\s"'“”‘’.,!?;:—–-]+|[\s"'“”‘’.,!?;:—–-]+$/g,
      ""
    )
    .replace(/[’‘`]/g, "'")
    .replace(
      /[“”.,!?;:—–()[\]{}]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizedCandidateText =
  normalizeMeaningText(
    candidate.text
  );

const normalizedSelectedText =
  normalizeMeaningText(
    cleanedSelectedText
  );

const normalizedSentence =
  normalizeMeaningText(
    cleanedSentence
  );

const candidateExistsInSentence =
  ` ${normalizedSentence} `.includes(
    ` ${normalizedCandidateText} `
  );

const candidateContainsSelected =
  ` ${normalizedCandidateText} `.includes(
    ` ${normalizedSelectedText} `
  );

const candidateIsValid =
  usesContextExpressionMode
    ? (
        candidateExistsInSentence &&
        candidateContainsSelected
      )
    : (
        normalizedCandidateText ===
        normalizedSelectedText
      );

if (
  normalizedCandidateText &&
  candidateIsValid &&
  candidate.meanings.length > 0
) {
  candidate.text =
    usesContextExpressionMode
      ? cleanText(candidate.text)
      : cleanedSelectedText;

  meaning = candidate;

  break;
}

          console.warn(
            `PauseSpeak kelime anlamı ` +
              `${attempt}. denemede ` +
              "doğrulanamadı.",

            candidate
          );
        } catch (error) {
          usage = mergeOpenAIUsage(
            usage,
            error?.openAIUsage
          );

          if (error?.status) {
            throw error;
          }

          console.warn(
            `PauseSpeak kelime anlamı ` +
              `${attempt}. denemede ` +
              "geçersiz cevap verdi.",

            error?.message
          );
        }
      }

      usage = finalizeOpenAIUsage(
        usage,
        {
          errorCount: meaning ? 0 : 1
        }
      );

      if (!meaning) {
        await recordSynchronizedUsage(
          request,
          {
            operation: "study_meaning",
            model: usageModel,
            usage
          }
        );

        return response
          .status(422)
          .json({
            success: false,

            error:
              "Seçilen ifade için güvenli " +
              "bir anlam alınamadı."
          });
      }

  await recordSynchronizedUsage(
    request,
    {
      operation: "study_meaning",
      model: usageModel,
      usage
    }
  );

  return response.json({
  success: true,

  text: meaning.text,

  meanings:
    meaning.meanings,

  pronunciation:
    meaning.pronunciation,

  expansion:
    meaning.expansion,

  note:
    meaning.note,

  provider: "openai",

  model: usageModel,

  usage
});
    } catch (error) {
      console.error(
        "PauseSpeak kelime anlamı hatası:",
        {
          message: error?.message,
          status: error?.status,
          code: error?.code
        }
      );

      return response
        .status(
          getStatusCode(error)
        )
        .json({
          success: false,

          error:
            getOpenAIErrorMessage(
              error,
              "Kelime anlamı"
            )
        });
    }
  }
);
app.post(
  "/speak-translation",
  async (request, response) => {
    const text =
      request.body?.text;
      const language =
  request.body?.language === "en"
    ? "en"
    : "tr";

    if (
      typeof text !== "string" ||
      text.trim() === ""
    ) {
      return response
        .status(400)
        .json({
          success: false,

          error:
            "Seslendirilecek Türkçe " +
            "çeviri gönderilmedi."
        });
    }

    const cleanedText =
      text.trim();

    if (cleanedText.length > 1000) {
      return response
        .status(400)
        .json({
          success: false,

          error:
            "Seslendirilecek metin çok uzun."
        });
    }

    try {
      const openAI =
        await getOpenAIClient();

      const speech =
        await openAI.audio.speech.create({
          model: openAITtsModel,

          voice: openAITtsVoice,

          input: cleanedText,

       instructions:
  language === "en"
    ? [
        "Speak natural American English.",
        "Pronounce the word or phrase clearly.",
        "Use a warm, human voice.",
        "Do not sound robotic.",
        "Speak slightly slowly for a language learner."
      ].join(" ")
    : [
        "Doğal, sıcak ve anlaşılır",
        "Türkçe konuş.",
        "Günlük ve samimi bir ton kullan.",
        "Robotik okuma yapma.",
        "Biraz yavaş ve net seslendir."
      ].join(" "),

          response_format: "mp3"
        });

      const audioBuffer =
        Buffer.from(
          await speech.arrayBuffer()
        );

      const usageEventId =
        await recordSynchronizedUsage(
          request,
          {
            operation:
              language === "en"
                ? "tts_english"
                : "tts_turkish",
            model: openAITtsModel,
            usage: {
              requests: 1
            },
            ttsCharacters:
              cleanedText.length
          }
        );

      response.set({
        "Content-Type": "audio/mpeg",

        "Content-Length":
          audioBuffer.length,

        "Cache-Control": "no-store"
      });

      if (usageEventId) {
        response.set(
          "X-PauseSpeak-Usage-Event",
          usageEventId
        );
      }

      return response.send(
        audioBuffer
      );
    } catch (error) {
      console.error(
        "PauseSpeak Türkçe ses hatası:",
        {
          message: error?.message,
          status: error?.status,
          code: error?.code
        }
      );

      return response
        .status(
          getStatusCode(error)
        )
        .json({
          success: false,

          error:
            getOpenAIErrorMessage(
              error,
              "Türkçe seslendirme"
            )
        });
    }
  }
);
app.post(
  "/study-segments",
  async (request, response) => {
    const text =
      request.body?.text;
const analysisMode =
  request.body?.analysisMode;
    if (
      typeof text !== "string" ||
      text.trim() === ""
    ) {
      return response
        .status(400)
        .json({
          success: false,

          error:
            "İncelenecek İngilizce " +
            "cümle gönderilmedi."
        });
    }

    const cleanedText =
      cleanText(text);
      const usesContextExpressionMode =
  analysisMode ===
  "context-expression-v1";
      const usageModel =
        usesContextExpressionMode
          ? openAITerraModel
          : openAIModel;

    if (
      cleanedText.length > 1000
    ) {
      return response
        .status(400)
        .json({
          success: false,

          error:
            "Cümle kelime analizi " +
            "için çok uzun."
        });
    }

    try {
      const openAI =
        await getOpenAIClient();

      let segments = null;
      let usage =
        emptyOpenAIUsage();

      for (
        let attempt = 1;
        attempt <= 2;
        attempt += 1
      ) {
        try {
     const candidate =
  await generateStudySegments(
    openAI,
    cleanedText,
    analysisMode
  );
          usage = mergeOpenAIUsage(
            usage,
            candidate.usage
          );

          if (
            validateStudySegments(
              cleanedText,
              candidate.segments
            )
          ) {
            segments =
              candidate.segments;

            break;
          }

          console.warn(
            `PauseSpeak kelime analizi ` +
              `${attempt}. denemede ` +
              "doğrulanamadı.",

            candidate
          );
        } catch (error) {
          usage = mergeOpenAIUsage(
            usage,
            error?.openAIUsage
          );

          if (error?.status) {
            throw error;
          }

          console.warn(
            `PauseSpeak kelime analizi ` +
              `${attempt}. denemede ` +
              "geçersiz cevap verdi.",

            error?.message
          );
        }
      }

      usage = finalizeOpenAIUsage(
        usage,
        {
          errorCount: segments ? 0 : 1
        }
      );

      if (!segments) {
        await recordSynchronizedUsage(
          request,
          {
            operation: "study_segments",
            model: usageModel,
            usage
          }
        );

        return response
          .status(422)
          .json({
            success: false,

            error:
              "Cümle için güvenli bir " +
              "kelime ve kalıp analizi " +
              "alınamadı."
          });
      }

      await recordSynchronizedUsage(
        request,
        {
          operation: "study_segments",
          model: usageModel,
          usage
        }
      );

      return response.json({
        success: true,

        segments,

        provider: "openai",

        model: usageModel,

        usage
      });
    } catch (error) {
      console.error(
        "PauseSpeak kelime analizi hatası:",
        {
          message: error?.message,
          status: error?.status,
          code: error?.code
        }
      );

      return response
        .status(
          getStatusCode(error)
        )
        .json({
          success: false,

          error:
            getOpenAIErrorMessage(
              error,
              "Kelime analizi"
            )
        });
    }
  }
);
app.post(
  "/chunk",
  async (request, response) => {
    const text =
      request.body?.text;
    const improve =
      request.body?.improve === true;
    const improvementType =
      improve &&
      request.body?.improvementType ===
        "translation"
        ? "translation"
        : "segmentation";
    const currentParts =
      Array.isArray(
        request.body?.currentParts
      )
        ? request.body.currentParts
            .slice(0, 8)
            .map((part) => ({
              english: cleanText(
                part?.english
              ),
              turkish: cleanText(
                part?.turkish
              )
            }))
            .filter(
              (part) => part.english
            )
        : [];
    const selectedModel = improve
      ? openAITerraModel
      : openAIModel;
    const usageOperation = improve
      ? improvementType === "translation"
        ? "improve_translation"
        : "improve_chunk"
      : "chunk_translation";

    if (
      typeof text !== "string" ||
      text.trim() === ""
    ) {
      return response
        .status(400)
        .json({
          success: false,

          error:
            "Parçalara ayrılacak " +
            "İngilizce cümle gönderilmedi."
        });
    }

    const cleanedText =
      cleanText(text);

    if (
      cleanedText.length > 1000
    ) {
      return response
        .status(400)
        .json({
          success: false,

          error:
            "Cümle parçalara ayırmak " +
            "için çok uzun."
        });
    }

    if (
      improve &&
      improvementType === "translation" &&
      (
        currentParts.length === 0 ||
        !validateChunks(
          cleanedText,
          currentParts.map(
            (part) => part.english
          )
        )
      )
    ) {
      return response
        .status(400)
        .json({
          success: false,
          error:
            "Çeviri iyileştirmesi için geçerli mevcut parçalar gönderilmedi."
        });
    }

    try {
      const openAI =
        await getOpenAIClient();
      const generated =
        await generateValidatedChunkDecision(
          openAI,
          cleanedText,
          {
            model: selectedModel,
            improve,
            improvementType,
            previousParts:
              currentParts
          }
        );
      const decision =
        generated.decision;
      const usage = generated.usage;

      if (!decision) {
        await recordSynchronizedUsage(
          request,
          {
            operation: usageOperation,
            model: selectedModel,
            usage
          }
        );

        return response
          .status(422)
          .json({
            success: false,

            error:
              improve
                ? "İyileştirme sonucu güvenli doğrulamadan geçmedi."
                : "Luna sonucu iki denemede de güvenli doğrulamadan geçmedi."
          });
      }

      await recordSynchronizedUsage(
        request,
        {
          operation: usageOperation,
          model: selectedModel,
          usage
        }
      );

      return response.json({
        success: true,

        suitable:
          decision.suitable,

        chunks:
          decision.parts.map(
            (part) => part.english
          ),

        translations:
          decision.parts.map(
            (part) => part.turkish
          ),

        provider: "openai",

        model: selectedModel,

        improved: improve,

        improvementType:
          improve
            ? improvementType
            : null,

        usage
      });
    } catch (error) {
      await recordSynchronizedUsage(
        request,
        {
          operation: usageOperation,
          model: selectedModel,
          usage: finalizeOpenAIUsage(
            error?.openAIUsage ||
              emptyOpenAIUsage(),
            { errorCount: 1 }
          )
        }
      );

      console.error(
        "PauseSpeak chunk hatası:",
        {
          message: error?.message,
          status: error?.status,
          code: error?.code
        }
      );

      return response
        .status(
          getStatusCode(error)
        )
        .json({
          success: false,

          error:
            getOpenAIErrorMessage(
              error,
              improve
                ? improvementType ===
                    "translation"
                  ? "Parça çevirilerini iyileştirme"
                  : "Parçalama iyileştirme"
                : "Parçalama"
            )
        });
    }
  }
);

app.listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      `PauseSpeak sunucusu ` +
        `http://localhost:${port} ` +
        `adresinde çalışıyor.`
    );

    console.log(
      `OpenAI modeli: ${openAIModel}`
    );
  }
);
