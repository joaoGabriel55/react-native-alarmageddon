import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import RNAlarmModule, {
  type AlarmParams,
  type ActiveAlarmState,
  type AlarmSubscription,
} from 'react-native-alarmageddon';

type LogEntry = {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'event';
};

function generateId(): string {
  return `alarm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getDefaultAlarmTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  return formatDateTime(now);
}

export default function AlarmPlaygroundScreen() {
  // Schedule Alarm state
  const [alarmId, setAlarmId] = useState(generateId());
  const [datetimeISO, setDatetimeISO] = useState(getDefaultAlarmTime());
  const [title, setTitle] = useState('Test Alarm');
  const [body, setBody] = useState('This is a test alarm from the playground!');
  const [snoozeEnabled, setSnoozeEnabled] = useState(true);
  const [snoozeInterval, setSnoozeInterval] = useState('5');

  // Cancel / Snooze / Stop state
  const [targetAlarmId, setTargetAlarmId] = useState('');
  const [snoozeMinutes, setSnoozeMinutes] = useState('5');

  // Scheduled alarms list
  const [scheduledAlarms, setScheduledAlarms] = useState<AlarmParams[]>([]);

  // Current alarm
  const [currentAlarm, setCurrentAlarm] = useState<ActiveAlarmState>(null);

  // Event listener
  const [isListening, setIsListening] = useState(false);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback(
    (message: string, type: LogEntry['type'] = 'info') => {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      };
      setLogs((prev) => [entry, ...prev].slice(0, 50));
    },
    []
  );

  // Event listener subscription
  useEffect(() => {
    let subscription: AlarmSubscription | null = null;

    if (isListening) {
      subscription = RNAlarmModule.onAlarmStateChange((activeAlarmId) => {
        if (activeAlarmId) {
          addLog(`🔔 Alarm state changed: "${activeAlarmId}" is now active`, 'event');
          setCurrentAlarm({ activeAlarmId });
        } else {
          addLog('🔕 Alarm state changed: no active alarm', 'event');
          setCurrentAlarm(null);
        }
      });
      addLog('👂 Started listening for alarm state changes', 'info');
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isListening, addLog]);

  // --- Action Handlers ---

  const handleEnsurePermissions = async () => {
    try {
      addLog('Requesting permissions...', 'info');
      const granted = await RNAlarmModule.ensurePermissions();
      if (granted) {
        addLog('✅ Permissions granted', 'success');
      } else {
        addLog('❌ Permissions denied', 'error');
      }
    } catch (error: any) {
      addLog(`❌ Permission error: ${error.message}`, 'error');
    }
  };

  const handleRequestPermissions = async () => {
    try {
      addLog('Requesting alarm permissions...', 'info');
      const result = await RNAlarmModule.requestPermissions();
      addLog(
        `✅ requestPermissions result: granted=${result.granted}`,
        result.granted ? 'success' : 'error'
      );
    } catch (error: any) {
      addLog(`❌ requestPermissions error: ${error.message}`, 'error');
    }
  };

  const handleScheduleAlarm = async () => {
    try {
      const alarm: AlarmParams = {
        id: alarmId,
        datetimeISO,
        title: title || undefined,
        body: body || undefined,
        snoozeEnabled,
        snoozeInterval: snoozeEnabled ? parseInt(snoozeInterval, 10) || 5 : undefined,
      };
      addLog(`Scheduling alarm "${alarm.id}" for ${alarm.datetimeISO}...`, 'info');
      await RNAlarmModule.scheduleAlarm(alarm);
      addLog(`✅ Alarm "${alarm.id}" scheduled successfully`, 'success');
      setTargetAlarmId(alarmId);
      // Generate a new ID for the next alarm
      setAlarmId(generateId());
      setDatetimeISO(getDefaultAlarmTime());
    } catch (error: any) {
      addLog(`❌ Schedule error: ${error.message}`, 'error');
    }
  };

  const handleListAlarms = async () => {
    try {
      addLog('Listing scheduled alarms...', 'info');
      const alarms = await RNAlarmModule.listAlarms();
      setScheduledAlarms(alarms);
      addLog(`✅ Found ${alarms.length} scheduled alarm(s)`, 'success');
      alarms.forEach((a) => {
        addLog(`   📋 ID: "${a.id}" | Time: ${a.datetimeISO} | Title: "${a.title ?? 'N/A'}"`, 'info');
      });
    } catch (error: any) {
      addLog(`❌ List error: ${error.message}`, 'error');
    }
  };

  const handleCancelAlarm = async () => {
    if (!targetAlarmId.trim()) {
      Alert.alert('Error', 'Please enter an alarm ID to cancel');
      return;
    }
    try {
      addLog(`Cancelling alarm "${targetAlarmId}"...`, 'info');
      await RNAlarmModule.cancelAlarm(targetAlarmId);
      addLog(`✅ Alarm "${targetAlarmId}" cancelled`, 'success');
    } catch (error: any) {
      addLog(`❌ Cancel error: ${error.message}`, 'error');
    }
  };

  const handleSnoozeAlarm = async () => {
    if (!targetAlarmId.trim()) {
      Alert.alert('Error', 'Please enter an alarm ID to snooze');
      return;
    }
    const minutes = parseInt(snoozeMinutes, 10) || 5;
    try {
      addLog(`Snoozing alarm "${targetAlarmId}" for ${minutes} min...`, 'info');
      await RNAlarmModule.snoozeAlarm(targetAlarmId, minutes);
      addLog(`✅ Alarm "${targetAlarmId}" snoozed for ${minutes} min`, 'success');
    } catch (error: any) {
      addLog(`❌ Snooze error: ${error.message}`, 'error');
    }
  };

  const handleGetCurrentAlarm = async () => {
    try {
      addLog('Getting current playing alarm...', 'info');
      const state = await RNAlarmModule.getCurrentAlarmPlaying();
      setCurrentAlarm(state);
      if (state) {
        addLog(`✅ Current alarm: "${state.activeAlarmId}"`, 'success');
        setTargetAlarmId(state.activeAlarmId);
      } else {
        addLog('ℹ️ No alarm currently playing', 'info');
      }
    } catch (error: any) {
      addLog(`❌ getCurrentAlarmPlaying error: ${error.message}`, 'error');
    }
  };

  const handleStopCurrentAlarm = async () => {
    if (!targetAlarmId.trim()) {
      Alert.alert('Error', 'Please enter the alarm ID to stop');
      return;
    }
    try {
      addLog(`Stopping alarm "${targetAlarmId}"...`, 'info');
      await RNAlarmModule.stopCurrentAlarm(targetAlarmId);
      addLog(`✅ Alarm "${targetAlarmId}" stopped`, 'success');
      setCurrentAlarm(null);
    } catch (error: any) {
      addLog(`❌ Stop error: ${error.message}`, 'error');
    }
  };

  const handleSnoozeCurrentAlarm = async () => {
    if (!targetAlarmId.trim()) {
      Alert.alert('Error', 'Please enter the alarm ID to snooze');
      return;
    }
    const minutes = parseInt(snoozeMinutes, 10) || 5;
    try {
      addLog(`Snoozing current alarm "${targetAlarmId}" for ${minutes} min...`, 'info');
      await RNAlarmModule.snoozeCurrentAlarm(targetAlarmId, minutes);
      addLog(`✅ Current alarm "${targetAlarmId}" snoozed for ${minutes} min`, 'success');
      setCurrentAlarm(null);
    } catch (error: any) {
      addLog(`❌ Snooze current error: ${error.message}`, 'error');
    }
  };

  const handleQuickAlarm = async () => {
    const quickId = `quick-${Date.now()}`;
    const triggerTime = new Date();
    triggerTime.setSeconds(triggerTime.getSeconds() + 15);
    const alarm: AlarmParams = {
      id: quickId,
      datetimeISO: formatDateTime(triggerTime),
      title: '⏰ Quick Test',
      body: 'This alarm was set 15 seconds ago!',
      snoozeEnabled: true,
      snoozeInterval: 1,
    };
    try {
      addLog(`⚡ Quick alarm "${quickId}" in 15 seconds...`, 'info');
      await RNAlarmModule.scheduleAlarm(alarm);
      addLog(`✅ Quick alarm scheduled for ${alarm.datetimeISO}`, 'success');
      setTargetAlarmId(quickId);
    } catch (error: any) {
      addLog(`❌ Quick alarm error: ${error.message}`, 'error');
    }
  };

  const clearLogs = () => setLogs([]);

  const logColors: Record<LogEntry['type'], string> = {
    info: '#8E8E93',
    success: '#34C759',
    error: '#FF3B30',
    event: '#5856D6',
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <View style={styles.centeredMessage}>
          <Text style={styles.centeredEmoji}>🤖</Text>
          <Text style={styles.centeredTitle}>Android Only</Text>
          <Text style={styles.centeredText}>
            react-native-alarmageddon currently only supports Android.
            {'\n'}Please run this app on an Android device or emulator.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💣 Alarmageddon</Text>
        <Text style={styles.headerSubtitle}>Alarm Playground</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.buttonQuick]}
            onPress={handleQuickAlarm}
          >
            <Text style={styles.buttonText}>Alarm in 15s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonInfo]}
            onPress={handleListAlarms}
          >
            <Text style={styles.buttonText}>List Alarms</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonInfo]}
            onPress={handleGetCurrentAlarm}
          >
            <Text style={styles.buttonText}>Current?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Permissions</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleEnsurePermissions}
          >
            <Text style={styles.buttonText}>Ensure Permissions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.buttonText}>Request Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Schedule Alarm */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Schedule Alarm</Text>

        <Text style={styles.label}>Alarm ID</Text>
        <TextInput
          style={styles.input}
          value={alarmId}
          onChangeText={setAlarmId}
          placeholder="Unique alarm ID"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Datetime (ISO 8601)</Text>
        <TextInput
          style={styles.input}
          value={datetimeISO}
          onChangeText={setDatetimeISO}
          placeholder="2025-12-25T08:00:00"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Alarm title"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Body</Text>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="Alarm body text"
          placeholderTextColor="#999"
          multiline
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Snooze Enabled</Text>
          <Switch value={snoozeEnabled} onValueChange={setSnoozeEnabled} />
        </View>

        {snoozeEnabled && (
          <>
            <Text style={styles.label}>Snooze Interval (minutes)</Text>
            <TextInput
              style={styles.input}
              value={snoozeInterval}
              onChangeText={setSnoozeInterval}
              placeholder="5"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonSuccess, styles.fullWidth]}
          onPress={handleScheduleAlarm}
        >
          <Text style={styles.buttonText}>📅 Schedule Alarm</Text>
        </TouchableOpacity>
      </View>

      {/* Manage Alarms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎛️ Manage Alarms</Text>

        <Text style={styles.label}>Target Alarm ID</Text>
        <TextInput
          style={styles.input}
          value={targetAlarmId}
          onChangeText={setTargetAlarmId}
          placeholder="Enter alarm ID"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Snooze Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          value={snoozeMinutes}
          onChangeText={setSnoozeMinutes}
          placeholder="5"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleCancelAlarm}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonWarning]}
            onPress={handleSnoozeAlarm}
          >
            <Text style={styles.buttonText}>Snooze</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleStopCurrentAlarm}
          >
            <Text style={styles.buttonText}>Stop Current</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonWarning]}
            onPress={handleSnoozeCurrentAlarm}
          >
            <Text style={styles.buttonText}>Snooze Current</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Alarm Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Current Alarm Status</Text>
        <View style={styles.statusBox}>
          {currentAlarm ? (
            <>
              <Text style={styles.statusActive}>🔴 ALARM ACTIVE</Text>
              <Text style={styles.statusId}>ID: {currentAlarm.activeAlarmId}</Text>
            </>
          ) : (
            <Text style={styles.statusInactive}>⚪ No active alarm</Text>
          )}
        </View>
      </View>

      {/* Scheduled Alarms List */}
      {scheduledAlarms.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Scheduled Alarms ({scheduledAlarms.length})</Text>
          {scheduledAlarms.map((alarm, index) => (
            <View key={`${alarm.id}-${index}`} style={styles.alarmCard}>
              <Text style={styles.alarmCardId}>🆔 {alarm.id}</Text>
              <Text style={styles.alarmCardDetail}>⏰ {alarm.datetimeISO}</Text>
              {alarm.title && <Text style={styles.alarmCardDetail}>📝 {alarm.title}</Text>}
              {alarm.snoozeEnabled && (
                <Text style={styles.alarmCardDetail}>💤 Snooze: {alarm.snoozeInterval}min</Text>
              )}
              <TouchableOpacity
                style={[styles.button, styles.buttonDanger, { marginTop: 6 }]}
                onPress={() => {
                  setTargetAlarmId(alarm.id);
                  handleCancelAlarm();
                }}
              >
                <Text style={styles.buttonText}>Cancel This</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Event Listener */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📡 Event Listener</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Listen for alarm state changes</Text>
          <Switch value={isListening} onValueChange={setIsListening} />
        </View>
        <Text style={styles.hint}>
          {isListening
            ? '🟢 Listening for onAlarmStateChange events...'
            : '⚪ Not listening'}
        </Text>
      </View>

      {/* Logs */}
      <View style={styles.section}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>📜 Logs</Text>
          <TouchableOpacity onPress={clearLogs}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>
        {logs.length === 0 ? (
          <Text style={styles.hint}>No logs yet. Try an action above!</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logEntry}>
              <Text style={styles.logTimestamp}>{log.timestamp}</Text>
              <Text style={[styles.logMessage, { color: logColors[log.type] }]}>
                {log.message}
              </Text>
            </View>
          ))
        )}
      </View>

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
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F0F6FC',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8B949E',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F0F6FC',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C9D1D9',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#30363D',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#F0F6FC',
    marginBottom: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    marginTop: 12,
  },
  buttonPrimary: {
    backgroundColor: '#1F6FEB',
  },
  buttonSecondary: {
    backgroundColor: '#30363D',
  },
  buttonSuccess: {
    backgroundColor: '#238636',
  },
  buttonDanger: {
    backgroundColor: '#DA3633',
  },
  buttonWarning: {
    backgroundColor: '#D29922',
  },
  buttonInfo: {
    backgroundColor: '#1F6FEB',
  },
  buttonQuick: {
    backgroundColor: '#8957E5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBox: {
    backgroundColor: '#0D1117',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  statusActive: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4444',
  },
  statusInactive: {
    fontSize: 16,
    color: '#8B949E',
  },
  statusId: {
    fontSize: 14,
    color: '#C9D1D9',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  alarmCard: {
    backgroundColor: '#0D1117',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  alarmCardId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#58A6FF',
    fontFamily: 'monospace',
  },
  alarmCardDetail: {
    fontSize: 13,
    color: '#8B949E',
    marginTop: 2,
  },
  hint: {
    fontSize: 13,
    color: '#8B949E',
    fontStyle: 'italic',
    marginTop: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  logEntry: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#21262D',
  },
  logTimestamp: {
    fontSize: 11,
    color: '#484F58',
    fontFamily: 'monospace',
    marginRight: 8,
    minWidth: 70,
  },
  logMessage: {
    fontSize: 12,
    flex: 1,
    fontFamily: 'monospace',
  },
  footer: {
    height: 40,
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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