import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DreamTrailsGame from '../components/steps/DreamTrailsGame';

/**
 * Standalone Dream Trails screen - accessible from Home screen
 * "Can't sleep? Play Dream Trails"
 */
export default function DreamTrailsScreen({ navigation }) {
  const handleExit = (answer) => {
    // Log the game data if needed
    console.log('Dream Trails completed:', answer);
    
    // Navigate back to home
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  // Mock step data for standalone mode
  const standaloneStep = {
    ui: {
      props: {
        scenes: 6,
        tiles_per_scene: 4,
        suggested_trail: null,
        default_duration: 180,
      },
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f0c29', '#1a1a2e', '#16213e']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <DreamTrailsGame
            step={standaloneStep}
            onSubmit={handleExit}
            onExit={handleExit}
            isStandalone={true}
            loading={false}
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
