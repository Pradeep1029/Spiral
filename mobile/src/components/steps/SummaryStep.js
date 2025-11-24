import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SummaryStep({ step, onAnswerChange }) {
  const accomplishments = step.ui?.props?.accomplishments || [];

  useEffect(() => {
    // Auto-set completed
    onAnswerChange({ completed: true });
  }, []);

  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={64} color="#4CAF50" style={styles.icon} />
      
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle && (
        <Text style={styles.subtitle}>{step.subtitle}</Text>
      )}

      <View style={styles.listContainer}>
        {accomplishments.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Ionicons name="checkmark" size={20} color="rgba(76, 175, 80, 0.8)" />
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>

      {step.description && (
        <Text style={styles.description}>{step.description}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  listContainer: {
    width: '100%',
    marginBottom: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  listText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 12,
    flex: 1,
    lineHeight: 24,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
  },
});
