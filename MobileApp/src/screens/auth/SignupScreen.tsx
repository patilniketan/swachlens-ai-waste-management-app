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
import { requestSignupOtp, verifySignupOtp } from '../../services/auth';
import { ApiError } from '../../services/api';
import { validateEmail, validateOtp } from '../../utils/validation';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors } from '../../constants/colors';
import { spacing, typography } from '../../constants/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;
type Step = 'email' | 'otp';

export default function SignupScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestOtp = async () => {
    const err = validateEmail(email);
    setEmailError(err);
    setFormError(null);
    if (err) return;

    setSubmitting(true);
    try {
      await requestSignupOtp({ email: email.trim() });
      setStep('otp');
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not send OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const err = validateOtp(otp);
    setOtpError(err);
    setFormError(null);
    if (err) return;

    setSubmitting(true);
    try {
      await verifySignupOtp({ email: email.trim(), otp: otp.trim() });
      navigation.replace('Login');
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Invalid OTP. Please try again.');
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
        <View style={styles.header}>
          <Text style={styles.heading}>Create your account</Text>
          <Text style={styles.subheading}>
            {step === 'email'
              ? "We'll send a one-time code to verify your email."
              : `Enter the code we sent to ${email.trim()}`}
          </Text>
        </View>

        <View style={styles.form}>
          {step === 'email' ? (
            <>
              <Input
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                error={emailError}
              />
              {!!formError && <ErrorBox message={formError} />}
              <Button label="Send OTP" onPress={handleRequestOtp} loading={submitting} />
            </>
          ) : (
            <>
              <Input
                label="OTP"
                placeholder="6-digit code"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                error={otpError}
                maxLength={6}
              />
              {!!formError && <ErrorBox message={formError} />}
              <Button label="Verify & Continue" onPress={handleVerifyOtp} loading={submitting} />
              <TouchableOpacity
                style={styles.resendLink}
                onPress={handleRequestOtp}
                disabled={submitting}
              >
                <Text style={styles.resendText}>Didn't get a code? Resend</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginTextBold}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.formErrorBox}>
      <Text style={styles.formErrorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subheading: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
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
  resendLink: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  resendText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  loginLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  loginText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  loginTextBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});
