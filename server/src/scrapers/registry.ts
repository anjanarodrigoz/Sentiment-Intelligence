import type { ReviewScraper } from './types.js';
import { nikeScraper } from './nike.js';
import { underArmourScraper } from './underarmour.js';
import { nordstromScraper } from './nordstrom.js';
import { columbiaScraper } from './columbia.js';
import { theNorthFaceScraper } from './thenorthface.js';
import { lululemonScraper } from './lululemon.js';
import { adidasScraper } from './adidas.js';
import { bazaarVoiceScraper } from './bazaarvoice.js';
import { yotpoScraper } from './yotpo.js';
import { powerReviewsScraper } from './powerreviews.js';
import { victoriaSecretScraper } from './victoriassecret.js';
import { genericScraper } from './generic.js';

const scrapers: ReviewScraper[] = [
  nikeScraper,
  underArmourScraper,
  nordstromScraper,
  columbiaScraper,
  theNorthFaceScraper,
  lululemonScraper,
  adidasScraper,
  bazaarVoiceScraper,
  yotpoScraper,
  powerReviewsScraper,
  victoriaSecretScraper,
  genericScraper, // Fallback — must be last
];

const brandScraperMap: Record<string, ReviewScraper> = {
  nike: nikeScraper,
  'under-armour': underArmourScraper,
  nordstrom: nordstromScraper,
  'the-north-face': theNorthFaceScraper,
  columbia: columbiaScraper,
  'new-balance': bazaarVoiceScraper,
  lululemon: lululemonScraper,
  allbirds: yotpoScraper,
  gymshark: yotpoScraper,
  adidas: adidasScraper,
  jcpenney: powerReviewsScraper,
  'victorias-secret': victoriaSecretScraper,
  other: genericScraper,
};

export function findScraper(url: string): ReviewScraper | null {
  return scrapers.find((s) => s.canHandle(url)) ?? null;
}

export function findScraperByBrand(brand: string): ReviewScraper | null {
  return brandScraperMap[brand] ?? null;
}

export function getSupportedBrands(): { id: string; name: string; logo: string }[] {
  return [
    { id: 'nike', name: 'Nike', logo: '/brands/nike.png' },
    { id: 'under-armour', name: 'Under Armour', logo: '/brands/under-armour.png' },
    { id: 'nordstrom', name: 'Nordstrom', logo: '/brands/nordstrom.png' },
    { id: 'the-north-face', name: 'The North Face', logo: '/brands/the-north-face.png' },
    { id: 'columbia', name: 'Columbia', logo: '/brands/columbia.png' },
    { id: 'new-balance', name: 'New Balance', logo: '/brands/new-balance.png' },
    { id: 'lululemon', name: 'Lululemon', logo: '/brands/lululemon.png' },
    { id: 'allbirds', name: 'Allbirds', logo: '/brands/allbirds.png' },
    { id: 'gymshark', name: 'Gymshark', logo: '/brands/gymshark.png' },
    { id: 'adidas', name: 'Adidas', logo: '/brands/adidas.png' },
    { id: 'jcpenney', name: 'JCPenney', logo: '/brands/jcpenney.png' },
    { id: 'victorias-secret', name: "Victoria's Secret", logo: '/brands/victorias-secret.png' },
    { id: 'other', name: 'Other', logo: '' },
  ];
}
