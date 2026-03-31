import * as SQLite from 'expo-sqlite';
import { CollectionEntry, ScanHistoryEntry, TcgCard, TcgSet, TcgSku } from '@/types/models';

const db = SQLite.openDatabaseSync('pokescan.db');

export const initDb = async (): Promise<void> => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY,
      api_category INTEGER NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      release_date TEXT,
      favorite INTEGER DEFAULT 0,
      cached INTEGER DEFAULT 0,
      selected INTEGER DEFAULT 0,
      last_synced_at TEXT
    );
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      set_id TEXT NOT NULL,
      api_category INTEGER NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      collector_number TEXT,
      rarity TEXT,
      image_url TEXT,
      raw_payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cards_set_id ON cards(set_id);
    CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(normalized_name);
    CREATE INDEX IF NOT EXISTS idx_cards_collector ON cards(collector_number);
    CREATE INDEX IF NOT EXISTS idx_cards_set_collector ON cards(set_id, collector_number);
    CREATE TABLE IF NOT EXISTS skus (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      variant TEXT,
      language TEXT,
      condition TEXT,
      price_data TEXT,
      raw_payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_skus_product_id ON skus(product_id);
    CREATE TABLE IF NOT EXISTS collection_entries (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku_id TEXT,
      quantity INTEGER NOT NULL,
      variant TEXT,
      language TEXT,
      notes TEXT,
      scan_confidence REAL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scan_history (
      id TEXT PRIMARY KEY,
      ocr_snapshot TEXT NOT NULL,
      top_candidates_snapshot TEXT NOT NULL,
      chosen_product_id TEXT,
      chosen_sku_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
};

export const dbRepo = {
  db,
  upsertSets: async (sets: TcgSet[]) => {
    for (const s of sets) {
      await db.runAsync(
        `INSERT OR REPLACE INTO sets (id, api_category, name, code, release_date, favorite, cached, selected, last_synced_at)
         VALUES (?, ?, ?, ?, ?, COALESCE((SELECT favorite FROM sets WHERE id = ?), 0), COALESCE((SELECT cached FROM sets WHERE id = ?), 0), COALESCE((SELECT selected FROM sets WHERE id = ?), 0), COALESCE((SELECT last_synced_at FROM sets WHERE id = ?), NULL))`,
        [s.id, s.apiCategory, s.name, s.code ?? null, s.releaseDate ?? null, s.id, s.id, s.id, s.id]
      );
    }
  },
  listSets: () => db.getAllAsync<TcgSet>(`SELECT id, api_category as apiCategory, name, code, release_date as releaseDate, favorite, cached, selected, last_synced_at as lastSyncedAt FROM sets ORDER BY name`),
  listSelectedSets: () => db.getAllAsync<TcgSet>(`SELECT id, api_category as apiCategory, name, code, release_date as releaseDate, favorite, cached, selected, last_synced_at as lastSyncedAt FROM sets WHERE selected = 1 ORDER BY name`),
  listSelectedCachedSets: () => db.getAllAsync<TcgSet>(`SELECT id, api_category as apiCategory, name, code, release_date as releaseDate, favorite, cached, selected, last_synced_at as lastSyncedAt FROM sets WHERE selected = 1 AND cached = 1 ORDER BY name`),
  toggleSetSelection: (setId: string) => db.runAsync(`UPDATE sets SET selected = CASE selected WHEN 1 THEN 0 ELSE 1 END WHERE id = ?`, [setId]),
  toggleSetFavorite: (setId: string) => db.runAsync(`UPDATE sets SET favorite = CASE favorite WHEN 1 THEN 0 ELSE 1 END WHERE id = ?`, [setId]),
  markSetCached: (setId: string) => db.runAsync(`UPDATE sets SET cached = 1, last_synced_at = ? WHERE id = ?`, [new Date().toISOString(), setId]),
  clearSetCache: async (setId: string) => {
    await db.runAsync('DELETE FROM skus WHERE product_id IN (SELECT id FROM cards WHERE set_id = ?)', [setId]);
    await db.runAsync('DELETE FROM cards WHERE set_id = ?', [setId]);
    await db.runAsync('UPDATE sets SET cached = 0 WHERE id = ?', [setId]);
  },
  replaceSetCards: async (setId: string, cards: TcgCard[]) => {
    await db.runAsync('DELETE FROM cards WHERE set_id = ?', [setId]);
    for (const c of cards) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cards (id, set_id, api_category, name, normalized_name, collector_number, rarity, image_url, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.setId, c.apiCategory, c.name, c.normalizedName, c.collectorNumber ?? null, c.rarity ?? null, c.imageUrl ?? null, c.rawPayload]
      );
    }
  },
  replaceSetSkus: async (setId: string, skus: TcgSku[]) => {
    await db.runAsync('DELETE FROM skus WHERE product_id IN (SELECT id FROM cards WHERE set_id = ?)', [setId]);
    for (const s of skus) {
      await db.runAsync(
        `INSERT OR REPLACE INTO skus (id, product_id, variant, language, condition, price_data, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.productId, s.variant ?? null, s.language ?? null, s.condition ?? null, s.priceData ?? null, s.rawPayload]
      );
    }
  },
  searchCardsLocal: (query: string, setIds: string[] = []) => {
    const like = `%${query.toLowerCase()}%`;
    if (!setIds.length) {
      return db.getAllAsync<TcgCard>(`SELECT id, set_id as setId, api_category as apiCategory, name, normalized_name as normalizedName, collector_number as collectorNumber, rarity, image_url as imageUrl, raw_payload as rawPayload FROM cards WHERE LOWER(name) LIKE ? OR LOWER(collector_number) LIKE ? LIMIT 120`, [like, like]);
    }
    const placeholders = setIds.map(() => '?').join(',');
    return db.getAllAsync<TcgCard>(`SELECT id, set_id as setId, api_category as apiCategory, name, normalized_name as normalizedName, collector_number as collectorNumber, rarity, image_url as imageUrl, raw_payload as rawPayload FROM cards WHERE (LOWER(name) LIKE ? OR LOWER(collector_number) LIKE ?) AND set_id IN (${placeholders}) LIMIT 120`, [like, like, ...setIds]);
  },
  getCardsForMatching: (setIds: string[] = []) => {
    if (!setIds.length) {
      return db.getAllAsync<TcgCard>(`SELECT id, set_id as setId, api_category as apiCategory, name, normalized_name as normalizedName, collector_number as collectorNumber, rarity, image_url as imageUrl, raw_payload as rawPayload FROM cards LIMIT 4000`);
    }
    const placeholders = setIds.map(() => '?').join(',');
    return db.getAllAsync<TcgCard>(`SELECT id, set_id as setId, api_category as apiCategory, name, normalized_name as normalizedName, collector_number as collectorNumber, rarity, image_url as imageUrl, raw_payload as rawPayload FROM cards WHERE set_id IN (${placeholders}) LIMIT 4000`, setIds);
  },
  getSkusByProductId: (productId: string) => db.getAllAsync<TcgSku>(`SELECT id, product_id as productId, variant, language, condition, price_data as priceData, raw_payload as rawPayload FROM skus WHERE product_id = ?`, [productId]),
  addCollectionEntry: (entry: CollectionEntry) => db.runAsync(`INSERT INTO collection_entries (id, product_id, sku_id, quantity, variant, language, notes, scan_confidence, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [entry.id, entry.productId, entry.skuId ?? null, entry.quantity, entry.variant ?? null, entry.language ?? null, entry.notes ?? null, entry.scanConfidence ?? null, entry.source, entry.createdAt, entry.updatedAt]),
  listCollection: () => db.getAllAsync<any>(`SELECT ce.*, c.name as card_name, c.collector_number, s.name as set_name FROM collection_entries ce JOIN cards c ON c.id = ce.product_id LEFT JOIN sets s ON s.id = c.set_id ORDER BY ce.updated_at DESC`),
  updateEntry: (id: string, quantity: number, variant?: string, language?: string) => db.runAsync(`UPDATE collection_entries SET quantity = ?, variant = ?, language = ?, updated_at = ? WHERE id = ?`, [quantity, variant ?? null, language ?? null, new Date().toISOString(), id]),
  updateEntryQuantity: (id: string, quantity: number) => db.runAsync(`UPDATE collection_entries SET quantity = ?, updated_at = ? WHERE id = ?`, [quantity, new Date().toISOString(), id]),
  deleteLastCollectionEntry: () => db.runAsync(`DELETE FROM collection_entries WHERE id = (SELECT id FROM collection_entries ORDER BY created_at DESC LIMIT 1)`),
  addScanHistory: (entry: ScanHistoryEntry) => db.runAsync(`INSERT INTO scan_history (id, ocr_snapshot, top_candidates_snapshot, chosen_product_id, chosen_sku_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [entry.id, entry.ocrSnapshot, entry.topCandidatesSnapshot, entry.chosenProductId ?? null, entry.chosenSkuId ?? null, entry.createdAt]),
  listRecentScanHistory: () => db.getAllAsync<ScanHistoryEntry>(`SELECT id, ocr_snapshot as ocrSnapshot, top_candidates_snapshot as topCandidatesSnapshot, chosen_product_id as chosenProductId, chosen_sku_id as chosenSkuId, created_at as createdAt FROM scan_history ORDER BY created_at DESC LIMIT 20`),
  saveSetting: (key: string, value: string) => db.runAsync(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [key, value]),
  getSetting: async (key: string) => {
    const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM app_settings WHERE key = ?`, [key]);
    return row?.value;
  },
  clearHistory: () => db.runAsync(`DELETE FROM scan_history`)
};
