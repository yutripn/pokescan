import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton, Pill, colors } from '@/components/ui';
import { cacheService } from '@/services/cache/cacheService';
import { dbRepo } from '@/db/database';
import { TcgSet } from '@/types/models';

export default function SetsScreen() {
  const [query, setQuery] = useState('');
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [busySetId, setBusySetId] = useState<string | null>(null);
  const [globalBusy, setGlobalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => setSets(await dbRepo.listSets());
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => sets.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())), [sets, query]);
  const selected = sets.filter((s) => s.selected);
  const cached = sets.filter((s) => s.cached);

  const cacheSelected = async () => {
    setGlobalBusy(true);
    setError(null);
    try {
      for (const set of selected) await cacheService.cacheSetData(set.apiCategory, set.id);
      await refresh();
    } catch {
      setError('Could not cache selected sets. Check connection and try again.');
    } finally {
      setGlobalBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search sets" placeholderTextColor="#77889b" />
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Pill label={`${selected.length} selected`} tone="accent" />
          <Pill label={`${cached.length} cached`} tone="success" />
          <Pill label="Selected sets improve scan speed" />
        </View>
        <AppButton label={globalBusy ? 'Caching…' : 'Cache Selected'} onPress={cacheSelected} variant="primary" />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No sets match your search.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, item.selected && styles.rowSelected]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.cached ? `Cached ${item.lastSyncedAt?.slice(0, 10) ?? ''}` : 'Not cached yet'}</Text>
            </View>
            <AppButton label={item.selected ? 'Selected' : 'Select'} onPress={async () => { await dbRepo.toggleSetSelection(item.id); refresh(); }} style={styles.smallBtn} />
            <AppButton label={busySetId === item.id ? '…' : 'Cache'} onPress={async () => { setBusySetId(item.id); try { await cacheService.cacheSetData(item.apiCategory, item.id); } finally { setBusySetId(null); refresh(); } }} style={styles.smallBtn} />
            <AppButton label="Clear" onPress={async () => { await dbRepo.clearSetCache(item.id); refresh(); }} variant="ghost" style={styles.smallBtn} />
            {busySetId === item.id && <ActivityIndicator style={{ marginLeft: 6 }} />}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12, gap: 10 },
  search: { backgroundColor: '#152131', color: colors.text, borderRadius: 14, padding: 12, fontSize: 16 },
  summaryCard: { backgroundColor: '#121d2a', borderRadius: 16, padding: 12, gap: 10 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f1823', padding: 10, borderRadius: 12, marginBottom: 8 },
  rowSelected: { borderWidth: 1, borderColor: '#3e7fc0' },
  name: { color: colors.text, fontWeight: '700' },
  meta: { color: '#92a8be', fontSize: 12, marginTop: 2 },
  smallBtn: { minHeight: 38, paddingHorizontal: 10 },
  error: { color: '#ffbcbc' },
  empty: { color: '#8ea2b7', padding: 16, textAlign: 'center' }
});
