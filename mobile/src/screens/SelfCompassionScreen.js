import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body, Subtitle } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import api from '../services/api';

const FEELINGS = [
  'ashamed',
  'stupid',
  'anxious',
  'angry',
  'sad',
  'guilty',
  'worthless',
  'other',
];

export default function SelfCompassionScreen({ navigation, route }) {
  const [feeling, setFeeling] = useState('anxious');
  const [customFeeling, setCustomFeeling] = useState('');
  const [line, setLine] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await api.post('/compassion/exercise', {
        type: 'standalone',
        feeling,
        customFeeling: feeling === 'other' ? customFeeling : undefined,
        customCompassionLine: line,
      });
      navigation.goBack();
    } catch (e) {
      setError('Could not save this right now. Its okay to try again later.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scrollable>
      <Title>Be on your own side.</Title>
      <Body style={{ marginBottom: 16 }}>
        Tiny 2-minute self-compassion reset for when youre being harsh on yourself.
      </Body>
      <Subtitle>Right now, Im feeling…</Subtitle>
      <View style={styles.row}>
        {FEELINGS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFeeling(f)}
            style={[styles.chip, feeling === f && styles.chipSelected]}
          >
            <Text style={styles.chipLabel}>{f}</Text>
          </Pressable>
        ))}
      </View>
      {feeling === 'other' && (
        <TextInput
          style={styles.input}
          placeholder="A word for what Im feeling..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={customFeeling}
          onChangeText={setCustomFeeling}
        />
      )}
      <Subtitle style={{ marginTop: 24 }}>One kind thing I can say to myself:</Subtitle>
      <TextInput
        style={styles.textArea}
        multiline
        placeholder="If a friend felt this way, I would say..."
        placeholderTextColor="rgba(255,255,255,0.4)"
        value={line}
        onChangeText={setLine}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <PrimaryButton
        label="Save this for tonight"
        onPress={handleSave}
        disabled={!line.trim() || (feeling === 'other' && !customFeeling.trim()) || saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    borderColor: '#F9E66A',
    backgroundColor: 'rgba(249,230,106,0.1)',
  },
  chipLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    color: '#F7FAFC',
    backgroundColor: 'rgba(15,23,42,0.8)',
    marginTop: 8,
  },
  textArea: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    color: '#F7FAFC',
    backgroundColor: 'rgba(15,23,42,0.8)',
    marginTop: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    marginBottom: 8,
  },
});
