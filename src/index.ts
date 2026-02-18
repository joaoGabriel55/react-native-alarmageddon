import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
} from 'react-native';

/**
 * Parameters for scheduling an alarm
 */
export type AlarmParams = {
  /** Unique identifier for the alarm */
  id: string;
  /** ISO 8601 timestamp for when the alarm should trigger (e.g., "2025-11-10T08:30:00") */
  datetimeISO: string;
  /** Title to display in the notification */
  title?: string;
  /** Body text to display in the notification */
  body?: string;
  /** Whether snoozing is enabled for this alarm */
  snoozeEnabled?: boolean;
  /** Interval in minutes for snoozing */
  snoozeInterval?: number;
};

/**
 * Result of permission request
 */
export type PermissionResult = {
  granted: boolean;
};

/**
 * Active alarm state
 */
export type ActiveAlarmState = {
  activeAlarmId: string;
} | null;

/**
 * Native module interface
 */
interface AlarmModuleInterface {
  scheduleAlarm(alarm: AlarmParams): Promise<void>;
  cancelAlarm(id: string): Promise<void>;
  listAlarms(): Promise<AlarmParams[]>;
  requestPermissions(): Promise<PermissionResult>;
  snoozeAlarm(id: string, minutes: number): Promise<void>;
  stopCurrentAlarm(id: string): Promise<void>;
  snoozeCurrentAlarm(id: string, minutes: number): Promise<void>;
  getCurrentAlarmPlaying(): Promise<ActiveAlarmState>;
}

const LINKING_ERROR =
  `The package 'react-native-alarmageddon' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go (Expo managed workflow is not supported)\n';

const AlarmModule: AlarmModuleInterface = NativeModules.AlarmModule
  ? NativeModules.AlarmModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

const eventEmitter = new NativeEventEmitter(NativeModules.AlarmModule);

/**
 * Subscription type for event listeners
 */
export type AlarmSubscription = {
  remove: () => void;
};

/**
 * Callback type for alarm state changes
 */
export type AlarmStateCallback = (alarmId: string | null) => void;

/**
 * Ensures notification permissions are granted.
 * On Android 13+, this will request POST_NOTIFICATIONS permission.
 * @returns Promise resolving to true if permissions are granted
 */
async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // iOS implementation pending
    return true;
  }

  try {
    const status = await AlarmModule.requestPermissions();
    if (status.granted) {
      return true;
    }

    // Android 13+ requires explicit POST_NOTIFICATIONS permission
    if (Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        'android.permission.POST_NOTIFICATIONS' as any
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  } catch (error) {
    console.warn('react-native-alarmageddon: Failed to request permissions', error);
    return false;
  }
}

/**
 * Schedule an alarm to trigger at a specific time.
 * The alarm will persist through device reboots.
 * @param alarm - Alarm parameters including id, datetime, title, and body
 */
async function scheduleAlarm(alarm: AlarmParams): Promise<void> {
  return AlarmModule.scheduleAlarm(alarm);
}

/**
 * Cancel a scheduled alarm by its ID.
 * @param id - The unique identifier of the alarm to cancel
 */
async function cancelAlarm(id: string): Promise<void> {
  return AlarmModule.cancelAlarm(id);
}

/**
 * List all currently scheduled alarms.
 * @returns Promise resolving to an array of alarm parameters
 */
async function listAlarms(): Promise<AlarmParams[]> {
  return AlarmModule.listAlarms();
}

/**
 * Request alarm and notification permissions.
 * @returns Promise resolving to permission result
 */
async function requestPermissions(): Promise<PermissionResult> {
  return AlarmModule.requestPermissions();
}

/**
 * Snooze an alarm by scheduling a new one for the specified minutes.
 * @param id - The alarm ID (used for the new snoozed alarm)
 * @param minutes - Number of minutes to snooze
 */
async function snoozeAlarm(id: string, minutes: number): Promise<void> {
  return AlarmModule.snoozeAlarm(id, minutes);
}

/**
 * Stop the currently ringing alarm.
 * @param id - The ID of the alarm to stop
 */
async function stopCurrentAlarm(id: string): Promise<void> {
  return AlarmModule.stopCurrentAlarm(id);
}

/**
 * Snooze the currently ringing alarm.
 * @param id - The ID of the alarm to snooze
 * @param minutes - Number of minutes to snooze
 */
async function snoozeCurrentAlarm(id: string, minutes: number): Promise<void> {
  return AlarmModule.snoozeCurrentAlarm(id, minutes);
}

/**
 * Get the currently playing alarm, if any.
 * @returns Promise resolving to the active alarm state or null
 */
async function getCurrentAlarmPlaying(): Promise<ActiveAlarmState> {
  return AlarmModule.getCurrentAlarmPlaying();
}

/**
 * Subscribe to alarm state changes.
 * The callback will be invoked when an alarm starts or stops ringing.
 * @param callback - Function called with the alarm ID (or null when stopped)
 * @returns Subscription object with remove() method to unsubscribe
 */
function onAlarmStateChange(callback: AlarmStateCallback): AlarmSubscription {
  const subscription = eventEmitter.addListener('activeAlarmId', callback);
  return {
    remove: () => subscription.remove(),
  };
}

/**
 * React Native Alarmageddon - Native exact alarm scheduling
 */
const RNAlarmModule = {
  ensurePermissions,
  scheduleAlarm,
  cancelAlarm,
  listAlarms,
  requestPermissions,
  snoozeAlarm,
  stopCurrentAlarm,
  snoozeCurrentAlarm,
  getCurrentAlarmPlaying,
  onAlarmStateChange,
};

export default RNAlarmModule;
