import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';

const OPTIONS = [
  { key: 'work_study', label: 'Work / study' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'money', label: 'Money' },
  { key: 'health', label: 'Health' },
  { key: 'myself', label: 'Myself (who I am)' },
];

export default function OnboardingTopicsScreen({ route, navigation }) {
  const { spiralPatterns, spiralTiming } = route.params || {};
  const [selected, setSelected] = useState([]);
  const { completeOnboarding } = useAuth();

  const toggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleFinish = async () => {
    await completeOnboarding({
      spiralPatterns,
      spiralTiming,
      spiralTopics: selected,
    });
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <Screen scrollable>
      <Title>What does your brain like to attack?</Title>
      <Body style={{ marginBottom: 24 }}>You can pick more than one.</Body>
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
        label="Finish setup"
        onPress={handleFinish}
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
