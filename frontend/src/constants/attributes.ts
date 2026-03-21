import type { AttributeTag } from '../types/review';

export const ATTRIBUTE_KEYWORDS: Record<AttributeTag, string[]> = {
  fit: [
    'fit', 'fitting', 'size', 'sizing', 'tight', 'loose', 'snug', 'baggy',
    'true to size', 'runs small', 'runs large', 'oversized', 'undersized',
    'waist', 'length', 'hem', 'roomy', 'narrow', 'wide',
  ],
  material: [
    'material', 'fabric', 'cotton', 'polyester', 'linen', 'silk', 'leather',
    'suede', 'denim', 'knit', 'woven', 'thread', 'stitching', 'blend',
    'synthetic', 'organic', 'wool', 'cashmere', 'nylon', 'spandex', 'lycra',
  ],
  aesthetic: [
    'look', 'looks', 'style', 'stylish', 'color', 'colour', 'design',
    'pattern', 'print', 'beautiful', 'elegant', 'ugly', 'attractive',
    'appearance', 'fashionable', 'trendy', 'classic', 'cute', 'chic',
  ],
  price: [
    'price', 'cost', 'value', 'expensive', 'cheap', 'affordable',
    'overpriced', 'worth', 'bargain', 'deal', 'money', 'budget',
    'premium', 'economical', 'pricey',
  ],
  comfort: [
    'comfort', 'comfortable', 'comfy', 'uncomfortable', 'soft', 'cozy',
    'breathable', 'irritating', 'scratchy', 'smooth', 'gentle', 'cushion',
    'support', 'wearable', 'lightweight',
  ],
  quality: [
    'quality', 'well-made', 'poorly-made', 'construction', 'craftsmanship',
    'build', 'cheap-looking', 'high-end', 'low-quality', 'sturdy', 'robust',
    'solid', 'flimsy', 'excellent',
  ],
  functionality: [
    'function', 'functional', 'practical', 'useful', 'feature', 'pocket',
    'zipper', 'button', 'closure', 'adjustable', 'versatile', 'multipurpose',
    'waterproof', 'stretch', 'stretchy',
  ],
  workmanship: [
    'sewing', 'seam', 'stitch', 'stitching', 'hemming', 'crafted',
    'handmade', 'finish', 'finishing', 'detail', 'detailing', 'tailored',
    'tailoring', 'embroidery', 'unraveling',
  ],
  performance: [
    'perform', 'performance', 'wash', 'washing', 'shrink', 'fade',
    'fading', 'wrinkle', 'iron', 'maintain', 'maintenance', 'hold up',
    'wear and tear', 'lasting', 'pilling',
  ],
  durability: [
    'durable', 'durability', 'last', 'lasting', 'long-lasting', 'wear out',
    'worn out', 'tear', 'rip', 'break', 'broke', 'fragile', 'resilient',
    'tough', 'withstand', 'endure',
  ],
};

export const ATTRIBUTE_LABELS: Record<AttributeTag, string> = {
  fit: 'Fit',
  material: 'Material',
  aesthetic: 'Aesthetics',
  price: 'Price',
  comfort: 'Comfort',
  quality: 'Quality',
  functionality: 'Functionality',
  workmanship: 'Workmanship',
  performance: 'Performance',
  durability: 'Durability',
};
