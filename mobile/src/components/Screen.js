import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View, StyleSheet, ScrollView } from 'react-native';

export default function Screen({ children, scrollable = false, center = false }) {
  const Container = scrollable ? ScrollView : View;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0A1128", "#050814", "#0A1128"]}
        style={StyleSheet.absoluteFill}
      />
      <Container
        contentContainerStyle={[
          styles.content,
          center && { justifyContent: 'center' },
        ]}
        style={!scrollable && styles.content}
      >
        {children}
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A1128',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
});
