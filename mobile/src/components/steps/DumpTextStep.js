import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function DumpTextStep({ step, onAnswerChange }) {
  const [text, setText] = useState('');

  const handleChange = (newText) => {
    setText(newText);
    onAnswerChange({ text: newText });
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
        placeholder="Start typing..."
        placeholderTextColor="rgba(255, 255, 255, 0.3)"
        multiline
        numberOfLines={10}
        textAlignVertical="top"
      />
      
      <Text style={styles.hint}>
        {text.length} characters
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
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
    paddingHorizontal: 20,
  },
  textarea: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'right',
    marginTop: 8,
    marginHorizontal: 20,
  },
});
