import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../PrimaryButton';

export default function SelfCompassionStep({ step, onSubmit, loading }) {
  const scriptLines = step.ui?.props?.script_lines || [];
  const [userLine, setUserLine] = useState('');

  const handleSubmit = () => {
    onSubmit({
      script_lines: scriptLines,
      user_compassion_line: userLine,
      completed: true,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}

      <View style={styles.compassionCard}>
        <View style={styles.heartIcon}>
          <Ionicons name="heart" size={32} color="#FF6B9D" />
        </View>

        {scriptLines.map((line, index) => (
          <View key={index} style={styles.scriptLine}>
            <Text style={styles.scriptText}>{line}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.promptText}>Now, add your own kind words:</Text>

      <TextInput
        style={styles.textInput}
        placeholder="Say something compassionate to yourself..."
        placeholderTextColor="rgba(255,255,255,0.4)"
        multiline
        numberOfLines={3}
        value={userLine}
        onChangeText={setUserLine}
        textAlignVertical="top"
      />

      {step.description && (
        <Text style={styles.description}>{step.description}</Text>
      )}

      <PrimaryButton
        label={step.primary_cta?.label || 'Continue'}
        onPress={handleSubmit}
        disabled={loading || !userLine.trim()}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
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
  compassionCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  heartIcon: {
    marginBottom: 16,
  },
  scriptLine: {
    width: '100%',
    marginBottom: 12,
  },
  scriptText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  promptText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    fontWeight: '500',
  },
  textInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.3)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    marginBottom: 16,
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
