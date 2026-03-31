export type OcrBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RecognizedToken = {
  raw: string;
  normalized: string;
  score: number;
};

export type OcrStructuredResult = {
  rawText: string;
  lines: string[];
  normalizedLines: string[];
  candidateNameTexts: RecognizedToken[];
  candidateCollectorNumbers: RecognizedToken[];
  candidateSetHints: RecognizedToken[];
  languageHints: RecognizedToken[];
  confidenceHints: {
    signalQuality: number;
    noisyTokenRatio: number;
  };
  regions?: OcrBoundingBox[];
  capturedAt: string;
};

export type ConfidenceBucket = 'very_high' | 'high' | 'medium' | 'low';

export type ScoreBreakdown = {
  selectedSetBoost: number;
  collectorExact: number;
  collectorPartial: number;
  collectorFuzzy: number;
  nameExact: number;
  nameFuzzy: number;
  setHint: number;
  languageHint: number;
  ambiguityPenalty: number;
  ocrNoisePenalty: number;
};
