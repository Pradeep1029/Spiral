import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';

export default function HomeScreen({ navigation }) {
  return (
    <Screen center>
      <View style={styles.container}>
        <Title>Night brain, meet a plan.</Title>
        <Body style={{ textAlign: 'center', marginBottom: 32 }}>
          One big button for when your thoughts wont shut up.
        </Body>
        <PrimaryButton
          label="Im spiraling"
          onPress={() => navigation.navigate('SpiralRescue')}
          style={styles.spiralButton}
        />
        <SecondaryButton
          label="Im okay, just checking in"
          onPress={() => navigation.navigate('QuickCheckIn')}
        />
        <SecondaryButton
          label="Im being harsh on myself"
          onPress={() => navigation.navigate('SelfCompassion')}
        />
      </View>
      <Pressable onPress={() => navigation.navigate('Safety')} style={styles.safetyLink}>
        <Text style={styles.safetyText}>
          Not for emergencies. If youre in immediate danger, tap here.
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  spiralButton: {
    width: '100%',
  },
  safetyLink: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  safetyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
});
