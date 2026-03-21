import type { RawReview } from '../types/review';

const TEXT_SYNONYMS = ['text', 'review', 'review_text', 'comment', 'feedback', 'body', 'content', 'description'];
const RATING_SYNONYMS = ['rating', 'stars', 'score', 'star_rating', 'star'];
const DATE_SYNONYMS = ['date', 'review_date', 'created_at', 'created', 'timestamp', 'time', 'posted'];

function findColumnIndex(headers: string[], synonyms: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, '_'));
  for (const syn of synonyms) {
    const idx = normalized.indexOf(syn.replace(/[\s_-]+/g, '_'));
    if (idx !== -1) return idx;
  }
  // Partial match
  for (const syn of synonyms) {
    const idx = normalized.findIndex((h) => h.includes(syn.replace(/[\s_-]+/g, '_')));
    if (idx !== -1) return idx;
  }
  return -1;
}

function findJsonField(obj: Record<string, unknown>, synonyms: string[]): string | null {
  const keys = Object.keys(obj).map((k) => k.toLowerCase().trim().replace(/[\s_-]+/g, '_'));
  const originalKeys = Object.keys(obj);
  for (const syn of synonyms) {
    const idx = keys.indexOf(syn.replace(/[\s_-]+/g, '_'));
    if (idx !== -1) return originalKeys[idx];
  }
  for (const syn of synonyms) {
    const idx = keys.findIndex((k) => k.includes(syn.replace(/[\s_-]+/g, '_')));
    if (idx !== -1) return originalKeys[idx];
  }
  return null;
}

export async function parseExcelFile(file: File): Promise<RawReview[]> {
  const readXlsxFile = (await import('read-excel-file')).default;
  const rows = await readXlsxFile(file);

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => String(h));
  const textIdx = findColumnIndex(headers, TEXT_SYNONYMS);
  const ratingIdx = findColumnIndex(headers, RATING_SYNONYMS);
  const dateIdx = findColumnIndex(headers, DATE_SYNONYMS);

  if (textIdx === -1) {
    throw new Error('Could not find a review text column. Expected columns: ' + TEXT_SYNONYMS.join(', '));
  }

  return rows.slice(1).map((row) => ({
    text: String(row[textIdx] || ''),
    rating: ratingIdx !== -1 ? Number(row[ratingIdx]) || 0 : 0,
    date: dateIdx !== -1 ? String(row[dateIdx] || '') : '',
  })).filter((r) => r.text.trim().length > 0);
}

export async function parseJsonFile(file: File): Promise<RawReview[]> {
  const text = await file.text();
  const data = JSON.parse(text);
  const reviews: unknown[] = Array.isArray(data) ? data : data.reviews || data.data || [];

  if (reviews.length === 0) {
    throw new Error('No reviews found in JSON file. Expected an array or an object with a "reviews" key.');
  }

  const sample = reviews[0] as Record<string, unknown>;
  const textField = findJsonField(sample, TEXT_SYNONYMS);
  const ratingField = findJsonField(sample, RATING_SYNONYMS);
  const dateField = findJsonField(sample, DATE_SYNONYMS);

  if (!textField) {
    throw new Error('Could not find a review text field. Expected fields: ' + TEXT_SYNONYMS.join(', '));
  }

  return reviews.map((r) => {
    const review = r as Record<string, unknown>;
    return {
      text: String(review[textField] || ''),
      rating: ratingField ? Number(review[ratingField]) || 0 : 0,
      date: dateField ? String(review[dateField] || '') : '',
    };
  }).filter((r) => r.text.trim().length > 0);
}

export async function parseReviewFile(file: File): Promise<RawReview[]> {
  if (file.name.endsWith('.json')) {
    return parseJsonFile(file);
  }
  return parseExcelFile(file);
}
