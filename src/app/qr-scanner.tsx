import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenHeader } from '@/components/screen-header';

export default function QRScannerScreen() {
  const [isFlashOn, setIsFlashOn] = useState(false);

  // UI-only for now
  const scannedData: string | null = null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScreenHeader title="QR Scanner" />

      {/* Heading */}
      <View style={styles.headingContainer}>
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={styles.subtitle}>
          Position the QR code inside the frame
        </Text>
      </View>

      {/* Camera placeholder */}
      <View style={styles.scannerContainer}>
        <View style={styles.cameraPlaceholder}>
          <Ionicons
            name="qr-code-outline"
            size={70}
            color="rgba(255,255,255,0.15)"
          />

          {/* Scanner frame */}
          <View style={styles.scanFrame}>
            {/* Top left */}
            <View style={[styles.corner, styles.topLeft]} />

            {/* Top right */}
            <View style={[styles.corner, styles.topRight]} />

            {/* Bottom left */}
            <View style={[styles.corner, styles.bottomLeft]} />

            {/* Bottom right */}
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Scanner line */}
            <View style={styles.scanLine} />
          </View>

          <Text style={styles.cameraText}>
            Align QR code within the frame
          </Text>
        </View>
      </View>

      {/* Scanner controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.controlButton}
          onPress={() => setIsFlashOn((prev) => !prev)}
        >
          <View
            style={[
              styles.controlIcon,
              isFlashOn && styles.controlIconActive,
            ]}
          >
            <Ionicons
              name={isFlashOn ? 'flash' : 'flash-outline'}
              size={24}
              color={isFlashOn ? '#FFFFFF' : '#111827'}
            />
          </View>

          <Text style={styles.controlText}>
            {isFlashOn ? 'Flash On' : 'Flash'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.controlButton}
          onPress={() => {
            // Gallery functionality will be added later
          }}
        >
          <View style={styles.controlIcon}>
            <Ionicons name="images-outline" size={24} color="#111827" />
          </View>

          <Text style={styles.controlText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Last scanned result */}
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View style={styles.resultIcon}>
            <Ionicons name="time-outline" size={20} color="#2563EB" />
          </View>

          <Text style={styles.resultTitle}>Last Scanned</Text>
        </View>

        <View style={styles.divider} />

        {scannedData ? (
          <Text style={styles.resultValue}>{scannedData}</Text>
        ) : (
          <View style={styles.emptyResult}>
            <Ionicons
              name="qr-code-outline"
              size={24}
              color="#9CA3AF"
            />

            <Text style={styles.emptyResultText}>
              No QR code scanned yet
            </Text>
          </View>
        )}
      </View>

      {/* Bottom hint */}
      <View style={styles.hintContainer}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color="#6B7280"
        />

        <Text style={styles.hintText}>
          Scanning starts automatically when a QR code is detected
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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

  cameraPlaceholder: {
    height: 350,
    borderRadius: 28,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    color: '#374151',
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