const crypto = require("crypto");
const { Pool } = require("pg");

const allowedOperations = new Set([
  "normal_translation",
  "chunk_split",
  "chunk_translation",
  "improve_translation",
  "improve_chunk",
  "study_meaning",
  "tts_english",
  "tts_turkish"
]);

const usageMetricKeys = [
  "requests",
  "inputTokens",
  "cachedInputTokens",
  "outputTokens",
  "reasoningTokens",
  "ttsCharacters",
  "ttsSeconds",
  "estimatedUsd"
];

function normalizeSyncCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (
    normalized.length < 16 ||
    normalized.length > 96 ||
    !/^[A-Z0-9-]+$/.test(normalized)
  ) {
    return "";
  }

  return normalized;
}

function hashSyncCode(value) {
  const normalized = normalizeSyncCode(
    value
  );

  if (!normalized) {
    return "";
  }

  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex");
}

function normalizeDate(value) {
  const normalized = String(value || "");

  return /^\d{4}-\d{2}-\d{2}$/.test(
    normalized
  )
    ? normalized
    : "";
}

function normalizeOperation(value) {
  const normalized = String(value || "");

  return allowedOperations.has(normalized)
    ? normalized
    : "";
}

function normalizeModel(value) {
  return String(value || "-")
    .trim()
    .slice(0, 80) || "-";
}

function normalizeNumber(
  value,
  maximum = 1000000000
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(number, maximum)
  );
}

function normalizeUsageRecord(record) {
  return {
    requests: Math.round(
      normalizeNumber(record?.requests)
    ),
    inputTokens: Math.round(
      normalizeNumber(record?.inputTokens)
    ),
    cachedInputTokens: Math.round(
      normalizeNumber(
        record?.cachedInputTokens
      )
    ),
    outputTokens: Math.round(
      normalizeNumber(record?.outputTokens)
    ),
    reasoningTokens: Math.round(
      normalizeNumber(
        record?.reasoningTokens
      )
    ),
    ttsCharacters: Math.round(
      normalizeNumber(
        record?.ttsCharacters
      )
    ),
    ttsSeconds: normalizeNumber(
      record?.ttsSeconds,
      10000000
    ),
    estimatedUsd: normalizeNumber(
      record?.estimatedUsd,
      100000
    )
  };
}

function emptyUsageRecord(model = "-") {
  return {
    model,
    requests: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    ttsCharacters: 0,
    ttsSeconds: 0,
    estimatedUsd: 0
  };
}

function addSummaryRow(operations, row) {
  const operation =
    normalizeOperation(row.operation);

  if (!operation) {
    return;
  }

  const model = normalizeModel(row.model);
  const current =
    operations[operation] ||
    emptyUsageRecord(model);

  if (
    current.model !== model &&
    !current.model.split(", ").includes(model)
  ) {
    current.model =
      `${current.model}, ${model}`;
  }

  const normalized =
    normalizeUsageRecord({
      requests: row.requests,
      inputTokens: row.input_tokens,
      cachedInputTokens:
        row.cached_input_tokens,
      outputTokens: row.output_tokens,
      reasoningTokens:
        row.reasoning_tokens,
      ttsCharacters: row.tts_characters,
      ttsSeconds: row.tts_seconds,
      estimatedUsd: row.estimated_usd
    });

  usageMetricKeys.forEach((key) => {
    current[key] += normalized[key];
  });

  operations[operation] = current;
}

class UsageStore {
  constructor({ databaseUrl, useSsl }) {
    this.databaseUrl = databaseUrl || "";
    this.pool = this.databaseUrl
      ? new Pool({
          connectionString: this.databaseUrl,
          ssl: useSsl
            ? {
                rejectUnauthorized: false
              }
            : false,
          max: 5
        })
      : null;
    this.schemaPromise = null;

    this.pool?.on("error", (error) => {
      console.error(
        "PauseSpeak kullanım veritabanı hatası:",
        error?.message
      );
    });
  }

  isConfigured() {
    return Boolean(this.pool);
  }

