import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function CompassScreen() {
  // Static value for UI testing.
  // Later this will come from the Magnetometer sensor.
  const heading = 342;

  const getDirection = (degree: number) => {
    if (degree >= 337.5 || degree < 22.5) return 'North';
    if (degree >= 22.5 && degree < 67.5) return 'North-East';
    if (degree >= 67.5 && degree < 112.5) return 'East';
    if (degree >= 112.5 && degree < 157.5) return 'South-East';
    if (degree >= 157.5 && degree < 202.5) return 'South';
    if (degree >= 202.5 && degree < 247.5) return 'South-West';
    if (degree >= 247.5 && degree < 292.5) return 'West';

    return 'North-West';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Compass</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.label}>CURRENT DIRECTION</Text>

        <View style={styles.compassContainer}>
          <View style={styles.compassCircle}>
            <Text style={[styles.direction, styles.north]}>N</Text>
            <Text style={[styles.direction, styles.east]}>E</Text>
            <Text style={[styles.direction, styles.south]}>S</Text>
            <Text style={[styles.direction, styles.west]}>W</Text>

            <View style={styles.centerDot} />

            <View style={styles.needle}>
              <View style={styles.needleTop} />
              <View style={styles.needleBottom} />
            </View>
          </View>
        </View>

        <Text style={styles.degree}>
          {heading}°
        </Text>

        <Text style={styles.directionText}>
          {getDirection(heading)}
        </Text>

        <View style={styles.infoCard}>
          <View>
            <Text style={styles.infoLabel}>
              Heading
            </Text>

            <Text style={styles.infoValue}>
              {heading}°
            </Text>
          </View>

          <View style={styles.divider} />

          <View>
            <Text style={styles.infoLabel}>
              Direction
            </Text>

            <Text style={styles.infoValue}>
              {getDirection(heading)}
            </Text>
          </View>
        </View>

        <Text style={styles.hint}>
          Keep your phone flat for better accuracy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 34,
    color: '#16181D',
    marginTop: -4,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16181D',
  },

  headerSpacer: {
    width: 44,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#9296A1',
  },

  compassContainer: {
    marginTop: 35,
  },

  compassCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: '#E4E6EC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  direction: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: '700',
    color: '#777B86',
  },

  north: {
    top: 20,
    color: '#6366F1',
  },

  east: {
    right: 22,
  },

  south: {
    bottom: 20,
  },

  west: {
    left: 22,
  },

  centerDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#16181D',
    zIndex: 3,
  },

  needle: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },

  needleTop: {
    width: 5,
    height: 70,
    backgroundColor: '#6366F1',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },

  needleBottom: {
    width: 5,
    height: 70,
    backgroundColor: '#D5D7DE',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },

  degree: {
    marginTop: 32,
    fontSize: 48,
    fontWeight: '700',
    color: '#16181D',
  },

  directionText: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '500',
    color: '#6366F1',
  },

  infoCard: {
    width: '100%',
    marginTop: 35,
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },

  infoLabel: {
    fontSize: 12,
    color: '#9296A1',
    textAlign: 'center',
  },

  infoValue: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: '600',
    color: '#16181D',
    textAlign: 'center',
  },

  hint: {
    marginTop: 22,
    fontSize: 13,
    color: '#9296A1',
  },
});