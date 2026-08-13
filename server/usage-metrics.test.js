const test = require("node:test");
const assert = require("node:assert/strict");

const {
  emptyOpenAIUsage,
  estimateTextUsageCost,
  finalizeOpenAIUsage,
  mergeOpenAIUsage,
  normalizeOpenAIUsage
} = require("./usage-metrics");

test("OpenAI usage keeps cached, cache-write and reasoning tokens", () => {
  const usage = normalizeOpenAIUsage({
    input_tokens: 1000,
    input_tokens_details: {
      cached_tokens: 300,
      cache_write_tokens: 200
    },
    output_tokens: 100,
    output_tokens_details: {
      reasoning_tokens: 40
    }
  });

  assert.deepEqual(usage, {
    requests: 1,
    inputTokens: 1000,
    cachedInputTokens: 300,
    cacheWriteTokens: 200,
    outputTokens: 100,
    reasoningTokens: 40,
    retryCount: 0,
    cacheHits: 0,
    cacheMisses: 1,
    errorCount: 0
  });
});

test("cache writes use the documented 1.25x input price", () => {
  const cost = estimateTextUsageCost(
    "gpt-5.6-luna",
    {
      inputTokens: 1000,
      cachedInputTokens: 300,
      cacheWriteTokens: 200,
      outputTokens: 100
    }
  );

  assert.equal(cost, 0.000276);
});

test("retry observability follows the number of model requests", () => {
  let usage = emptyOpenAIUsage();

  usage = mergeOpenAIUsage(
    usage,
    normalizeOpenAIUsage({
      input_tokens: 10
    })
  );
  usage = mergeOpenAIUsage(
    usage,
    normalizeOpenAIUsage({
      input_tokens: 20
    })
  );

  assert.deepEqual(
    finalizeOpenAIUsage(usage, {
      errorCount: 1
    }),
    {
      requests: 2,
      inputTokens: 30,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      retryCount: 1,
      cacheHits: 0,
      cacheMisses: 2,
      errorCount: 1
    }
  );
});
