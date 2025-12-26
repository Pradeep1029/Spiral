import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export default function PrimaryButton({ label, onPress, style, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2A9D8F',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    shadowColor: '#2A9D8F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  label: {
    color: '#0B1016',
    fontSize: 18,
    fontWeight: '700',
  },
});
