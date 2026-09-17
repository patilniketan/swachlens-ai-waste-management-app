import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAuth } from '../../navigation/AuthContext';
import { login } from '../../services/auth';
import { ApiError } from '../../services/api';
import { validateEmail, validatePassword } from '../../utils/validation';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
    setFormError(null);

    if (emailError || passwordError) return;

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      signIn(user);
      // No manual navigation call needed — RootNavigator swaps to AppNavigator
      // automatically once AuthContext.isAuthenticated flips true.
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to log in. Please try again.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoGlyph}>♻</Text>
          </View>
          <Text style={styles.appName}>SWACHLENS AI</Text>
          <Text style={styles.tagline}>Report waste. Track cleanup. Build a cleaner city.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.heading}>Welcome back</Text>

          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            secureToggle
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />

          {!!formError && (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          )}

          <Button label="Log In" onPress={handleSubmit} loading={submitting} />

          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => navigation.navigate('Signup')}
            accessibilityRole="button"
          >
            <Text style={styles.signupText}>
              Don't have an account? <Text style={styles.signupTextBold}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoGlyph: {
    fontSize: 28,
    color: colors.primary,
  },
  appName: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  tagline: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 260,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
  },
  heading: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  formErrorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  formErrorText: {
    ...typography.caption,
    color: colors.danger,
  },
  signupLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  signupText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  signupTextBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});
