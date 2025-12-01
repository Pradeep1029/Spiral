import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, BackHandler, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import StepRenderer from '../components/StepRenderer';
import PrimaryButton from '../components/PrimaryButton';

export default function SessionFlowScreen({ navigation, route }) {
    const { context = 'spiral', sleepRelated = true, mode = 'rescue' } = route?.params || {};
    const [sessionId, setSessionId] = useState(null);
    const [session, setSession] = useState(null);
    const [currentStep, setCurrentStep] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [flowComplete, setFlowComplete] = useState(false);
    const [summary, setSummary] = useState(null);

    // Prevent back button from exiting mid-flow
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (!flowComplete) {
                    Alert.alert(
                        'Leave Rescue?',
                        "You're in the middle of a rescue. Are you sure you want to leave?",
                        [
                            { text: 'Stay', style: 'cancel' },
                            { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
                        ]
                    );
                    return true;
                }
                return false;
            };
            BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
        }, [flowComplete])
    );

    useEffect(() => {
        startSession();
    }, []);

    const startSession = async () => {
        try {
            setLoading(true);
            // Start a new session using the Session API (not SpiralSession)
            const res = await api.post('/sessions', {
                context,
                sleepRelated,
                mode, // rescue | quick_rescue | buffer
            });

            console.log('Session response:', res.data);

            // Extract session ID - handle different response structures
            const sessionData = res.data.data?.session || res.data.session || res.data.data;
            const extractedSessionId = sessionData?._id || sessionData?.id;

            if (!extractedSessionId) {
                console.error('No session ID in response:', res.data);
                setError('Failed to create session');
                return;
            }

            console.log('Session ID:', extractedSessionId);
            setSessionId(extractedSessionId);
            setSession(sessionData);

            // Get first step
            await getNextStep(extractedSessionId);
        } catch (err) {
            console.error('Failed to start session:', err);
            setError('Failed to start session');
        } finally {
            setLoading(false);
        }
    };

    const getNextStep = async (sid) => {
        if (!sid) {
            console.error('getNextStep called with no sessionId');
            setError('Invalid session');
            return;
        }

        try {
            setLoading(true);
            console.log('Getting next step for session:', sid);
            const res = await api.get(`/sessions/${sid}/next_step`);

            if (res.data.flow_complete) {
                setFlowComplete(true);
                setSummary(res.data.summary);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                return;
            }
            
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            setCurrentStep(res.data.data.step);
        } catch (err) {
            console.error('Failed to get next step:', err);
            setError('Failed to load step');
        } finally {
            setLoading(false);
        }
    };

    const submitAnswer = async (answer) => {
        if (!sessionId || !currentStep) {
            console.error('submitAnswer called without sessionId or currentStep', { sessionId, currentStep });
            return;
        }

        try {
            setLoading(true);
            console.log('Submitting answer for session:', sessionId, 'step:', currentStep.step_id);
            await api.post(`/sessions/${sessionId}/steps/${currentStep.step_id}/answer`, {
                answer,
            });

            // Get next step
            await getNextStep(sessionId);
        } catch (err) {
            console.error('Failed to submit answer:', err);
            setError('Failed to submit');
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
        });
    };

    // NO "SUCCESS!" or gamified messaging per spec
    if (flowComplete) {
        return (
            <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
                <View style={styles.completeContainer}>
                    <Text style={styles.completeTitle}>You did something for yourself.</Text>
                    <Text style={styles.completeText}>
                        That matters, even if it doesn't feel like it yet.
                    </Text>
                    {summary && (
                        <View style={styles.summaryBox}>
                            {summary.duration && (
                                <Text style={styles.summaryText}>
                                    Time: {Math.round(summary.duration / 60)} minutes
                                </Text>
                            )}
                            {summary.intensity_change !== null && summary.intensity_change > 0 && (
                                <Text style={styles.summaryText}>
                                    Intensity ↓ {summary.intensity_change}
                                </Text>
                            )}
                        </View>
                    )}
                    <PrimaryButton
                        label="Done"
                        onPress={handleFinish}
                        style={styles.doneButton}
                    />
                </View>
            </LinearGradient>
        );
    }

    if (error) {
        return (
            <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </LinearGradient>
        );
    }

    if (loading && !currentStep) {
        return (
            <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
                <ActivityIndicator size="large" color="#fff" />
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {currentStep && (
                    <StepRenderer
                        step={currentStep}
                        onSubmit={submitAnswer}
                        loading={loading}
                    />
                )}
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    completeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    completeTitle: {
        fontSize: 32,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
    completeText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 24,
    },
    summaryBox: {
        backgroundColor: 'rgba(129, 140, 248, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        marginBottom: 24,
    },
    summaryText: {
        color: '#D1D5DB',
        fontSize: 14,
        marginBottom: 4,
    },
    doneButton: {
        width: '100%',
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        fontSize: 16,
        color: '#ff6b6b',
        textAlign: 'center',
    },
});
