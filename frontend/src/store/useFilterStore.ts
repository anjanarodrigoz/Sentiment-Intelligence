import { create } from 'zustand';

interface FilterStoreState {
  sentimentFilter: ('positive' | 'negative' | 'mixed')[];
  attributeFilter: string[];
  ratingFilter: number[];
  keywordSearch: string;

  toggleSentiment: (s: 'positive' | 'negative' | 'mixed') => void;
  toggleAttribute: (attr: string) => void;
  toggleRating: (rating: number) => void;
  setKeywordSearch: (keyword: string) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterStoreState>((set) => ({
  sentimentFilter: [],
  attributeFilter: [],
  ratingFilter: [],
  keywordSearch: '',

  toggleSentiment: (s) =>
    set((state) => ({
      sentimentFilter: state.sentimentFilter.includes(s)
        ? state.sentimentFilter.filter((x) => x !== s)
        : [...state.sentimentFilter, s],
    })),

  toggleAttribute: (attr) =>
    set((state) => ({
      attributeFilter: state.attributeFilter.includes(attr)
        ? state.attributeFilter.filter((x) => x !== attr)
        : [...state.attributeFilter, attr],
    })),

  toggleRating: (rating) =>
    set((state) => ({
      ratingFilter: state.ratingFilter.includes(rating)
        ? state.ratingFilter.filter((x) => x !== rating)
        : [...state.ratingFilter, rating],
    })),

  setKeywordSearch: (keyword) => set({ keywordSearch: keyword }),

  resetFilters: () =>
    set({
      sentimentFilter: [],
      attributeFilter: [],
      ratingFilter: [],
      keywordSearch: '',
    }),
}));
