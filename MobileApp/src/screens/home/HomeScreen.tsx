import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../navigation/AuthContext';
import { getMyComplaints, getNearbyComplaints } from '../../services/complaint';
import { ensureLocationPermission, getCurrentCoordinates } from '../../utils/location';
import { NEARBY_DEFAULT_RADIUS_KM } from '../../constants/config';
import ComplaintCard from '../../components/ComplaintCard';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../constants/colors';
import { radius, shadow, spacing, typography } from '../../constants/spacing';
import type { Complaint } from '../../types/complaint';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Complaint[]>([]);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState('Detecting location…');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const complaints = await getMyComplaints();
      setRecent(complaints.slice(0, 3));

      const permission = await ensureLocationPermission();
      if (permission === 'granted') {
        try {
          const coords = await getCurrentCoordinates();
          setLocationLabel('Location detected');
          const nearby = await getNearbyComplaints({
            ...coords,
            radiusKm: NEARBY_DEFAULT_RADIUS_KM,
          });
          setNearbyCount(nearby.length);
        } catch {
          setLocationLabel('Location unavailable');
        }
      } else {
        setLocationLabel('Location permission needed');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not load your dashboard.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (loading) return <Loading label="Loading your dashboard…" />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hello{user?.email ? `, ${user.email.split('@')[0]}` : ''}</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationDot} />
            <Text style={styles.locationText}>{locationLabel}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Report Waste"
        activeOpacity={0.9}
        style={styles.cta}
        onPress={() => navigation.navigate('ReportWaste')}
      >
        <View style={styles.ctaIconCircle}>
          <Text style={styles.ctaIcon}>+</Text>
        </View>
        <View style={styles.ctaTextWrap}>
          <Text style={styles.ctaTitle}>Report Waste</Text>
          <Text style={styles.ctaSubtitle}>Snap a photo, and we'll handle the rest</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{recent.length > 0 ? recent.length : '0'}</Text>
          <Text style={styles.summaryLabel}>My Complaints</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{nearbyCount ?? '—'}</Text>
          <Text style={styles.summaryLabel}>Nearby (5km)</Text>
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Recent Complaints</Text>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate('MyComplaints' as never)}>
          <Text style={styles.sectionLink}>See all</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <EmptyState variant="error" title="Couldn't load complaints" message={error} actionLabel="Retry" onAction={() => load()} />
      ) : recent.length === 0 ? (
        <EmptyState
          title="No complaints yet"
          message="Report your first waste issue to see it here."
          actionLabel="Report Waste"
          onAction={() => navigation.navigate('ReportWaste')}
        />
      ) : (
        recent.map((c) => (
          <ComplaintCard
            key={c.id}
            complaint={c}
            onPress={() => navigation.navigate('ComplaintDetails', { id: c.id })}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  headerRow: {
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  greeting: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  locationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  locationText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.raised,
  },
  ctaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  ctaIcon: {
    fontSize: 24,
    color: colors.textInverse,
    fontWeight: '700',
  },
  ctaTextWrap: { flex: 1 },
  ctaTitle: {
    ...typography.h3,
    color: colors.textInverse,
  },
  ctaSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  summaryNumber: {
    ...typography.h1,
    color: colors.primary,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeader: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sectionLink: {
    ...typography.captionMedium,
    color: colors.primary,
  },
});
