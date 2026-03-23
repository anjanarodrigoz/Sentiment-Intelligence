/**
 * Maps internal Ollama model names to user-facing display names.
 * This lets us brand our own models without exposing the underlying engine.
 */
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gemma3': 'Sentiment 1.0',
};

/**
 * Returns the user-friendly display name for a model.
 * Falls back to the raw model name if no mapping exists.
 */
export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] ?? modelId;
}

/** Returns true if the model is our branded Sentiment model */
export function isSentimentModel(modelId: string): boolean {
  return modelId in MODEL_DISPLAY_NAMES;
}
