import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenHeader } from '@/components/screen-header';

type CameraState =
  | 'checking'
  | 'ready'
  | 'unavailable'
  | 'error';

export default function FlashlightScreen() {
  const [permission, requestPermission] =
    useCameraPermissions();

  const [cameraState, setCameraState] =
    useState<CameraState>('checking');

  const [cameraReady, setCameraReady] =
    useState(false);

  const [torchEnabled, setTorchEnabled] =
    useState(false);

  const [isBlinking, setIsBlinking] =
    useState(false);

  const blinkIntervalRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraError, setCameraError] =
    useState<string | null>(null);

  /**
   * Check whether a camera exists
   * on the current device.
   */
  useEffect(() => {
    const checkCamera = async () => {
      try {
        setCameraState('checking');

        const available =
          await CameraView.isAvailableAsync();

        if (!available) {
          setCameraState('unavailable');
          return;
        }

        setCameraState('ready');
      } catch (error) {
        console.log(
          'Camera availability error:',
          error
        );

        setCameraState('error');
      }
    };

    checkCamera();
  }, []);

  const stopBlinking = () => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }

    setIsBlinking(false);
    setTorchEnabled(false);
  };

  const startBlinking = () => {
    if (!cameraReady) {
      return;
    }

    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
    }

    setTorchEnabled(true);
    setIsBlinking(true);

    blinkIntervalRef.current = setInterval(
      () => {
        setTorchEnabled(
          (current) => !current
        );
      },
      500
    );
  };

  const toggleBlinking = () => {
    if (isBlinking) {
      stopBlinking();
      return;
    }

    startBlinking();
  };

  /**
   * Always stop blinking and turn the
   * torch state off when leaving the screen.
   */
  useEffect(() => {
    return () => {
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current);
      }

      setTorchEnabled(false);
    };
  }, []);

  // Normal Turn On / Turn Off — kept for later, blink-only for now.
  // const toggleFlashlight = () => {
  //   if (!cameraReady || isBlinking) {
  //     return;
  //   }
  //
  //   setTorchEnabled(
  //     (current) => !current
  //   );
  // };

  const handleCameraReady = () => {
    setCameraReady(true);
    setCameraError(null);
  };

  const handleCameraError = (
    event: { message: string }
  ) => {
    console.log(
      'Camera mount error:',
      event.message
    );

    setCameraReady(false);
    stopBlinking();
    setCameraError(event.message);
  };

  /**
   * Camera permission still loading.
   */
  if (
    !permission ||
    cameraState === 'checking'
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="dark-content"
        />

        <ScreenHeader title="Flashlight" />

        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#2563EB"
          />

          <Text style={styles.loadingText}>
            Preparing flashlight...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Device has no usable camera.
   */
  if (
    cameraState === 'unavailable'
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="dark-content"
        />

        <ScreenHeader title="Flashlight" />

        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            Camera Unavailable
          </Text>

          <Text style={styles.errorText}>
            This device does not have an
            available camera for the
            flashlight.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Camera permission not granted.
   */
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="dark-content"
        />

        <ScreenHeader title="Flashlight" />

        <View
          style={
            styles.permissionContainer
          }
        >
          <View
            style={styles.permissionIcon}
          >
            <Text
              style={
                styles.permissionIconText
              }
            >
              🔦
            </Text>
          </View>

          <Text
            style={
              styles.permissionTitle
            }
          >
            Camera Access Required
          </Text>

          <Text
            style={
              styles.permissionText
            }
          >
            Pocket Toolkit uses the rear
            camera torch to provide the
            flashlight feature.
          </Text>

          {permission.canAskAgain ? (
            <TouchableOpacity
              style={
                styles.permissionButton
              }
              activeOpacity={0.8}
              onPress={
                requestPermission
              }
            >
              <Text
                style={
                  styles.permissionButtonText
                }
              >
                Allow Camera Access
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={
                styles.permissionButton
              }
              activeOpacity={0.8}
              onPress={() =>
                Linking.openSettings()
              }
            >
              <Text
                style={
                  styles.permissionButtonText
                }
              >
                Open Settings
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={
          torchEnabled
            ? 'light-content'
            : 'dark-content'
        }
      />

      {/*
       * CameraView must remain mounted
       * so the hardware torch can work.
       *
       * We don't need to show the camera
       * preview to the user, therefore we
       * keep the preview extremely small.
       */}
      <CameraView
        style={styles.hiddenCamera}
        facing="back"
        enableTorch={
          cameraReady &&
          torchEnabled
        }
        onCameraReady={
          handleCameraReady
        }
        onMountError={
          handleCameraError
        }
      />

      <View
        style={[
          styles.screen,
          torchEnabled &&
            styles.screenActive,
        ]}
      >
        <ScreenHeader
          title="Flashlight"
          variant={torchEnabled ? 'dark' : 'default'}
        />

        <View
          style={styles.content}
        >
          {/* Heading */}

          <Text
            style={[
              styles.title,
              torchEnabled &&
                styles.lightText,
            ]}
          >
            Flashlight
          </Text>

          <Text
            style={[
              styles.subtitle,
              torchEnabled &&
                styles.lightSubtitle,
            ]}
          >
            {isBlinking || torchEnabled
              ? 'Your flashlight is blinking'
              : 'Tap Blink Flashlight to start'}
          </Text>

          {/* Main flashlight visual */}

          <View
            style={[
              styles.lightArea,
              torchEnabled &&
                styles.lightAreaActive,
            ]}
          >
            <View
              style={[
                styles.glowOuter,
                torchEnabled &&
                  styles.glowOuterActive,
              ]}
            >
              <View
                style={[
                  styles.glowMiddle,
                  torchEnabled &&
                    styles.glowMiddleActive,
                ]}
              >
                <View
                  style={[
                    styles.flashlightCircle,
                    torchEnabled &&
                      styles.flashlightCircleActive,
                  ]}
                >
                  <Text
                    style={
                      styles.flashlightIcon
                    }
                  >
                    🔦
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Status */}

          <View
            style={[
              styles.statusBadge,
              torchEnabled
                ? styles.statusOn
                : styles.statusOff,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                torchEnabled
                  ? styles.statusDotOn
                  : styles.statusDotOff,
              ]}
            />

            <Text
              style={[
                styles.statusText,
                torchEnabled
                  ? styles.statusTextOn
                  : styles.statusTextOff,
              ]}
            >
              {torchEnabled
                ? 'FLASHLIGHT ON'
                : cameraReady
                  ? 'FLASHLIGHT OFF'
                  : 'PREPARING CAMERA'}
            </Text>
          </View>

          {/* Torch intensity */}

          <View
            style={styles.intensitySection}
          >
            <View
              style={
                styles.intensityHeader
              }
            >
              <Text
                style={[
                  styles.intensityTitle,
                  torchEnabled &&
                    styles.lightText,
                ]}
              >
                Intensity
              </Text>

              <Text
                style={
                  styles.intensityValue
                }
              >
                Device default
              </Text>
            </View>

            <View
              style={
                styles.intensityOptions
              }
            >
              {[
                'Low',
                'Medium',
                'High',
              ].map((level) => (
                <TouchableOpacity
                  key={level}
                  disabled
                  style={
                    styles.intensityOption
                  }
                >
                  <Text
                    style={
                      styles.intensityOptionText
                    }
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={
                styles.intensityUnsupported
              }
            >
              Torch intensity is not
              supported by Expo Camera on
              this device build.
            </Text>
          </View>

          {/* Power Button — Turn On / Turn Off (disabled while blink-only) */}
          {/*
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={
              !cameraReady || isBlinking
            }
            onPress={
              toggleFlashlight
            }
            style={[
              styles.powerButton,
              torchEnabled
                ? styles.powerButtonActive
                : styles.powerButtonInactive,
              (!cameraReady ||
                isBlinking) &&
                styles.powerButtonDisabled,
            ]}
          >
            {!cameraReady ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <>
                <Text
                  style={
                    styles.powerIcon
                  }
                >
                  ⏻
                </Text>

                <Text
                  style={
                    styles.powerButtonText
                  }
                >
                  {torchEnabled
                    ? 'Turn Off'
                    : 'Turn On'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          */}

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!cameraReady}
            onPress={toggleBlinking}
            style={[
              styles.powerButton,
              styles.blinkButton,
              isBlinking &&
                styles.blinkButtonActive,
              !cameraReady &&
                styles.powerButtonDisabled,
            ]}
          >
            <Text
              style={
                styles.powerButtonText
              }
            >
              {isBlinking
                ? 'Stop Blinking'
                : 'Blink Flashlight'}
            </Text>
          </TouchableOpacity>

          {/* Camera error */}

          {cameraError && (
            <View
              style={
                styles.cameraErrorCard
              }
            >
              <Text
                style={
                  styles.cameraErrorTitle
                }
              >
                Camera Error
              </Text>

              <Text
                style={
                  styles.cameraErrorText
                }
              >
                {cameraError}
              </Text>
            </View>
          )}

          {/* Information */}

          <View
            style={[
              styles.infoCard,
              torchEnabled &&
                styles.infoCardDark,
            ]}
          >
            <View
              style={styles.infoIcon}
            >
              <Text
                style={
                  styles.infoIconText
                }
              >
                i
              </Text>
            </View>

            <Text
              style={[
                styles.infoText,
                torchEnabled &&
                  styles.infoTextDark,
              ]}
            >
              The flashlight uses your
              phone&apos;s rear camera torch.
              It will automatically stop
              when this screen is closed.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  screenActive: {
    backgroundColor: '#0F172A',
  },

  /*
   * Camera session is required for torch,
   * but we don't need the preview.
   */
  hiddenCamera: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
  },

  content: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: 'center',
  },

  title: {
    marginTop: 20,
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: '#6B7280',
  },

  lightText: {
    color: '#FFFFFF',
  },

  lightSubtitle: {
    color: '#CBD5E1',
  },

  lightArea: {
    width: '100%',
    height: 330,
    marginTop: 30,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lightAreaActive: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },

  glowOuter: {
    width: 235,
    height: 235,
    borderRadius: 118,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  glowOuterActive: {
    backgroundColor:
      'rgba(250,204,21,0.10)',
  },

  glowMiddle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  glowMiddleActive: {
    backgroundColor:
      'rgba(250,204,21,0.20)',
  },

  flashlightCircle: {
    width: 125,
    height: 125,
    borderRadius: 63,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  flashlightCircleActive: {
    backgroundColor: '#FACC15',
  },

  flashlightIcon: {
    fontSize: 52,
  },

  statusBadge: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusOff: {
    backgroundColor: '#F1F5F9',
  },

  statusOn: {
    backgroundColor:
      'rgba(34,197,94,0.15)',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  statusDotOff: {
    backgroundColor: '#94A3B8',
  },

  statusDotOn: {
    backgroundColor: '#22C55E',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  statusTextOff: {
    color: '#64748B',
  },

  statusTextOn: {
    color: '#22C55E',
  },

  intensitySection: {
    width: '100%',
    marginTop: 18,
  },

  intensityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  intensityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  intensityValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  intensityOptions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },

  intensityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    opacity: 0.55,
  },

  intensityOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  intensityUnsupported: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    color: '#94A3B8',
  },

  powerButton: {
    width: '100%',
    height: 60,
    marginTop: 26,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  powerButtonInactive: {
    backgroundColor: '#2563EB',
  },

  powerButtonActive: {
    backgroundColor: '#DC2626',
  },

  blinkButton: {
    marginTop: 12,
    backgroundColor: '#7C3AED',
  },

  blinkButtonActive: {
    backgroundColor: '#DC2626',
  },

  powerButtonDisabled: {
    opacity: 0.6,
  },

  powerIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    marginRight: 9,
  },

  powerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  infoCard: {
    width: '100%',
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
  },

  infoCardDark: {
    backgroundColor:
      'rgba(255,255,255,0.08)',
  },

  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoIconText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },

  infoText: {
    flex: 1,
    marginLeft: 11,
    fontSize: 11,
    lineHeight: 18,
    color: '#64748B',
  },

  infoTextDark: {
    color: '#CBD5E1',
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

  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  permissionIcon: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  permissionIconText: {
    fontSize: 42,
  },

  permissionTitle: {
    marginTop: 20,
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },

  permissionText: {
    marginTop: 9,
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
  },

  permissionButton: {
    marginTop: 24,
    height: 54,
    paddingHorizontal: 28,
    borderRadius: 17,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  permissionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  errorCard: {
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

  cameraErrorCard: {
    width: '100%',
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
  },

  cameraErrorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },

  cameraErrorText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: '#B91C1C',
  },
});
