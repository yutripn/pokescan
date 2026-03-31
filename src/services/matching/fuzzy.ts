import { normalizeText } from '@/utils/text';

export const stringSimilarity = (a: string, b: string): number => {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const maxLen = Math.max(x.length, y.length);
  let matches = 0;
  for (let i = 0; i < Math.min(x.length, y.length); i += 1) if (x[i] === y[i]) matches += 1;
  return matches / maxLen;
};

export const tokenOverlap = (a: string, b: string): number => {
  const aTokens = new Set(normalizeText(a).split(' ').filter(Boolean));
  const bTokens = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (!aTokens.size || !bTokens.size) return 0;
  let overlap = 0;
  for (const token of aTokens) if (bTokens.has(token)) overlap += 1;
  return overlap / Math.max(aTokens.size, bTokens.size);
};

export const suffixAwareNameScore = (query: string, cardName: string): number => {
  const q = normalizeText(query);
  const c = normalizeText(cardName);
  const suffixes = [' ex', ' v', ' vmax', ' vstar', ' gx', ' break'];

  let suffixBoost = 0;
  suffixes.forEach((suffix) => {
    if (q.endsWith(suffix) && c.endsWith(suffix)) suffixBoost += 0.2;
    if (q.endsWith(suffix) && !c.endsWith(suffix) && c.startsWith(q.replace(suffix, ''))) suffixBoost -= 0.25;
  });

  return Math.max(0, Math.min(1, tokenOverlap(q, c) * 0.6 + stringSimilarity(q, c) * 0.4 + suffixBoost));
};
