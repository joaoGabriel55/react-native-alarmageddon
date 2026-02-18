# react-native-alarmageddon

Native exact alarm scheduling for React Native with sound, snooze, and boot persistence.

## Features

- ⏰ **Exact Alarms**: Uses Android's `setExactAndAllowWhileIdle` for precise scheduling
- 🔊 **Alarm Sound**: Plays alarm audio at maximum volume with audio focus
- 💤 **Snooze Support**: Built-in snooze functionality with customizable duration
- 🔄 **Boot Persistence**: Alarms are automatically rescheduled after device reboot
- 📱 **Full-Screen Intent**: Shows notification with full-screen intent on lock screen
- 🎯 **Event Emitter**: Subscribe to alarm state changes in JavaScript
- 📲 **iOS Support**: Basic notification-based implementation for iOS

## Installation

```bash
npm install react-native-alarmageddon
# or
yarn add react-native-alarmageddon
```

### Android Setup

The library uses autolinking, so no manual linking is required for React Native 0.60+.

#### Permissions

The following permissions are automatically merged into your app's `AndroidManifest.xml`:

- `SCHEDULE_EXACT_ALARM` - Required for exact alarm scheduling
- `USE_EXACT_ALARM` - Alternative permission for exact alarms
- `WAKE_LOCK` - Keep device awake during alarm
- `VIBRATE` - Vibration support
- `RECEIVE_BOOT_COMPLETED` - Reschedule alarms after reboot
- `POST_NOTIFICATIONS` - Required for Android 13+

#### Android 12+ (API 31+)

On Android 12 and above, you need to request the `SCHEDULE_EXACT_ALARM` permission. Users may need to grant this permission in Settings:

```typescript
import RNAlarmModule from 'react-native-alarmageddon';

// Check and request permissions
const granted = await RNAlarmModule.ensurePermissions();
if (!granted) {
  // Guide user to enable notification permissions
}
```

#### Custom Alarm Sound

To use a custom alarm sound, place your audio file in:

```
android/app/src/main/res/raw/alarm_default.wav
```

If no custom sound is found, the system default alarm sound will be used.

### iOS Setup

Run pod install:

```bash
cd ios && pod install
```

Add the following to your `Info.plist` for notification permissions:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

**Note**: iOS uses local notifications for alarms, which have limitations compared to Android (no persistent alarm sound, relies on system notification behavior).

## Usage

### Basic Example

```typescript
import RNAlarmModule from 'react-native-alarmageddon';

// Request permissions first
await RNAlarmModule.ensurePermissions();

// Schedule an alarm
await RNAlarmModule.scheduleAlarm({
  id: 'medication-reminder-1',
  datetimeISO: '2025-01-15T08:30:00',
  title: 'Medication Reminder',
  body: 'Time to take your morning medication',
});

// List all scheduled alarms
const alarms = await RNAlarmModule.listAlarms();
console.log('Scheduled alarms:', alarms);

// Cancel an alarm
await RNAlarmModule.cancelAlarm('medication-reminder-1');
```

### Listening to Alarm Events

```typescript
import RNAlarmModule from 'react-native-alarmageddon';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Subscribe to alarm state changes
    const subscription = RNAlarmModule.onAlarmStateChange((alarmId) => {
      if (alarmId) {
        console.log('Alarm started:', alarmId);
        // Navigate to alarm screen, etc.
      } else {
        console.log('Alarm stopped');
      }
    });

    return () => subscription.remove();
  }, []);

  // ... rest of your app
}
```

### Stopping and Snoozing

```typescript
import RNAlarmModule from 'react-native-alarmageddon';

// Get currently playing alarm
const activeAlarm = await RNAlarmModule.getCurrentAlarmPlaying();
if (activeAlarm) {
  console.log('Active alarm:', activeAlarm.activeAlarmId);
  
  // Stop the alarm
  await RNAlarmModule.stopCurrentAlarm(activeAlarm.activeAlarmId);
  
  // Or snooze for 5 minutes
  await RNAlarmModule.snoozeCurrentAlarm(activeAlarm.activeAlarmId, 5);
}
```

## API Reference

### Types

