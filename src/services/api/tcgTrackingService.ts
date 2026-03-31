import { ApiCategory, TcgCard, TcgSet, TcgSku } from '@/types/models';
import { TcgTrackingCardResponse, TcgTrackingSetResponse, TcgTrackingSkuResponse } from '@/types/api';
import { normalizeText } from '@/utils/text';

const BASE_URL = 'https://tcgtracking.com/tcgapi/v1';

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
};

export const tcgTrackingService = {
  async fetchSets(category: ApiCategory): Promise<TcgSet[]> {
    const data = await request<TcgTrackingSetResponse[]>(`/${category}/sets`);
    return data.map((s) => ({
      id: String(s.id),
      apiCategory: category,
      name: s.name,
      code: s.code,
      releaseDate: s.releaseDate,
      favorite: false,
      cached: false,
      selected: false
    }));
  },

  async searchCards(category: ApiCategory, query: string): Promise<TcgCard[]> {
    const data = await request<TcgTrackingCardResponse[]>(`/${category}/search?q=${encodeURIComponent(query)}`);
    return data.map((c) => ({
      id: String(c.id),
      setId: String(c.setId ?? c.set ?? ''),
      apiCategory: category,
      name: c.name,
      normalizedName: normalizeText(c.name),
      collectorNumber: c.number,
      rarity: c.rarity,
      imageUrl: c.image,
      rawPayload: JSON.stringify(c)
    }));
  },

  async fetchSetCards(category: ApiCategory, setId: string): Promise<TcgCard[]> {
    const data = await request<TcgTrackingCardResponse[]>(`/${category}/sets/${setId}`);
    return data.map((c) => ({
      id: String(c.id),
      setId,
      apiCategory: category,
      name: c.name,
      normalizedName: normalizeText(c.name),
      collectorNumber: c.number,
      rarity: c.rarity,
      imageUrl: c.image,
      rawPayload: JSON.stringify(c)
    }));
  },

  async fetchSetSkus(category: ApiCategory, setId: string): Promise<TcgSku[]> {
    const data = await request<TcgTrackingSkuResponse[]>(`/${category}/sets/${setId}/skus`);
    return data.map((s) => ({
      id: String(s.id),
      productId: String(s.productId ?? ''),
      variant: s.variant ?? s.finish,
      language: s.language,
      condition: s.condition,
      rawPayload: JSON.stringify(s)
    }));
  }
};
