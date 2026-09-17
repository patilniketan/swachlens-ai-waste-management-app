import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../constants/colors';
import { radius, spacing, typography } from '../constants/spacing';

interface InputProps extends TextInputProps {
  label: string;
  error?: string | null;
  secureToggle?: boolean;
  rightElement?: React.ReactNode;
}

export default function Input({
  label,
  error,
  secureToggle,
  secureTextEntry,
  rightElement,
  style,
  ...rest
}: InputProps) {
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          !!error && styles.inputRowError,
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {secureToggle && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.toggleText}>{hidden ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}
        {rightElement}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  inputRowFocused: {
    borderColor: colors.primary,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.captionMedium,
    color: colors.primary,
    paddingLeft: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
