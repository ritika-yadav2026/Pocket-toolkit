import { Accelerometer, DeviceMotion } from 'expo-sensors';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
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
  | 'ready'
  | 'unavailable'
  | 'permission-denied'
  | 'error';

type Tilt = {
  horizontal: number;
  vertical: number;
};

type GravitySample = {
  x: number;
  y: number;
  z: number;
};

const LEVEL_THRESHOLD = 1;
const MAX_VISUAL_ANGLE = 15;
const BUBBLE_TRAVEL = 70;
const SMOOTHING = 0.2;

export default function SpiritLevelScreen() {
  const [sensorState, setSensorState] =
    useState<SensorState>('checking');

  const [tilt, setTilt] = useState<Tilt>({
    horizontal: 0,
    vertical: 0,
  });

  const [hasReading, setHasReading] =
    useState(false);

  const [calibration, setCalibration] =
    useState<Tilt>({
      horizontal: 0,
      vertical: 0,
    });

  const subscriptionRef = useRef<{
    remove: () => void;
  } | null>(null);

  const smoothedHorizontalRef =
    useRef(0);

  const smoothedVerticalRef =
    useRef(0);

  /**
   * Keep value between -1 and 1
   * before passing it to asin().
   */
  const clampUnit = (value: number) =>
    Math.max(-1, Math.min(1, value));

  /**
   * Convert gravity sample into smoothed tilt angles.
   */
  const applyGravitySample = useCallback(
    (gravity: GravitySample) => {
      const { x, y, z } = gravity;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      if (!magnitude) {
        return;
      }
      const horizontalRaw =
        (Math.asin(clampUnit(x / magnitude)) * 180) / Math.PI;
      const verticalRaw =
        (Math.asin(clampUnit(y / magnitude)) * 180) / Math.PI;
      smoothedHorizontalRef.current =
        smoothedHorizontalRef.current +
        SMOOTHING * (horizontalRaw - smoothedHorizontalRef.current);
      smoothedVerticalRef.current =
        smoothedVerticalRef.current +
        SMOOTHING * (verticalRaw - smoothedVerticalRef.current);
      setTilt({
        horizontal: smoothedHorizontalRef.current,
        vertical: smoothedVerticalRef.current,
      });
      setHasReading(true);
    },
    []
  );

  /**
   * Prefer Accelerometer on Android (DeviceMotion is often unavailable).
   * Fall back to DeviceMotion when needed.
   */
  const startSensor = useCallback(
    async (useAccelerometer: boolean) => {
      subscriptionRef.current?.remove();
      if (useAccelerometer) {
        Accelerometer.setUpdateInterval(100);
        subscriptionRef.current = Accelerometer.addListener((measurement) => {
          applyGravitySample(measurement);
        });
        return;
      }
      DeviceMotion.setUpdateInterval(100);
      subscriptionRef.current = DeviceMotion.addListener((measurement) => {
        const gravity = measurement.accelerationIncludingGravity;
        if (!gravity) {
          return;
        }
        applyGravitySample(gravity);
      });
    },
    [applyGravitySample]
  );

  /**
   * Check sensor + permission.
   */
  const initializeSensor = useCallback(async () => {
    try {
      setSensorState('checking');
      const accelerometerAvailable =
        await Accelerometer.isAvailableAsync();
      const deviceMotionAvailable = accelerometerAvailable
        ? false
        : await DeviceMotion.isAvailableAsync();
      if (!accelerometerAvailable && !deviceMotionAvailable) {
        setSensorState('unavailable');
        return;
      }
      const sensorApi = accelerometerAvailable
        ? Accelerometer
        : DeviceMotion;
      let permission = await sensorApi.getPermissionsAsync();
      if (!permission.granted) {
        permission = await sensorApi.requestPermissionsAsync();
      }
      if (!permission.granted) {
        setSensorState('permission-denied');
        return;
      }
      await startSensor(accelerometerAvailable);
      setSensorState('ready');
    } catch (error) {
      console.log('Spirit level sensor error:', error);
      setSensorState('error');
    }
  }, [startSensor]);

  useEffect(() => {
    void initializeSensor();
    return () => {
      subscriptionRef.current?.remove();
    };
  }, [initializeSensor]);

  /**
   * Apply calibration offsets.
   */
  const horizontalAngle =
    tilt.horizontal -
    calibration.horizontal;

  const verticalAngle =
    tilt.vertical -
    calibration.vertical;

  /**
   * Consider the device level when
   * both directions are within ±1 degree.
   */
  const isLevel =
    hasReading &&
    Math.abs(horizontalAngle) <=
      LEVEL_THRESHOLD &&
    Math.abs(verticalAngle) <=
      LEVEL_THRESHOLD;

  /**
   * Convert angle into movement inside
   * the visual level area.
   */
  const angleToPosition = (
    angle: number
  ) => {
    const limited = Math.max(
      -MAX_VISUAL_ANGLE,
      Math.min(MAX_VISUAL_ANGLE, angle)
    );

    return (
      (limited / MAX_VISUAL_ANGLE) *
      BUBBLE_TRAVEL
    );
  };

  const bubbleX =
    angleToPosition(horizontalAngle);

  const bubbleY =
    angleToPosition(verticalAngle);

  /**
   * Make the current physical position
   * the new zero point.
   */
  const calibrate = () => {
    setCalibration({
      horizontal: tilt.horizontal,
      vertical: tilt.vertical,
    });
  };

  const resetCalibration = () => {
    setCalibration({
      horizontal: 0,
      vertical: 0,
    });
  };

  const formatAngle = (
    value: number
  ) => {
    if (!hasReading) {
      return '--';
    }

    const fixed =
      Math.abs(value) < 0.05
        ? 0
        : value;

    return `${fixed.toFixed(1)}°`;
  };

  if (sensorState === 'checking') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#2563EB"
          />

          <Text style={styles.loadingText}>
            Checking motion sensor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    sensorState === 'unavailable' ||
    sensorState === 'error'
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <ScreenHeader title="Spirit Level" />

        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            Motion Sensor Unavailable
          </Text>

          <Text style={styles.errorText}>
            This emulator or device has no usable
            motion sensor. Open the app on a real
            phone to use Spirit Level.
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={initializeSensor}
          >
            <Text
              style={styles.retryButtonText}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (
    sensorState ===
    'permission-denied'
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <ScreenHeader title="Spirit Level" />

        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            Motion Access Required
          </Text>

          <Text style={styles.errorText}>
            Pocket Toolkit needs motion sensor
            access to calculate the phone's
            tilt.
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() =>
              Linking.openSettings()
            }
          >
            <Text
              style={styles.retryButtonText}
            >
              Open Settings
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <ScreenHeader title="Spirit Level" />

        {/* Heading */}

        <View
          style={styles.headingContainer}
        >
          <Text style={styles.title}>
            Spirit Level
          </Text>

          <Text style={styles.subtitle}>
            Place your phone flat on a surface
            to check its level
          </Text>
        </View>

        {/* Level Area */}

        <View style={styles.levelCard}>
          <View style={styles.levelArea}>
            {/* Horizontal reference */}

            <View
              style={
                styles.horizontalLine
              }
            />

            {/* Vertical reference */}

            <View
              style={
                styles.verticalLine
              }
            />

            {/* Center target */}

            <View
              style={styles.centerTarget}
            />

            {/* Moving Bubble */}

            <View
              style={[
                styles.bubble,
                isLevel &&
                  styles.bubbleLevel,
                {
                  transform: [
                    {
                      translateX:
                        bubbleX,
                    },
                    {
                      translateY:
                        bubbleY,
                    },
                  ],
                },
              ]}
            >
              <View
                style={styles.bubbleInner}
              />
            </View>
          </View>

          {/* Main Angle */}

          <Text style={styles.mainAngle}>
            {formatAngle(
              Math.sqrt(
                horizontalAngle *
                  horizontalAngle +
                  verticalAngle *
                    verticalAngle
              )
            )}
          </Text>

          <View
            style={[
              styles.levelBadge,
              isLevel
                ? styles.levelBadgeActive
                : styles.levelBadgeInactive,
            ]}
          >
            <Text
              style={[
                styles.levelBadgeText,
                isLevel
                  ? styles.levelTextActive
                  : styles.levelTextInactive,
              ]}
            >
              {!hasReading
                ? 'WAITING'
                : isLevel
                  ? 'LEVEL'
                  : 'NOT LEVEL'}
            </Text>
          </View>
        </View>

        {/* Axis Details */}

        <View style={styles.axisRow}>
          <View style={styles.axisCard}>
            <Text style={styles.axisLabel}>
              Horizontal
            </Text>

            <Text style={styles.axisValue}>
              {formatAngle(
                horizontalAngle
              )}
            </Text>

            <Text
              style={styles.axisHint}
            >
              Left / Right
            </Text>
          </View>

          <View style={styles.axisCard}>
            <Text style={styles.axisLabel}>
              Vertical
            </Text>

            <Text style={styles.axisValue}>
              {formatAngle(
                verticalAngle
              )}
            </Text>

            <Text
              style={styles.axisHint}
            >
              Front / Back
            </Text>
          </View>
        </View>

        {/* Live Status */}

        <View style={styles.statusCard}>
          <View style={styles.liveDot} />

          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              Sensor Active
            </Text>

            <Text style={styles.statusText}>
              Tilt values update automatically
              as you move the phone.
            </Text>
          </View>
        </View>

        {/* Calibration */}

        <View
          style={styles.calibrationCard}
        >
          <Text style={styles.cardTitle}>
            Calibration
          </Text>

          <Text
            style={
              styles.calibrationDescription
            }
          >
            Place the phone on a known flat
            surface, then tap Calibrate to
            compensate for small sensor or case
            offsets.
          </Text>

          <TouchableOpacity
            style={styles.calibrateButton}
            activeOpacity={0.8}
            onPress={calibrate}
            disabled={!hasReading}
          >
            <Text
              style={
                styles.calibrateButtonText
              }
            >
              Calibrate
            </Text>
          </TouchableOpacity>

          {(calibration.horizontal !== 0 ||
            calibration.vertical !== 0) && (
            <TouchableOpacity
              style={
                styles.resetButton
              }
              onPress={
                resetCalibration
              }
            >
              <Text
                style={
                  styles.resetButtonText
                }
              >
                Reset Calibration
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tip */}

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Text
              style={styles.tipIconText}
            >
              i
            </Text>
          </View>

          <Text style={styles.tipText}>
            For the best result, place the
            phone flat and keep it still for a
            moment. A thick or uneven phone
            case can affect the measurement.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    maxWidth: 300,
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
  },

  levelCard: {
    marginHorizontal: 22,
    marginTop: 30,
    paddingVertical: 30,
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  levelArea: {
    width: 250,
    height: 250,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  horizontalLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#93C5FD',
  },

  verticalLine: {
    position: 'absolute',
    top: 20,
    bottom: 20,
    width: 1,
    backgroundColor: '#93C5FD',
  },

  centerTarget: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#60A5FA',
  },

  bubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bubbleLevel: {
    backgroundColor: '#22C55E',
  },

  bubbleInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },

  mainAngle: {
    marginTop: 24,
    fontSize: 38,
    fontWeight: '900',
    color: '#111827',
  },

  levelBadge: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },

  levelBadgeActive: {
    backgroundColor: '#DCFCE7',
  },

  levelBadgeInactive: {
    backgroundColor: '#FEF2F2',
  },

  levelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  levelTextActive: {
    color: '#15803D',
  },

  levelTextInactive: {
    color: '#DC2626',
  },

  axisRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    marginTop: 20,
  },

  axisCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  axisLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  axisValue: {
    marginTop: 7,
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  axisHint: {
    marginTop: 5,
    fontSize: 11,
    color: '#9CA3AF',
  },

  statusCard: {
    marginHorizontal: 22,
    marginTop: 20,
    padding: 17,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    alignItems: 'center',
  },

  liveDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22C55E',
  },

  statusContent: {
    flex: 1,
    marginLeft: 12,
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },

  statusText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: '#4B7D5A',
  },

  calibrationCard: {
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

  calibrationDescription: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 19,
    color: '#6B7280',
  },

  calibrateButton: {
    height: 52,
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  calibrateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  resetButton: {
    height: 46,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },

  tipCard: {
    flexDirection: 'row',
    marginHorizontal: 22,
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
  },

  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
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

  errorContainer: {
    marginHorizontal: 22,
    marginTop: 50,
    padding: 24,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
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
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});