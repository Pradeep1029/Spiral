import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body } from '../components/Typography';

export default function SplashScreen() {
  return (
    <Screen center>
      <View style={styles.container}>
        <Title>Unspiral</Title>
        <Body>Getting things ready for tonights calm.</Body>
        <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#F9E66A" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
