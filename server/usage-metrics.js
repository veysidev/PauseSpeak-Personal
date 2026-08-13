const usageModelPrices = {
  "gpt-5.6-luna": {
    input: 0.2,
    cachedInput: 0.02,
    cacheWriteInput: 0.25,
    output: 1.2
  },
  "gpt-5.6-terra": {
    input: 2,
    cachedInput: 0.2,
    cacheWriteInput: 2.5,
    output: 12
  }
};

function toNonNegativeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(0, number)
    : 0;
}

function getCacheWriteTokens(usage) {
  return toNonNegativeNumber(
    usage?.input_tokens_details
      ?.cache_write_tokens ??
      usage?.cache_write_tokens ??
      usage?.input_cache_write_tokens
  );
}

function normalizeOpenAIUsage(usage) {
  return {
    requests: 1,
    inputTokens: toNonNegativeNumber(
      usage?.input_tokens
    ),
    cachedInputTokens:
      toNonNegativeNumber(
        usage?.input_tokens_details
          ?.cached_tokens
      ),
    cacheWriteTokens:
      getCacheWriteTokens(usage),
    outputTokens: toNonNegativeNumber(
      usage?.output_tokens
    ),
    reasoningTokens:
      toNonNegativeNumber(
        usage?.output_tokens_details
          ?.reasoning_tokens
      ),
    retryCount: 0,
    cacheHits: 0,
    cacheMisses: 1,
    errorCount: 0
  };
}

function emptyOpenAIUsage() {
  return {
    requests: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    retryCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errorCount: 0
  };
}

function mergeOpenAIUsage(total, usage) {
  const merged = emptyOpenAIUsage();

  Object.keys(merged).forEach((key) => {
    merged[key] =
      toNonNegativeNumber(total?.[key]) +
      toNonNegativeNumber(usage?.[key]);
  });

  return merged;
}

function finalizeOpenAIUsage(
  usage,
  { errorCount = 0 } = {}
) {
  const normalized = mergeOpenAIUsage(
    emptyOpenAIUsage(),
    usage
  );

  normalized.retryCount = Math.max(
    0,
    normalized.requests - 1
  );
  normalized.cacheMisses =
    normalized.requests;
  normalized.errorCount =
    toNonNegativeNumber(errorCount);

  return normalized;
}

function estimateTextUsageCost(model, usage) {
  const prices = usageModelPrices[model];

  if (!prices) {
    return 0;
  }

  const inputTokens =
    toNonNegativeNumber(
      usage?.inputTokens
    );
  const cachedInputTokens = Math.min(
    inputTokens,
    toNonNegativeNumber(
      usage?.cachedInputTokens
    )
  );
  const cacheWriteTokens = Math.min(
    inputTokens - cachedInputTokens,
    toNonNegativeNumber(
      usage?.cacheWriteTokens
    )
  );
  const regularInputTokens = Math.max(
    0,
    inputTokens -
      cachedInputTokens -
      cacheWriteTokens
  );
  const outputTokens =
    toNonNegativeNumber(
      usage?.outputTokens
    );

  return (
    regularInputTokens * prices.input +
    cachedInputTokens *
      prices.cachedInput +
    cacheWriteTokens *
      prices.cacheWriteInput +
    outputTokens * prices.output
  ) / 1000000;
}

module.exports = {
  emptyOpenAIUsage,
  estimateTextUsageCost,
  finalizeOpenAIUsage,
  mergeOpenAIUsage,
  normalizeOpenAIUsage,
  usageModelPrices
};
