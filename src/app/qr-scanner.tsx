import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  scanFromURLAsync,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';

/**
 * QR Scanner with live camera barcode detection,
 * torch control, and gallery image scanning.
 */
export default function QRScannerScreen(): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isScanningGallery, setIsScanningGallery] = useState(false);
  const isLockedRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (isLockedRef.current || !result.data) {
        return;
      }
      isLockedRef.current = true;
      setIsFlashOn(false);
      setScannedData(result.data);
    },
    []
  );

  const handleScanAgain = (): void => {
    isLockedRef.current = false;
    setScannedData(null);
  };

  const handleOpenResult = async (): Promise<void> => {
    if (!scannedData) {
      return;
    }
    const canOpen = await Linking.canOpenURL(scannedData);
    if (!canOpen) {
      Alert.alert('Cannot open', 'This scanned value is not a valid link.');
      return;
    }
    await Linking.openURL(scannedData);
  };

  const handleShareResult = async (): Promise<void> => {
    if (!scannedData) {
      return;
    }
    await Share.share({ message: scannedData });
  };

  const handlePickFromGallery = async (): Promise<void> => {
    try {
      setIsScanningGallery(true);
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (pickerResult.canceled || !pickerResult.assets[0]?.uri) {
        return;
      }
      const barcodes = await scanFromURLAsync(pickerResult.assets[0].uri, [
        'qr',
      ]);
      if (!barcodes.length) {
        Alert.alert('No QR found', 'This image does not contain a QR code.');
        return;
      }
      isLockedRef.current = true;
      setIsFlashOn(false);
      setScannedData(barcodes[0].data);
    } catch (error) {
      console.log('Gallery QR scan error:', error);
      Alert.alert('Scan failed', 'Could not scan a QR code from that image.');
    } finally {
      setIsScanningGallery(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="QR Scanner" />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Checking camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="QR Scanner" />
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera permission required</Text>
          <Text style={styles.permissionText}>
            Pocket Toolkit needs camera access to scan QR codes.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            activeOpacity={0.85}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isScanningPaused = scannedData !== null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="QR Scanner" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headingContainer}>
          <Text style={styles.title}>Scan QR Code</Text>
          <Text style={styles.subtitle}>
            Position the QR code inside the frame
          </Text>
        </View>

        <View style={styles.scannerContainer}>
          <View style={styles.cameraShell}>
            {!isScanningPaused ? (
              <CameraView
                style={styles.camera}
                facing="back"
                enableTorch={isFlashOn}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={handleBarcodeScanned}
              />
            ) : (
              <View style={styles.pausedCamera}>
                <Ionicons name="checkmark-circle" size={56} color="#22C55E" />
                <Text style={styles.pausedText}>QR code detected</Text>
              </View>
            )}

            <View style={styles.scanFrame} pointerEvents="none">
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {!isScanningPaused && <View style={styles.scanLine} />}
            </View>

            <Text style={styles.cameraText}>
              {isScanningPaused
                ? 'Tap Scan Again to continue'
                : 'Align QR code within the frame'}
            </Text>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.controlButton}
            disabled={isScanningPaused}
            onPress={() => setIsFlashOn((prev) => !prev)}
          >
            <View
              style={[
                styles.controlIcon,
                isFlashOn && styles.controlIconActive,
                isScanningPaused && styles.controlIconDisabled,
              ]}
            >
              <Ionicons
                name={isFlashOn ? 'flash' : 'flash-outline'}
                size={24}
                color={
                  isScanningPaused
                    ? '#9CA3AF'
                    : isFlashOn
                      ? '#FFFFFF'
                      : '#111827'
                }
              />
            </View>
            <Text style={styles.controlText}>
              {isFlashOn ? 'Flash On' : 'Flash'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.controlButton}
            disabled={isScanningGallery}
            onPress={handlePickFromGallery}
          >
            <View style={styles.controlIcon}>
              {isScanningGallery ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <Ionicons name="images-outline" size={24} color="#111827" />
              )}
            </View>
            <Text style={styles.controlText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultIcon}>
              <Ionicons name="time-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.resultTitle}>Last Scanned</Text>
          </View>

          <View style={styles.divider} />

          {scannedData ? (
            <>
              <Text style={styles.resultValue} selectable>
                {scannedData}
              </Text>
              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.resultActionButton}
                  activeOpacity={0.85}
                  onPress={handleScanAgain}
                >
                  <Text style={styles.resultActionText}>Scan Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.resultActionButton,
                    styles.resultActionSecondary,
                  ]}
                  activeOpacity={0.85}
                  onPress={handleShareResult}
                >
                  <Text style={styles.resultActionSecondaryText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.resultActionButton,
                    styles.resultActionSecondary,
                  ]}
                  activeOpacity={0.85}
                  onPress={handleOpenResult}
                >
                  <Text style={styles.resultActionSecondaryText}>Open</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyResult}>
              <Ionicons name="qr-code-outline" size={24} color="#9CA3AF" />
              <Text style={styles.emptyResultText}>
                No QR code scanned yet
              </Text>
            </View>
          )}
        </View>

        <View style={styles.hintContainer}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#6B7280"
          />
          <Text style={styles.hintText}>
            Scanning starts automatically when a QR code is detected. Use
            Gallery to scan from a photo.
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
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: '#6B7280',
  },
  permissionCard: {
    marginHorizontal: 22,
    marginTop: 40,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
  },
  permissionText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#B91C1C',
  },
  permissionButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headingContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 24,
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
  scannerContainer: {
    marginTop: 30,
    paddingHorizontal: 22,
  },
  cameraShell: {
    height: 350,
    borderRadius: 28,
    backgroundColor: '#111827',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  pausedCamera: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    gap: 12,
  },
  pausedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  scanFrame: {
    position: 'absolute',
    width: 220,
    height: 220,
  },
  corner: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '50%',
    height: 2,
    borderRadius: 20,
    backgroundColor: '#60A5FA',
  },
  cameraText: {
    position: 'absolute',
    bottom: 26,
    color: '#D1D5DB',
    fontSize: 13,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 52,
    marginTop: 25,
  },
  controlButton: {
    alignItems: 'center',
  },
  controlIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  controlIconActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  controlIconDisabled: {
    opacity: 0.6,
  },
  controlText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  resultCard: {
    marginHorizontal: 22,
    marginTop: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  emptyResult: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyResultText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#9CA3AF',
  },
  resultValue: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  resultActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  resultActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  resultActionSecondary: {
    backgroundColor: '#EFF6FF',
  },
  resultActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultActionSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginTop: 20,
  },
  hintText: {
    marginLeft: 7,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
});
