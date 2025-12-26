import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function NewHomeScreen({ navigation }) {
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchSuggestion = async () => {
      try {
        const res = await api.get('/personalization/home-suggestion');
        const text = res.data?.data?.suggestion_text;
        if (mounted) setSuggestion(typeof text === 'string' ? text : '');
      } catch {
        if (mounted) setSuggestion('');
      }
    };

    fetchSuggestion();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSpiraling = async () => {
    navigation.navigate('SpiralFlow');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#0A1128', '#050814', '#0A1128']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* App Title */}
          <View style={styles.header}>
            <Text style={styles.title}>Unspiral</Text>
            <Text style={styles.subtitle}>For brains that won't shut up at night.</Text>
          </View>

          {!!suggestion && (
            <View style={styles.suggestionBox}>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          )}

          {/* Main Action Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSpiraling}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>I'm spiralling</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Not for emergencies.</Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1128',
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
    marginBottom: 38,
  },
  title: {
    fontSize: 48,
    fontWeight: '300',
    color: '#F8F9FA',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(248, 249, 250, 0.6)',
    fontWeight: '300',
  },
  suggestionBox: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(21, 34, 56, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(248, 249, 250, 0.12)',
    marginBottom: 16,
  },
  suggestionText: {
    fontSize: 13,
    color: 'rgba(248, 249, 250, 0.6)',
    lineHeight: 18,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#2A9D8F',
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#F8F9FA',
    fontSize: 18,
    fontWeight: '700',
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
  secondaryLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 16,
  },
  smallLink: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  smallLinkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  dreamTrailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(139, 126, 200, 0.3)',
    backgroundColor: 'rgba(139, 126, 200, 0.08)',
  },
  dreamTrailsText: {
    color: 'rgba(139, 126, 200, 0.9)',
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
    color: 'rgba(248, 249, 250, 0.4)',
    fontSize: 13,
    textAlign: 'center',
  },
  footerLink: {
    color: 'rgba(248, 249, 250, 0.6)',
    textDecorationLine: 'underline',
  },
});
