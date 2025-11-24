import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function ReframeReviewStep({ step, onAnswerChange }) {
  const originalReframe = step.ui?.props?.reframe_text || '';
  const [text, setText] = useState(originalReframe);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    // Initialize with the AI-generated reframe
    setText(originalReframe);
    setApproved(true); // Assume approved by default
    onAnswerChange({
      approved: true,
      text: originalReframe,
    });
  }, [originalReframe]);

  const handleChange = (newText) => {
    setText(newText);
    setApproved(newText.trim() !== '');
    onAnswerChange({
      approved: newText.trim() !== '',
      text: newText,
    });
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
        value={text}
        onChangeText={handleChange}
        placeholder="Your balanced thought..."
        placeholderTextColor="rgba(255, 255, 255, 0.3)"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <Text style={styles.hint}>
        Feel free to edit this until it feels right to you.
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
    backgroundColor: 'rgba(98, 126, 234, 0.15)',
    borderRadius: 16,
    padding: 20,
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 26,
    minHeight: 160,
    borderWidth: 2,
    borderColor: 'rgba(98, 126, 234, 0.3)',
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
