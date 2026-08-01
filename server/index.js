const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const port =
  Number(process.env.PORT) || 3000;

const openAIModel =
  process.env.OPENAI_MODEL ||
  "gpt-5.6-terra";

let openAIClientPromise = null;

app.use(cors());

app.use(
  express.json({
    limit: "20kb"
  })
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
    !Array.isArray(parsed.chunks) ||
    parsed.chunks.some(
      (chunk) =>
        typeof chunk !== "string"
    )
  ) {
    throw new Error(
      "Chunk cevabı geçerli bir karar nesnesi değil."
    );
  }

  return {
    suitable: parsed.suitable,

    chunks: parsed.chunks.map(
      (chunk) => cleanText(chunk)
    )
  };
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
  sentence
) {
  const openAIResponse =
    await openAI.responses.create({
      model: openAIModel,

      reasoning: {
        effort: "none"
      },

      instructions: [
        "Sen İngilizce telaffuz ve",
        "akıcı konuşma çalışması için",
        "öğrenmeye değer doğal",
        "konuşma parçaları belirleyen",
        "bir uzmansın.",

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

        "Tek kelimelik basit cevapları,",
        "basit özne ve yardımcı fiil",
        "yapılarını, sıradan A1-A2",
        "cümlelerini, tek başına",
        "anlamsız bağlaçları ve",
        "anlamsız mikro parçaları",
        "zorla chunk yapma.",
        "Uh, um, erm, hmm, mm, ah,",
"yeah, yes, no, okay, maybe",
"ve well gibi tereddüt veya",
"basit tepki sözlerini tek",
"başına chunk yapma.",

'"Um... yeah," gibi yalnızca',
"dolgu ve basit tepki",
"sözcüklerinden oluşan bir",
"parça kesinlikle üretme.",

"Bu tür sözcükleri anlamlı",
"devamıyla birlikte tut.",
"Anlamlı bir devamla doğal",
"şekilde birleştirilemiyorsa",
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
        "2 ile 8 arasında chunk döndür.",

        "Uygun değilse suitable false",
        "ve boş chunks dizisi döndür.",

        "Fiil ile nesnesini bölme.",
        "Phrasal verb bölme.",
        "Deyim bölme.",
        "Collocation bölme.",
        "Verb pattern bölme.",

        "Edatlı yapıları anlamı",
        "bozacak şekilde ayırma.",

        "Zamir ile yüklemi doğal",
        "olmayan şekilde ayırma.",

        "Hiçbir kelimeyi veya",
        "noktalama işaretini silme,",
        "ekleme, düzeltme ya da",
        "yeniden sıralama.",

        "Suitable true olduğunda",
        "chunklar boşlukla yeniden",
        "birleştirildiğinde orijinal",
        "cümle aynen oluşmalıdır.",

        "Yalnızca geçerli bir JSON",
        "nesnesi döndür.",

        "Açıklama, analiz, başlık,",
        "Markdown veya kod bloğu",
        "ekleme."
      ].join(" "),

      input: [
        `Cümle: ${sentence}`,

        "Yalnızca şu iki biçimden",
        "birini döndür:",

        '{"suitable":true,"chunks":["birinci parça","ikinci parça"]}',

        '{"suitable":false,"chunks":[]}'
      ].join("\n"),

      max_output_tokens: 350
    });

  return parseChunkDecision(
    openAIResponse.output_text
  );
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
      )
    });
  }
);

app.post(
  "/translate",
  async (request, response) => {
    const text =
      request.body?.text;

    const previousText =
      request.body?.previousText;

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

    const contextText =
      cleanedPreviousText ||
      "Önceki altyazı yok.";

    try {
      const openAI =
        await getOpenAIClient();

      const openAIResponse =
        await openAI.responses.create({
          model: openAIModel,

          reasoning: {
            effort: "none"
          },

          instructions: [
            "Sen profesyonel bir",
            "İngilizce-Türkçe dizi ve",
            "film altyazı çevirmenisin.",

            "Yalnızca mevcut İngilizce",
            "cümleyi Türkçeye çevir.",

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

            "Önceki altyazıyı yalnızca",
            "bağlam olarak kullan;",

            "onu yeniden çevirme.",

            "Cevapta yalnızca Türkçe",
            "çeviriyi ver.",

            "Başlık, tırnak, seçenek,",
            "not veya ek bilgi ekleme."
          ].join(" "),

          input: [
            `Önceki altyazı: ${contextText}`,

            `Mevcut cümle: ${cleanedText}`
          ].join("\n"),

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

      return response.json({
        success: true,

        translation,

        provider: "openai",

        model: openAIModel,

        cached: false
      });
    } catch (error) {
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
  "/chunk",
  async (request, response) => {
    const text =
      request.body?.text;

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

    try {
      const openAI =
        await getOpenAIClient();

      let decision = null;

      for (
        let attempt = 1;
        attempt <= 2;
        attempt += 1
      ) {
        const candidateDecision =
          await generateSmartChunkDecision(
            openAI,
            cleanedText
          );

        const suitableDecisionIsValid =
          candidateDecision.suitable ===
            true &&
          validateChunks(
            cleanedText,
            candidateDecision.chunks
          );

        const unsuitableDecisionIsValid =
          candidateDecision.suitable ===
            false &&
          candidateDecision.chunks.length ===
            0;

        if (
          suitableDecisionIsValid ||
          unsuitableDecisionIsValid
        ) {
          decision = candidateDecision;

          break;
        }

        console.warn(
          `PauseSpeak chunk kararı ` +
            `${attempt}. denemede ` +
            "doğrulanamadı.",

          candidateDecision
        );
      }

      if (!decision) {
        return response
          .status(422)
          .json({
            success: false,

            error:
              "Cümle için güvenli bir " +
              "chunk kararı alınamadı."
          });
      }

      return response.json({
        success: true,

        suitable:
          decision.suitable,

        chunks:
          decision.chunks,

        provider: "openai",

        model: openAIModel
      });
    } catch (error) {
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
              "Parçalama"
            )
        });
    }
  }
);

app.listen(
  port,
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