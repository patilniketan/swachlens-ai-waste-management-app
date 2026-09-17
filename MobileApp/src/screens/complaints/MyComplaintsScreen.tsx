import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MyComplaintsStackParamList } from '../../navigation/AppNavigator';
import { getMyComplaints } from '../../services/complaint';
import ComplaintCard from '../../components/ComplaintCard';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import type { Complaint } from '../../types/complaint';

type Props = NativeStackScreenProps<MyComplaintsStackParamList, 'MyComplaintsMain'>;

export default function MyComplaintsScreen({ navigation }: Props) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await getMyComplaints();
      setComplaints(data);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load your complaints.');
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

  if (loading) return <Loading label="Loading your complaints…" />;

  if (error) {
    return (
      <View style={styles.center}>
        <EmptyState variant="error" title="Something went wrong" message={error} actionLabel="Retry" onAction={() => load()} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={complaints.length === 0 ? styles.emptyContent : styles.listContent}
      data={complaints}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      renderItem={({ item }) => (
        <ComplaintCard
          complaint={item}
          onPress={() => navigation.navigate('ComplaintDetails', { id: item.id })}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          title="No complaints yet"
          message="Complaints you report will show up here so you can track their progress."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg },
  emptyContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
});
