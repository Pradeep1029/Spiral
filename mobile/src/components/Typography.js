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

export function Guidance({ children, style, ...props }) {
  return (
    <Text style={[styles.guidance, style]} {...props}>
      {children}
    </Text>
  );
}

export function Context({ children, style, ...props }) {
  return (
    <Text style={[styles.context, style]} {...props}>
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
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(248,249,250,0.9)',
    lineHeight: 26,
    marginBottom: 8,
  },
  guidance: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(248,249,250,0.9)',
    lineHeight: 26,
  },
  context: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(248,249,250,0.55)',
    lineHeight: 21,
  },
  body: {
    fontSize: 16,
    color: 'rgba(248,249,250,0.8)',
    lineHeight: 24,
  },
});
