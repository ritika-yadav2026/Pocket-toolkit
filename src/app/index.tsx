import { router, type Href } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const tools = [
  {
    id: 'flashlight',
    title: 'Flashlight',
    icon: '🔦',
    description: 'Light when you need it',
  },
  {
    id: 'compass',
    title: 'Compass',
    icon: '🧭',
    description: 'Find your direction',
  },
  {
    id: 'level',
    title: 'Spirit Level',
    icon: '📐',
    description: 'Check surface alignment',
  },
  {
    id: 'scanner',
    title: 'QR Scanner',
    icon: '📷',
    description: 'Scan QR codes',
  },
  {
    id: 'location',
    title: 'Location',
    icon: '📍',
    description: 'Check your position',
  },
  {
    id: 'steps',
    title: 'Step Counter',
    icon: '👣',
    description: 'Track your movement',
  },
  {
    id: 'soundMeter',
    title: 'Sound Meter',
    icon: '🔊',
    description: 'Measure noise levels',
  },
  {
    id: 'deviceInfo',
    title: 'Device Info',
    icon: '📱',
    description: 'See phone details',
  },
];

const toolRoutes: Record<string, Href> = {
  flashlight: '/flashlight',
  compass: '/compass',
  level: '/spirit-level',
  scanner: '/qr-scanner',
  location: '/location',
  steps: '/step-counter',
  soundMeter: '/sound-meter',
  deviceInfo: '/device-info',
};

export default function HomeScreen() {
  const handleToolPress = (toolId: string, toolName: string) => {
    const route = toolRoutes[toolId];
    if (route) {
      router.push(route);
      return;
    }
    Alert.alert(toolName, 'We will build this feature soon.');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>Pocket Toolkit</Text>

        <Text style={styles.heading}>
          Your everyday tools
        </Text>

        <Text style={styles.subheading}>
          Simple utilities powered by your device.
        </Text>
      </View>

      <View style={styles.grid}>
        {tools.map((tool) => (
          <Pressable
            key={tool.id}
            style={styles.card}
            onPress={() => handleToolPress(tool.id, tool.title)}
          >
            <Text style={styles.icon}>{tool.icon}</Text>

            <Text style={styles.cardTitle}>
              {tool.title}
            </Text>

            <Text style={styles.cardDescription}>
              {tool.description}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 32,
  },

  logo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 24,
  },

  heading: {
    fontSize: 30,
    fontWeight: '700',
    color: '#16181D',
  },

  subheading: {
    fontSize: 15,
    color: '#777B86',
    marginTop: 8,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },

  card: {
    width: '47%',
    minHeight: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,

    elevation: 2,
  },

  icon: {
    fontSize: 32,
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#16181D',
  },

  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#858994',
    marginTop: 6,
  },
});