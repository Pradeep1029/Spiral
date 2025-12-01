import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function NewHomeScreen({ navigation }) {
  const handleSpiraling = async () => {
    // Navigate to spiral rescue flow (sleep-related by default)
    navigation.navigate('SessionFlow', {
      context: 'spiral',
      sleepRelated: true,
    });
  };

  const handleHarshOnSelf = async () => {
    // Navigate to self-compassion–flavored rescue flow
    navigation.navigate('SessionFlow', {
      context: 'self_compassion',
      sleepRelated: true,
    });
  };

  const handleCheckIn = () => {
    navigation.navigate('QuickCheckIn');
  };

  const handleCrisis = () => {
    navigation.navigate('Safety');
  };

  const handleTraining = () => {
    navigation.navigate('TrainingSelection');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* App Title */}
          <View style={styles.header}>
            <Text style={styles.title}>Unspiral</Text>
            <Text style={styles.subtitle}>For brains that won't shut up at night.</Text>
          </View>

          {/* Main Action Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSpiraling}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>I'm spiraling</Text>
          </TouchableOpacity>

          {/* Secondary Action */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleHarshOnSelf}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>I'm being harsh on myself</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCheckIn} style={styles.tertiaryButton}>
            <Text style={styles.tertiaryText}>I'm okay, just checking in</Text>
          </TouchableOpacity>

          {/* Training Mode Link */}
          <TouchableOpacity onPress={handleTraining} style={styles.trainingLink}>
            <Ionicons name="shield-checkmark-outline" size={18} color="rgba(249, 230, 106, 0.8)" />
            <Text style={styles.trainingLinkText}>Build my defenses</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleCrisis}>
              <Text style={styles.footerText}>
                Not for emergencies.{' '}
                <Text style={styles.footerLink}>Tap here if you're in crisis.</Text>
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 80,
  },
  title: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '300',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  tertiaryButton: {
    marginTop: 12,
  },
  tertiaryText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  trainingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(249, 230, 106, 0.3)',
    backgroundColor: 'rgba(249, 230, 106, 0.08)',
  },
  trainingLinkText: {
    color: 'rgba(249, 230, 106, 0.9)',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    textAlign: 'center',
  },
  footerLink: {
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'underline',
  },
});
