import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius, spacing, typography } from '../constants/spacing';
import type { ComplaintStatus } from '../types/complaint';

const STATUS_STYLE: Record<ComplaintStatus, { bg: string; fg: string }> = {
  Pending: { bg: colors.statusPendingBg, fg: colors.statusPending },
  Assigned: { bg: colors.statusAssignedBg, fg: colors.statusAssigned },
  'In Progress': { bg: colors.statusInProgressBg, fg: colors.statusInProgress },
  Resolved: { bg: colors.statusResolvedBg, fg: colors.statusResolved },
};

export default function StatusBadge({ status }: { status: ComplaintStatus | string }) {
  const style = STATUS_STYLE[status as ComplaintStatus] ?? {
    bg: colors.divider,
    fg: colors.textSecondary,
  };

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <View style={[styles.dot, { backgroundColor: style.fg }]} />
      <Text style={[styles.text, { color: style.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...typography.label,
    textTransform: 'none',
  },
});
