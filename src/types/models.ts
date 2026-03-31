import { ConfidenceBucket, ScoreBreakdown } from '@/types/recognition';

export type ApiCategory = 3 | 85;

export type TcgSet = {
  id: string;
  apiCategory: ApiCategory;
  name: string;
  code?: string;
  releaseDate?: string;
  favorite: boolean;
  cached: boolean;
  selected: boolean;
  lastSyncedAt?: string;
};

export type TcgCard = {
  id: string;
  setId: string;
  apiCategory: ApiCategory;
  name: string;
  normalizedName: string;
  collectorNumber?: string;
  rarity?: string;
  imageUrl?: string;
  rawPayload: string;
};

export type TcgSku = {
  id: string;
  productId: string;
  variant?: string;
  language?: string;
  condition?: string;
  priceData?: string;
  rawPayload: string;
};

export type CollectionEntry = {
  id: string;
  productId: string;
  skuId?: string;
  quantity: number;
  variant?: string;
  language?: string;
  notes?: string;
  scanConfidence?: number;
  source: 'scan' | 'manual';
  createdAt: string;
  updatedAt: string;
};

export type ScanHistoryEntry = {
  id: string;
  ocrSnapshot: string;
  topCandidatesSnapshot: string;
  chosenProductId?: string;
  chosenSkuId?: string;
  createdAt: string;
};

export type AppSettings = {
  restrictToSelectedSets: boolean;
  autoAddEnabled: boolean;
  confidenceThreshold: number;
  hapticsEnabled: boolean;
  mockModeEnabled: boolean;
};

export type OcrExtraction = {
  rawText: string;
  probableName?: string;
  probableCollectorNumber?: string;
  probableSetHint?: string;
};

export type MatchCandidate = {
  card: TcgCard;
  score: number;
  confidence: number;
  confidenceBucket: ConfidenceBucket;
  reason: string;
  matchedFields: string[];
  scoreBreakdown: ScoreBreakdown;
};

export type MatchResult = {
  top: MatchCandidate | null;
  candidates: MatchCandidate[];
  shouldAutoAdd: boolean;
  debug: {
    usedSelectedSets: boolean;
    poolSize: number;
  };
};
