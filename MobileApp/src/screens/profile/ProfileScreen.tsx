import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../navigation/AuthContext';
import Button from '../../components/Button';
import { colors } from '../../constants/colors';
import { radius, shadow, spacing, typography } from '../../constants/spacing';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            // signOut() clears AsyncStorage and flips AuthContext state, which
            // causes RootNavigator to swap back to AuthNavigator automatically —
            // this also revokes access to every authenticated screen.
            await signOut();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const initial = user?.email?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <InfoRow label="Email" value={user?.email ?? 'Unknown'} />
        <InfoRow label="Role" value={user?.role ?? 'CITIZEN'} isLast />
      </View>

      <View style={styles.logoutWrapper}>
        <Button label="Log Out" variant="danger" onPress={handleLogout} loading={loggingOut} />
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h1,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  logoutWrapper: {
    marginTop: spacing.xxl,
  },
});
