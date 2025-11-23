import React from 'react';
import { Linking, StyleSheet, View, Text } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';

export default function SafetyScreen() {
  const openEmergency = () => {
    // Users should contact local services; we just open dialer with 911 as a placeholder.
    Linking.openURL('tel:911').catch(() => {});
  };

  return (
    <Screen scrollable>
      <Title>Safety first.</Title>
      <Body style={{ marginBottom: 16 }}>
        Unspiral is a self-help tool, not therapy or medical care.
      </Body>
      <Body style={{ marginBottom: 24 }}>
        If you are in immediate danger or thinking of harming yourself, please contact local
        emergency services or a crisis hotline instead of this app.
      </Body>
      <PrimaryButton label="Call emergency services" onPress={openEmergency} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Some crisis resources</Text>
        <Text style={styles.link} onPress={() => Linking.openURL('https://988lifeline.org')}>
          US: 988 Suicide & Crisis Lifeline
        </Text>
        <Text
          style={styles.link}
          onPress={() => Linking.openURL('https://www.opencounseling.com/suicide-hotlines')}
        >
          Global list of helplines
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 8,
  },
  link: {
    color: '#F9E66A',
    fontSize: 14,
    marginBottom: 4,
  },
});