```typescript
type AlarmParams = {
  id: string;              // Unique identifier for the alarm
  datetimeISO: string;     // ISO 8601 timestamp (e.g., "2025-01-15T08:30:00")
  title?: string;          // Notification title (default: "Alarm")
  body?: string;           // Notification body (default: "")
  snoozeEnabled?: boolean; // Whether snoozing is enabled (default: true)
  snoozeInterval?: number; // Snooze interval in minutes (default: 5)
};

type PermissionResult = {
  granted: boolean;
};

type ActiveAlarmState = {
  activeAlarmId: string;
} | null;

type AlarmSubscription = {
  remove: () => void;
};
```

### Methods

#### `ensurePermissions(): Promise<boolean>`

Requests notification permissions. On Android 13+, this will prompt for `POST_NOTIFICATIONS` permission.

Returns `true` if permissions are granted.

#### `scheduleAlarm(alarm: AlarmParams): Promise<void>`

Schedules an exact alarm. The alarm will persist through device reboots.

#### `cancelAlarm(id: string): Promise<void>`

Cancels a scheduled alarm by its ID.

#### `listAlarms(): Promise<AlarmParams[]>`

Returns an array of all currently scheduled alarms.

#### `requestPermissions(): Promise<PermissionResult>`

Checks current permission status without prompting (Android).

#### `snoozeAlarm(id: string, minutes: number): Promise<void>`

Creates a new snooze alarm that will trigger after the specified minutes.

#### `stopCurrentAlarm(id: string): Promise<void>`

Stops the currently ringing alarm.

#### `snoozeCurrentAlarm(id: string, minutes: number): Promise<void>`

Stops the current alarm and schedules it to ring again after the specified minutes.

#### `getCurrentAlarmPlaying(): Promise<ActiveAlarmState>`

Returns the ID of the currently ringing alarm, or `null` if no alarm is active.

#### `onAlarmStateChange(callback: (alarmId: string | null) => void): AlarmSubscription`

Subscribes to alarm state changes. The callback is invoked when an alarm starts (`alarmId` is the alarm ID) or stops (`alarmId` is `null`).

Returns a subscription object with a `remove()` method to unsubscribe.

## Android Behavior Details

### Alarm Triggering

- Alarms use `AlarmManager.setExactAndAllowWhileIdle()` for precise scheduling
- When triggered, the alarm plays at maximum volume on the `STREAM_ALARM` audio channel
- A wake lock is acquired to ensure the device stays awake during playback
- The alarm auto-stops after 60 seconds if not dismissed

### Notification

- Shows a high-priority notification with full-screen intent
- Includes "Stop" and "Snooze" action buttons
- Tapping the notification opens the app with `alarm_id` in the intent extras

### Boot Persistence

- The `BootReceiver` listens for `BOOT_COMPLETED`, `TIME_SET`, and `TIMEZONE_CHANGED`
- All scheduled alarms are rescheduled automatically
- Past alarms (that should have fired during device off time) are skipped

## Limitations

- **Expo**: This library is not compatible with Expo Go. You need to use a development build or eject.
- **iOS**: This library is not compatible with iOS.
- **Background Restrictions**: Some device manufacturers (Samsung, Xiaomi, Huawei, etc.) may kill background processes. Users may need to disable battery optimization for your app.

## Playground (only Android supported)

A simple example app is provided to demonstrate the library's functionality.

```bash
cd example-app
npx expo prebuild --platform android
npm run android
```

## Troubleshooting

### Alarms not triggering on some devices

Some manufacturers implement aggressive battery optimization. Guide users to:

1. Disable battery optimization for your app
2. Enable "Allow background activity"
3. Add your app to any "protected apps" list

### "Cannot schedule exact alarms" on Android 12+

On Android 12+, exact alarm scheduling may require user permission. Check if `AlarmManager.canScheduleExactAlarms()` returns true, and if not, guide users to Settings > Apps > Special access > Alarms & reminders.

### Notifications not showing on Android 13+

Ensure you call `ensurePermissions()` before scheduling alarms. Android 13+ requires explicit `POST_NOTIFICATIONS` permission.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to the main repository.

## License

MIT License - see the [LICENSE](LICENSE) file for details.
