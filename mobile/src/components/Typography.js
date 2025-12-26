import React from 'react';
import { Text, StyleSheet } from 'react-native';

export function Title({ children, style, ...props }) {
  return (
    <Text style={[styles.title, style]} {...props}>
      {children}
    </Text>
  );
}

export function Subtitle({ children, style, ...props }) {
  return (
    <Text style={[styles.subtitle, style]} {...props}>
      {children}
    </Text>
  );
}

export function Body({ children, style, ...props }) {
  return (
    <Text style={[styles.body, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8F9FA',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(248,249,250,0.85)',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: 'rgba(248,249,250,0.8)',
  },
});
