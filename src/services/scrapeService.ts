import type { ScrapeResponse } from '../types/scrape';

export async function scrapeProductUrl(
  url: string,
  brand: string,
  forceRescrape = false
): Promise<ScrapeResponse> {
  const response = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, brand, forceRescrape }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Scrape failed: ${response.status}`);
  }

  return data as ScrapeResponse;
}
