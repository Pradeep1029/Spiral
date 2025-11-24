import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function CBTQuestionStep({ step, onAnswerChange }) {
  const [response, setResponse] = useState('');

  const handleChange = (text) => {
    setResponse(text);
    onAnswerChange({ response: text });
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
        style={styles.textarea}
        value={response}
        onChangeText={handleChange}
        placeholder="Take your time..."
        placeholderTextColor="rgba(255, 255, 255, 0.3)"
        multiline
        numberOfLines={8}
        textAlignVertical="top"
      />

      <Text style={styles.hint}>
        There's no right answer. Just what comes to mind.
      </Text>
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
    lineHeight: 32,
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
  textarea: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 180,
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
});
