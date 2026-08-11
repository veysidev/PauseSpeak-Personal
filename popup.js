const syncCodeInput =
  document.getElementById("syncCode");
const saveButton =
  document.getElementById("saveButton");
const copyButton =
  document.getElementById("copyButton");
const generateButton =
  document.getElementById("generateButton");
const clearButton =
  document.getElementById("clearButton");
const statusText = document.getElementById("status");
const syncCodeStorageKey =
  "pausespeakUsageSyncCodeV1";

function normalizeSyncCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function isValidSyncCode(value) {
  return (
    value.length >= 16 &&
    value.length <= 96 &&
    /^[A-Z0-9-]+$/.test(value)
  );
}

function createSyncCode() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);

  const compact = [...bytes]
    .map((value) =>
      value.toString(16)
        .padStart(2, "0")
        .toUpperCase()
    )
    .join("");

  return compact.match(/.{1,8}/g)
    .join("-");
}

function saveSyncCode(code, message) {
  chrome.storage.local.set(
    {
      [syncCodeStorageKey]: code
    },
    () => {
      statusText.textContent = message;
    }
  );
}

chrome.storage.local.get(
  [syncCodeStorageKey],
  (result) => {
    syncCodeInput.value =
      normalizeSyncCode(
        result[syncCodeStorageKey]
      );

    statusText.textContent =
      syncCodeInput.value
        ? "Ortak sayaç kodu bu cihazda kayıtlı."
        : "Henüz ortak sayaç kodu yok.";
  }
);

saveButton.addEventListener(
  "click",
  () => {
    const code = normalizeSyncCode(
      syncCodeInput.value
    );

    if (!isValidSyncCode(code)) {
      statusText.textContent =
        "Kod en az 16 karakter olmalı; yalnızca harf, rakam ve kısa çizgi kullanılabilir.";
      return;
    }

    syncCodeInput.value = code;
    saveSyncCode(
      code,
      "Kod kaydedildi. Netflix veya YouTube sekmesini yenilemen gerekmez."
    );
  }
);

generateButton.addEventListener(
  "click",
  () => {
    const code = createSyncCode();

    syncCodeInput.value = code;
    saveSyncCode(
      code,
      "Yeni kod oluşturuldu ve kaydedildi. Aynı kodu diğer cihaza da gir."
    );
  }
);

copyButton.addEventListener(
  "click",
  async () => {
    const code = normalizeSyncCode(
      syncCodeInput.value
    );

    if (!isValidSyncCode(code)) {
      statusText.textContent =
        "Önce geçerli bir kod oluştur veya kaydet.";
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      statusText.textContent =
        "Kod panoya kopyalandı.";
    } catch (error) {
      syncCodeInput.select();
      statusText.textContent =
        "Kod seçildi; kopyalamak için Ctrl+C kullan.";
    }
  }
);

clearButton.addEventListener(
  "click",
  () => {
    chrome.storage.local.remove(
      syncCodeStorageKey,
      () => {
        syncCodeInput.value = "";
        statusText.textContent =
          "Ortak sayaç kapatıldı; yerel sayaç kullanılacak.";
      }
    );
  }
);
