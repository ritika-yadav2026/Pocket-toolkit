import { router } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenHeaderProps = {
  readonly title: string;
  readonly variant?: 'default' | 'dark';
};

/**
 * Shared tool-screen header with safe-area top padding
 * and a larger back-button hit target.
 */
export function ScreenHeader({
  title,
  variant = 'default',
}: ScreenHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const isDark = variant === 'dark';

  return (
    <View
      style={[
        styles.header,
        { paddingTop: Math.max(insets.top, 12) + 8 },
      ]}
    >
      <TouchableOpacity
        style={[styles.backButton, isDark && styles.backButtonDark]}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={() => router.back()}
      >
        <Text style={[styles.backIcon, isDark && styles.darkText]}>
          ‹
        </Text>
      </TouchableOpacity>
      <Text style={[styles.title, isDark && styles.darkText]}>
        {title}
      </Text>
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  backIcon: {
    fontSize: 34,
    lineHeight: 34,
    color: '#111827',
    marginTop: -2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  darkText: {
    color: '#F8FAFC',
  },
  placeholder: {
    width: 48,
  },
});
