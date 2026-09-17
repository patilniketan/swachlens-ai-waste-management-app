import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ComplaintsStackParamList } from '../../navigation/AppNavigator';
import { getComplaintById } from '../../services/complaint';
import { resolveImageUrl } from '../../services/api';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { colors } from '../../constants/colors';
import { radius, shadow, spacing, typography } from '../../constants/spacing';
import type { Complaint, ComplaintStatus } from '../../types/complaint';

type Props = NativeStackScreenProps<ComplaintsStackParamList, 'ComplaintDetails'>;

const STAGES: ComplaintStatus[] = ['Pending', 'Assigned', 'In Progress', 'Resolved'];

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ComplaintDetailsScreen({ route }: Props) {
  const { id } = route.params;
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getComplaintById(id);
      setComplaint(data);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load this complaint.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <Loading label="Loading complaint…" />;

  if (error || !complaint) {
    return (
      <EmptyState
        variant="error"
        title="Couldn't load this complaint"
        message={error ?? 'Please try again.'}
        actionLabel="Retry"
        onAction={load}
      />
    );
  }

  const imageUrl = resolveImageUrl(complaint.imageUrl);
  const currentStageIndex = STAGES.indexOf(complaint.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>No image available</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.wasteType}>{complaint.wasteType ?? 'Classifying…'}</Text>
          <StatusBadge status={complaint.status} />
        </View>
        <Text style={styles.idText}>Complaint #{complaint.id.slice(0, 8)}</Text>

        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.bodyText}>{complaint.description}</Text>

        <Text style={styles.sectionLabel}>Address</Text>
        <Text style={styles.bodyText}>{complaint.address}</Text>

        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.sectionLabel}>Reported</Text>
            <Text style={styles.bodyTextSmall}>{formatDateTime(complaint.createdAt)}</Text>
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.sectionLabel}>Last Updated</Text>
            <Text style={styles.bodyTextSmall}>{formatDateTime(complaint.updatedAt)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Status Timeline</Text>
        <View style={styles.timeline}>
          {STAGES.map((stage, index) => {
            const isComplete = index <= currentStageIndex;
            const isLast = index === STAGES.length - 1;
            return (
              <View key={stage} style={styles.timelineRow}>
                <View style={styles.timelineIndicatorCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      isComplete && styles.timelineDotActive,
                    ]}
                  />
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        index < currentStageIndex && styles.timelineLineActive,
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[styles.timelineLabel, isComplete && styles.timelineLabelActive]}
                >
                  {stage}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl },
  image: {
    width: '100%',
    height: 260,
    backgroundColor: colors.divider,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    ...typography.body,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    marginBottom: 0,
    ...shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  wasteType: {
    ...typography.h3,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  idText: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  bodyText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  bodyTextSmall: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  dateCol: { flex: 1 },
  timeline: {
    marginTop: spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.divider,
    borderWidth: 2,
    borderColor: colors.border,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.divider,
    marginVertical: 2,
  },
  timelineLineActive: {
    backgroundColor: colors.primary,
  },
  timelineLabel: {
    ...typography.body,
    color: colors.textMuted,
    marginLeft: spacing.md,
  },
  timelineLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
