import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

export default function Screen({ children, scrollable = false, center = false }) {
  const Container = scrollable ? ScrollView : View;

  return (
    <View style={styles.root}>
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
    backgroundColor: '#0B1016',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
});
