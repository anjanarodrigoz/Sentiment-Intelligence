import { create } from 'zustand';
import type { AnalysisMode } from '../types/app';
import type { ProductInput, ProductAnalysis } from '../types/product';

interface AppState {
  selectedBrand: string;
  mode: AnalysisMode | null;
  productCount: number;
  products: ProductInput[];
  analyses: ProductAnalysis[];
  aggregateAnalysis: ProductAnalysis | null;
  isProcessing: boolean;
  processingProgress: number;
  processingStatus: string;
  analysisMethod: 'vader' | 'llm' | 'cloud';
  llmModel: string;
  cloudProvider: 'openai' | 'gemini' | 'anthropic';
  cloudApiKey: string;

  setBrand: (brand: string) => void;
  setMode: (mode: AnalysisMode) => void;
  setProductCount: (count: number) => void;
  initProducts: (count: number) => void;
  updateProduct: (id: string, updates: Partial<ProductInput>) => void;
  setAnalyses: (analyses: ProductAnalysis[]) => void;
  setAggregateAnalysis: (analysis: ProductAnalysis | null) => void;
  setProcessing: (isProcessing: boolean, progress?: number, status?: string) => void;
  setAnalysisMethod: (method: 'vader' | 'llm' | 'cloud') => void;
  setLlmModel: (model: string) => void;
  setCloudProvider: (provider: 'openai' | 'gemini' | 'anthropic') => void;
  setCloudApiKey: (key: string) => void;
  reset: () => void;
}

function createEmptyProduct(index: number): ProductInput {
  return {
    id: `product-${index}-${Date.now()}`,
    title: '',
    overallRating: 0,
    overallReviewCount: 0,
    imageUrl: '',
    imageFile: null,
    reviewFile: null,
    reviewFileName: '',
    reviewCount: 0,
    inputMode: 'url',
    brand: '',
    productUrl: '',
    scrapedReviews: null,
  };
}

export const useAppStore = create<AppState>((set) => ({
  selectedBrand: '',
  mode: null,
  productCount: 1,
  products: [],
  analyses: [],
  aggregateAnalysis: null,
  isProcessing: false,
  processingProgress: 0,
  processingStatus: '',
  analysisMethod: localStorage.getItem('sentiment_analysisMethod') as 'vader' | 'llm' | 'cloud' || 'vader',
  llmModel: localStorage.getItem('sentiment_llmModel') || 'gemma3:27b',
  cloudProvider: localStorage.getItem('sentiment_cloudProvider') as 'openai' | 'gemini' | 'anthropic' || 'openai',
  cloudApiKey: localStorage.getItem('sentiment_cloudApiKey') || '',

  setBrand: (brand) => set({ selectedBrand: brand }),

  setMode: (mode) =>
    set({
      mode,
      productCount: mode === 'single' ? 1 : 2,
    }),

  setProductCount: (count) => set({ productCount: count }),

  initProducts: (count) =>
    set({
      products: Array.from({ length: count }, (_, i) => createEmptyProduct(i)),
    }),

  updateProduct: (id, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setAnalyses: (analyses) => set({ analyses }),

  setAggregateAnalysis: (analysis) => set({ aggregateAnalysis: analysis }),

  setProcessing: (isProcessing, progress = 0, status = '') =>
    set({ isProcessing, processingProgress: progress, processingStatus: status }),

  setAnalysisMethod: (method) => {
    localStorage.setItem('sentiment_analysisMethod', method);
    set({ analysisMethod: method });
  },

  setLlmModel: (model) => {
    localStorage.setItem('sentiment_llmModel', model);
    set({ llmModel: model });
  },

  setCloudProvider: (provider) => {
    localStorage.setItem('sentiment_cloudProvider', provider);
    set({ cloudProvider: provider });
  },

  setCloudApiKey: (key) => {
    localStorage.setItem('sentiment_cloudApiKey', key);
    set({ cloudApiKey: key });
  },

  reset: () =>
    set({
      selectedBrand: '',
      mode: null,
      productCount: 1,
      products: [],
      analyses: [],
      aggregateAnalysis: null,
      isProcessing: false,
      processingProgress: 0,
      processingStatus: '',
      analysisMethod: 'vader',
      llmModel: 'gemma3:27b',
    }),
}));
