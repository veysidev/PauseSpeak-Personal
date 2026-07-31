const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const port = Number(process.env.PORT) || 3000;

const openAIModel =
  process.env.OPENAI_MODEL ||
  "gpt-5.6-terra";

let openAIClientPromise = null;

app.use(cors());
app.use(express.json({ limit: "20kb" }));

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

function getTranslationErrorMessage(error) {
  if (error?.status === 401) {
    return (
      "OpenAI API anahtarı geçersiz " +
      "veya kullanılamıyor."
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

app.get("/health", (request, response) => {
  response.json({
    success: true,
    message:
      "PauseSpeak sunucusu çalışıyor.",
    model: openAIModel,
    apiKeyConfigured: Boolean(
      process.env.OPENAI_API_KEY
    )
  });
});

app.post(
  "/translate",
  async (request, response) => {
    const text = request.body?.text;

    const previousText =
      request.body?.previousText;

    if (
      typeof text !== "string" ||
      text.trim() === ""
    ) {
      return response.status(400).json({
        success: false,
        error:
          "Çevrilecek İngilizce " +
          "cümle gönderilmedi."
      });
    }

    const cleanedText = text.trim();

    const cleanedPreviousText =
      typeof previousText === "string"
        ? previousText.trim()
        : "";

    try {
      const openAI =
        await getOpenAIClient();

      const contextText =
        cleanedPreviousText
          ? cleanedPreviousText
          : "Önceki altyazı yok.";

      const openAIResponse =
        await openAI.responses.create({
          model: openAIModel,

          instructions: [
            "Sen İngilizce dizi ve film",
            "diyaloglarını doğal Türkçeye",
            "çeviren uzman bir çevirmensin.",
            "Kelime kelime çeviri yapma.",
            "Konuşma dilini, deyimleri ve",
            "sahnenin tonunu koru.",
            "Önceki altyazıyı yalnızca",
            "bağlam olarak kullan.",
            "Yalnızca mevcut İngilizce",
            "cümlenin Türkçe çevirisini",
            "döndür.",
            "Açıklama, başlık, tırnak veya",
            "ek bilgi ekleme."
          ].join(" "),

          input: [
            `Önceki altyazı: ${contextText}`,
            `Çevrilecek cümle: ${cleanedText}`
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

      return response
        .status(
          error?.status === 401
            ? 401
            : error?.status === 429
              ? 429
              : 500
        )
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

app.listen(port, () => {
  console.log(
    `PauseSpeak sunucusu ` +
      `http://localhost:${port} ` +
      `adresinde çalışıyor.`
  );

  console.log(
    `OpenAI modeli: ${openAIModel}`
  );
});