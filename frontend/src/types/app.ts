export type AnalysisMode = 'single' | 'comparison' | 'aggregate';

export interface FilterState {
  sentimentFilter: ('positive' | 'negative' | 'mixed')[];
  attributeFilter: string[];
  ratingFilter: number[];
  keywordSearch: string;
}
