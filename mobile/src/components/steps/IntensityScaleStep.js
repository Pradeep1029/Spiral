import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

export default function IntensityScaleStep({ step, onAnswerChange }) {
  const [value, setValue] = useState(5);

  const handleChange = (newValue) => {
    setValue(Math.round(newValue));
    onAnswerChange({ value: Math.round(newValue) });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle && (
        <Text style={styles.subtitle}>{step.subtitle}</Text>
      )}
      
      <View style={styles.sliderContainer}>
        <Text style={styles.valueText}>{value}</Text>
        <Text style={styles.label}>out of 10</Text>
        
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={value}
          onValueChange={handleChange}
          minimumTrackTintColor="rgba(98, 126, 234, 0.8)"
          maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
          thumbTintColor="#FFFFFF"
        />
        
        <View style={styles.labelsRow}>
          <Text style={styles.endLabel}>Mild</Text>
          <Text style={styles.endLabel}>Intense</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
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
    marginBottom: 32,
  },
  sliderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginHorizontal: 20,
  },
  valueText: {
    fontSize: 72,
    fontWeight: '200',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 32,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  endLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
