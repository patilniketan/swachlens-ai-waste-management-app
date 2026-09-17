import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { spacing, typography } from '../constants/spacing';

export default function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
