import {
    getRecordingPermissionsAsync,
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
  } from 'expo-audio';
  
  import React, {
    useEffect,
    useRef,
    useState,
  } from 'react';
  
  import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';

  import { ScreenHeader } from '@/components/screen-header';
  
  // Enable microphone metering
  const recordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  };
  
  type PermissionState =
    | 'checking'
    | 'granted'
    | 'denied';
  
  export default function SoundMeterScreen() {
    const recorder = useAudioRecorder(recordingOptions);
  
    // Get recorder state every 200ms
    const recorderState = useAudioRecorderState(
      recorder,
      200
    );
  
    const [permissionState, setPermissionState] =
      useState<PermissionState>('checking');
  
    const [currentDb, setCurrentDb] =
      useState<number | null>(null);
  
    const [minimumDb, setMinimumDb] =
      useState<number | null>(null);
  
    const [maximumDb, setMaximumDb] =
      useState<number | null>(null);
  
    const [averageDb, setAverageDb] =
      useState<number | null>(null);
  
    const [starting, setStarting] = useState(false);
  
    const totalRef = useRef(0);
    const sampleCountRef = useRef(0);
  
    /*
     * Check microphone permission when screen opens.
     * We don't force the popup immediately.
     */
    useEffect(() => {
      const checkPermission = async () => {
        try {
          const permission =
            await getRecordingPermissionsAsync();
  
          setPermissionState(
            permission.granted
              ? 'granted'
              : 'denied'
          );
        } catch (error) {
          console.log(
            'Microphone permission check error:',
            error
          );
  
          setPermissionState('denied');
        }
      };
  
      checkPermission();
    }, []);
  
    /*
     * Receive live microphone metering.
     */
    useEffect(() => {
      if (!recorderState.isRecording) {
        return;
      }
  
      const metering = recorderState.metering;
  
      if (typeof metering !== 'number') {
        return;
      }
  
      setCurrentDb(metering);
  
      setMinimumDb((previous) => {
        if (previous === null) {
          return metering;
        }
  
        return Math.min(previous, metering);
      });
  
      setMaximumDb((previous) => {
        if (previous === null) {
          return metering;
        }
  
        return Math.max(previous, metering);
      });
  
      totalRef.current += metering;
      sampleCountRef.current += 1;
  
      const average =
        totalRef.current /
        sampleCountRef.current;
  
      setAverageDb(average);
    }, [
      recorderState.metering,
      recorderState.isRecording,
    ]);
  
    /*
     * Restore normal audio mode when leaving screen.
     */
    useEffect(() => {
      return () => {
        setAudioModeAsync({
          allowsRecording: false,
        }).catch(() => {});
      };
    }, []);
  
    const requestMicrophonePermission =
      async (): Promise<boolean> => {
        try {
          const current =
            await getRecordingPermissionsAsync();
  
          if (current.granted) {
            setPermissionState('granted');
            return true;
          }
  
          const requested =
            await requestRecordingPermissionsAsync();
  
          if (requested.granted) {
            setPermissionState('granted');
            return true;
          }
  
          setPermissionState('denied');
  
          Alert.alert(
            'Microphone Permission',
            'Microphone access is required to measure sound.'
          );
  
          return false;
        } catch (error) {
          console.log(
            'Permission error:',
            error
          );
  
          return false;
        }
      };
  
    const resetStatistics = () => {
      setCurrentDb(null);
      setMinimumDb(null);
      setMaximumDb(null);
      setAverageDb(null);
  
      totalRef.current = 0;
      sampleCountRef.current = 0;
    };
  
    const startMeasurement = async () => {
      try {
        setStarting(true);
  
        const hasPermission =
          await requestMicrophonePermission();
  
        if (!hasPermission) {
          return;
        }
  
        resetStatistics();
  
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
  
        /*
         * Passing the options here too ensures
         * metering is enabled for this recording.
         */
        await recorder.prepareToRecordAsync(
          recordingOptions
        );
  
        recorder.record();
      } catch (error) {
        console.log(
          'Start measurement error:',
          error
        );
  
        Alert.alert(
          'Unable to start',
          'Could not access the microphone.'
        );
      } finally {
        setStarting(false);
      }
    };
  
    const stopMeasurement = async () => {
      try {
        await recorder.stop();
  
        await setAudioModeAsync({
          allowsRecording: false,
        });
      } catch (error) {
        console.log(
          'Stop measurement error:',
          error
        );
      }
    };
  
    const toggleMeasurement = () => {
      if (recorderState.isRecording) {
        stopMeasurement();
      } else {
        startMeasurement();
      }
    };
  
    /*
     * Relative microphone level classification.
     *
     * dBFS values are normally negative.
     * Closer to 0 = stronger microphone signal.
     */
    const getSoundStatus = (
      value: number | null
    ) => {
      if (value === null) {
        return 'Waiting';
      }
  
      if (value < -50) {
        return 'Quiet';
      }
  
      if (value < -30) {
        return 'Moderate';
      }
  
      if (value < -15) {
        return 'Loud';
      }
  
      return 'Very Loud';
    };
  
    /*
     * Convert approximately -60 → 0 dBFS
     * into a 0 → 100 UI progress value.
     */
    const getProgress = (
      value: number | null
    ) => {
      if (value === null) {
        return 0;
      }
  
      const min = -60;
      const max = 0;
  
      const normalized =
        ((value - min) / (max - min)) * 100;
  
      return Math.max(
        0,
        Math.min(100, normalized)
      );
    };
  
    const formatDb = (
      value: number | null
    ) => {
      if (value === null) {
        return '--';
      }
  
      return value.toFixed(1);
    };
  
    const status =
      getSoundStatus(currentDb);
  
    const progress =
      getProgress(currentDb);
  
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
  
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
        >
          {/* Header */}
  
          <ScreenHeader title="Sound Meter" />
  
          {/* Heading */}
  
          <View
            style={styles.headingContainer}
          >
            <Text style={styles.title}>
              Microphone Level
            </Text>
  
            <Text style={styles.subtitle}>
              Measure the live microphone input
              level
            </Text>
          </View>
  
          {/* Main Meter */}
  
          <View style={styles.meterCard}>
            <View style={styles.gaugeOuter}>
              <View style={styles.gaugeMiddle}>
                <View
                  style={styles.gaugeInner}
                >
                  <Text style={styles.dbValue}>
                    {formatDb(currentDb)}
                  </Text>
  
                  <Text style={styles.dbUnit}>
                    dBFS
                  </Text>
  
                  <View
                    style={styles.statusBadge}
                  >
                    <Text
                      style={
                        styles.statusText
                      }
                    >
                      {status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
  
            {/* Live indicator */}
  
            <View
              style={
                styles.liveStatusContainer
              }
            >
              <View
                style={[
                  styles.liveDot,
                  recorderState.isRecording &&
                    styles.liveDotActive,
                ]}
              />
  
              <Text
                style={styles.liveStatusText}
              >
                {recorderState.isRecording
                  ? 'Measuring live'
                  : 'Measurement stopped'}
              </Text>
            </View>
  
            {/* Level bar */}
  
            <View
              style={styles.scaleContainer}
            >
              <View
                style={styles.scaleBackground}
              >
                <View
                  style={[
                    styles.scaleProgress,
                    {
                      width: `${progress}%`,
                    },
                  ]}
                />
              </View>
  
              <View
                style={styles.scaleLabels}
              >
                <Text
                  style={styles.scaleLabel}
                >
                  Quiet
                </Text>
  
                <Text
                  style={styles.scaleLabel}
                >
                  Moderate
                </Text>
  
                <Text
                  style={styles.scaleLabel}
                >
                  Loud
                </Text>
              </View>
            </View>
          </View>
  
          {/* Statistics */}
  
          <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>
              Live Statistics
            </Text>
  
            <View style={styles.divider} />
  
            <StatRow
              label="Minimum"
              value={`${formatDb(
                minimumDb
              )} dBFS`}
            />
  
            <View style={styles.divider} />
  
            <StatRow
              label="Average"
              value={`${formatDb(
                averageDb
              )} dBFS`}
            />
  
            <View style={styles.divider} />
  
            <StatRow
              label="Maximum"
              value={`${formatDb(
                maximumDb
              )} dBFS`}
            />
          </View>
  
          {/* Duration */}
  
          <View style={styles.durationCard}>
            <Text
              style={styles.durationLabel}
            >
              Measurement Time
            </Text>
  
            <Text
              style={styles.durationValue}
            >
              {Math.floor(
                recorderState.durationMillis /
                  1000
              )}{' '}
              sec
            </Text>
          </View>
  
          {/* Start / Stop */}
  
          <TouchableOpacity
            style={[
              styles.measureButton,
              recorderState.isRecording &&
                styles.stopButton,
            ]}
            activeOpacity={0.85}
            disabled={starting}
            onPress={toggleMeasurement}
          >
            {starting ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <>
                <View
                  style={styles.buttonIcon}
                >
                  <Text
                    style={
                      styles.buttonIconText
                    }
                  >
                    {recorderState.isRecording
                      ? '■'
                      : '●'}
                  </Text>
                </View>
  
                <Text
                  style={
                    styles.measureButtonText
                  }
                >
                  {recorderState.isRecording
                    ? 'Stop Measuring'
                    : 'Start Measuring'}
                </Text>
              </>
            )}
          </TouchableOpacity>
  
          {/* Reset */}
  
          {!recorderState.isRecording &&
            currentDb !== null && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetStatistics}
              >
                <Text
                  style={
                    styles.resetButtonText
                  }
                >
                  Reset Statistics
                </Text>
              </TouchableOpacity>
            )}
  
          {/* Permission */}
  
          <View style={styles.infoCard}>
            <View
              style={styles.infoIconContainer}
            >
              <Text style={styles.infoIcon}>
                i
              </Text>
            </View>
  
            <View style={styles.infoContent}>
              <Text
                style={styles.infoTitle}
              >
                Microphone
              </Text>
  
              <Text
                style={styles.infoText}
              >
                {permissionState ===
                'checking'
                  ? 'Checking microphone permission...'
                  : permissionState ===
                      'granted'
                    ? 'Microphone permission granted.'
                    : 'Microphone permission is required to measure sound.'}
              </Text>
            </View>
          </View>
  
          {/* Accuracy note */}
  
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              This value is the microphone's
              relative recording level (dBFS),
              not a calibrated sound-pressure
              measurement.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  type StatRowProps = {
    label: string;
    value: string;
  };
  
  function StatRow({
    label,
    value,
  }: StatRowProps) {
    return (
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>
          {label}
        </Text>
  
        <Text style={styles.statValue}>
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
      color: '#6B7280',
      textAlign: 'center',
    },
  
    meterCard: {
      marginHorizontal: 22,
      marginTop: 30,
      padding: 24,
      borderRadius: 28,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      alignItems: 'center',
    },
  
    gaugeOuter: {
      width: 225,
      height: 225,
      borderRadius: 113,
      backgroundColor: '#DBEAFE',
      alignItems: 'center',
      justifyContent: 'center',
    },
  
    gaugeMiddle: {
      width: 185,
      height: 185,
      borderRadius: 93,
      backgroundColor: '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
  
    gaugeInner: {
      width: 145,
      height: 145,
      borderRadius: 73,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
  
    dbValue: {
      fontSize: 39,
      fontWeight: '900',
      color: '#111827',
    },
  
    dbUnit: {
      fontSize: 14,
      fontWeight: '700',
      color: '#64748B',
    },
  
    statusBadge: {
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 15,
      backgroundColor: '#EFF6FF',
    },
  
    statusText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#2563EB',
      letterSpacing: 0.8,
    },
  
    liveStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
    },
  
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#CBD5E1',
    },
  
    liveDotActive: {
      backgroundColor: '#22C55E',
    },
  
    liveStatusText: {
      marginLeft: 7,
      fontSize: 12,
      color: '#64748B',
    },
  
    scaleContainer: {
      width: '100%',
      marginTop: 25,
    },
  
    scaleBackground: {
      height: 10,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: '#E5E7EB',
    },
  
    scaleProgress: {
      height: '100%',
      backgroundColor: '#2563EB',
      borderRadius: 10,
    },
  
    scaleLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
  
    scaleLabel: {
      fontSize: 11,
      color: '#9CA3AF',
    },
  
    statsCard: {
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
  
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  
    statLabel: {
      fontSize: 14,
      color: '#64748B',
    },
  
    statValue: {
      fontSize: 15,
      fontWeight: '700',
      color: '#111827',
    },
  
    durationCard: {
      marginHorizontal: 22,
      marginTop: 20,
      padding: 18,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  
    durationLabel: {
      fontSize: 14,
      color: '#64748B',
    },
  
    durationValue: {
      fontSize: 15,
      fontWeight: '700',
      color: '#111827',
    },
  
    measureButton: {
      height: 58,
      marginHorizontal: 22,
      marginTop: 24,
      borderRadius: 18,
      backgroundColor: '#2563EB',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
  
    stopButton: {
      backgroundColor: '#DC2626',
    },
  
    buttonIcon: {
      marginRight: 10,
    },
  
    buttonIconText: {
      color: '#FFFFFF',
      fontSize: 17,
    },
  
    measureButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  
    resetButton: {
      height: 50,
      marginHorizontal: 22,
      marginTop: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
  
    resetButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#374151',
    },
  
    infoCard: {
      flexDirection: 'row',
      marginHorizontal: 22,
      marginTop: 20,
      padding: 16,
      borderRadius: 18,
      backgroundColor: '#EFF6FF',
    },
  
    infoIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#DBEAFE',
      alignItems: 'center',
      justifyContent: 'center',
    },
  
    infoIcon: {
      fontWeight: '800',
      color: '#2563EB',
    },
  
    infoContent: {
      flex: 1,
      marginLeft: 12,
    },
  
    infoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#1E3A8A',
    },
  
    infoText: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: '#64748B',
    },
  
    noteCard: {
      marginHorizontal: 22,
      marginTop: 15,
      padding: 14,
    },
  
    noteText: {
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
      color: '#94A3B8',
    },
  });