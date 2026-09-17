import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { spacing, typography } from '../constants/spacing';
import Button from './Button';

interface Props {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'empty' | 'error';
}

export default function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  variant = 'empty',
}: Props) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          variant === 'error' && { backgroundColor: colors.dangerBg },
        ]}
      >
        <Text style={styles.iconText}>{variant === 'error' ? '!' : '—'}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
      {!!actionLabel && onAction && (
        <View style={styles.actionWrapper}>
          <Button label={actionLabel} variant="outline" onPress={onAction} fullWidth={false} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actionWrapper: {
    marginTop: spacing.sm,
  },
});
