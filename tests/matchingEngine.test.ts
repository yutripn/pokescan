import assert from 'node:assert/strict';
import test from 'node:test';
import { matchingEngine } from '../src/services/matching/matchingEngine';
import { buildOcrStructuredResult } from '../src/services/scanner/ocrPipeline';
import { OCR_FIXTURES } from './fixtures/ocrFixtures';

const cards = [
  { id: 'c1', setId: 's1', apiCategory: 3 as const, name: 'Pikachu V', normalizedName: 'pikachu v', collectorNumber: '25', rarity: 'Rare', rawPayload: '{}' },
  { id: 'c2', setId: 's1', apiCategory: 3 as const, name: 'Houndoom', normalizedName: 'houndoom', collectorNumber: 'TG04', rarity: 'Rare', rawPayload: '{}' },
  { id: 'c3', setId: 's2', apiCategory: 3 as const, name: 'Pikachu', normalizedName: 'pikachu', collectorNumber: '25', rarity: 'Common', rawPayload: '{}' }
];

test('selected set restriction improves rank', () => {
  const ocr = buildOcrStructuredResult(OCR_FIXTURES.ambiguous);
  const result = matchingEngine.rankCandidates(ocr, { cards, options: { selectedSetIds: ['s1'], confidenceThreshold: 0.8, autoAddEnabled: false, forceSelectedOnly: true } });
  assert.equal(result.top?.card.setId, 's1');
});

test('suffix bearing names rank correctly', () => {
  const ocr = buildOcrStructuredResult(OCR_FIXTURES.exactMatch);
  const result = matchingEngine.rankCandidates(ocr, { cards, options: { selectedSetIds: ['s1'], confidenceThreshold: 0.8, autoAddEnabled: false, forceSelectedOnly: true } });
  assert.equal(result.top?.card.name, 'Pikachu V');
});
