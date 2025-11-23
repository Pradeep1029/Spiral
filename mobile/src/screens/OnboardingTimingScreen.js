import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';

const OPTIONS = [
  { key: 'before_sleep', label: 'Right before sleep' },
  { key: 'middle_night', label: 'Middle of the night' },
  { key: 'random', label: 'Random times' },
];

export default function OnboardingTimingScreen({ route, navigation }) {
  const { spiralPatterns } = route.params || {};
  const [selected, setSelected] = useState(null);

  const handleNext = () => {
    navigation.navigate('OnboardingTopics', {
      spiralPatterns,
      spiralTiming: selected,
    });
  };

  return (
    <Screen scrollable>
      <Title>When do your spirals usually hit?</Title>
      <Body style={{ marginBottom: 24 }}>
        Well use this later for gentle reminders and defaults.
      </Body>
      <View style={{ gap: 12 }}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setSelected(opt.key)}
            style={[styles.card, selected === opt.key && styles.cardSelected]}
          >
            <Text style={styles.cardLabel}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton
        label="Next"
        onPress={handleNext}
        disabled={!selected}
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
