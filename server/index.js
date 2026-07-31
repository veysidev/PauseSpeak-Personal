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

function getTranslationErrorMessage(
  error
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

  return "Çeviri sırasında hata oluştu.";
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
        openAIResponse.output_text?.trim();

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
        "PauseSpeak OpenAI hatası:",
        {
          message: error?.message,
          status: error?.status,
          code: error?.code
        }
      );

      const statusCode =
        [
          401,
          403,
          404,
          429
        ].includes(error?.status) ||
        error?.status >= 500
          ? error.status
          : 500;

      return response
        .status(statusCode)
        .json({
          success: false,

          error:
            getTranslationErrorMessage(
              error
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