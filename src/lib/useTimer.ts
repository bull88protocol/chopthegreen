import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * A wall-clock countdown. Timing is derived from a target timestamp rather
 * than by decrementing, so backgrounding the app can't make the timer drift,
 * and a local notification covers the case where the cook has switched away.
 */
export function useTimer(onDone?: () => void) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const notifId = useRef<string | null>(null);
  const done = useRef(onDone);
  done.current = onDone;

  const cancelNotification = useCallback(async () => {
    if (notifId.current) {
      await Notifications.cancelScheduledNotificationAsync(notifId.current).catch(() => {});
      notifId.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setEndAt(null);
    setRemaining(0);
    void cancelNotification();
  }, [cancelNotification]);

  const start = useCallback(async (seconds: number, label: string) => {
    if (seconds <= 0) return;
    setEndAt(Date.now() + seconds * 1000);
    setRemaining(seconds);
    setRunning(true);

    if (Platform.OS === 'web') return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const granted = status === 'granted'
        ? true
        : (await Notifications.requestPermissionsAsync()).status === 'granted';
      if (!granted) return;
      await cancelNotification();
      notifId.current = await Notifications.scheduleNotificationAsync({
        content: { title: 'Timer done', body: label, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
      });
    } catch {
      // Notifications are a bonus; the in-app countdown still works.
    }
  }, [cancelNotification]);

  // Tick while running, and resync whenever the app returns to the foreground.
  useEffect(() => {
    if (!running || endAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        setEndAt(null);
        notifId.current = null;
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        done.current?.();
      }
    };
    const id = setInterval(tick, 500);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') tick(); });
    tick();
    return () => { clearInterval(id); sub.remove(); };
  }, [running, endAt]);

  useEffect(() => () => { void cancelNotification(); }, [cancelNotification]);

  return { running, remaining, start, stop };
}

export const mmss = (total: number) => {
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};
