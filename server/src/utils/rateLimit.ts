export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function politeDelay(baseMs = 1000): Promise<void> {
  const jitter = Math.random() * baseMs * 0.5;
  return delay(baseMs + jitter);
}
