
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Callout } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { NearbyStackParamList } from '../../navigation/AppNavigator';
import {
  getHotspots,
  Hotspot,
  HotspotLevel,
} from '../../services/complaint';

import {
  ensureLocationPermission,
  getCurrentCoordinates,
} from '../../utils/location';

import { colors } from '../../constants/colors';
import { spacing, typography, radius, shadow } from '../../constants/spacing';

type Props = NativeStackScreenProps<
  NearbyStackParamList,
  'NearbyMain'
>;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ViewState =
  | { status: 'loading' }
  | { status: 'permission-denied' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      hotspots: Hotspot[];
      coords: Coordinates;
    };

const DEFAULT_DELTA = {
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const DEFAULT_HOTSPOT_RADIUS_METERS = 500;

function getLevelColor(level: HotspotLevel) {
  switch (level) {
    case 'CRITICAL':
      return '#DC2626';

    case 'HIGH':
      return '#EA580C';

    case 'MEDIUM':
      return '#D97706';

    case 'LOW':
    default:
      return '#16A34A';
  }
}

function getLevelLabel(level: HotspotLevel) {
  switch (level) {
    case 'CRITICAL':
      return 'Critical Hotspot';

    case 'HIGH':
      return 'High Priority';

    case 'MEDIUM':
      return 'Medium Priority';

    case 'LOW':
    default:
      return 'Low Priority';
  }
}

export default function NearbyComplaintsScreen(_props: Props) {
  const [state, setState] = useState<ViewState>({
    status: 'loading',
  });

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setState({ status: 'loading' });
    }

    const permission = await ensureLocationPermission();

    if (permission !== 'granted') {
      setState({
        status: 'permission-denied',
      });

      setRefreshing(false);
      return;
    }

    try {
      const coords = await getCurrentCoordinates();

      const hotspots = await getHotspots();

      setState({
        status: 'ready',
        hotspots,
        coords,
      });
    } catch (e: any) {
      setState({
        status: 'error',
        message:
          e?.message ??
          'Could not load waste hotspots.',
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading waste hotspots…
        </Text>
      </View>
    );
  }

  if (state.status === 'permission-denied') {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>
          Location permission required
        </Text>

        <Text style={styles.emptyMessage}>
          Enable location access to see waste
          hotspots near you.
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => load()}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>
          Something went wrong
        </Text>

        <Text style={styles.emptyMessage}>
          {state.message}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => load()}
        >
          <Text style={styles.retryText}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { coords, hotspots } = state;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: coords.latitude,
          longitude: coords.longitude,
          ...DEFAULT_DELTA,
        }}
        showsUserLocation
        showsMyLocationButton
        loadingEnabled
        toolbarEnabled
      >
        {/* USER LOCATION */}
        <Circle
          center={coords}
          radius={40}
          strokeWidth={1}
          strokeColor="rgba(37,99,235,0.35)"
          fillColor="rgba(37,99,235,0.10)"
        />

        {/* HOTSPOTS */}
        {hotspots.map((hotspot, index) => {
          const markerColor = getLevelColor(
            hotspot.level,
          );

          return (
            <React.Fragment
              key={`${hotspot.latitude}-${hotspot.longitude}-${index}`}
            >
              {/* hotspot clustering area */}
              <Circle
                center={{
                  latitude: hotspot.latitude,
                  longitude: hotspot.longitude,
                }}
                radius={hotspot.radiusMeters ?? DEFAULT_HOTSPOT_RADIUS_METERS}
                strokeWidth={2}
                strokeColor={`${markerColor}80`}
                fillColor={`${markerColor}20`}
              />

              {/* Hotspot marker */}
              <Marker
                coordinate={{
                  latitude: hotspot.latitude,
                  longitude: hotspot.longitude,
                }}
                pinColor={markerColor}
                tracksViewChanges={false}
              >
                <View
                  style={[
                    styles.marker,
                    {
                      backgroundColor: markerColor,
                    },
                  ]}
                >
                  <Text style={styles.markerCount}>
                    {hotspot.complaintCount}
                  </Text>
                </View>

                <Callout>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>
                      {getLevelLabel(hotspot.level)}
                    </Text>

                    <Text style={styles.calloutScore}>
                      Score: {hotspot.score}
                    </Text>

                    <View
                      style={styles.calloutDivider}
                    />

                    <Text style={styles.calloutText}>
                      Complaints: {hotspot.complaintCount}
                    </Text>

                    <Text style={styles.calloutText}>
                      Votes: {hotspot.totalVotes}
                    </Text>

                    {hotspot.wasteTypes?.length > 0 && (
                      <Text style={styles.calloutText}>
                        Waste:{' '}
                        {hotspot.wasteTypes.join(', ')}
                      </Text>
                    )}

                    {hotspot.simulatedCount > 0 && (
                      <Text style={styles.calloutText}>
                        Simulated demo reports: {hotspot.simulatedCount}
                      </Text>
                    )}

                    {/* Citizens can only open their own complaints, so the
                        callout is informational. */}
                    <Text style={styles.calloutHint}>
                      Reports in this area
                    </Text>
                  </View>
                </Callout>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      {/* TOP INFO CARD */}
      <View style={styles.infoCard}>
        <View>
          <Text style={styles.infoTitle}>
            Waste Hotspots
          </Text>

          <Text style={styles.infoSubtitle}>
            {hotspots.length === 0
              ? 'No active hotspots nearby'
              : `${hotspots.length} active hotspot${
                  hotspots.length === 1 ? '' : 's'
                } detected`}
          </Text>
        </View>

        <View style={styles.infoBadge}>
          <Text style={styles.infoBadgeText}>
            AI
          </Text>
        </View>
      </View>

      {/* LEGEND */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>
          Hotspot severity
        </Text>

        <LegendItem
          color="#DC2626"
          label="Critical"
        />

        <LegendItem
          color="#EA580C"
          label="High"
        />

        <LegendItem
          color="#D97706"
          label="Medium"
        />

        <LegendItem
          color="#16A34A"
          label="Low"
        />
      </View>

      {/* REFRESH */}
      <View style={styles.refreshWrapper}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => load(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />
          ) : (
            <Text style={styles.refreshButtonText}>
              Refresh
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: color },
        ]}
      />

      <Text style={styles.legendText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  map: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },

  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  emptyMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },

  retryText: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },

  infoCard: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,

    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    ...shadow.card,
  },

  infoTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },

  infoSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  infoBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textInverse,
  },

  marker: {
    width: 44,
    height: 44,
    borderRadius: 22,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 3,
    borderColor: '#FFFFFF',

    ...shadow.card,
  },

  markerCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  callout: {
    width: 220,
    padding: spacing.md,
  },

  calloutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  calloutScore: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 3,
  },

  calloutDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  calloutText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 3,
  },

  calloutHint: {
    ...typography.captionMedium,
    color: colors.primary,
    marginTop: spacing.md,
  },

  legend: {
    position: 'absolute',
    bottom: 82,
    left: spacing.md,

    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,

    ...shadow.card,
  },

  legendTitle: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: spacing.sm,
  },

  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  refreshWrapper: {
    position: 'absolute',
    right: spacing.md,
    bottom: 82,
  },

  refreshButton: {
    minWidth: 80,
    height: 40,
    paddingHorizontal: spacing.md,

    backgroundColor: colors.surface,
    borderRadius: radius.md,

    alignItems: 'center',
    justifyContent: 'center',

    ...shadow.card,
  },

  refreshButtonText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
});

