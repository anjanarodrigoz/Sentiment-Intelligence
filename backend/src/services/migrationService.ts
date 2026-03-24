import { getDB } from '../config/database.js';
import type { Brand } from '../models/Brand.js';

// Brand data extracted from registry.ts
// Maps brand ID to scraper type based on brandScraperMap
const BRAND_DATA: (Omit<Brand, '_id' | 'createdAt' | 'updatedAt'> & { onboarding: boolean })[] = [
  {
    id: 'nike',
    name: 'Nike',
    logoUrl: '/brands/nike.png',
    scraperType: 'nike',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'under-armour',
    name: 'Under Armour',
    logoUrl: '/brands/under-armour.png',
    scraperType: 'bazaarvoice',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'nordstrom',
    name: 'Nordstrom',
    logoUrl: '/brands/nordstrom.png',
    scraperType: 'bazaarvoice',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'the-north-face',
    name: 'The North Face',
    logoUrl: '/brands/the-north-face.png',
    scraperType: 'bazaarvoice',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'columbia',
    name: 'Columbia',
    logoUrl: '/brands/columbia.png',
    scraperType: 'bazaarvoice',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'new-balance',
    name: 'New Balance',
    logoUrl: '/brands/new-balance.png',
    scraperType: 'bazaarvoice',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'lululemon',
    name: 'Lululemon',
    logoUrl: '/brands/lululemon.png',
    scraperType: 'yotpo',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'allbirds',
    name: 'Allbirds',
    logoUrl: '/brands/allbirds.png',
    scraperType: 'yotpo',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'gymshark',
    name: 'Gymshark',
    logoUrl: '/brands/gymshark.png',
    scraperType: 'yotpo',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'adidas',
    name: 'Adidas',
    logoUrl: '/brands/adidas.png',
    scraperType: 'powerreviews',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'jcpenney',
    name: 'JCPenney',
    logoUrl: '/brands/jcpenney.png',
    scraperType: 'powerreviews',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'victorias-secret',
    name: "Victoria's Secret",
    logoUrl: '/brands/victorias-secret.png',
    scraperType: 'victoriassecret',
    isActive: true,
    onboarding: true,
  },
  {
    id: 'amazon',
    name: 'Amazon',
    logoUrl: '/brands/amazon.png',
    scraperType: 'amazon',
    isActive: true,
    onboarding: false,
  },
  {
    id: 'aliexpress',
    name: 'AliExpress',
    logoUrl: '/brands/aliexpress.png',
    scraperType: 'aliexpress',
    isActive: true,
    onboarding: false,
  },
  {
    id: 'alibaba',
    name: 'Alibaba',
    logoUrl: '/brands/alibaba.png',
    scraperType: 'alibaba',
    isActive: true,
    onboarding: false,
  },
  {
    id: 'ebay',
    name: 'eBay',
    logoUrl: '/brands/ebay.png',
    scraperType: 'ebay',
    isActive: true,
    onboarding: false,
  },

  {
    id: 'other',
    name: 'Other',
    logoUrl: '',
    scraperType: 'generic',
    isActive: true,
    onboarding: true,
  },
];

/**
 * Migrates brand data from code to MongoDB
 * Upserts all brands to avoid duplicates
 */
export async function migrateBrands(): Promise<void> {
  const db = getDB();
  const brands = db.collection<Brand>('brands');

  const now = new Date();

  for (const brand of BRAND_DATA) {
    await brands.updateOne(
      { id: brand.id },
      {
        $set: {
          name: brand.name,
          logoUrl: brand.logoUrl,
          scraperType: brand.scraperType,
          isActive: brand.isActive,
          onboarding: brand.onboarding,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }

  console.log(`Successfully migrated ${BRAND_DATA.length} brands to MongoDB`);
}
