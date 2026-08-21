import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function LevelScreen() {
  // Static values for UI testing.
  // Later these will come from the Accelerometer.
  const xTilt = 1.2;
  const yTilt = -0.4;

  const isLevel =
    Math.abs(xTilt) < 1 &&
    Math.abs(yTilt) < 1;

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

        <Text style={styles.headerTitle}>
          Spirit Level
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>
          SURFACE ALIGNMENT
        </Text>

        {/* Level Visual */}
        <View style={styles.levelArea}>
          <View style={styles.horizontalLine} />

          <View style={styles.levelTrack}>
            <View
              style={[
                styles.bubble,
                isLevel && styles.bubbleLevel,
              ]}
            />
          </View>

          <View style={styles.horizontalLine} />
        </View>

        {/* Degree */}
        <Text style={styles.degree}>
          {Math.abs(yTilt).toFixed(1)}°
        </Text>

        <Text
          style={[
            styles.status,
            isLevel && styles.statusLevel,
          ]}
        >
          {isLevel ? 'Perfectly Level' : 'Adjust Surface'}
        </Text>

        {/* Axis Values */}
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>
              Horizontal
            </Text>

            <Text style={styles.infoValue}>
              {xTilt.toFixed(1)}°
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>
              Vertical
            </Text>

            <Text style={styles.infoValue}>
              {yTilt.toFixed(1)}°
            </Text>
          </View>
        </View>

        <Text style={styles.hint}>
          Place your phone on a flat surface.
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
    paddingTop: 45,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#9296A1',
  },

  levelArea: {
    marginTop: 70,
    width: '100%',
    alignItems: 'center',
  },

  horizontalLine: {
    width: 200,
    height: 1,
    backgroundColor: '#D9DCE3',
  },

  levelTrack: {
    width: 260,
    height: 70,
    marginVertical: 20,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#E2E5EA',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#6366F1',
  },

  bubbleLevel: {
    backgroundColor: '#22C55E',
  },

  degree: {
    marginTop: 55,
    fontSize: 52,
    fontWeight: '700',
    color: '#16181D',
  },

  status: {
    marginTop: 5,
    fontSize: 17,
    fontWeight: '600',
    color: '#F59E0B',
  },

  statusLevel: {
    color: '#22C55E',
  },

  infoCard: {
    width: '100%',
    marginTop: 40,
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  infoItem: {
    alignItems: 'center',
  },

  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },

  infoLabel: {
    fontSize: 12,
    color: '#9296A1',
  },

  infoValue: {
    marginTop: 5,
    fontSize: 17,
    fontWeight: '600',
    color: '#16181D',
  },

  hint: {
    marginTop: 24,
    fontSize: 13,
    color: '#9296A1',
  },
});