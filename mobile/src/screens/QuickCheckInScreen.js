import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body } from '../components/Typography';
import api from '../services/api';

export default function QuickCheckInScreen({ navigation }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (state) => {
    setSelected(state);
    try {
      setSaving(true);
      await api.post('/checkins', {
        mentalState: state,
      });
      if (state === 'spiraling') {
        navigation.replace('SessionFlow', {
          context: 'spiral',
          sleepRelated: true,
        });
      } else {
        navigation.goBack();
      }
    } catch (e) {
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen center>
      <View style={styles.container}>
        <Title>Hows your mind tonight?</Title>
        <Body style={{ marginBottom: 24 }}>
          One tiny check-in so we can spot patterns over time.
        </Body>
        <Pressable
          style={[styles.card, selected === 'calm' && styles.cardSelected]}
          onPress={() => handleSelect('calm')}
        >
          <Text style={styles.cardTitle}>Calm</Text>
          <Text style={styles.cardText}>Brain is pretty quiet right now.</Text>
        </Pressable>
        <Pressable
          style={[styles.card, selected === 'bit_loud' && styles.cardSelected]}
          onPress={() => handleSelect('bit_loud')}
        >
          <Text style={styles.cardTitle}>A bit loud</Text>
          <Text style={styles.cardText}>Thoughts are humming but Im okay.</Text>
        </Pressable>
        <Pressable
          style={[styles.card, selected === 'spiraling' && styles.cardSelected]}
          onPress={() => handleSelect('spiraling')}
        >
          <Text style={styles.cardTitle}>Spiraling</Text>
          <Text style={styles.cardText}>Im getting pulled into a spiral.</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(15,23,42,0.9)',
    marginBottom: 12,
  },
  cardSelected: {
    borderColor: '#F9E66A',
    backgroundColor: 'rgba(249,230,106,0.06)',
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
});
