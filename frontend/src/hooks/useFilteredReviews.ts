import { useMemo } from 'react';
import { useFilterStore } from '../store/useFilterStore';
import type { AnalyzedReview } from '../types/review';

export function useFilteredReviews(reviews: AnalyzedReview[]) {
  const { sentimentFilter, attributeFilter, ratingFilter, keywordSearch } =
    useFilterStore();

  return useMemo(() => {
    return reviews.filter((review) => {
      if (
        sentimentFilter.length > 0 &&
        !sentimentFilter.includes(review.sentiment.classification)
      )
        return false;

      if (
        attributeFilter.length > 0 &&
        !review.attributes.some((a) => attributeFilter.includes(a))
      )
        return false;

      if (
        ratingFilter.length > 0 &&
        !ratingFilter.includes(Math.round(review.rating))
      )
        return false;

      if (
        keywordSearch &&
        !review.text.toLowerCase().includes(keywordSearch.toLowerCase())
      )
        return false;

      return true;
    });
  }, [reviews, sentimentFilter, attributeFilter, ratingFilter, keywordSearch]);
}
