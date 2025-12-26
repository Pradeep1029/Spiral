import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export default function SecondaryButton({ label, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && { backgroundColor: 'rgba(42, 157, 143, 0.10)' },
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
    borderColor: 'rgba(42, 157, 143, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  label: {
    color: 'rgba(248,249,250,0.92)',
    fontSize: 16,
    fontWeight: '500',
  },
});
