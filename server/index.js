const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const port =
  Number(process.env.PORT) || 3000;

const openAIModel =
  process.env.OPENAI_MODEL ||
  "gpt-5.6-terra";
const openAITtsModel =
  "gpt-4o-mini-tts";

const openAITtsVoice =
  "marin";
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

    note:
      cleanText(
        parsed.note || ""
      )
  };
}
function parseStudySegments(
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

        return {
          text: cleanText(
            segment.text
          ),
          type: segment.type
        };
      }
    );

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
async function generateStudyMeaning(
  openAI,
  selectedText,
  sentence,
  segmentType
) {
  const openAIResponse =
    await openAI.responses.create({
      model: openAIModel,

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

        "text alanında seçilen İngilizce",
        "metni değiştirmeden koru.",

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

        '{"text":"find out","meanings":["öğrenmek","ortaya çıkarmak"],"expansion":"","note":"Phrasal verb."}'
      ].join("\n"),

      max_output_tokens: 300
    });

  return parseStudyMeaning(
    openAIResponse.output_text
  );
}
async function generateStudySegments(
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

        '{"segments":[{"text":"I","type":"word"},{"text":"need to","type":"verb-pattern"},{"text":"find out","type":"phrasal-verb"}]}'
      ].join("\n"),

      max_output_tokens: 700
    });

  return parseStudySegments(
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
  "/study-meaning",
  async (request, response) => {
    const selectedText =
      request.body?.selectedText;

    const sentence =
      request.body?.sentence;

    const segmentType =
      request.body?.segmentType;

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

      for (
        let attempt = 1;
        attempt <= 2;
        attempt += 1
      ) {
        try {
          const candidate =
            await generateStudyMeaning(
              openAI,
              cleanedSelectedText,
              cleanedSentence,
              cleanedSegmentType
            );
if (
  cleanedSegmentType ===
  "contraction"
) {
  candidate.note = "";
}
          if (
            cleanText(
              candidate.text
            ) ===
              cleanedSelectedText &&
            candidate.meanings.length >
              0
          ) {
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

      if (!meaning) {
        return response
          .status(422)
          .json({
            success: false,

            error:
              "Seçilen ifade için güvenli " +
              "bir anlam alınamadı."
          });
      }

      return response.json({
        success: true,

        text: meaning.text,

        meanings:
          meaning.meanings,

        expansion:
          meaning.expansion,

        note:
          meaning.note,

        provider: "openai",

        model: openAIModel
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

          instructions: [
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

      response.set({
        "Content-Type": "audio/mpeg",

        "Content-Length":
          audioBuffer.length,

        "Cache-Control": "no-store"
      });

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

      for (
        let attempt = 1;
        attempt <= 2;
        attempt += 1
      ) {
        try {
          const candidate =
            await generateStudySegments(
              openAI,
              cleanedText
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

      if (!segments) {
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

      return response.json({
        success: true,

        segments,

        provider: "openai",

        model: openAIModel
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