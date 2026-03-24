import type { ScrapeResponse, ExistingProduct } from '../types/scrape';

export async function fetchExistingProducts(
  brand: string,
  search?: string
): Promise<ExistingProduct[]> {
  const params = new URLSearchParams({ brand });
  if (search?.trim()) {
    params.set('search', search.trim());
  }

  const response = await fetch(`/api/products?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Failed to fetch products: ${response.status}`);
  }

  return data as ExistingProduct[];
}

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
    throw new Error(data.message || data.error || `Scrape failed: ${response.status}`);
  }

  return data as ScrapeResponse;
}