  async ensureSchema() {
    if (!this.pool) {
      throw new Error(
        "DATABASE_URL bulunamadı."
      );
    }

    if (!this.schemaPromise) {
      this.schemaPromise = this.pool
        .query(`
          CREATE TABLE IF NOT EXISTS pausespeak_usage_events (
            account_hash CHAR(64) NOT NULL,
            event_id TEXT NOT NULL,
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            local_date DATE NOT NULL,
            operation VARCHAR(64) NOT NULL,
            model VARCHAR(80) NOT NULL,
            requests BIGINT NOT NULL DEFAULT 0,
            input_tokens BIGINT NOT NULL DEFAULT 0,
            cached_input_tokens BIGINT NOT NULL DEFAULT 0,
            output_tokens BIGINT NOT NULL DEFAULT 0,
            reasoning_tokens BIGINT NOT NULL DEFAULT 0,
            tts_characters BIGINT NOT NULL DEFAULT 0,
            tts_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
            estimated_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
            is_legacy BOOLEAN NOT NULL DEFAULT FALSE,
            PRIMARY KEY (account_hash, event_id)
          );

          CREATE INDEX IF NOT EXISTS pausespeak_usage_events_account_date_idx
            ON pausespeak_usage_events (account_hash, local_date);

          CREATE INDEX IF NOT EXISTS pausespeak_usage_events_account_time_idx
            ON pausespeak_usage_events (account_hash, occurred_at);

          CREATE TABLE IF NOT EXISTS pausespeak_usage_counters (
            account_hash CHAR(64) PRIMARY KEY,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `)
        .catch((error) => {
          this.schemaPromise = null;
          throw error;
        });
    }

    await this.schemaPromise;
  }

  async recordEvent(
    accountHash,
    {
      localDate,
      operation,
      model,
      usage
    }
  ) {
    const normalizedDate =
      normalizeDate(localDate);
    const normalizedOperation =
      normalizeOperation(operation);

    if (
      !accountHash ||
      !normalizedDate ||
      !normalizedOperation
    ) {
      return "";
    }

    await this.ensureSchema();

    const eventId = crypto.randomUUID();
    const normalizedUsage =
      normalizeUsageRecord(usage);

    await this.pool.query(
      `
        INSERT INTO pausespeak_usage_events (
          account_hash,
          event_id,
          local_date,
          operation,
          model,
          requests,
          input_tokens,
          cached_input_tokens,
          output_tokens,
          reasoning_tokens,
          tts_characters,
          tts_seconds,
          estimated_usd
        ) VALUES (
          $1, $2, $3::date, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13
        )
      `,
      [
        accountHash,
        eventId,
        normalizedDate,
        normalizedOperation,
        normalizeModel(model),
        normalizedUsage.requests,
        normalizedUsage.inputTokens,
        normalizedUsage.cachedInputTokens,
        normalizedUsage.outputTokens,
        normalizedUsage.reasoningTokens,
        normalizedUsage.ttsCharacters,
        normalizedUsage.ttsSeconds,
        normalizedUsage.estimatedUsd
      ]
    );

    return eventId;
  }

  async updateTtsDuration(
    accountHash,
    eventId,
    seconds
  ) {
    const normalizedEventId =
      String(eventId || "").trim();
    const normalizedSeconds =
      normalizeNumber(seconds, 86400);

    if (
      !accountHash ||
      !/^[0-9a-f-]{36}$/i.test(
        normalizedEventId
      ) ||
      normalizedSeconds <= 0
    ) {
      return false;
    }

    await this.ensureSchema();

    const result = await this.pool.query(
      `
        UPDATE pausespeak_usage_events
        SET
          tts_seconds = $3,
          estimated_usd =
            ((tts_characters::double precision / 4 * 0.6) / 1000000) +
            ($3 * 0.0144 / 60)
        WHERE
          account_hash = $1 AND
          event_id = $2 AND
          operation IN ('tts_english', 'tts_turkish')
      `,
      [
        accountHash,
        normalizedEventId,
        normalizedSeconds
      ]
    );

    return result.rowCount > 0;
  }

