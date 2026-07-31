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

      let chunks = null;

      for (
        let attempt = 1;
        attempt <= 2;
        attempt += 1
      ) {
        const candidateChunks =
          await generateSmartChunks(
            openAI,
            cleanedText
          );

        if (
          validateChunks(
            cleanedText,
            candidateChunks
          )
        ) {
          chunks =
            candidateChunks;

          break;
        }

        console.warn(
          `PauseSpeak chunk doğrulaması ` +
            `${attempt}. denemede ` +
            "başarısız oldu.",

          candidateChunks
        );
      }

      if (!chunks) {
        return response
          .status(422)
          .json({
            success: false,

            error:
              "Cümle güvenli biçimde " +
              "parçalara ayrılamadı. " +
              "Lütfen tam cümleyi " +
              "tekrar dene."
          });
      }

      return response.json({
        success: true,

        chunks,

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