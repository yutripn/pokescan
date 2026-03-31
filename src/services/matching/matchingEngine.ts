import { buildLocalCardIndex, LocalCardIndex } from '@/services/matching/localIndex';
import { suffixAwareNameScore, tokenOverlap } from '@/services/matching/fuzzy';
import { MatchCandidate, MatchResult, TcgCard, TcgSku } from '@/types/models';
import { ConfidenceBucket, OcrStructuredResult, ScoreBreakdown } from '@/types/recognition';
import { normalizeCollectorNumber, normalizeText } from '@/utils/text';

type MatchOptions = {
  selectedSetIds: string[];
  confidenceThreshold: number;
  autoAddEnabled: boolean;
  forceSelectedOnly?: boolean;
};

type EngineContext = {
  cards: TcgCard[];
  skus?: TcgSku[];
  options: MatchOptions;
};

const bucketFor = (score: number, gap: number, hasExactCollector: boolean): ConfidenceBucket => {
  if (score >= 92 && gap > 22 && hasExactCollector) return 'very_high';
  if (score >= 76 && gap > 12) return 'high';
  if (score >= 58) return 'medium';
  return 'low';
};

const toNumericConfidence = (bucket: ConfidenceBucket): number => ({ very_high: 0.96, high: 0.84, medium: 0.68, low: 0.42 }[bucket]);

const collectFromIndex = (index: LocalCardIndex, ocr: OcrStructuredResult, selectedSetIds: string[]): TcgCard[] => {
  const collectorCandidates = ocr.candidateCollectorNumbers.map((c) => c.normalized);
  const nameCandidates = ocr.candidateNameTexts.map((n) => n.normalized);

  const found = new Map<string, TcgCard>();
  collectorCandidates.forEach((collector) => {
    (index.byCollector.get(normalizeCollectorNumber(collector) ?? collector) ?? []).forEach((card) => found.set(card.id, card));
    selectedSetIds.forEach((setId) => (index.bySetCollector.get(`${setId}:${collector}`) ?? []).forEach((card) => found.set(card.id, card)));
  });

  nameCandidates.forEach((name) => {
    (index.byNormalizedName.get(name) ?? []).forEach((card) => found.set(card.id, card));
    name.split(' ').filter(Boolean).forEach((token) => (index.byNameToken.get(token) ?? []).forEach((card) => found.set(card.id, card)));
  });

  return [...found.values()];
};

const scoreCandidate = (card: TcgCard, ocr: OcrStructuredResult, options: MatchOptions): MatchCandidate => {
  const breakdown: ScoreBreakdown = {
    selectedSetBoost: 0,
    collectorExact: 0,
    collectorPartial: 0,
    collectorFuzzy: 0,
    nameExact: 0,
    nameFuzzy: 0,
    setHint: 0,
    languageHint: 0,
    ambiguityPenalty: 0,
    ocrNoisePenalty: 0
  };

  const normalizedName = normalizeText(card.name);
  const cardCollector = normalizeCollectorNumber(card.collectorNumber ?? '');
  const nameCandidates = ocr.candidateNameTexts.map((n) => n.normalized);
  const collectorCandidates = ocr.candidateCollectorNumbers.map((n) => normalizeCollectorNumber(n.normalized) ?? n.normalized);

  if (options.selectedSetIds.includes(card.setId)) breakdown.selectedSetBoost += 18;

  if (cardCollector && collectorCandidates.includes(cardCollector)) {
    breakdown.collectorExact += 42;
  } else if (cardCollector && collectorCandidates.some((c) => c && (cardCollector.includes(c) || c.includes(cardCollector)))) {
    breakdown.collectorPartial += 26;
  } else if (cardCollector && collectorCandidates.some((c) => c?.slice(0, 2) === cardCollector.slice(0, 2))) {
    breakdown.collectorFuzzy += 12;
  }

  const nameExact = nameCandidates.some((name) => name === normalizedName);
  if (nameExact) breakdown.nameExact += 24;
  else {
    const fuzzy = Math.max(...nameCandidates.map((name) => suffixAwareNameScore(name, card.name)), 0);
    breakdown.nameFuzzy += fuzzy * 22;
  }

  if (ocr.candidateSetHints.some((hint) => normalizeText(card.rawPayload).includes(hint.normalized.toLowerCase()))) {
    breakdown.setHint += 7;
  }

  if (ocr.languageHints.some((hint) => hint.normalized === 'jp') && card.apiCategory === 85) breakdown.languageHint += 6;
  if (ocr.languageHints.some((hint) => hint.normalized === 'en') && card.apiCategory === 3) breakdown.languageHint += 4;

  const ambiguousTokens = nameCandidates.length > 3 ? 1 : 0;
  breakdown.ambiguityPenalty -= ambiguousTokens * 5;
  breakdown.ocrNoisePenalty -= Math.round(ocr.confidenceHints.noisyTokenRatio * 8);

  const score = Object.values(breakdown).reduce((sum, n) => sum + n, 0);
  const matchedFields = [
    breakdown.collectorExact > 0 ? 'collector_exact' : breakdown.collectorPartial > 0 ? 'collector_partial' : '',
    breakdown.nameExact > 0 ? 'name_exact' : breakdown.nameFuzzy > 0 ? 'name_fuzzy' : '',
    breakdown.selectedSetBoost > 0 ? 'selected_set' : ''
  ].filter(Boolean);

  return {
    card,
    score,
    confidence: 0,
    confidenceBucket: 'low',
    reason: matchedFields.join(', ') || 'weak_signals',
    matchedFields,
    scoreBreakdown: breakdown
  };
};

export const matchingEngine = {
  createIndex(cards: TcgCard[], skus: TcgSku[] = []) {
    return buildLocalCardIndex(cards, skus);
  },

  rankCandidates(ocr: OcrStructuredResult, ctx: EngineContext, prebuiltIndex?: LocalCardIndex): MatchResult {
    const selectedOnly = ctx.options.forceSelectedOnly ?? true;
    const scopedCards = selectedOnly && ctx.options.selectedSetIds.length
      ? ctx.cards.filter((card) => ctx.options.selectedSetIds.includes(card.setId))
      : ctx.cards;

    const index = prebuiltIndex ?? buildLocalCardIndex(scopedCards, ctx.skus ?? []);
    const seedCandidates = collectFromIndex(index, ocr, ctx.options.selectedSetIds);
    const pool = seedCandidates.length >= 8 ? seedCandidates : scopedCards;

    const scored = pool.map((card) => scoreCandidate(card, ocr, ctx.options));
    scored.sort((a, b) => b.score - a.score);

    const top = scored[0] ?? null;
    const second = scored[1] ?? null;
    const gap = top && second ? top.score - second.score : 999;

    const finalCandidates = scored.slice(0, 3).map((candidate, idx) => {
      const bucket = bucketFor(candidate.score, idx === 0 ? gap : 0, candidate.scoreBreakdown.collectorExact > 0);
      return { ...candidate, confidenceBucket: bucket, confidence: toNumericConfidence(bucket) };
    });

    const topFinal = finalCandidates[0] ?? null;
    const shouldAutoAdd = Boolean(topFinal && topFinal.confidenceBucket === 'very_high' && ctx.options.autoAddEnabled);

    return {
      top: topFinal,
      candidates: topFinal && topFinal.confidenceBucket === 'very_high' ? [topFinal] : finalCandidates,
      shouldAutoAdd,
      debug: {
        usedSelectedSets: Boolean(selectedOnly && ctx.options.selectedSetIds.length),
        poolSize: pool.length
      }
    };
  }
};
