interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Logs LLM token usage as structured JSON.
 * Call after any OpenAI completion to track cost.
 */
export function logLLMUsage(
  operation: string,
  model: string,
  usage: Usage | null | undefined
) {
  if (!usage) return;
  console.log(
    JSON.stringify({
      event: 'llm_usage',
      operation,
      model,
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    })
  );
}
