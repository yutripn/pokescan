import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MatchCandidate, MatchResult, TcgSku } from '@/types/models';
import { AppButton, colors, Pill } from '@/components/ui';

const confidenceCopy = {
  very_high: { label: 'Very likely', tone: 'success' as const },
  high: { label: 'Likely', tone: 'accent' as const },
  medium: { label: 'Needs review', tone: 'warning' as const },
  low: { label: 'Needs review', tone: 'warning' as const }
};

type Props = {
  result: MatchResult | null;
  reviewQueue: MatchCandidate[];
  variants: TcgSku[];
  quantity: number;
  onAdd: () => void;
  onAdjustQuantity: (next: number) => void;
  onCycleVariant: () => void;
  onChooseCandidate: (candidate: MatchCandidate) => void;
  onOpenCandidatePicker: () => void;
  onManualSearch: () => void;
  onUndo: () => void;
};

export const ResultPanel = ({ result, reviewQueue, variants, quantity, onAdd, onAdjustQuantity, onCycleVariant, onChooseCandidate, onOpenCandidatePicker, onManualSearch, onUndo }: Props) => {
  const top = result?.top;
  const confidence = top ? confidenceCopy[top.confidenceBucket] : null;

  return (
    <View style={styles.container}>
      {top ? (
        <>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>{top.card.name}</Text>
            {confidence && <Pill label={confidence.label} tone={confidence.tone} />}
          </View>
          <Text style={styles.subtitle}>#{top.card.collectorNumber ?? '-'} · {top.card.rarity ?? 'Unknown'}</Text>
          <Text style={styles.meta} numberOfLines={1}>Set {top.card.setId} · {top.reason}</Text>
          <Pressable style={styles.variantBtn} onPress={onCycleVariant}>
            <Text style={styles.variantText}>Variant: {variants[0]?.variant ?? 'Default'} / {variants[0]?.language ?? 'EN'}</Text>
          </Pressable>
        </>
      ) : <Text style={styles.title}>Point at a card. We’ll suggest the best match.</Text>}

      {reviewQueue.length > 1 && (
        <Pressable style={styles.reviewBar} onPress={onOpenCandidatePicker}>
          <Text style={styles.reviewText}>Multiple plausible matches · Tap to review top {Math.min(3, reviewQueue.length)}</Text>
        </Pressable>
      )}

      <View style={styles.actions}>
        <View style={styles.qtyGroup}>
          <AppButton label="−" onPress={() => onAdjustQuantity(Math.max(1, quantity - 1))} style={styles.qtyButton} />
          <Text style={styles.qtyText}>Qty {quantity}</Text>
          <AppButton label="+" onPress={() => onAdjustQuantity(quantity + 1)} style={styles.qtyButton} />
        </View>
        <AppButton label="Add" onPress={onAdd} variant="primary" style={styles.addButton} />
      </View>

      <View style={styles.secondaryActions}>
        <AppButton label="Variants" onPress={onCycleVariant} />
        <AppButton label="Wrong Card" onPress={onManualSearch} />
        <AppButton label="Undo" onPress={onUndo} variant="ghost" />
      </View>

      {reviewQueue.length > 1 && (
        <View style={styles.inlineCandidates}>
          {reviewQueue.slice(0, 3).map((candidate) => (
            <Pressable key={candidate.card.id} style={styles.inlineCandidate} onPress={() => onChooseCandidate(candidate)}>
              <Text style={styles.inlineCandidateText} numberOfLines={1}>{candidate.card.name} #{candidate.card.collectorNumber ?? '-'}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, padding: 14, borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 },
  subtitle: { color: '#d8e2ef', fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12 },
  variantBtn: { backgroundColor: '#22374d', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  variantText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  reviewBar: { backgroundColor: '#283847', borderRadius: 12, padding: 10 },
  reviewText: { color: '#c4d6eb', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  qtyGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  qtyButton: { minWidth: 44, minHeight: 44 },
  qtyText: { color: colors.text, fontWeight: '700', minWidth: 55, textAlign: 'center' },
  addButton: { flex: 1, minHeight: 52 },
  secondaryActions: { flexDirection: 'row', gap: 8 },
  inlineCandidates: { gap: 6 },
  inlineCandidate: { backgroundColor: '#1c2b3a', borderRadius: 10, padding: 9 },
  inlineCandidateText: { color: '#e6effa', fontSize: 13 }
});
