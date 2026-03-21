import type { AnalyzedReview, RawReview } from '../types/review';

function escapeCsvCell(cell: string | number | undefined | null): string {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportReviewsToCsv(
  reviews: RawReview[] | AnalyzedReview[],
  filename: string = 'reviews.csv'
) {
  if (!reviews || reviews.length === 0) return;

  // Check if first item has analyzed fields
  const isAnalyzed = 'sentiment' in reviews[0];

  const headers = ['Date', 'Rating', 'Text'];
  if (isAnalyzed) {
    headers.push('Sentiment', 'Attributes', 'Keywords');
  }

  const csvRows = [headers.join(',')];

  for (const review of reviews) {
    const row = [
      escapeCsvCell(review.date),
      escapeCsvCell(review.rating),
      escapeCsvCell(review.text),
    ];

    if (isAnalyzed) {
      const analyzed = review as AnalyzedReview;
      row.push(
        escapeCsvCell(analyzed.sentiment?.classification || ''),
        escapeCsvCell(analyzed.attributes?.join(', ') || ''),
        escapeCsvCell(analyzed.keywords?.join(', ') || '')
      );
    }
    csvRows.push(row.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link); // Required for specific browsers like old FF
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
