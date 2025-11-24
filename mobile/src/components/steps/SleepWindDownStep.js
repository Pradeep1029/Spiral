import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SleepWindDownStep({ step, onAnswerChange }) {
  const [currentWord, setCurrentWord] = useState('calm');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  
  const words = [
    'calm', 'rest', 'peace', 'soft', 'gentle', 'quiet', 'float',
    'drift', 'ease', 'still', 'dream', 'slow', 'deep', 'warm',
    'light', 'safe', 'release', 'settle', 'breathe', 'let go'
  ];

  useEffect(() => {
    // Auto-set answer so button is enabled
    onAnswerChange({ completed: true });

    // Change word every 3 seconds
    const wordInterval = setInterval(() => {
      setCurrentWord(words[Math.floor(Math.random() * words.length)]);
    }, 3000);

    // Track elapsed time
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(wordInterval);
      clearInterval(timer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle && (
        <Text style={styles.subtitle}>{step.subtitle}</Text>
      )}
      {step.description && (
        <Text style={styles.description}>{step.description}</Text>
      )}

      <View style={styles.wordContainer}>
        <Text style={styles.word}>{currentWord}</Text>
      </View>

      <Text style={styles.instructions}>
        Let random, calming words wash over you.{'\n'}
        Don't try to make sense of them.{'\n'}
        Just notice each one and let it go.
      </Text>

      <Text style={styles.timeText}>
        {Math.floor(secondsElapsed / 60)}:{(secondsElapsed % 60).toString().padStart(2, '0')}
      </Text>

      <Text style={styles.hint}>
        Tap "Next" whenever you feel ready to drift off.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
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
    marginBottom: 40,
  },
  wordContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 32,
  },
  word: {
    fontSize: 48,
    fontWeight: '200',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  instructions: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 24,
    marginBottom: 32,
  },
  timeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
