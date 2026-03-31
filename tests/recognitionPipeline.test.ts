import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOcrStructuredResult } from '../src/services/scanner/ocrPipeline.ts';
import { OCR_FIXTURES } from './fixtures/ocrFixtures.ts';

test('extracts collector number variants including TG style', () => {
  const result = buildOcrStructuredResult(OCR_FIXTURES.tgStyle);
  assert.ok(result.candidateCollectorNumbers.some((c) => c.raw.toUpperCase().includes('TG04')));
});

test('normalizes OCR-confused digits', () => {
  const result = buildOcrStructuredResult(OCR_FIXTURES.noisyNumber);
  assert.ok(result.candidateCollectorNumbers.length > 0);
});

test('extracts name candidates with suffix', () => {
  const result = buildOcrStructuredResult(OCR_FIXTURES.exactMatch);
  assert.ok(result.candidateNameTexts.some((c) => c.normalized.includes('pikachu')));
});
