import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    withSequence
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.6;

export default function BreathingPacer({ isActive = true }) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        if (isActive) {
            // 4-7-8 breathing pattern roughly:
            // Inhale (4s) -> Hold (7s) -> Exhale (8s)
            // Simplified for visual pacer: Expand (4s) -> Contract (4s)
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.5, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.8, { duration: 4000 }),
                    withTiming(0.3, { duration: 4000 })
                ),
                -1,
                true
            );
        }
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.circle, animatedStyle]} />
            <Text style={styles.text}>Breathe In... Breathe Out...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 300,
    },
    circle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        backgroundColor: '#A5D6A7', // Soft green
        position: 'absolute',
    },
    text: {
        marginTop: 20,
        fontSize: 18,
        color: '#fff',
        fontWeight: '600',
        zIndex: 1,
    },
});
