import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenHeader } from '@/components/screen-header';

const INITIAL_POWER_STATE: Battery.PowerState = {
  batteryLevel: -1,
  batteryState: Battery.BatteryState.UNKNOWN,
  lowPowerMode: false,
};

export default function DeviceInfoScreen() {
  const [powerState, setPowerState] =
    useState<Battery.PowerState>(INITIAL_POWER_STATE);
  const [batteryAvailable, setBatteryAvailable] = useState<boolean | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);

  const loadPowerState = useCallback(async () => {
    try {
      const available = await Battery.isAvailableAsync();
      setBatteryAvailable(available);
      if (!available) {
        setPowerState(INITIAL_POWER_STATE);
        return;
      }
      const nextPowerState = await Battery.getPowerStateAsync();
      setPowerState({
        batteryLevel: nextPowerState.batteryLevel ?? -1,
        batteryState:
          nextPowerState.batteryState ?? Battery.BatteryState.UNKNOWN,
        lowPowerMode: nextPowerState.lowPowerMode ?? false,
      });
    } catch (error) {
      console.log('Battery power state error:', error);
      setBatteryAvailable(false);
      setPowerState(INITIAL_POWER_STATE);
    }
  }, []);

  useEffect(() => {
    void loadPowerState();
    const levelSubscription = Battery.addBatteryLevelListener(
      ({ batteryLevel }) => {
        setPowerState((current) => ({
          ...current,
          batteryLevel,
        }));
      }
    );
    const stateSubscription = Battery.addBatteryStateListener(
      ({ batteryState }) => {
        setPowerState((current) => ({
          ...current,
          batteryState,
        }));
      }
    );
    const modeSubscription = Battery.addLowPowerModeListener(
      ({ lowPowerMode }) => {
        setPowerState((current) => ({
          ...current,
          lowPowerMode,
        }));
      }
    );
    return () => {
      levelSubscription.remove();
      stateSubscription.remove();
      modeSubscription.remove();
    };
  }, [loadPowerState]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadPowerState();
    } catch (error) {
      console.log('Refresh device info error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const batteryLevel =
    powerState.batteryLevel >= 0
      ? Math.round(powerState.batteryLevel * 100)
      : null;

  const getBatteryStatus = () => {
    switch (powerState.batteryState) {
      case Battery.BatteryState.CHARGING:
        return 'Charging';
      case Battery.BatteryState.FULL:
        return 'Full';
      case Battery.BatteryState.UNPLUGGED:
        return 'On Battery';
      case Battery.BatteryState.UNKNOWN:
      default:
        return 'Unknown';
    }
  };

  const getDeviceType = () => {
    switch (Device.deviceType) {
      case Device.DeviceType.PHONE:
        return 'Phone';
      case Device.DeviceType.TABLET:
        return 'Tablet';
      case Device.DeviceType.DESKTOP:
        return 'Desktop';
      case Device.DeviceType.TV:
        return 'TV';
      case Device.DeviceType.UNKNOWN:
      default:
        return 'Unknown';
    }
  };

  const getBatteryMessage = () => {
    if (batteryLevel === null) {
      return 'Battery information is currently unavailable.';
    }
    if (powerState.batteryState === Battery.BatteryState.CHARGING) {
      return `Your device is charging at ${batteryLevel}%.`;
    }
    if (batteryLevel <= 15) {
      return 'Battery level is very low. Consider charging your device.';
    }
    if (batteryLevel <= 30) {
      return 'Battery level is getting low.';
    }
    if (batteryLevel >= 90) {
      return 'Battery is almost fully charged.';
    }
    return `Battery level is currently ${batteryLevel}%.`;
  };

  const batteryStatus = getBatteryStatus();
  const deviceName = Device.deviceName ?? 'Unavailable';
  const modelName = Device.modelName ?? 'Unavailable';
  const manufacturer = Device.manufacturer ?? 'Unavailable';
  const brand = Device.brand ?? 'Unavailable';
  const operatingSystem =
    Device.osName && Device.osVersion
      ? `${Device.osName} ${Device.osVersion}`
      : Device.osName ?? Device.osVersion ?? 'Unavailable';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <ScreenHeader title="Device Info" />

        {/* Heading */}
        <View style={styles.headingContainer}>
          <Text style={styles.title}>Your Device</Text>

          <Text style={styles.subtitle}>
            Live hardware and battery information
          </Text>
        </View>

        {/* Battery API unavailable */}
        {batteryAvailable === false && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>
              Battery information unavailable
            </Text>

            <Text style={styles.warningText}>
              Battery information may not be supported on this device or
              simulator.
            </Text>
          </View>
        )}

        {/* Battery Summary */}
        <View style={styles.batteryCard}>
          {batteryAvailable === null ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>
                Loading battery information...
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.batteryCircleOuter}>
                <View style={styles.batteryCircleInner}>
                  <Text style={styles.batteryPercentage}>
                    {batteryLevel !== null
                      ? `${batteryLevel}%`
                      : '--'}
                  </Text>

                  <Text style={styles.batteryLabel}>BATTERY</Text>
                </View>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {powerState.batteryState ===
                  Battery.BatteryState.CHARGING
                    ? '⚡ '
                    : ''}
                  {batteryStatus.toUpperCase()}
                </Text>
              </View>

              <View style={styles.batteryProgressBackground}>
                <View
                  style={[
                    styles.batteryProgressFill,
                    {
                      width:
                        batteryLevel !== null
                          ? `${batteryLevel}%`
                          : '0%',
                    },
                  ]}
                />
              </View>
            </>
          )}
        </View>

        {/* Device Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Device Information</Text>

          <View style={styles.divider} />

          <InfoRow
            label="Device Name"
            description="Current device name"
            value={deviceName}
          />

          <View style={styles.divider} />

          <InfoRow
            label="Model"
            description="Hardware model"
            value={modelName}
          />

          <View style={styles.divider} />

          <InfoRow
            label="Manufacturer"
            description="Device manufacturer"
            value={manufacturer}
          />

          <View style={styles.divider} />

          <InfoRow
            label="Brand"
            description="Device brand"
            value={brand}
          />

          <View style={styles.divider} />

          <InfoRow
            label="Operating System"
            description="Installed system"
            value={operatingSystem}
          />

          <View style={styles.divider} />

          <InfoRow
            label="Device Type"
            description="Device category"
            value={getDeviceType()}
          />

          <View style={styles.divider} />

          <InfoRow
            label="Physical Device"
            description="Device or emulator"
            value={Device.isDevice ? 'Yes' : 'Emulator'}
          />
        </View>

        {/* Battery Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Battery Information</Text>

          <View style={styles.divider} />

          <InfoRow
            label="Battery Level"
            description="Current charge"
            value={
              batteryLevel !== null
                ? `${batteryLevel}%`
                : 'Unavailable'
            }
          />

          <View style={styles.divider} />

          <InfoRow
            label="Battery Status"
            description="Current power state"
            value={batteryStatus}
          />

          <View style={styles.divider} />

          <InfoRow
            label="Low Power Mode"
            description="Battery saver status"
            value={powerState.lowPowerMode ? 'On' : 'Off'}
          />

          <View style={styles.divider} />

          <InfoRow
            label="Battery API"
            description="Device API availability"
            value={
              batteryAvailable === null
                ? 'Checking...'
                : batteryAvailable
                  ? 'Available'
                  : 'Unavailable'
            }
          />
        </View>

        {/* Battery Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Text style={styles.statusIconText}>
              {powerState.batteryState ===
              Battery.BatteryState.CHARGING
                ? '⚡'
                : '✓'}
            </Text>
          </View>

          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              Battery Status
            </Text>

            <Text style={styles.statusText}>
              {getBatteryMessage()}
            </Text>
          </View>
        </View>

        {/* Refresh */}
        <TouchableOpacity
          style={[
            styles.refreshButton,
            refreshing && styles.refreshButtonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={refreshing}
          onPress={handleRefresh}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.refreshIcon}>↻</Text>
              <Text style={styles.refreshButtonText}>
                Refresh Info
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footerInfo}>
          <View style={styles.footerInfoIcon}>
            <Text style={styles.footerInfoIconText}>i</Text>
          </View>

          <Text style={styles.footerInfoText}>
            Battery values update automatically when your device power
            state changes.
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
      <View style={styles.infoRowLeft}>
        <Text style={styles.infoLabel}>{label}</Text>

        <Text style={styles.infoDescription}>
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

  warningCard: {
    marginHorizontal: 22,
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },

  warningText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: '#B91C1C',
  },

  batteryCard: {
    marginHorizontal: 22,
    marginTop: 30,
    borderRadius: 28,
    paddingVertical: 30,
    paddingHorizontal: 22,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  loadingContainer: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 15,
    fontSize: 13,
    color: '#6B7280',
  },

  batteryCircleOuter: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  batteryCircleInner: {
    width: 165,
    height: 165,
    borderRadius: 83,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  batteryPercentage: {
    fontSize: 44,
    fontWeight: '900',
    color: '#111827',
  },

  batteryLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#16A34A',
  },

  statusBadge: {
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#2563EB',
  },

  batteryProgressBackground: {
    width: '100%',
    height: 10,
    marginTop: 24,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },

  batteryProgressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#22C55E',
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
    marginVertical: 15,
    backgroundColor: '#F1F5F9',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  infoRowLeft: {
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
    fontSize: 12,
    color: '#9CA3AF',
  },

  infoValue: {
    maxWidth: '48%',
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
  },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 22,
    marginTop: 20,
    padding: 17,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
  },

  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },

  statusIconText: {
    fontSize: 20,
  },

  statusContent: {
    flex: 1,
    marginLeft: 13,
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },

  statusText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#4B7D5A',
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

  refreshButtonDisabled: {
    opacity: 0.7,
  },

  refreshIcon: {
    marginRight: 9,
    fontSize: 23,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  refreshButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 22,
    marginTop: 18,
    paddingHorizontal: 12,
  },

  footerInfoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerInfoIconText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },

  footerInfoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 11,
    lineHeight: 17,
    color: '#94A3B8',
  },
});