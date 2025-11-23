import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';

const OPTIONS = [
  { key: 'replay_conversations', label: 'I replay conversations' },
  { key: 'obsess_mistakes', label: 'I obsess about mistakes' },
  { key: 'worry_tomorrow', label: 'I worry about tomorrow' },
  { key: 'failure_thoughts', label: 'I spiral into Im a failure thoughts' },
];

export default function OnboardingPatternsScreen({ navigation }) {
  const [selected, setSelected] = useState([]);

  const toggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleNext = () => {
    navigation.navigate('OnboardingTiming', { spiralPatterns: selected });
  };

  return (
    <Screen scrollable>
      <Title>Hey.
This is for people whose brains wont shut up at night.</Title>
      <Body style={{ marginBottom: 24 }}>Does this sound like you?</Body>
      <View style={{ gap: 12 }}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => toggle(opt.key)}
            style={[styles.card, selected.includes(opt.key) && styles.cardSelected]}
          >
            <Text style={styles.cardLabel}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton
        label="Yeah, thats me"
        onPress={handleNext}
        disabled={selected.length === 0}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  cardSelected: {
    borderColor: '#F9E66A',
    backgroundColor: 'rgba(249,230,106,0.08)',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
  },
});
