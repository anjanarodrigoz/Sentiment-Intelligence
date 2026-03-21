import 'dotenv/config';
import { connectDB, closeDB } from '../config/database.js';
import { getCachedScrape } from '../services/cacheService.js';
import { hashUrl, normalizeProductUrl } from '../services/urlService.js';

async function testCache() {
  await connectDB();

  // Get the actual URL from the database
  const db = (await import('../config/database.js')).getDB();
  const product = await db.collection('products').findOne({});

  if (!product) {
    console.log('No products found in database');
    await closeDB();
    return;
  }

  console.log('Testing cache for product:', product.title);
  console.log('URL:', product.url);
  console.log('');

  const normalizedUrl = normalizeProductUrl(product.url);
  const urlHash = hashUrl(normalizedUrl);

  const cached = await getCachedScrape(normalizedUrl, urlHash);

  if (cached) {
    console.log('✅ Cache hit!');
    console.log('');
    console.log('Product data:');
    console.log('- Title:', cached.product.title);
    console.log('- Rating:', cached.product.rating);
    console.log('- Review Count:', cached.product.reviewCount);
    console.log('');
    console.log('Reviews:');
    console.log('- Total reviews returned:', cached.reviews.length);
    console.log('- First review text length:', cached.reviews[0]?.text?.length || 0);
    console.log('- Reviews array is valid:', Array.isArray(cached.reviews));
    console.log('');
    console.log('Metadata:');
    console.log('- Cached:', cached.cached);
    console.log('- Version:', cached.version);
    console.log('- Source:', cached.source);
    console.log('- Scraped at:', cached.scrapedAt);
  } else {
    console.log('❌ No cache found');
  }

  await closeDB();
}

testCache().catch(console.error);
