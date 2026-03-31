import { useEffect, useState } from 'react';
import { initDb } from '@/db/database';
import { cacheService } from '@/services/cache/cacheService';

export const useAppBootstrap = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        await cacheService.syncSets(3);
        await cacheService.syncSets(85);
        setReady(true);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  return { ready, error };
};
