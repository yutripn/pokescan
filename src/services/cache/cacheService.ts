import { dbRepo } from '@/db/database';
import { ApiCategory } from '@/types/models';
import { tcgTrackingService } from '@/services/api/tcgTrackingService';

export const cacheService = {
  syncSets: async (category: ApiCategory) => {
    try {
      const sets = await tcgTrackingService.fetchSets(category);
      await dbRepo.upsertSets(sets);
      return sets;
    } catch (error) {
      const fallback = await dbRepo.listSets();
      if (fallback.length) return fallback;
      throw error;
    }
  },
  cacheSetData: async (category: ApiCategory, setId: string) => {
    const [cards, skus] = await Promise.all([
      tcgTrackingService.fetchSetCards(category, setId),
      tcgTrackingService.fetchSetSkus(category, setId)
    ]);
    await dbRepo.replaceSetCards(setId, cards);
    await dbRepo.replaceSetSkus(setId, skus);
    await dbRepo.markSetCached(setId);
    return { cards: cards.length, skus: skus.length };
  }
};
