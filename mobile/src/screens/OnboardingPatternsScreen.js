import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';

const OPTIONS = [
  { key: 'replay_conversations', label: "I replay conversations in my head" },
  { key: 'obsess_mistakes', label: 'I obsess about mistakes' },
  { key: 'worry_tomorrow', label: 'I worry about tomorrow' },
  { key: 'failure_thoughts', label: "I spiral into 'I'm a failure' thoughts" },
  { key: 'anger_at_others', label: 'I get stuck in anger at other people' },
  { key: 'health_anxiety', label: 'I worry something is wrong with my health' },
  { key: 'existential_thinking', label: 'I think about meaning, death, or life direction' },
  { key: 'catastrophize_future', label: 'I catastrophize about the future' },
  { key: 'cant_switch_off', label: "I can't switch my brain off at night" },
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
      <Title>For brains that won't shut up at night</Title>
      <Body style={{ marginBottom: 24 }}>
        This is for people who get stuck in loops of overthinking, regret, or anxiety when
        they should be resting.
      </Body>
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
        label="Yeah, that's me"
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
