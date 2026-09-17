import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius, shadow, spacing, typography } from '../constants/spacing';
import { resolveImageUrl } from '../services/api';
import StatusBadge from './StatusBadge';
import type { Complaint } from '../types/complaint';

interface Props {
  complaint: Complaint;
  onPress?: () => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function ComplaintCard({ complaint, onPress }: Props) {
  const imageUrl = resolveImageUrl(complaint.imageUrl);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Complaint ${complaint.id}, ${complaint.status}`}
      activeOpacity={0.85}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.thumbWrapper}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbPlaceholderText}>No image</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.wasteType} numberOfLines={1}>
            {complaint.wasteType ?? 'Classifying…'}
          </Text>
          <StatusBadge status={complaint.status} />
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {complaint.description}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            #{complaint.id.slice(0, 8)} · {formatDate(complaint.createdAt)}
          </Text>
          {typeof complaint.distanceKm === 'number' && (
            <Text style={styles.metaText}>{complaint.distanceKm.toFixed(1)} km away</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  thumbWrapper: {
    marginRight: spacing.md,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.divider,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: spacing.sm,
  },
  wasteType: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
});
