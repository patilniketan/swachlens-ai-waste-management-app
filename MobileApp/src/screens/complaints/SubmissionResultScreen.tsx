import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import Button from '../../components/Button';
import { colors } from '../../constants/colors';
import { radius, shadow, spacing, typography } from '../../constants/spacing';
import {
  DUPLICATE_MESSAGE,
  PRIORITY_LABELS,
  describeAiSource,
} from '../../utils/complaintView';

type Props = NativeStackScreenProps<HomeStackParamList, 'SubmissionResult'>;

const PRIORITY_COLORS: Record<string, { fg: string; bg: string }> = {
  CRITICAL: { fg: colors.danger, bg: colors.dangerBg },
  STANDARD: { fg: colors.warning, bg: colors.warningBg },
  TRIVIAL: { fg: colors.success, bg: colors.successBg },
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function SubmissionResultScreen({ route, navigation }: Props) {
  const { complaint, ai, duplicateSuggestion, idempotentReplay } = route.params.result;
  const source = describeAiSource(ai.source);
  const priorityColor = PRIORITY_COLORS[ai.priority] ?? PRIORITY_COLORS.STANDARD;

  // Scoring reasons without the summary line ("Urgency 5/10 -> ...").
  const reasons = ai.priorityReasons.filter(reason => !reason.startsWith('Urgency '));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.check} accessibilityElementsHidden>
          ✓
        </Text>
        <Text style={styles.title}>
          {idempotentReplay ? 'Already submitted' : 'Thanks, your report is in'}
        </Text>
        <Text style={styles.subtitle}>
          Reference #{complaint.id.slice(-8).toUpperCase()}
        </Text>
      </View>

      {duplicateSuggestion && (
        <View style={[styles.card, styles.noticeCard]}>
          <Text style={styles.noticeTitle}>Possibly already reported</Text>
          <Text style={styles.noticeText}>{DUPLICATE_MESSAGE}</Text>
          {!!duplicateSuggestion.summary && (
            <Text style={styles.noticeQuote}>"{duplicateSuggestion.summary}"</Text>
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What we found</Text>
        <Text style={[styles.sourceText, source.needsReview && styles.sourceReview]}>
          {source.label}
        </Text>
        {!!ai.summary && <Text style={styles.summary}>{ai.summary}</Text>}

        <Row label="Waste type" value={ai.wasteType ?? 'Not determined'} />
        <Row label="Amount" value={ai.relativeVolume && ai.relativeVolume !== 'Unknown' ? ai.relativeVolume : 'Not determined'} />
        <Row
          label="Hazardous material"
          value={
            ai.hazardousDetected
              ? `Yes${ai.hazardousTypes.length ? `: ${ai.hazardousTypes.join(', ')}` : ''}`
              : 'None seen'
          }
        />
        {ai.blockedRoad && <Row label="Road access" value="Blocking a road" />}
      </View>

      <View style={styles.card}>
        <View style={styles.priorityHead}>
          <Text style={styles.cardTitle}>Priority</Text>
          <View style={[styles.pill, { backgroundColor: priorityColor.bg }]}>
            <Text style={[styles.pillText, { color: priorityColor.fg }]}>
              {PRIORITY_LABELS[ai.priority] ?? ai.priority} · {ai.urgencyScore}/10
            </Text>
          </View>
        </View>
        <Text style={styles.explain}>Set by fixed rules from the assessment:</Text>
        {reasons.length ? (
          reasons.map(reason => (
            <Text key={reason} style={styles.reason}>
              • {reason}
            </Text>
          ))
        ) : (
          <Text style={styles.reason}>• Base urgency (no extra risk factors found)</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          label="View my report"
          onPress={() => navigation.replace('ComplaintDetails', { id: complaint.id })}
        />
        <Button label="Back to home" variant="outline" onPress={() => navigation.popToTop()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  header: { alignItems: 'center', paddingVertical: spacing.lg },
  check: {
    fontSize: 28,
    color: colors.textInverse,
    backgroundColor: colors.success,
    width: 52,
    height: 52,
    borderRadius: 26,
    textAlign: 'center',
    lineHeight: 52,
    overflow: 'hidden',
  },
  title: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  noticeCard: { backgroundColor: colors.infoBg },
  noticeTitle: { ...typography.bodyMedium, color: colors.info, marginBottom: spacing.xs },
  noticeText: { ...typography.caption, color: colors.textPrimary },
  noticeQuote: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' },
  cardTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.xs },
  sourceText: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  sourceReview: { color: colors.warning, fontWeight: '600' },
  summary: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    gap: spacing.md,
  },
  rowLabel: { ...typography.caption, color: colors.textMuted },
  rowValue: { ...typography.captionMedium, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  priorityHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  pillText: { ...typography.label },
  explain: { ...typography.caption, color: colors.textMuted, marginVertical: spacing.xs },
  reason: { ...typography.caption, color: colors.textPrimary, marginTop: 2 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
