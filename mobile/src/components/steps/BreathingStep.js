import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function BreathingStep({ step, onAnswerChange }) {
  const [phase, setPhase] = useState('inhale'); // 'inhale' or 'exhale'
  const [breathCount, setBreathCount] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  const props = step.ui?.props || {};
  const duration = props.duration_sec || 60;
  const inhaleTime = props.inhale_sec || 4;
  const exhaleTime = props.exhale_sec || 6;
  const totalBreathTime = inhaleTime + exhaleTime;

  useEffect(() => {
    // Timer for tracking elapsed time
    const timer = setInterval(() => {
      setSecondsElapsed(prev => {
        const newTime = prev + 1;
        if (newTime >= duration) {
          // Auto-complete after duration
          onAnswerChange({
            completed: true,
            duration_completed_sec: duration,
            breaths_completed: breathCount,
          });
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duration, breathCount]);

  useEffect(() => {
    // Breathing animation loop
    const animate = () => {
      // Inhale phase
      setPhase('inhale');
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: inhaleTime * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: inhaleTime * 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Exhale phase
        setPhase('exhale');
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.5,
            duration: exhaleTime * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: exhaleTime * 1000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setBreathCount(prev => prev + 1);
          if (secondsElapsed < duration) {
            animate(); // Loop
          }
        });
      });
    };

    animate();
  }, [breathCount]);

  // Set answer on mount so button is enabled
  useEffect(() => {
    onAnswerChange({
      completed: false,
      duration_completed_sec: 0,
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle && (
        <Text style={styles.subtitle}>{step.subtitle}</Text>
      )}
      {step.description && (
        <Text style={styles.description}>{step.description}</Text>
      )}

      <View style={styles.animationContainer}>
        <Animated.View
          style={[
            styles.breathingCircle,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
        
        <View style={styles.textOverlay}>
          <Text style={styles.phaseText}>
            {phase === 'inhale' ? 'Breathe in' : 'Breathe out'}
          </Text>
          <Text style={styles.countText}>
            {breathCount} {breathCount === 1 ? 'breath' : 'breaths'}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.timeText}>
          {secondsElapsed}s / {duration}s
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(secondsElapsed / duration) * 100}%` },
            ]}
          />
        </View>
      </View>

      <Text style={styles.hint}>
        Follow the circle. You can stop anytime by tapping "Next" or "Skip".
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 32,
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 320,
    marginVertical: 32,
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(98, 126, 234, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(98, 126, 234, 0.6)',
    position: 'absolute',
  },
  textOverlay: {
    alignItems: 'center',
    zIndex: 10,
  },
  phaseText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  countText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  timeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(98, 126, 234, 0.6)',
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
