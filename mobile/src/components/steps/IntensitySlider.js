import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import PrimaryButton from '../PrimaryButton';

export default function IntensitySlider({ step, onSubmit, loading }) {
    const [value, setValue] = useState(5);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{step.title}</Text>
            {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}

            <View style={styles.sliderContainer}>
                <Text style={styles.valueText}>{value}</Text>
                <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={10}
                    step={1}
                    value={value}
                    onValueChange={setValue}
                    minimumTrackTintColor="#FFD700"
                    maximumTrackTintColor="rgba(255,255,255,0.2)"
                    thumbTintColor="#FFD700"
                />
                <View style={styles.labels}>
                    <Text style={styles.labelText}>Barely noticeable</Text>
                    <Text style={styles.labelText}>Overwhelming</Text>
                </View>
            </View>

            <PrimaryButton
                label={step.primary_cta?.label || 'Next'}
                onPress={() => onSubmit({ value })}
                disabled={loading}
                style={styles.button}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 24,
        textAlign: 'center',
    },
    sliderContainer: {
        width: '100%',
        marginBottom: 32,
    },
    valueText: {
        fontSize: 48,
        fontWeight: '700',
        color: '#FFD700',
        textAlign: 'center',
        marginBottom: 16,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    labels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    labelText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
    },
    button: {
        width: '100%',
    },
});
