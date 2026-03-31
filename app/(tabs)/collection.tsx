import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { AppButton, Pill, colors } from '@/components/ui';
import { dbRepo } from '@/db/database';

const LANGUAGE_ROTATION = ['EN', 'JP', 'DE', 'FR'];

export default function CollectionScreen() {
  const [query, setQuery] = useState('');
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  const refresh = async () => setRows(await dbRepo.listCollection());
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => rows
    .filter((r) => `${r.card_name} ${r.collector_number} ${r.set_name}`.toLowerCase().includes(query.toLowerCase()))
    .filter((r) => (onlyDuplicates ? r.quantity > 1 : true)), [rows, query, onlyDuplicates]);

  const exportCsv = async () => {
    const lines = [
      'card_name,set,collector_number,variant,language,quantity,date_added',
      ...filtered.map((r) => [r.card_name, r.set_name, r.collector_number, r.variant ?? '', r.language ?? '', r.quantity, r.created_at].map((x: string) => `"${String(x).replace(/"/g, '""')}"`).join(','))
    ];
    const output = `${FileSystem.documentDirectory}collection-export.csv`;
    await FileSystem.writeAsStringAsync(output, lines.join('\n'));
    Alert.alert('CSV Exported', output);
  };

  const cycleLanguage = async (row: any) => {
    const current = row.language ?? 'EN';
    const idx = LANGUAGE_ROTATION.indexOf(current);
    const next = LANGUAGE_ROTATION[(idx + 1) % LANGUAGE_ROTATION.length];
    await dbRepo.updateEntry(row.id, row.quantity, row.variant, next);
    refresh();
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search collection" placeholderTextColor="#7f92a6" />
      <View style={styles.toolbar}>
        <Pressable onPress={() => setOnlyDuplicates((v) => !v)}>
          <Pill label={onlyDuplicates ? 'Duplicates only' : 'All cards'} tone={onlyDuplicates ? 'warning' : 'default'} />
        </Pressable>
        <AppButton label="Export CSV" onPress={exportCsv} style={styles.exportBtn} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No cards in collection yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => setSelectedRow(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.card_name}</Text>
              <Text style={styles.meta}>{item.set_name} · #{item.collector_number ?? '-'} · {item.variant ?? 'Default'} · {item.language ?? 'EN'}</Text>
            </View>
            <View style={styles.qtyCluster}>
              <AppButton label="−" onPress={async () => { await dbRepo.updateEntryQuantity(item.id, Math.max(1, item.quantity - 1)); refresh(); }} style={styles.qtyBtn} />
              <Text style={styles.qty}>{item.quantity}</Text>
              <AppButton label="+" onPress={async () => { await dbRepo.updateEntryQuantity(item.id, item.quantity + 1); refresh(); }} style={styles.qtyBtn} />
            </View>
          </Pressable>
        )}
      />

      <Modal visible={Boolean(selectedRow)} transparent animationType="slide" onRequestClose={() => setSelectedRow(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{selectedRow?.card_name}</Text>
            <Text style={styles.modalMeta}>{selectedRow?.set_name} · #{selectedRow?.collector_number ?? '-'}</Text>
            <Text style={styles.modalMeta}>Qty {selectedRow?.quantity} · {selectedRow?.variant ?? 'Default'} · {selectedRow?.language ?? 'EN'}</Text>
            <AppButton label="Cycle language" onPress={() => selectedRow && cycleLanguage(selectedRow)} />
            <AppButton label="Close" onPress={() => setSelectedRow(null)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 12, gap: 10 },
  search: { backgroundColor: '#152131', color: colors.text, borderRadius: 14, padding: 12, fontSize: 16 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exportBtn: { minHeight: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#101a26', borderRadius: 14, padding: 12, marginBottom: 8 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: '#98adc3', fontSize: 12, marginTop: 3 },
  qtyCluster: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { minHeight: 36, minWidth: 36, paddingHorizontal: 8 },
  qty: { color: colors.text, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  empty: { color: '#8da1b7', padding: 20, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: '#121c28', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, gap: 10 },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  modalMeta: { color: '#9bb1c8' }
});
