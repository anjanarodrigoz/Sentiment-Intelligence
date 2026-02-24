import puppeteer, { type Browser } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteerExtra.use(StealthPlugin());

let browser: Browser | null = null;
let stealthBrowser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

/**
 * Stealth browser using puppeteer-extra-plugin-stealth.
 * Bypasses bot detection (Akamai, PerimeterX, etc.) by patching
 * browser fingerprint signals that headless detectors check.
 */
export async function getStealthBrowser(): Promise<Browser> {
  if (!stealthBrowser || !stealthBrowser.connected) {
    stealthBrowser = await puppeteerExtra.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    }) as unknown as Browser;
  }
  return stealthBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
  if (stealthBrowser) {
    await stealthBrowser.close();
    stealthBrowser = null;
  }
}
