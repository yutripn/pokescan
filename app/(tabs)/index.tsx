import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ResultPanel } from '@/components/ResultPanel';
import { AppButton, colors, Pill } from '@/components/ui';
import { dbRepo } from '@/db/database';
import { matchingEngine } from '@/services/matching/matchingEngine';
import { reviewQueue } from '@/services/matching/reviewQueue';
import { scannerService } from '@/services/scanner/scannerService';
import { AppSettings, MatchCandidate, MatchResult, ScanHistoryEntry, TcgCard, TcgSet, TcgSku } from '@/types/models';
import { OcrStructuredResult } from '@/types/recognition';

const defaultSettings: AppSettings = {
  restrictToSelectedSets: true,
  autoAddEnabled: false,
  confidenceThreshold: 0.86,
  hapticsEnabled: true,
  mockModeEnabled: true
};

export default function ScanScreen() {
  const [scanning, setScanning] = useState(true);
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [cards, setCards] = useState<TcgCard[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [reviewCandidates, setReviewCandidates] = useState<MatchCandidate[]>([]);
  const [variants, setVariants] = useState<TcgSku[]>([]);
  const [recentScans, setRecentScans] = useState<ScanHistoryEntry[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [settings, setSettings] = useState(defaultSettings);
  const [showScopePicker, setShowScopePicker] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [debugText, setDebugText] = useState('');
  const lastHandledAtRef = useRef(0);

  const selectedSetIds = useMemo(() => sets.filter((s) => s.selected).map((s) => s.id), [sets]);
  const pendingReviewCount = reviewQueue.list().filter((i) => i.status === 'pending').length;

  const refreshLocalData = async () => {
    const scoped = settings.restrictToSelectedSets ? selectedSetIds : [];
    const [cardsForMatching, history, latestSets] = await Promise.all([
      dbRepo.getCardsForMatching(scoped),
      dbRepo.listRecentScanHistory(),
      dbRepo.listSets()
    ]);
    setCards(cardsForMatching);
    setRecentScans(history);
    setSets(latestSets);
  };

  useEffect(() => {
    refreshLocalData();
  }, [selectedSetIds.join(','), settings.restrictToSelectedSets]);

  useEffect(() => {
    if (!scanning) return;
    const provider = scannerService.createProvider(settings.mockModeEnabled ? 'mock' : 'live');
    provider.start(handleRecognition);
    return () => { provider.stop(); };
  }, [scanning, cards.length, selectedSetIds.join(','), settings.mockModeEnabled]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1100);
  };

  const handleRecognition = async (ocr: OcrStructuredResult) => {
    const nowMs = Date.now();
    if (nowMs - lastHandledAtRef.current < 750) return;
    lastHandledAtRef.current = nowMs;
    if (!cards.length) return;

    const match = matchingEngine.rankCandidates(ocr, {
      cards,
      options: {
        selectedSetIds,
        autoAddEnabled: settings.autoAddEnabled,
        confidenceThreshold: settings.confidenceThreshold,
        forceSelectedOnly: settings.restrictToSelectedSets
      }
    });

    setResult(match);
    setReviewCandidates(match.candidates);

    if (match.top) {
      setVariants(await dbRepo.getSkusByProductId(match.top.card.id));
      setDebugText(`name=${ocr.candidateNameTexts.map((n) => n.raw).join('|')} num=${ocr.candidateCollectorNumbers.map((n) => n.raw).join('|')} score=${match.top.score.toFixed(0)}`);
    }

    await dbRepo.addScanHistory({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ocrSnapshot: ocr.rawText,
      topCandidatesSnapshot: JSON.stringify(match.candidates.map((c) => ({ id: c.card.id, score: c.score, bucket: c.confidenceBucket }))),
      chosenProductId: match.top?.card.id,
      createdAt: new Date().toISOString()
    });
    setRecentScans(await dbRepo.listRecentScanHistory());

    if (match.top && (match.top.confidenceBucket === 'medium' || match.top.confidenceBucket === 'low')) {
      reviewQueue.add(ocr, match.candidates);
    }

    if (match.shouldAutoAdd) await addCard();
  };

  const addCard = async () => {
    const top = result?.top;
    if (!top) return;
    const now = new Date().toISOString();
    await dbRepo.addCollectionEntry({
      id: `${top.card.id}-${Date.now()}`,
      productId: top.card.id,
      skuId: variants[0]?.id,
      quantity,
      variant: variants[0]?.variant,
      language: variants[0]?.language,
      scanConfidence: top.confidence,
      source: 'scan',
      createdAt: now,
      updatedAt: now
    });
    setQuantity(1);
    showToast(`Added ${top.card.name}`);
    if (settings.hapticsEnabled) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const chooseCandidate = async (candidate: MatchCandidate) => {
    setResult((prev) => (prev ? { ...prev, top: candidate } : prev));
    setVariants(await dbRepo.getSkusByProductId(candidate.card.id));
    setShowCandidates(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.overlayTop}>
        <View style={styles.scopeRow}>
          <Pressable style={styles.scopeChip} onPress={() => setShowScopePicker(true)}>
            <Text style={styles.scopeChipText}>{settings.restrictToSelectedSets ? `Selected Sets (${selectedSetIds.length})` : 'All Sets'}</Text>
          </Pressable>
          <Pill label={scanning ? 'Live' : 'Paused'} tone={scanning ? 'success' : 'warning'} />
          <Pill label={`Review ${pendingReviewCount}`} tone={pendingReviewCount ? 'warning' : 'default'} />
        </View>

        <View style={styles.topActions}>
          <AppButton label={scanning ? 'Pause' : 'Resume'} onPress={() => setScanning((s) => !s)} />
          <AppButton label="Torch" onPress={() => Alert.alert('Torch ready for camera provider')} />
          <AppButton label="Scope" onPress={() => setShowScopePicker(true)} />
        </View>
      </View>

      <View style={styles.cameraArea}>
        <Text style={styles.cameraHint}>Point card in frame • Tap Add with your thumb</Text>
      </View>

      <View style={styles.recentStrip}>
        <FlatList
          horizontal
          data={recentScans}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyRecent}>Recent scans appear here</Text>}
          renderItem={({ item }) => (
            <View style={styles.recentPill}><Text style={styles.recentText}>{item.ocrSnapshot.slice(0, 24)}</Text></View>
          )}
        />
      </View>

      <ResultPanel
        result={result}
        reviewQueue={reviewCandidates}
        variants={variants}
        quantity={quantity}
        onAdjustQuantity={setQuantity}
        onCycleVariant={() => variants.length > 1 && setVariants((prev) => [...prev.slice(1), prev[0]])}
        onChooseCandidate={chooseCandidate}
        onOpenCandidatePicker={() => setShowCandidates(true)}
        onAdd={addCard}
        onManualSearch={() => setShowCandidates(true)}
        onUndo={async () => { await dbRepo.deleteLastCollectionEntry(); showToast('Undid last add'); }}
      />

      <Modal visible={showScopePicker} transparent animationType="slide" onRequestClose={() => setShowScopePicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Scan Scope</Text>
            <Text style={styles.modalText}>Selected set mode improves speed and accuracy.</Text>
            <AppButton label={`Use Selected Sets (${selectedSetIds.length})`} onPress={() => { setSettings((s) => ({ ...s, restrictToSelectedSets: true })); setShowScopePicker(false); }} variant="primary" />
            <AppButton label="Search All Sets" onPress={() => { setSettings((s) => ({ ...s, restrictToSelectedSets: false })); setShowScopePicker(false); }} />
            <AppButton label="Close" onPress={() => setShowScopePicker(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      <Modal visible={showCandidates} transparent animationType="slide" onRequestClose={() => setShowCandidates(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Pick the right card</Text>
            <Text style={styles.modalText}>Top likely matches from this scan.</Text>
            {reviewCandidates.slice(0, 3).map((candidate) => (
              <Pressable key={candidate.card.id} style={styles.candidateRow} onPress={() => chooseCandidate(candidate)}>
                <Text style={styles.candidateTitle}>{candidate.card.name}</Text>
                <Text style={styles.candidateMeta}>#{candidate.card.collectorNumber ?? '-'} · {candidate.confidenceBucket.replace('_', ' ')}</Text>
              </Pressable>
            ))}
            <AppButton label="Back to Scan" onPress={() => setShowCandidates(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      {toast && <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>}
      {__DEV__ && <Text style={styles.debugText}>{debugText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  overlayTop: { paddingTop: 58, paddingHorizontal: 14, gap: 10 },
  scopeRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  scopeChip: { backgroundColor: '#18314b', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  scopeChipText: { color: colors.text, fontWeight: '700' },
  topActions: { flexDirection: 'row', gap: 8 },
  cameraArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraHint: { color: '#91a5ba', fontSize: 13 },
  recentStrip: { minHeight: 46, paddingVertical: 8, backgroundColor: '#0d1621' },
  emptyRecent: { color: '#8298ae', paddingHorizontal: 12 },
  recentPill: { backgroundColor: '#21364a', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 8 },
  recentText: { color: colors.text, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#121c28', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, gap: 10 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  modalText: { color: '#a6bacf', marginBottom: 4 },
  candidateRow: { backgroundColor: '#1d2a39', borderRadius: 12, padding: 12 },
  candidateTitle: { color: colors.text, fontWeight: '700' },
  candidateMeta: { color: '#9db2c7', fontSize: 12, marginTop: 2 },
  toast: { position: 'absolute', bottom: 190, alignSelf: 'center', backgroundColor: '#1f7d4f', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  toastText: { color: 'white', fontWeight: '700' },
  debugText: { color: '#7f95aa', fontSize: 10, paddingHorizontal: 10, paddingBottom: 6 }
});
