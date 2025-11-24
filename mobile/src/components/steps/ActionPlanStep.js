import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function ActionPlanStep({ step, onAnswerChange }) {
  const [actionText, setActionText] = useState('');

  const handleChange = (text) => {
    setActionText(text);
    onAnswerChange({ action_text: text });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle && (
        <Text style={styles.subtitle}>{step.subtitle}</Text>
      )}
      {step.description && (
        <Text style={styles.description}>{step.description}</Text>
      )}

      <TextInput
        style={styles.input}
        value={actionText}
        onChangeText={handleChange}
        placeholder="One small step I can take..."
        placeholderTextColor="rgba(255, 255, 255, 0.3)"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <Text style={styles.hint}>
        Keep it tiny and doable. Even 5 minutes counts.
      </Text>

      <View style={styles.examplesContainer}>
        <Text style={styles.examplesTitle}>Examples:</Text>
        <Text style={styles.exampleText}>• Send a quick email to clarify expectations</Text>
        <Text style={styles.exampleText}>• Take a 10-minute walk tomorrow morning</Text>
        <Text style={styles.exampleText}>• Text one friend to check in</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  examplesContainer: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  examplesTitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exampleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 22,
    marginBottom: 4,
  },
});
