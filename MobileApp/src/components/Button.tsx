import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { colors } from '../constants/colors';
import { radius, spacing, typography } from '../constants/spacing';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export default function Button({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  icon,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyles[variant].container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].spinnerColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, variantStyles[variant].label]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyMedium,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles: Record<
  Variant,
  { container: object; label: object; spinnerColor: string }
> = {
  primary: {
    container: { backgroundColor: colors.accent },
    label: { color: colors.textInverse },
    spinnerColor: colors.textInverse,
  },
  secondary: {
    container: { backgroundColor: colors.primary },
    label: { color: colors.textInverse },
    spinnerColor: colors.textInverse,
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    label: { color: colors.primary },
    spinnerColor: colors.primary,
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    label: { color: colors.primary },
    spinnerColor: colors.primary,
  },
  danger: {
    container: { backgroundColor: colors.danger },
    label: { color: colors.textInverse },
    spinnerColor: colors.textInverse,
  },
};
