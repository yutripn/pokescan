export const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeCollectorNumber = (value?: string): string | undefined => {
  if (!value) return undefined;
  const base = value.split('/')[0];
  return base.replace(/[^a-z0-9]/gi, '').toLowerCase();
};

export const extractCollectorNumber = (raw: string): string | undefined => {
  const match = raw.match(/\b([a-z]?\d{1,3}[a-z]?)\s*\/\s*\d{1,3}\b/i) ?? raw.match(/\b([a-z]?\d{1,3}[a-z]?)\b/i);
  return normalizeCollectorNumber(match?.[1]);
};

export const tokenOverlapScore = (a: string, b: string): number => {
  const aTokens = new Set(normalizeText(a).split(' ').filter(Boolean));
  const bTokens = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (!aTokens.size || !bTokens.size) return 0;
  let overlap = 0;
  for (const token of aTokens) if (bTokens.has(token)) overlap += 1;
  return overlap / Math.max(aTokens.size, bTokens.size);
};
