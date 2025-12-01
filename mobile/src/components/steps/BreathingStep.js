import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function BreathingStep({ step, onAnswerChange }) {
  const [phase, setPhase] = useState('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;
  const animationRef = useRef(null);

  const props = step.ui?.props || {};
  const targetBreaths = props.breath_count || 4;
  const inhaleTime = props.inhale_sec || 4;
  const exhaleTime = props.exhale_sec || 6;
  const totalDurationSec = (inhaleTime + exhaleTime) * targetBreaths;

  useEffect(() => {
    let isActive = true;

    // Set initial answer
    onAnswerChange({
      completed: false,
      breaths_completed: 0,
    });

    const runBreathCycle = () => {
      if (!isActive) return;

      // Inhale
      setPhase('inhale');
      const inhaleAnim = Animated.parallel([
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
      ]);

      inhaleAnim.start(({ finished }) => {
        if (!finished || !isActive) return;

        // Exhale
        setPhase('exhale');
        const exhaleAnim = Animated.parallel([
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
        ]);

        exhaleAnim.start(({ finished }) => {
          if (!finished || !isActive) return;

          // Increment breath count
          setBreathCount(prev => {
            const newCount = prev + 1;
            
            // Update answer
            onAnswerChange({
              completed: newCount >= targetBreaths,
              breaths_completed: newCount,
            });
            
            return newCount;
          });

          // Always keep the animation going for a calm loop
          if (isActive) {
            runBreathCycle();
          }
        });
      });
    };

    // Start animation
    runBreathCycle();

    return () => {
      isActive = false;
      scaleAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, []);

  useEffect(() => {
    if (elapsedSec >= totalDurationSec) return;

    const interval = setInterval(() => {
      setElapsedSec(prev => {
        if (prev >= totalDurationSec) return prev;
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [elapsedSec, totalDurationSec]);

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
        <Text style={styles.progressText}>
          {breathCount} of {targetBreaths} breaths
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(breathCount / targetBreaths) * 100}%` },
            ]}
          />
        </View>
      </View>

      <Text style={styles.hint}>
        {breathCount >= targetBreaths
          ? "Great! Tap 'Next' when you're ready, or keep breathing with the circle."
          : `About ${Math.max(totalDurationSec - elapsedSec, 0)}s until you can move on. Follow the circle and breathe with it.`}
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
  progressText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
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
