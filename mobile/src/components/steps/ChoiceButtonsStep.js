import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ChoiceButtonsStep({ step, onAnswerChange }) {
  const [selectedChoice, setSelectedChoice] = useState(null);

  const choices = step.ui?.props?.choices || [];

  const handleSelect = (choiceId) => {
    setSelectedChoice(choiceId);
    onAnswerChange({ choice_id: choiceId });
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

      <View style={styles.choicesContainer}>
        {choices.map((choice, index) => (
          <TouchableOpacity
            key={choice.id || index}
            style={[
              styles.choiceButton,
              selectedChoice === choice.id && styles.choiceButtonSelected,
            ]}
            onPress={() => handleSelect(choice.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.choiceText,
                selectedChoice === choice.id && styles.choiceTextSelected,
              ]}
            >
              {choice.label}
            </Text>
            {choice.description && (
              <Text style={styles.choiceDescription}>{choice.description}</Text>
            )}
          </TouchableOpacity>
        ))}
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
    marginBottom: 32,
  },
  choicesContainer: {
    gap: 16,
  },
  choiceButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  choiceButtonSelected: {
    backgroundColor: 'rgba(98, 126, 234, 0.2)',
    borderColor: 'rgba(98, 126, 234, 0.6)',
  },
  choiceText: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 4,
  },
  choiceTextSelected: {
    color: '#FFFFFF',
  },
  choiceDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 8,
  },
});
