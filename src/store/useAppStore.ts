import { create } from 'zustand';
import type { AnalysisMode } from '../types/app';
import type { ProductInput, ProductAnalysis } from '../types/product';

interface AppState {
  mode: AnalysisMode | null;
  productCount: number;
  products: ProductInput[];
  analyses: ProductAnalysis[];
  aggregateAnalysis: ProductAnalysis | null;
  isProcessing: boolean;
  processingProgress: number;

  setMode: (mode: AnalysisMode) => void;
  setProductCount: (count: number) => void;
  initProducts: (count: number) => void;
  updateProduct: (id: string, updates: Partial<ProductInput>) => void;
  setAnalyses: (analyses: ProductAnalysis[]) => void;
  setAggregateAnalysis: (analysis: ProductAnalysis | null) => void;
  setProcessing: (isProcessing: boolean, progress?: number) => void;
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
  };
}

export const useAppStore = create<AppState>((set) => ({
  mode: null,
  productCount: 1,
  products: [],
  analyses: [],
  aggregateAnalysis: null,
  isProcessing: false,
  processingProgress: 0,

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

  setProcessing: (isProcessing, progress = 0) =>
    set({ isProcessing, processingProgress: progress }),

  reset: () =>
    set({
      mode: null,
      productCount: 1,
      products: [],
      analyses: [],
      aggregateAnalysis: null,
      isProcessing: false,
      processingProgress: 0,
    }),
}));
