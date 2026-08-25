import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { DeviceMotion, Magnetometer } from 'expo-sensors';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';

type CompassState =
  | 'checking'
  | 'ready'
  | 'unavailable'
  | 'permission-denied'
  | 'error';

type NorthType =
  | 'True North'
  | 'Magnetic North';

const SMOOTHING = 0.22;
const SENSOR_WAIT_MS = 3000;

export default function CompassScreen() {
  const [compassState, setCompassState] =
    useState<CompassState>('checking');

  const [heading, setHeading] =
    useState<number | null>(null);

  const [accuracy, setAccuracy] =
    useState<number>(0);

  const [northType, setNorthType] =
    useState<NorthType>('Magnetic North');

  const [isDemoMode, setIsDemoMode] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState('Starting compass...');

  const locationSubscriptionRef =
    useRef<Location.LocationSubscription | null>(null);

  const magnetometerSubscriptionRef =
    useRef<{ remove: () => void } | null>(null);

  const deviceMotionSubscriptionRef =
    useRef<{ remove: () => void } | null>(null);

  const demoIntervalRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const previousHeadingRef =
    useRef<number | null>(null);

  const hasLiveHeadingRef = useRef(false);

  const normalizeHeading = (value: number): number => {
    return ((value % 360) + 360) % 360;
  };

  const smoothHeading = useCallback((newHeading: number): number => {
    const normalized = normalizeHeading(newHeading);
    if (previousHeadingRef.current === null) {
      previousHeadingRef.current = normalized;
      return normalized;
    }
    const previous = previousHeadingRef.current;
    const delta = ((normalized - previous + 540) % 360) - 180;
    const smoothed = normalizeHeading(previous + delta * SMOOTHING);
    previousHeadingRef.current = smoothed;
    return smoothed;
  }, []);

  const applyHeading = useCallback(
    ({
      value,
      north,
      nextAccuracy,
    }: {
      value: number;
      north: NorthType;
      nextAccuracy: number;
    }) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return;
      }
      hasLiveHeadingRef.current = true;
      setIsDemoMode(false);
      setNorthType(north);
      setAccuracy(nextAccuracy);
      setHeading(smoothHeading(normalizeHeading(value)));
      setCompassState('ready');
    },
    [smoothHeading]
  );

  const getDirection = (value: number | null): string => {
    if (value === null) {
      return '--';
    }
    const directions = [
      'North',
      'North-East',
      'East',
      'South-East',
      'South',
      'South-West',
      'West',
      'North-West',
    ];
    return directions[Math.round(value / 45) % 8];
  };

  const getShortDirection = (value: number | null): string => {
    if (value === null) {
      return '--';
    }
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(value / 45) % 8];
  };

  const getAccuracyText = (value: number): string => {
    switch (value) {
      case 3:
        return 'High';
      case 2:
        return 'Medium';
      case 1:
        return 'Low';
      default:
        return 'Needs Calibration';
    }
  };

  const stopSubscriptions = useCallback(() => {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
    magnetometerSubscriptionRef.current?.remove();
    magnetometerSubscriptionRef.current = null;
    deviceMotionSubscriptionRef.current?.remove();
    deviceMotionSubscriptionRef.current = null;
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
  }, []);

  const startDemoCompass = useCallback(() => {
    setIsDemoMode(true);
    setNorthType('Magnetic North');
    setAccuracy(2);
    setHeading(0);
    setCompassState('ready');
    let angle = 0;
    demoIntervalRef.current = setInterval(() => {
      angle = (angle + 3) % 360;
      setHeading(angle);
    }, 120);
  }, []);

  const waitForMs = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Primary Android path: raw magnetometer.
   * Do not hard-fail on isAvailableAsync / permission quirks.
   */
  const startMagnetometerCompass = useCallback(async (): Promise<boolean> => {
    try {
      setStatusMessage('Reading magnetometer...');
      const available = await Magnetometer.isAvailableAsync().catch(() => true);
      if (!available && Platform.OS === 'ios') {
        return false;
      }
      if (Platform.OS === 'ios') {
        try {
          let permission = await Magnetometer.getPermissionsAsync();
          if (!permission.granted) {
            permission = await Magnetometer.requestPermissionsAsync();
          }
          if (!permission.granted) {
            return false;
          }
        } catch {
          // Continue without blocking.
        }
      }
      Magnetometer.setUpdateInterval(100);
      magnetometerSubscriptionRef.current = Magnetometer.addListener(
        ({ x, y }) => {
          const rawHeading =
            (Math.atan2(-x, y) * 180) / Math.PI;
          applyHeading({
            value: rawHeading,
            north: 'Magnetic North',
            nextAccuracy: 2,
          });
        }
      );
      await waitForMs(SENSOR_WAIT_MS);
      return hasLiveHeadingRef.current;
    } catch (error) {
      console.log('Magnetometer compass error:', error);
      return false;
    }
  }, [applyHeading]);

  /**
   * Fallback using DeviceMotion rotation alpha.
   */
  const startDeviceMotionCompass = useCallback(async (): Promise<boolean> => {
    try {
      setStatusMessage('Reading device motion...');
      const available = await DeviceMotion.isAvailableAsync().catch(() => false);
      if (!available) {
        return false;
      }
      if (Platform.OS === 'ios') {
        try {
          let permission = await DeviceMotion.getPermissionsAsync();
          if (!permission.granted) {
            permission = await DeviceMotion.requestPermissionsAsync();
          }
          if (!permission.granted) {
            return false;
          }
        } catch {
          // Continue without blocking.
        }
      }
      DeviceMotion.setUpdateInterval(100);
      deviceMotionSubscriptionRef.current = DeviceMotion.addListener((data) => {
        if (!data.rotation) {
          return;
        }
        const alphaDegrees = (data.rotation.alpha * 180) / Math.PI;
        const rawHeading = 360 - alphaDegrees;
        applyHeading({
          value: rawHeading,
          north: 'Magnetic North',
          nextAccuracy: 1,
        });
      });
      await waitForMs(SENSOR_WAIT_MS);
      return hasLiveHeadingRef.current;
    } catch (error) {
      console.log('DeviceMotion compass error:', error);
      return false;
    }
  }, [applyHeading]);

  /**
   * Location heading (best when GPS / true north is available).
   */
  const startLocationHeading = useCallback(async (): Promise<
    'ready' | 'denied' | 'failed'
  > => {
    try {
      setStatusMessage('Checking location permission...');
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setStatusMessage('Turn on Location / GPS, then try again.');
        return 'failed';
      }
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (!permission.granted) {
        setStatusMessage('Location permission is required for compass heading.');
        return 'denied';
      }
      setStatusMessage('Listening for compass heading...');
      locationSubscriptionRef.current = await Location.watchHeadingAsync(
        (result) => {
          const hasTrueHeading =
            permission.granted && result.trueHeading >= 0;
          const rawHeading = hasTrueHeading
            ? result.trueHeading
            : result.magHeading;
          if (
            typeof rawHeading !== 'number' ||
            Number.isNaN(rawHeading) ||
            rawHeading < 0
          ) {
            return;
          }
          applyHeading({
            value: rawHeading,
            north: hasTrueHeading ? 'True North' : 'Magnetic North',
            nextAccuracy: result.accuracy ?? 2,
          });
        }
      );
      await waitForMs(SENSOR_WAIT_MS);
      return hasLiveHeadingRef.current ? 'ready' : 'failed';
    } catch (error) {
      console.log('Location heading unavailable:', error);
      return 'failed';
    }
  }, [applyHeading]);

  const startCompass = useCallback(async () => {
    try {
      setCompassState('checking');
      setIsDemoMode(false);
      hasLiveHeadingRef.current = false;
      previousHeadingRef.current = null;
      stopSubscriptions();

      /**
       * Try multiple sources. Android often fails Location heading
       * or reports Magnetometer unavailable incorrectly, so we keep going.
       */
      if (await startMagnetometerCompass()) {
        return;
      }
      if (await startDeviceMotionCompass()) {
        return;
      }
      const locationResult = await startLocationHeading();
      if (locationResult === 'ready') {
        return;
      }
      if (locationResult === 'denied') {
        setCompassState('permission-denied');
        return;
      }

      if (!Device.isDevice) {
        startDemoCompass();
        return;
      }

      setStatusMessage(
        'No compass sensor data received. Keep the phone away from metal, enable Location, and try again.'
      );
      setCompassState('unavailable');
    } catch (error) {
      console.log('Compass initialization error:', error);
      if (!Device.isDevice) {
        startDemoCompass();
        return;
      }
      setCompassState('error');
    }
  }, [
    startDemoCompass,
    startDeviceMotionCompass,
    startLocationHeading,
    startMagnetometerCompass,
    stopSubscriptions,
  ]);

  useEffect(() => {
    void startCompass();
    return () => {
      stopSubscriptions();
    };
  }, [startCompass, stopSubscriptions]);

  const direction =
    getDirection(heading);

  const shortDirection =
    getShortDirection(heading);

  const displayHeading =
    heading !== null
      ? Math.round(heading)
      : null;

  if (compassState === 'checking') {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar
          barStyle="dark-content"
        />

        <ScreenHeader title="Compass" />

        <View
          style={styles.centerState}
        >
          <ActivityIndicator
            size="large"
            color="#2563EB"
          />

          <Text
            style={styles.loadingText}
          >
            {statusMessage}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (compassState === 'permission-denied') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="Compass" />
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            Location Permission Required
          </Text>
          <Text style={styles.errorText}>
            Compass needs location access on Android.
            Allow location permission, then try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={startCompass}
          >
            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryButton, styles.settingsButton]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.retryButtonText}>
              Open Settings
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (
    compassState ===
      'unavailable' ||
    compassState === 'error'
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar
          barStyle="dark-content"
        />

        <ScreenHeader title="Compass" />

        <View
          style={styles.errorCard}
        >
          <Text
            style={styles.errorTitle}
          >
            Compass Unavailable
          </Text>

          <Text
            style={styles.errorText}
          >
            {statusMessage}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={startCompass}
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              Try Again
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryButton, styles.settingsButton]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.retryButtonText}>
              Open Settings
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <StatusBar
        barStyle="dark-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <ScreenHeader title="Compass" />

        {isDemoMode && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerTitle}>
              Demo mode
            </Text>
            <Text style={styles.demoBannerText}>
              Emulator has no real compass sensor.
              Heading is simulated for UI testing.
              Use a physical phone for live compass.
            </Text>
          </View>
        )}

        {/* Heading */}

        <View
          style={
            styles.headingContainer
          }
        >
          <Text style={styles.title}>
            Compass
          </Text>

          <Text
            style={styles.subtitle}
          >
            Rotate your phone to find
            your direction
          </Text>
        </View>

        {/* Compass */}

        <View
          style={styles.compassCard}
        >
          {/* Fixed direction pointer */}

          <View
            style={
              styles.pointerContainer
            }
          >
            <View
              style={styles.pointer}
            />
          </View>

          {/* Rotating Dial */}

          <View
            style={[
              styles.compassDial,
              {
                transform: [
                  {
                    rotate:
                      heading !== null
                        ? `${-heading}deg`
                        : '0deg',
                  },
                ],
              },
            ]}
          >
            <View
              style={styles.innerRing}
            />

            {/* Cardinal Directions */}

            <Text
              style={[
                styles.cardinal,
                styles.north,
                styles.northText,
              ]}
            >
              N
            </Text>

            <Text
              style={[
                styles.cardinal,
                styles.east,
              ]}
            >
              E
            </Text>

            <Text
              style={[
                styles.cardinal,
                styles.south,
              ]}
            >
              S
            </Text>

            <Text
              style={[
                styles.cardinal,
                styles.west,
              ]}
            >
              W
            </Text>

            {/* Secondary directions */}

            <Text
              style={[
                styles.secondaryDirection,
                styles.northEast,
              ]}
            >
              NE
            </Text>

            <Text
              style={[
                styles.secondaryDirection,
                styles.southEast,
              ]}
            >
              SE
            </Text>

            <Text
              style={[
                styles.secondaryDirection,
                styles.southWest,
              ]}
            >
              SW
            </Text>

            <Text
              style={[
                styles.secondaryDirection,
                styles.northWest,
              ]}
            >
              NW
            </Text>

            {/* Centre */}

            <View
              style={
                styles.centerCircle
              }
            >
              <View
                style={
                  styles.centerDot
                }
              />
            </View>
          </View>

          {/* Heading Value */}

          <Text
            style={styles.headingValue}
          >
            {displayHeading !== null
              ? `${displayHeading}°`
              : '--'}
          </Text>

          <Text
            style={styles.directionText}
          >
            {direction}
          </Text>

          <View
            style={
              styles.directionBadge
            }
          >
            <Text
              style={
                styles.directionBadgeText
              }
            >
              {shortDirection}
            </Text>
          </View>
        </View>

        {/* Heading details */}

        <View
          style={styles.detailsCard}
        >
          <Text
            style={styles.cardTitle}
          >
            Compass Details
          </Text>

          <View
            style={styles.divider}
          />

          <InfoRow
            label="Heading"
            description="Current direction in degrees"
            value={
              displayHeading !== null
                ? `${displayHeading}°`
                : 'Unavailable'
            }
          />

          <View
            style={styles.divider}
          />

          <InfoRow
            label="Direction"
            description="Current compass direction"
            value={direction}
          />

          <View
            style={styles.divider}
          />

          <InfoRow
            label="North Reference"
            description="Compass reference type"
            value={northType}
          />

          <View
            style={styles.divider}
          />

          <InfoRow
            label="Accuracy"
            description="Current compass calibration"
            value={getAccuracyText(
              accuracy
            )}
          />
        </View>

        {/* Accuracy */}

        <View
          style={[
            styles.statusCard,
            accuracy >= 2
              ? styles.goodStatus
              : styles.warningStatus,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              accuracy >= 2
                ? styles.goodDot
                : styles.warningDot,
            ]}
          />

          <View
            style={
              styles.statusContent
            }
          >
            <Text
              style={
                styles.statusTitle
              }
            >
              {accuracy >= 2
                ? 'Compass Ready'
                : 'Calibration Recommended'}
            </Text>

            <Text
              style={
                styles.statusDescription
              }
            >
              {accuracy >= 2
                ? 'Compass accuracy is currently good.'
                : 'Move your phone in a figure-eight motion away from magnets and metal objects.'}
            </Text>
          </View>
        </View>

        {/* Calibration instructions */}

        <View
          style={
            styles.calibrationCard
          }
        >
          <Text
            style={styles.cardTitle}
          >
            Improve Accuracy
          </Text>

          <View
            style={
              styles.figureEight
            }
          >
            <Text
              style={
                styles.figureEightText
              }
            >
              ∞
            </Text>
          </View>

          <Text
            style={
              styles.calibrationText
            }
          >
            Move your phone slowly in a
            figure-eight pattern if the
            compass seems inaccurate.
          </Text>
        </View>

        {/* Tip */}

        <View style={styles.tipCard}>
          <View
            style={styles.tipIcon}
          >
            <Text
              style={
                styles.tipIconText
              }
            >
              i
            </Text>
          </View>

          <Text
            style={styles.tipText}
          >
            Keep the phone away from
            magnets, speakers, laptops,
            and large metal objects while
            using the compass.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
        <Text
          style={styles.infoLabel}
        >
          {label}
        </Text>

        <Text
          style={
            styles.infoDescription
          }
        >
          {description}
        </Text>
      </View>

      <Text
        style={styles.infoValue}
      >
        {value}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },

    scrollContent: {
      paddingBottom: 40,
    },

    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      marginTop: 14,
      fontSize: 13,
      color: '#6B7280',
    },

    demoBanner: {
      marginHorizontal: 22,
      marginTop: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: '#FFFBEB',
      borderWidth: 1,
      borderColor: '#FDE68A',
    },

    demoBannerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#92400E',
    },

    demoBannerText: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: '#B45309',
    },

    headingContainer: {
      paddingTop: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
    },

    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#111827',
    },

    subtitle: {
      marginTop: 8,
      fontSize: 14,
      color: '#6B7280',
      textAlign: 'center',
    },

    compassCard: {
      marginHorizontal: 22,
      marginTop: 30,
      paddingVertical: 30,
      alignItems: 'center',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 28,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },

    pointerContainer: {
      position: 'absolute',
      top: 18,
      zIndex: 10,
      alignItems: 'center',
    },

    pointer: {
      width: 0,
      height: 0,
      borderLeftWidth: 9,
      borderRightWidth: 9,
      borderBottomWidth: 18,
      borderLeftColor:
        'transparent',
      borderRightColor:
        'transparent',
      borderBottomColor:
        '#EF4444',
      transform: [
        {
          rotate: '180deg',
        },
      ],
    },

    compassDial: {
      width: 270,
      height: 270,
      borderRadius: 135,
      backgroundColor:
        '#F8FAFC',
      borderWidth: 3,
      borderColor: '#CBD5E1',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    innerRing: {
      position: 'absolute',
      width: 210,
      height: 210,
      borderRadius: 105,
      borderWidth: 1,
      borderColor: '#DBEAFE',
    },

    cardinal: {
      position: 'absolute',
      fontSize: 22,
      fontWeight: '800',
      color: '#111827',
    },

    northText: {
      color: '#EF4444',
    },

    north: {
      top: 14,
    },

    south: {
      bottom: 14,
    },

    east: {
      right: 18,
    },

    west: {
      left: 18,
    },

    secondaryDirection: {
      position: 'absolute',
      fontSize: 11,
      fontWeight: '700',
      color: '#64748B',
    },

    northEast: {
      top: 48,
      right: 48,
    },

    southEast: {
      bottom: 48,
      right: 48,
    },

    southWest: {
      bottom: 48,
      left: 48,
    },

    northWest: {
      top: 48,
      left: 48,
    },

    centerCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor:
        '#EFF6FF',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    centerDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor:
        '#2563EB',
    },

    headingValue: {
      marginTop: 24,
      fontSize: 40,
      fontWeight: '900',
      color: '#111827',
    },

    directionText: {
      marginTop: 4,
      fontSize: 16,
      fontWeight: '600',
      color: '#64748B',
    },

    directionBadge: {
      marginTop: 10,
      paddingHorizontal: 15,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor:
        '#EFF6FF',
    },

    directionBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#2563EB',
    },

    detailsCard: {
      marginHorizontal: 22,
      marginTop: 20,
      padding: 19,
      borderRadius: 22,
      backgroundColor:
        '#FFFFFF',
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
      marginVertical: 15,
      backgroundColor:
        '#F1F5F9',
    },

    infoRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },

    infoLeft: {
      flex: 1,
      paddingRight: 15,
    },

    infoLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
    },

    infoDescription: {
      marginTop: 4,
      fontSize: 11,
      color: '#9CA3AF',
    },

    infoValue: {
      maxWidth: '45%',
      fontSize: 14,
      fontWeight: '700',
      color: '#111827',
      textAlign: 'right',
    },

    statusCard: {
      marginHorizontal: 22,
      marginTop: 20,
      padding: 17,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },

    goodStatus: {
      backgroundColor:
        '#F0FDF4',
    },

    warningStatus: {
      backgroundColor:
        '#FFF7ED',
    },

    statusDot: {
      width: 11,
      height: 11,
      borderRadius: 6,
    },

    goodDot: {
      backgroundColor:
        '#22C55E',
    },

    warningDot: {
      backgroundColor:
        '#F97316',
    },

    statusContent: {
      flex: 1,
      marginLeft: 12,
    },

    statusTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#374151',
    },

    statusDescription: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: '#64748B',
    },

    calibrationCard: {
      marginHorizontal: 22,
      marginTop: 20,
      padding: 20,
      borderRadius: 22,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      alignItems: 'center',
    },

    figureEight: {
      marginTop: 12,
    },

    figureEightText: {
      fontSize: 65,
      fontWeight: '300',
      color: '#2563EB',
    },

    calibrationText: {
      marginTop: 7,
      fontSize: 12,
      lineHeight: 19,
      color: '#64748B',
      textAlign: 'center',
    },

    tipCard: {
      marginHorizontal: 22,
      marginTop: 18,
      padding: 16,
      borderRadius: 18,
      backgroundColor:
        '#EFF6FF',
      flexDirection: 'row',
    },

    tipIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor:
        '#DBEAFE',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    tipIconText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#2563EB',
    },

    tipText: {
      flex: 1,
      marginLeft: 11,
      fontSize: 11,
      lineHeight: 18,
      color: '#64748B',
    },

    errorCard: {
      marginHorizontal: 22,
      marginTop: 50,
      padding: 24,
      borderRadius: 22,
      backgroundColor:
        '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
    },

    errorTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#991B1B',
    },

    errorText: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      color: '#B91C1C',
    },

    retryButton: {
      height: 50,
      marginTop: 20,
      borderRadius: 15,
      backgroundColor:
        '#2563EB',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    settingsButton: {
      marginTop: 10,
      backgroundColor: '#1D4ED8',
    },

    retryButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });