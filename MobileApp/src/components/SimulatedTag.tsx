import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { radius, spacing, typography } from '../constants/spacing';

/** Marks seeded demo data so it is never mistaken for a real report. */
export default function SimulatedTag() {
  return (
    <View style={styles.tag} accessibilityLabel="Simulated demo data">
      <Text style={styles.text}>Simulated</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  text: {
    ...typography.label,
    color: colors.warning,
    textTransform: 'none',
  },
});
