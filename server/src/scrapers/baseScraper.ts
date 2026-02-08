import type { Page } from 'puppeteer';
import { getBrowser } from '../utils/browser.js';
import { getRandomUserAgent } from '../utils/userAgent.js';

export async function createPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(getRandomUserAgent());
  await page.setViewport({ width: 1280, height: 800 });

  // Block heavy resources to speed up loading
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  return page;
}

/**
 * Creates a page that allows ALL resources to load.
 * Required for SPA sites (like Nike) where reviews render via JavaScript.
 */
export async function createFullPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(getRandomUserAgent());
  await page.setViewport({ width: 1280, height: 800 });

  return page;
}

export async function closePage(page: Page): Promise<void> {
  try {
    await page.close();
  } catch {
    // Page may already be closed
  }
}
