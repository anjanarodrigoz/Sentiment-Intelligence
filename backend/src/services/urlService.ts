import crypto from 'crypto';

/**
 * Normalizes a product URL to prevent duplicates
 * - Converts domain to lowercase
 * - Removes trailing slashes
 * - Removes tracking parameters
 * - Sorts remaining query parameters
 */
export function normalizeProductUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Tracking parameters to remove
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'source',
      'referer',
      'referrer',
      'fbclid',
      'gclid',
      'msclkid',
      '_ga',
      '_gl',
    ];

    // Remove tracking parameters
    trackingParams.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    // Sort remaining query parameters for consistency
    const sortedParams = new URLSearchParams(
      Array.from(parsed.searchParams.entries()).sort()
    );

    // Remove trailing slashes from pathname
    let pathname = parsed.pathname.replace(/\/+$/, '');
    if (!pathname) pathname = '/';

    // Build normalized URL
    const normalized = `${parsed.origin.toLowerCase()}${pathname}${
      sortedParams.toString() ? '?' + sortedParams.toString() : ''
    }`;

    return normalized;
  } catch (error) {
    // If URL parsing fails, return original URL
    console.error('URL normalization failed:', error);
    return url;
  }
}

/**
 * Creates an MD5 hash of a URL for fast database lookups
 */
export function hashUrl(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}