  async importLegacy(
    accountHash,
    deviceId,
    days
  ) {
    const normalizedDeviceId =
      String(deviceId || "")
        .trim()
        .slice(0, 80);

    if (
      !accountHash ||
      !/^[A-Za-z0-9-]{8,80}$/.test(
        normalizedDeviceId
      ) ||
      !days ||
      typeof days !== "object" ||
      Array.isArray(days)
    ) {
      throw new Error(
        "Geçmiş kullanım verisi geçersiz."
      );
    }

    await this.ensureSchema();

    const entries = [];
    const dateEntries = Object.entries(days)
      .filter(([date]) => normalizeDate(date))
      .sort(([first], [second]) =>
        first.localeCompare(second)
      )
      .slice(-90);

    dateEntries.forEach(([date, day]) => {
      const operations =
        day?.operations;

      if (
        !operations ||
        typeof operations !== "object" ||
        Array.isArray(operations)
      ) {
        return;
      }

      Object.entries(operations).forEach(
        ([operation, record]) => {
          const normalizedOperation =
            normalizeOperation(operation);

          if (!normalizedOperation) {
            return;
          }

          entries.push({
            eventId:
              `legacy:${normalizedDeviceId}:` +
              `${date}:${normalizedOperation}`,
            date,
            operation:
              normalizedOperation,
            model: normalizeModel(
              record?.model
            ),
            usage:
              normalizeUsageRecord(record)
          });
        }
      );
    });

    if (entries.length > 720) {
      throw new Error(
        "Geçmiş kullanım verisi çok büyük."
      );
    }

    const client =
      await this.pool.connect();

    try {
      await client.query("BEGIN");

      for (const entry of entries) {
        await client.query(
          `
            INSERT INTO pausespeak_usage_events (
              account_hash,
              event_id,
              occurred_at,
              local_date,
              operation,
              model,
              requests,
              input_tokens,
              cached_input_tokens,
              output_tokens,
              reasoning_tokens,
              tts_characters,
              tts_seconds,
              estimated_usd,
              is_legacy
            ) VALUES (
              $1, $2, $3::timestamptz,
              $4::date, $5, $6, $7, $8, $9, $10, $11,
              $12, $13, $14, TRUE
            )
            ON CONFLICT (account_hash, event_id)
            DO NOTHING
          `,
          [
            accountHash,
            entry.eventId,
            `${entry.date}T12:00:00.000Z`,
            entry.date,
            entry.operation,
            entry.model,
            entry.usage.requests,
            entry.usage.inputTokens,
            entry.usage.cachedInputTokens,
            entry.usage.outputTokens,
            entry.usage.reasoningTokens,
            entry.usage.ttsCharacters,
            entry.usage.ttsSeconds,
            entry.usage.estimatedUsd
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return entries.length;
  }

  async getSummary(accountHash, today) {
    const normalizedToday =
      normalizeDate(today);

    if (!accountHash || !normalizedToday) {
      throw new Error(
        "Kullanım özeti isteği geçersiz."
      );
    }

    await this.ensureSchema();

    const [dailyResult, counterResult] =
      await Promise.all([
        this.pool.query(
          `
            SELECT
              TO_CHAR(local_date, 'YYYY-MM-DD') AS date,
              operation,
              model,
              SUM(requests) AS requests,
              SUM(input_tokens) AS input_tokens,
              SUM(cached_input_tokens) AS cached_input_tokens,
              SUM(output_tokens) AS output_tokens,
              SUM(reasoning_tokens) AS reasoning_tokens,
              SUM(tts_characters) AS tts_characters,
              SUM(tts_seconds) AS tts_seconds,
              SUM(estimated_usd) AS estimated_usd
            FROM pausespeak_usage_events
            WHERE
              account_hash = $1 AND
              local_date BETWEEN
                ($2::date - INTERVAL '89 days')::date AND
                $2::date
            GROUP BY local_date, operation, model
            ORDER BY local_date ASC
          `,
          [accountHash, normalizedToday]
        ),
        this.pool.query(
          `
            SELECT
              counter.started_at,
              event.operation,
              event.model,
              COALESCE(SUM(event.requests), 0) AS requests,
              COALESCE(SUM(event.input_tokens), 0) AS input_tokens,
              COALESCE(SUM(event.cached_input_tokens), 0) AS cached_input_tokens,
              COALESCE(SUM(event.output_tokens), 0) AS output_tokens,
              COALESCE(SUM(event.reasoning_tokens), 0) AS reasoning_tokens,
              COALESCE(SUM(event.tts_characters), 0) AS tts_characters,
              COALESCE(SUM(event.tts_seconds), 0) AS tts_seconds,
              COALESCE(SUM(event.estimated_usd), 0) AS estimated_usd
            FROM pausespeak_usage_counters AS counter
            LEFT JOIN pausespeak_usage_events AS event
              ON event.account_hash = counter.account_hash
              AND event.occurred_at >= counter.started_at
              AND event.is_legacy = FALSE
            WHERE counter.account_hash = $1
            GROUP BY counter.started_at, event.operation, event.model
          `,
          [accountHash]
        )
      ]);

    const days = {};

    dailyResult.rows.forEach((row) => {
      if (!days[row.date]) {
        days[row.date] = {
          operations: {}
        };
      }

      addSummaryRow(
        days[row.date].operations,
        row
      );
    });

    let activeCounter = null;

    counterResult.rows.forEach((row) => {
      if (!activeCounter) {
        activeCounter = {
          startedAt: row.started_at,
          operations: {}
        };
      }

      if (row.operation) {
        addSummaryRow(
          activeCounter.operations,
          row
        );
      }
    });

    return {
      version: 2,
      days,
      activeCounter
    };
  }

  async startCounter(accountHash) {
    if (!accountHash) {
      throw new Error(
        "Senkronizasyon kodu geçersiz."
      );
    }

    await this.ensureSchema();

    const result = await this.pool.query(
      `
        INSERT INTO pausespeak_usage_counters (
          account_hash,
          started_at
        ) VALUES ($1, NOW())
        ON CONFLICT (account_hash)
        DO UPDATE SET started_at = NOW()
        RETURNING started_at
      `,
      [accountHash]
    );

    return result.rows[0].started_at;
  }
}

module.exports = {
  UsageStore,
  hashSyncCode,
  normalizeDate,
  normalizeSyncCode,
  normalizeUsageRecord
};
