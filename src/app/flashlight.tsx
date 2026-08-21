import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function FlashlightScreen() {
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔦 Flashlight</Text>

        <Text style={styles.text}>
          Camera permission is required to use flashlight.
        </Text>

        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={isTorchOn}
      />

      <View style={styles.overlay}>
        <Text style={styles.title}>🔦 Flashlight</Text>

        <Text style={styles.status}>
          {isTorchOn ? 'Flashlight is ON' : 'Flashlight is OFF'}
        </Text>

        <Pressable
          style={[
            styles.torchButton,
            isTorchOn && styles.torchButtonOn,
          ]}
          onPress={() => setIsTorchOn(prev => !prev)}
        >
          <Text style={styles.torchIcon}>
            {isTorchOn ? '💡' : '🔦'}
          </Text>

          <Text style={styles.torchButtonText}>
            {isTorchOn ? 'Turn Off' : 'Turn On'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  text: {
    marginTop: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  status: {
    marginTop: 20,
    fontSize: 16,
    color: '#94A3B8',
  },

  torchButton: {
    marginTop: 40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },

  torchButtonOn: {
    backgroundColor: '#FACC15',
  },

  torchIcon: {
    fontSize: 42,
  },

  torchButtonText: {
    marginTop: 8,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  button: {
    marginTop: 30,
    backgroundColor: '#6366F1',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },

  backButton: {
    marginTop: 30,
    backgroundColor: '#6366F1',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});