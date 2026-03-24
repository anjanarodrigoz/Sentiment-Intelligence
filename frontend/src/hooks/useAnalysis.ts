import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { parseReviewFile } from '../services/fileParser';
import { analyzeAllReviews, computeSentimentSummary } from '../services/sentimentAnalyzer';
import { analyzeReviewsWithLLMStream } from '../services/llmAnalyzer';
import { computeAttributeCounts } from '../services/attributeExtractor';
import { extractKeywords } from '../services/keywordExtractor';
import { generateSellingPoints } from '../services/sellingPointsGenerator';
import { aggregateAnalyses } from '../services/aggregator';
import type { ProductAnalysis } from '../types/product';
import type { RatingDistribution } from '../types/analysis';
import type { AnalyzedReview } from '../types/review';

function computeRatingDistribution(reviews: { rating: number }[]): RatingDistribution {
  const dist: RatingDistribution = {
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0,
  };
  for (const r of reviews) {
    const rounded = Math.round(r.rating);
    if (rounded >= 5) dist.fiveStar++;
    else if (rounded === 4) dist.fourStar++;
    else if (rounded === 3) dist.threeStar++;
    else if (rounded === 2) dist.twoStar++;
    else dist.oneStar++;
  }
  return dist;
}

export function useAnalysis() {
  const { products, mode, setAnalyses, setAggregateAnalysis, setProcessing } =
    useAppStore();

  const runAnalysis = useCallback(async () => {
    setProcessing(true, 0, 'Starting analysis...');

    try {
      const analyses: ProductAnalysis[] = [];

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const productLabel = products.length > 1 ? `Product ${i + 1}: ` : '';
        
        setProcessing(true, Math.round(((i + 0.1) / products.length) * 100), `${productLabel}Preparing data...`);

        // 1. Get reviews from file or URL scrape
        let rawReviews;
        if ((product.inputMode === 'url' || product.inputMode === 'existing') && product.scrapedReviews) {
          rawReviews = product.scrapedReviews;
        } else if (product.reviewFile) {
          rawReviews = await parseReviewFile(product.reviewFile);
        } else {
          throw new Error(`No review data for "${product.title}"`);
        }

        // 2. Analyze reviews (VADER, Local LLM, or Cloud LLM based on user selection)
        const { analysisMethod, llmModel, cloudProvider, cloudApiKey } = useAppStore.getState();
        
        let analyzedReviews: AnalyzedReview[];
        if (analysisMethod === 'vader') {
          setProcessing(true, Math.round(((i + 0.3) / products.length) * 100), `${productLabel}VADER sentiment analysis...`);
          analyzedReviews = analyzeAllReviews(rawReviews);
        } else {
          const provider = analysisMethod === 'cloud' ? cloudProvider : 'ollama';
          analyzedReviews = await analyzeReviewsWithLLMStream(
            rawReviews,
            llmModel,
            provider,
            analysisMethod === 'cloud' ? cloudApiKey : undefined,
            (_, index, total) => {
              const subProgress = (index / total) * 0.6; // 60% of product progress is LLM analysis
              const overallProgress = ((i + 0.2 + subProgress) / products.length) * 100;
              setProcessing(true, Math.round(overallProgress), `${productLabel}Analyzed ${index}/${total} reviews...`);
            }
          );
        }
        
        setProcessing(true, Math.round(((i + 0.9) / products.length) * 100), `${productLabel}Generating summaries...`);

        // 3. Compute summaries
        const sentimentSummary = computeSentimentSummary(analyzedReviews);
        const attributeCounts = computeAttributeCounts(analyzedReviews);
        const topKeywords = extractKeywords(analyzedReviews);
        const topSellingPoints = generateSellingPoints(analyzedReviews);
        const ratingDistribution = computeRatingDistribution(analyzedReviews);

        // Resolve image URL
        let imageUrl = product.imageUrl;
        if (product.imageFile) {
          imageUrl = URL.createObjectURL(product.imageFile);
        }

        analyses.push({
          productId: product.id,
          title: product.title,
          imageUrl,
          overallRating: product.overallRating,
          overallReviewCount: product.overallReviewCount,
          reviews: analyzedReviews,
          sentimentSummary,
          attributeCounts,
          ratingDistribution,
          topSellingPoints,
          topKeywords,
        });
      }

      setAnalyses(analyses);

      if (mode === 'aggregate') {
        setAggregateAnalysis(aggregateAnalyses(analyses));
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  }, [products, mode, setAnalyses, setAggregateAnalysis, setProcessing]);

  return { runAnalysis };
}
