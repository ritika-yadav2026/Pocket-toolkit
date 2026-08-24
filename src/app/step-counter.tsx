import { Pedometer } from 'expo-sensors';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenHeader } from '@/components/screen-header';

type SensorState =
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'permission-denied';

export default function StepCounterScreen() {
  const [sensorState, setSensorState] =
    useState<SensorState>('checking');

  const [sessionSteps, setSessionSteps] =
    useState(0);

  const [todaySteps, setTodaySteps] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const subscriptionRef =
    useRef<ReturnType<
      typeof Pedometer.watchStepCount
    > | null>(null);

  /**
   * iOS supports historical step querying.
   * We fetch from midnight until the current time.
   */
  const fetchTodaySteps =
    useCallback(async () => {
      if (Platform.OS !== 'ios') {
        setTodaySteps(null);
        return;
      }

      try {
        const end = new Date();

        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const result =
          await Pedometer.getStepCountAsync(
            start,
            end
          );

        setTodaySteps(result.steps);
      } catch (error) {
        console.log(
          'Today step count error:',
          error
        );

        setTodaySteps(null);
      }
    }, []);

  /**
   * Start live step tracking.
   */
  const startWatching = useCallback(() => {
    subscriptionRef.current?.remove();

    setSessionSteps(0);

    subscriptionRef.current =
      Pedometer.watchStepCount((result) => {
        setSessionSteps(result.steps);
      });
  }, []);

  /**
   * Check sensor + request permission.
   */
  const initialisePedometer =
    useCallback(async () => {
      try {
        setLoading(true);

        const available =
          await Pedometer.isAvailableAsync();

        if (!available) {
          setSensorState('unavailable');
          return;
        }

        const existingPermission =
          await Pedometer.getPermissionsAsync();

        let granted =
          existingPermission.granted;

        if (!granted) {
          const requested =
            await Pedometer.requestPermissionsAsync();

          granted = requested.granted;
        }

        if (!granted) {
          setSensorState(
            'permission-denied'
          );
          return;
        }

        setSensorState('available');

        await fetchTodaySteps();

        startWatching();
      } catch (error) {
        console.log(
          'Pedometer initialization error:',
          error
        );

        setSensorState('unavailable');
      } finally {
        setLoading(false);
      }
    }, [
      fetchTodaySteps,
      startWatching,
    ]);

  useEffect(() => {
    initialisePedometer();

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [initialisePedometer]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      if (
        sensorState !== 'available'
      ) {
        await initialisePedometer();
        return;
      }

      await fetchTodaySteps();

      startWatching();
    } catch (error) {
      console.log(
        'Refresh pedometer error:',
        error
      );
    } finally {
      setRefreshing(false);
    }
  };

  const requestPermissionAgain =
    async () => {
      try {
        const permission =
          await Pedometer.requestPermissionsAsync();

        if (permission.granted) {
          await initialisePedometer();
        } else {
          Alert.alert(
            'Motion Permission',
            'Motion access is required for step counting.'
          );
        }
      } catch (error) {
        console.log(
          'Permission error:',
          error
        );
      }
    };

  /**
   * On iOS:
   * historical steps from midnight
   * +
   * new steps since screen opened.
   *
   * On Android:
   * only foreground-session steps.
   */
  const displayedSteps =
    Platform.OS === 'ios' &&
    todaySteps !== null
      ? todaySteps + sessionSteps
      : sessionSteps;

  const displayTitle =
    Platform.OS === 'ios'
      ? "Today's Steps"
      : 'Current Session';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* Header */}

        <ScreenHeader title="Step Counter" />

        {/* Heading */}

        <View
          style={styles.headingContainer}
        >
          <Text style={styles.title}>
            {displayTitle}
          </Text>

          <Text style={styles.subtitle}>
            Steps are measured using your
            device's pedometer sensor
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

            <Text style={styles.loadingText}>
              Checking pedometer...
            </Text>
          </View>
        ) : sensorState ===
          'unavailable' ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Pedometer unavailable
            </Text>

            <Text style={styles.errorText}>
              This emulator or device has no step
              sensor. Open the app on a real phone
              to count steps.
            </Text>
          </View>
        ) : sensorState ===
          'permission-denied' ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Motion permission required
            </Text>

            <Text style={styles.errorText}>
              Pocket Toolkit needs motion
              access to count your steps.
            </Text>

            <TouchableOpacity
              style={
                styles.permissionButton
              }
              onPress={
                requestPermissionAgain
              }
            >
              <Text
                style={
                  styles.permissionButtonText
                }
              >
                Allow Motion Access
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Main Steps */}

            <View style={styles.mainCard}>
              <View
                style={styles.stepCircleOuter}
              >
                <View
                  style={styles.stepCircleInner}
                >
                  <Text
                    style={styles.stepsValue}
                  >
                    {displayedSteps.toLocaleString()}
                  </Text>

                  <Text
                    style={styles.stepsLabel}
                  >
                    STEPS
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.liveContainer
                }
              >
                <View
                  style={styles.liveDot}
                />

                <Text
                  style={styles.liveText}
                >
                  Live tracking active
                </Text>
              </View>
            </View>

            {/* Live session */}

            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>
                Live Activity
              </Text>

              <View
                style={styles.divider}
              />

              <InfoRow
                label="Session Steps"
                description="Steps since this screen started tracking"
                value={sessionSteps.toLocaleString()}
              />

              {Platform.OS === 'ios' && (
                <>
                  <View
                    style={styles.divider}
                  />

                  <InfoRow
                    label="Before Session"
                    description="Steps recorded earlier today"
                    value={
                      todaySteps !== null
                        ? todaySteps.toLocaleString()
                        : 'Unavailable'
                    }
                  />
                </>
              )}

              <View
                style={styles.divider}
              />

              <InfoRow
                label="Sensor"
                description="Pedometer availability"
                value="Active"
              />
            </View>

            {/* Platform notice */}

            <View style={styles.noticeCard}>
              <View
                style={
                  styles.noticeIcon
                }
              >
                <Text
                  style={
                    styles.noticeIconText
                  }
                >
                  i
                </Text>
              </View>

              <View
                style={
                  styles.noticeContent
                }
              >
                <Text
                  style={
                    styles.noticeTitle
                  }
                >
                  {Platform.OS === 'ios'
                    ? 'Daily step data'
                    : 'Android session tracking'}
                </Text>

                <Text
                  style={
                    styles.noticeText
                  }
                >
                  {Platform.OS === 'ios'
                    ? 'The total combines steps already recorded today with live steps from this session.'
                    : 'Expo Pedometer provides live foreground steps on Android. Closing or backgrounding the app stops live updates.'}
                </Text>
              </View>
            </View>

            {/* Refresh */}

            <TouchableOpacity
              style={[
                styles.refreshButton,
                refreshing &&
                  styles.refreshDisabled,
              ]}
              activeOpacity={0.8}
              disabled={refreshing}
              onPress={handleRefresh}
            >
              {refreshing ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Text
                    style={
                      styles.refreshIcon
                    }
                  >
                    ↻
                  </Text>

                  <Text
                    style={
                      styles.refreshText
                    }
                  >
                    Refresh Steps
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

type InfoRowProps = {
  label: string;
  description: string;
  value: string;
};

function InfoRow({
  label,
  description,
  value,
}: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text
          style={styles.infoDescription}
        >
          {description}
        </Text>
      </View>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  headingContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
  },

  loadingCard: {
    marginHorizontal: 22,
    marginTop: 40,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },

  loadingText: {
    marginTop: 15,
    fontSize: 13,
    color: '#6B7280',
  },

  errorCard: {
    marginHorizontal: 22,
    marginTop: 30,
    padding: 25,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#991B1B',
  },

  errorText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color: '#B91C1C',
  },

  permissionButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  mainCard: {
    marginHorizontal: 22,
    marginTop: 30,
    paddingVertical: 32,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },

  stepCircleOuter: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepCircleInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepsValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#111827',
  },

  stepsLabel: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#2563EB',
  },

  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },

  liveText: {
    marginLeft: 7,
    fontSize: 12,
    color: '#64748B',
  },

  infoCard: {
    marginHorizontal: 22,
    marginTop: 20,
    padding: 19,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 15,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  infoLeft: {
    flex: 1,
    paddingRight: 16,
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  infoDescription: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: '#9CA3AF',
  },

  infoValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  noticeCard: {
    flexDirection: 'row',
    marginHorizontal: 22,
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
  },

  noticeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  noticeIconText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },

  noticeContent: {
    flex: 1,
    marginLeft: 12,
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  noticeText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },

  refreshButton: {
    height: 58,
    marginHorizontal: 22,
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshDisabled: {
    opacity: 0.7,
  },

  refreshIcon: {
    marginRight: 9,
    fontSize: 22,
    color: '#FFFFFF',
  },

  refreshText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});