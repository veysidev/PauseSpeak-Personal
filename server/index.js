const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (request, response) => {
  response.json({
    success: true,
    message: "PauseSpeak sunucusu çalışıyor."
  });
});

app.post("/translate", (request, response) => {
  const text = request.body?.text;

  if (typeof text !== "string" || text.trim() === "") {
    return response.status(400).json({
      success: false,
      error: "Çevrilecek İngilizce cümle gönderilmedi."
    });
  }

  const cleanedText = text.trim();

  const mockTranslations = {
    "You have got to be kidding me.": "Şaka yapıyor olmalısın.",
    "How are you?": "Nasılsın?",
    "What are you doing?": "Ne yapıyorsun?",
    "I don't understand.": "Anlamıyorum."
  };

  const translation =
    mockTranslations[cleanedText] ||
    `Geçici çeviri sonucu: ${cleanedText}`;

  return response.json({
    success: true,
    translation,
    provider: "mock",
    cached: false
  });
});

app.listen(port, () => {
  console.log(
    `PauseSpeak sunucusu http://localhost:${port} adresinde çalışıyor.`
  );
});