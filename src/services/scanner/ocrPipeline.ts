import { OcrStructuredResult, RecognizedToken } from '@/types/recognition';
import { normalizeCollectorNumber, normalizeText } from '@/utils/text';

const SUFFIX_TOKENS = ['EX', 'V', 'VMAX', 'VSTAR', 'GX', 'BREAK'];

const cleanLine = (line: string): string =>
  line
    .replace(/[–—−]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[|]/g, '/')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeNumberLike = (token: string): string =>
  token
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/G/g, '6');

const scoreToken = (token: string): number => {
  const hasSlash = token.includes('/');
  const alphaNum = /[A-Z]+\d|\d+[A-Z]/i.test(token);
  const clean = token.replace(/[^A-Z0-9/]/gi, '');
  return Math.min(1, (hasSlash ? 0.5 : 0.2) + (alphaNum ? 0.35 : 0.15) + Math.min(clean.length / 12, 0.2));
};

const extractCollectorNumbers = (lines: string[]): RecognizedToken[] => {
  const candidates: RecognizedToken[] = [];
  const patterns = [
    /\b([A-Z]{1,3}\d{1,3}\/[A-Z]{0,3}\d{1,3})\b/gi,
    /\b(\d{1,3}\/[A-Z]{0,3}\d{1,3})\b/gi,
    /\b([A-Z]{1,3}\d{2,4})\b/gi
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const matches = line.match(pattern) ?? [];
      for (const raw of matches) {
        const normalizedRaw = normalizeNumberLike(raw.replace(/[.,;:]/g, ''));
        candidates.push({ raw, normalized: normalizeCollectorNumber(normalizedRaw) ?? normalizedRaw, score: scoreToken(normalizedRaw) });
      }
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((item, index, arr) => index === arr.findIndex((x) => x.normalized === item.normalized))
    .slice(0, 6);
};

const extractNameCandidates = (lines: string[]): RecognizedToken[] => {
  const candidates: RecognizedToken[] = [];
  const blocked = ['HP', 'WEAKNESS', 'RESISTANCE', 'TRAINER', 'POKEMON'];

  lines.slice(0, 4).forEach((line) => {
    const cleaned = line.replace(/\d+\/?\d*/g, '').trim();
    if (!cleaned || blocked.some((w) => cleaned.toUpperCase().includes(w))) return;

    const words = cleaned.split(' ').filter(Boolean).slice(0, 4);
    if (!words.length) return;

    let raw = words.join(' ');
    const upperRaw = raw.toUpperCase();
    if (SUFFIX_TOKENS.some((suffix) => upperRaw.endsWith(` ${suffix}`) || upperRaw === suffix)) {
      raw = raw.replace(/\s+/g, ' ');
    }
    candidates.push({ raw, normalized: normalizeText(raw), score: Math.min(1, 0.45 + raw.length / 30) });
  });

  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((item, index, arr) => index === arr.findIndex((x) => x.normalized === item.normalized))
    .slice(0, 5);
};

const extractSetHints = (lines: string[]): RecognizedToken[] => {
  const hints = lines
    .flatMap((line) => line.match(/\b(TG|GG|SV|SWSH|SM|XY|BW|DP)[A-Z0-9]*\b/gi) ?? [])
    .map((raw) => ({ raw, normalized: raw.toUpperCase(), score: 0.5 }));

  return hints.slice(0, 4);
};

const inferLanguageHints = (rawText: string): RecognizedToken[] => {
  const jpChars = /[\u3040-\u30ff\u4e00-\u9faf]/.test(rawText);
  if (jpChars) return [{ raw: 'Japanese Script', normalized: 'jp', score: 0.95 }];
  return [{ raw: 'Latin Script', normalized: 'en', score: 0.65 }];
};

export const buildOcrStructuredResult = (rawText: string): OcrStructuredResult => {
  const lines = rawText.split('\n').map(cleanLine).filter(Boolean);
  const normalizedLines = lines.map((line) => normalizeText(line));

  const candidateCollectorNumbers = extractCollectorNumbers(lines);
  const candidateNameTexts = extractNameCandidates(lines);
  const candidateSetHints = extractSetHints(lines);
  const languageHints = inferLanguageHints(rawText);

  return {
    rawText,
    lines,
    normalizedLines,
    candidateNameTexts,
    candidateCollectorNumbers,
    candidateSetHints,
    languageHints,
    confidenceHints: {
      signalQuality: Math.min(1, (candidateCollectorNumbers.length * 0.25) + (candidateNameTexts.length * 0.2)),
      noisyTokenRatio: lines.length ? Math.max(0, 1 - normalizedLines.join(' ').length / rawText.length) : 1
    },
    capturedAt: new Date().toISOString()
  };
};
