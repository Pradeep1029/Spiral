import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function SelfCompassionStep({ step, onAnswerChange }) {
  const script = step.ui?.props?.script || [];
  const [addedLine, setAddedLine] = useState('');

  const handleChange = (text) => {
    setAddedLine(text);
    onAnswerChange({ added_line: text });
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

      <View style={styles.scriptContainer}>
        {script.map((line, index) => (
          <Text key={index} style={styles.scriptLine}>
            {line}
          </Text>
        ))}
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>
          One kind thing you can add:
        </Text>
        <TextInput
          style={styles.input}
          value={addedLine}
          onChangeText={handleChange}
          placeholder="I'm doing my best..."
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          multiline
          numberOfLines={2}
        />
      </View>

      <Text style={styles.hint}>
        Take a moment to really feel these words.
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
  scriptContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scriptLine: {
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '300',
  },
  inputSection: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
