import * as Location from 'expo-location';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';

type LocationState =
  | 'checking'
  | 'ready'
  | 'permission-denied'
  | 'services-disabled'
  | 'error';

export default function LocationScreen() {
  const [locationState, setLocationState] =
    useState<LocationState>('checking');

  const [location, setLocation] =
    useState<Location.LocationObject | null>(null);

  const [address, setAddress] =
    useState<Location.LocationGeocodedAddress | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const subscriptionRef =
    useRef<Location.LocationSubscription | null>(null);

  /**
   * Reverse geocode current coordinates into
   * city/state/country information.
   */
  const fetchAddress = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const addresses =
          await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });

        if (addresses.length > 0) {
          setAddress(addresses[0]);
        }
      } catch (error) {
        console.log(
          'Reverse geocode error:',
          error
        );

        setAddress(null);
      }
    },
    []
  );

  /**
   * Get a fresh GPS position.
   */
  const getCurrentLocation =
    useCallback(async () => {
      try {
        const currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

        setLocation(currentLocation);

        await fetchAddress(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );

        return currentLocation;
      } catch (error) {
        console.log(
          'Current location error:',
          error
        );

        throw error;
      }
    }, [fetchAddress]);

  /**
   * Subscribe to live location changes.
   */
  const startLocationWatcher =
    useCallback(async () => {
      subscriptionRef.current?.remove();

      subscriptionRef.current =
        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,

            // Android uses these values to control updates.
            timeInterval: 2000,

            // Update after moving approximately 1 metre.
            distanceInterval: 1,
          },
          (newLocation) => {
            setLocation(newLocation);
          },
          (error) => {
            console.log(
              'Location watcher error:',
              error
            );
          }
        );
    }, []);

  /**
   * Initialize GPS.
   */
  const initializeLocation =
    useCallback(async () => {
      try {
        setLocationState('checking');

        /**
         * First check whether GPS/location services
         * are enabled on the phone.
         */
        const servicesEnabled =
          await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          setLocationState(
            'services-disabled'
          );

          return;
        }

        /**
         * Check current app permission.
         */
        let permission =
          await Location.getForegroundPermissionsAsync();

        /**
         * Ask user if permission hasn't been given.
         */
        if (!permission.granted) {
          permission =
            await Location.requestForegroundPermissionsAsync();
        }

        if (!permission.granted) {
          setLocationState(
            'permission-denied'
          );

          return;
        }

        /**
         * Get immediate current GPS position.
         */
        await getCurrentLocation();

        /**
         * Then start live updates.
         */
        await startLocationWatcher();

        setLocationState('ready');
      } catch (error) {
        console.log(
          'Location initialization error:',
          error
        );

        setLocationState('error');
      }
    }, [
      getCurrentLocation,
      startLocationWatcher,
    ]);

  useEffect(() => {
    initializeLocation();

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [initializeLocation]);

  /**
   * Manually request a new GPS fix.
   */
  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      if (
        locationState !== 'ready'
      ) {
        await initializeLocation();
        return;
      }

      await getCurrentLocation();
    } catch (error) {
      Alert.alert(
        'Location Error',
        'Unable to refresh your current location.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * If permission was permanently denied,
   * user can open phone settings.
   */
  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.log(
        'Open settings error:',
        error
      );
    }
  };

  const formatCoordinate = (
    value: number | undefined
  ) => {
    if (typeof value !== 'number') {
      return '--';
    }

    return value.toFixed(6);
  };

  const formatAccuracy = (
    value: number | null | undefined
  ) => {
    if (typeof value !== 'number') {
      return 'Unavailable';
    }

    return `± ${Math.round(value)} m`;
  };

  const formatAltitude = (
    value: number | null | undefined
  ) => {
    if (typeof value !== 'number') {
      return 'Unavailable';
    }

    return `${value.toFixed(1)} m`;
  };

  const formatSpeed = (
    value: number | null | undefined
  ) => {
    if (
      typeof value !== 'number' ||
      value < 0
    ) {
      return 'Unavailable';
    }

    /**
     * GPS speed is metres / second.
     * Convert to km/h.
     */
    const kmh = value * 3.6;

    return `${kmh.toFixed(1)} km/h`;
  };

  const formatHeading = (
    value: number | null | undefined
  ) => {
    if (
      typeof value !== 'number' ||
      value < 0
    ) {
      return 'Unavailable';
    }

    return `${Math.round(value)}°`;
  };

  const getAddressText = () => {
    if (!address) {
      return 'Address unavailable';
    }

    const parts = [
      address.name,
      address.street,
      address.city,
      address.region,
      address.postalCode,
      address.country,
    ].filter(Boolean);

    /**
     * Remove duplicate address values.
     */
    const uniqueParts = [
      ...new Set(parts),
    ];

    return uniqueParts.join(', ');
  };

  const latitude =
    location?.coords.latitude;

  const longitude =
    location?.coords.longitude;

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

        <ScreenHeader title="Location" />

        {/* Heading */}

        <View
          style={styles.headingContainer}
        >
          <Text style={styles.title}>
            Your Current Location
          </Text>

          <Text style={styles.subtitle}>
            Live GPS coordinates and device
            location information
          </Text>
        </View>

        {/* Loading */}

        {locationState === 'checking' && (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

            <Text style={styles.loadingTitle}>
              Finding your location
            </Text>

            <Text style={styles.loadingText}>
              Waiting for GPS signal...
            </Text>
          </View>
        )}

        {/* Permission Denied */}

        {locationState ===
          'permission-denied' && (
          <View style={styles.errorCard}>
            <Text
              style={styles.errorTitle}
            >
              Location permission required
            </Text>

            <Text style={styles.errorText}>
              Pocket Toolkit needs location
              access to display your GPS
              coordinates.
            </Text>

            <TouchableOpacity
              style={
                styles.settingsButton
              }
              onPress={openSettings}
            >
              <Text
                style={
                  styles.settingsButtonText
                }
              >
                Open Settings
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* GPS Disabled */}

        {locationState ===
          'services-disabled' && (
          <View style={styles.errorCard}>
            <Text
              style={styles.errorTitle}
            >
              Location services disabled
            </Text>

            <Text style={styles.errorText}>
              Turn on GPS / Location Services
              on your device and try again.
            </Text>

            <TouchableOpacity
              style={
                styles.settingsButton
              }
              onPress={handleRefresh}
            >
              <Text
                style={
                  styles.settingsButtonText
                }
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error */}

        {locationState === 'error' && (
          <View style={styles.errorCard}>
            <Text
              style={styles.errorTitle}
            >
              Location unavailable
            </Text>

            <Text style={styles.errorText}>
              We couldn't get a GPS position.
              Move to an open area and try again.
            </Text>

            <TouchableOpacity
              style={
                styles.settingsButton
              }
              onPress={handleRefresh}
            >
              <Text
                style={
                  styles.settingsButtonText
                }
              >
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real Location */}

        {locationState === 'ready' &&
          location && (
            <>
              {/* Position Card */}

              <View
                style={
                  styles.locationCard
                }
              >
                <View
                  style={
                    styles.locationVisual
                  }
                >
                  <View
                    style={
                      styles.circleOuter
                    }
                  >
                    <View
                      style={
                        styles.circleMiddle
                      }
                    >
                      <View
                        style={
                          styles.locationPin
                        }
                      >
                        <View
                          style={
                            styles.pinDot
                          }
                        />
                      </View>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.locationTitle
                    }
                  >
                    Live Position
                  </Text>

                  <View
                    style={
                      styles.liveContainer
                    }
                  >
                    <View
                      style={
                        styles.liveDot
                      }
                    />

                    <Text
                      style={
                        styles.liveText
                      }
                    >
                      GPS tracking active
                    </Text>
                  </View>
                </View>
              </View>

              {/* Coordinates */}

              <View
                style={
                  styles.coordinatesRow
                }
              >
                <View
                  style={
                    styles.coordinateCard
                  }
                >
                  <Text
                    style={
                      styles.coordinateLabel
                    }
                  >
                    Latitude
                  </Text>

                  <Text
                    style={
                      styles.coordinateValue
                    }
                  >
                    {formatCoordinate(
                      latitude
                    )}
                  </Text>

                  <Text
                    style={
                      styles.coordinateDirection
                    }
                  >
                    {latitude !== undefined
                      ? latitude >= 0
                        ? 'NORTH'
                        : 'SOUTH'
                      : '--'}
                  </Text>
                </View>

                <View
                  style={
                    styles.coordinateCard
                  }
                >
                  <Text
                    style={
                      styles.coordinateLabel
                    }
                  >
                    Longitude
                  </Text>

                  <Text
                    style={
                      styles.coordinateValue
                    }
                  >
                    {formatCoordinate(
                      longitude
                    )}
                  </Text>

                  <Text
                    style={
                      styles.coordinateDirection
                    }
                  >
                    {longitude !== undefined
                      ? longitude >= 0
                        ? 'EAST'
                        : 'WEST'
                      : '--'}
                  </Text>
                </View>
              </View>

              {/* Address */}

              <View
                style={styles.addressCard}
              >
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Current Address
                </Text>

                <Text
                  style={
                    styles.addressText
                  }
                >
                  {getAddressText()}
                </Text>
              </View>

              {/* GPS Details */}

              <View
                style={styles.infoCard}
              >
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  GPS Details
                </Text>

                <View
                  style={styles.divider}
                />

                <InfoRow
                  label="Accuracy"
                  description="Estimated GPS precision"
                  value={formatAccuracy(
                    location.coords
                      .accuracy
                  )}
                />

                <View
                  style={styles.divider}
                />

                <InfoRow
                  label="Altitude"
                  description="Height above sea level"
                  value={formatAltitude(
                    location.coords
                      .altitude
                  )}
                />

                <View
                  style={styles.divider}
                />

                <InfoRow
                  label="Speed"
                  description="Current movement speed"
                  value={formatSpeed(
                    location.coords.speed
                  )}
                />

                <View
                  style={styles.divider}
                />

                <InfoRow
                  label="Heading"
                  description="Current travel direction"
                  value={formatHeading(
                    location.coords
                      .heading
                  )}
                />
              </View>

              {/* Refresh */}

              <TouchableOpacity
                style={[
                  styles.refreshButton,
                  refreshing &&
                    styles.refreshDisabled,
                ]}
                activeOpacity={0.85}
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
                      Refresh Location
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View
                style={styles.noticeCard}
              >
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

                <Text
                  style={
                    styles.noticeText
                  }
                >
                  GPS accuracy can vary
                  depending on signal strength,
                  buildings, and whether you're
                  indoors or outdoors.
                </Text>
              </View>
            </>
          )}
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
        <Text style={styles.infoLabel}>
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
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
  },

  loadingCard: {
    height: 280,
    marginHorizontal: 22,
    marginTop: 30,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingTitle: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  loadingText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },

  errorCard: {
    marginHorizontal: 22,
    marginTop: 30,
    padding: 22,
    borderRadius: 20,
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

  settingsButton: {
    height: 48,
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  locationCard: {
    marginHorizontal: 22,
    marginTop: 30,
    padding: 12,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  locationVisual: {
    height: 250,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor:
      'rgba(37,99,235,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleMiddle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor:
      'rgba(37,99,235,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationPin: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pinDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },

  locationTitle: {
    marginTop: 18,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
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

  coordinatesRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    marginTop: 20,
  },

  coordinateCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  coordinateLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  coordinateValue: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  coordinateDirection: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#2563EB',
  },

  addressCard: {
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

  addressText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 21,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
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

  noticeCard: {
    flexDirection: 'row',
    marginHorizontal: 22,
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
  },

  noticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  noticeIconText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },

  noticeText: {
    flex: 1,
    marginLeft: 11,
    fontSize: 11,
    lineHeight: 18,
    color: '#64748B',
  },
});
