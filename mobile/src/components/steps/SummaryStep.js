import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../PrimaryButton';

export default function SummaryStep({ step, onSubmit, loading }) {
  const accomplishments = step.ui?.props?.accomplishments || [];
  const closingMessage = step.ui?.props?.closing_message || '';

  const handleComplete = () => {
    onSubmit({
      completed: true,
      session_completed: true,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.celebrationIcon}>
        <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
      </View>

      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}

      <View style={styles.accomplishmentsContainer}>
        {accomplishments.map((item, index) => (
          <View key={index} style={styles.accomplishmentRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
            <Text style={styles.accomplishmentText}>{item}</Text>
          </View>
        ))}
      </View>

      {closingMessage && (
        <View style={styles.closingCard}>
          <Text style={styles.closingText}>{closingMessage}</Text>
        </View>
      )}

      {step.description && (
        <Text style={styles.description}>{step.description}</Text>
      )}

      <PrimaryButton
        label={step.primary_cta?.label || 'Done'}
        onPress={handleComplete}
        disabled={loading}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  celebrationIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
    textAlign: 'center',
  },
  accomplishmentsContainer: {
    width: '100%',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  accomplishmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  accomplishmentText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  closingCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  closingText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    width: '100%',
  },
});
