import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export default function SecondaryButton({ label, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && { backgroundColor: 'rgba(249, 230, 106, 0.06)' },
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(249, 230, 106, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '500',
  },
});
