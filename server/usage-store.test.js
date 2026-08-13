const test = require("node:test");
const assert = require("node:assert/strict");

const {
  UsageStore,
  normalizeUsageRecord
} = require("./usage-store");

test("usage store preserves cache and retry observability fields", () => {
  assert.deepEqual(
    normalizeUsageRecord({
      requests: 2,
      inputTokens: 100,
      cachedInputTokens: 20,
      cacheWriteTokens: 10,
      outputTokens: 30,
      reasoningTokens: 5,
      retryCount: 1,
      cacheHits: 0,
      cacheMisses: 2,
      errorCount: 1,
      estimatedUsd: 0.5
    }),
    {
      requests: 2,
      inputTokens: 100,
      cachedInputTokens: 20,
      cacheWriteTokens: 10,
      outputTokens: 30,
      reasoningTokens: 5,
      retryCount: 1,
      cacheHits: 0,
      cacheMisses: 2,
      errorCount: 1,
      ttsCharacters: 0,
      ttsSeconds: 0,
      estimatedUsd: 0.5
    }
  );
});

test("study-segments event writes every observability column", async () => {
  const queries = [];
  const store = Object.create(
    UsageStore.prototype
  );

  store.ensureSchema = async () => {};
  store.pool = {
    query: async (sql, parameters) => {
      queries.push({ sql, parameters });
      return { rowCount: 1 };
    }
  };

  const eventId = await store.recordEvent(
    "a".repeat(64),
    {
      localDate: "2026-08-12",
      operation: "study_segments",
      model: "gpt-5.6-terra",
      usage: {
        requests: 2,
        inputTokens: 100,
        cachedInputTokens: 20,
        cacheWriteTokens: 10,
        outputTokens: 30,
        reasoningTokens: 5,
        retryCount: 1,
        cacheHits: 0,
        cacheMisses: 2,
        errorCount: 0,
        estimatedUsd: 0.5
      }
    }
  );

  assert.match(eventId, /^[0-9a-f-]{36}$/i);
  assert.equal(queries.length, 1);
  assert.match(
    queries[0].sql,
    /cache_write_tokens[\s\S]*?retry_count[\s\S]*?cache_misses[\s\S]*?error_count/s
  );
  assert.equal(
    queries[0].parameters.length,
    18
  );
});
