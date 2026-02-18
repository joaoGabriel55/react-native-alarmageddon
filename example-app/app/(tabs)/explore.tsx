import { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import RNAlarmModule, { type AlarmParams } from 'react-native-alarmageddon';

export default function AlarmsListScreen() {
  const [alarms, setAlarms] = useState<AlarmParams[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlarms = useCallback(async () => {
    try {
      setError(null);
      const list = await RNAlarmModule.listAlarms();
      setAlarms(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load alarms');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlarms();
    setRefreshing(false);
  }, [fetchAlarms]);

  useFocusEffect(
    useCallback(() => {
      fetchAlarms();
    }, [fetchAlarms])
  );

  const handleCancelAlarm = (id: string) => {
    Alert.alert('Cancel Alarm', `Are you sure you want to cancel alarm "${id}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await RNAlarmModule.cancelAlarm(id);
            await fetchAlarms();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to cancel alarm');
          }
        },
      },
    ]);
  };

  const formatAlarmTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

  const getTimeUntil = (isoString: string): string => {
    try {
      const target = new Date(isoString).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) return 'Overdue';

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `in ${days}d ${hours % 24}h`;
      if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
      return `in ${minutes}m`;
    } catch {
      return '';
    }
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <View style={styles.centeredMessage}>
          <Text style={styles.centeredEmoji}>🤖</Text>
          <Text style={styles.centeredTitle}>Android Only</Text>
          <Text style={styles.centeredText}>
            react-native-alarmageddon currently only supports Android.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#58A6FF"
          colors={['#58A6FF']}
          progressBackgroundColor="#161B22"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Scheduled Alarms</Text>
        <Text style={styles.headerSubtitle}>Pull down to refresh</Text>
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{alarms.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {alarms.filter((a) => a.snoozeEnabled).length}
          </Text>
          <Text style={styles.summaryLabel}>With Snooze</Text>
        </View>
        <View style={styles.summaryDivider} />
        <TouchableOpacity style={styles.summaryRefreshBtn} onPress={fetchAlarms}>
          <Text style={styles.summaryRefreshText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}

      {/* Empty State */}
      {alarms.length === 0 && !error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⏰</Text>
          <Text style={styles.emptyTitle}>No Alarms Scheduled</Text>
          <Text style={styles.emptyText}>
            Go to the Playground tab to schedule your first alarm!
          </Text>
        </View>
      )}

      {/* Alarm Cards */}
      {alarms.map((alarm, index) => {
        const timeUntil = getTimeUntil(alarm.datetimeISO);
        const isOverdue = timeUntil === 'Overdue';

        return (
          <View
            key={`${alarm.id}-${index}`}
            style={[styles.alarmCard, isOverdue && styles.alarmCardOverdue]}
          >
            <View style={styles.alarmCardHeader}>
              <View style={styles.alarmIdContainer}>
                <View style={[styles.statusDot, isOverdue ? styles.dotOverdue : styles.dotActive]} />
                <Text style={styles.alarmId} numberOfLines={1}>
                  {alarm.id}
                </Text>
              </View>
              <Text style={[styles.timeUntil, isOverdue && styles.timeUntilOverdue]}>
                {timeUntil}
              </Text>
            </View>

            <View style={styles.alarmCardBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>⏰</Text>
                <Text style={styles.detailText}>{formatAlarmTime(alarm.datetimeISO)}</Text>
              </View>

              {alarm.title && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>📝</Text>
                  <Text style={styles.detailText}>{alarm.title}</Text>
                </View>
              )}

              {alarm.body && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>💬</Text>
                  <Text style={styles.detailTextLight} numberOfLines={2}>
                    {alarm.body}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>💤</Text>
                <Text style={styles.detailText}>
                  Snooze: {alarm.snoozeEnabled ? `${alarm.snoozeInterval ?? 5} min` : 'Disabled'}
                </Text>
              </View>
            </View>

            <View style={styles.alarmCardFooter}>
              <Text style={styles.isoText}>{alarm.datetimeISO}</Text>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancelAlarm(alarm.id)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F0F6FC',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B949E',
    marginTop: 4,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#58A6FF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#30363D',
  },
  summaryRefreshBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRefreshText: {
    fontSize: 14,
    color: '#58A6FF',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#3D1F1F',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DA3633',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F0F6FC',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  alarmCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#30363D',
    overflow: 'hidden',
  },
  alarmCardOverdue: {
    borderColor: '#DA3633',
  },
  alarmCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  alarmIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotActive: {
    backgroundColor: '#34C759',
  },
  dotOverdue: {
    backgroundColor: '#DA3633',
  },
  alarmId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#58A6FF',
    fontFamily: 'monospace',
    flex: 1,
  },
  timeUntil: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
    backgroundColor: '#1B3A2D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  timeUntilOverdue: {
    color: '#FF6B6B',
    backgroundColor: '#3D1F1F',
  },
  alarmCardBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 8,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#C9D1D9',
    flex: 1,
  },
  detailTextLight: {
    fontSize: 13,
    color: '#8B949E',
    flex: 1,
  },
  alarmCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D1117',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#21262D',
  },
  isoText: {
    fontSize: 11,
    color: '#484F58',
    fontFamily: 'monospace',
    flex: 1,
  },
  cancelBtn: {
    backgroundColor: '#DA3633',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginLeft: 8,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    height: 40,
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0D1117',
  },
  centeredEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  centeredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F0F6FC',
    marginBottom: 8,
  },
  centeredText: {
    fontSize: 16,
    color: '#8B949E',
    textAlign: 'center',
    lineHeight: 24,
  },
});