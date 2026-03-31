import { TcgCard, TcgSku } from '@/types/models';
import { normalizeCollectorNumber, normalizeText } from '@/utils/text';

export type LocalCardIndex = {
  byCollector: Map<string, TcgCard[]>;
  byCollectorPrefix: Map<string, TcgCard[]>;
  byNormalizedName: Map<string, TcgCard[]>;
  bySetCollector: Map<string, TcgCard[]>;
  byNameToken: Map<string, TcgCard[]>;
  skuByProductId: Map<string, TcgSku[]>;
};

const addToMap = <T>(map: Map<string, T[]>, key: string, item: T) => {
  const list = map.get(key) ?? [];
  list.push(item);
  map.set(key, list);
};

export const buildLocalCardIndex = (cards: TcgCard[], skus: TcgSku[] = []): LocalCardIndex => {
  const index: LocalCardIndex = {
    byCollector: new Map(),
    byCollectorPrefix: new Map(),
    byNormalizedName: new Map(),
    bySetCollector: new Map(),
    byNameToken: new Map(),
    skuByProductId: new Map()
  };

  cards.forEach((card) => {
    const collector = normalizeCollectorNumber(card.collectorNumber ?? '');
    const normalizedName = normalizeText(card.name);

    addToMap(index.byNormalizedName, normalizedName, card);
    normalizedName.split(' ').filter(Boolean).forEach((token) => addToMap(index.byNameToken, token, card));

    if (collector) {
      addToMap(index.byCollector, collector, card);
      addToMap(index.bySetCollector, `${card.setId}:${collector}`, card);
      addToMap(index.byCollectorPrefix, collector.slice(0, 2), card);
      addToMap(index.byCollectorPrefix, collector.slice(0, 3), card);
    }
  });

  skus.forEach((sku) => addToMap(index.skuByProductId, sku.productId, sku));
  return index;
};
