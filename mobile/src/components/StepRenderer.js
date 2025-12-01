import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Import step components
import IntensitySlider from './steps/IntensitySlider';
import TextDumpStep from './steps/TextDumpStep';
import BreathingPacer from './BreathingPacer';
import CBTQuestionStep from './steps/CBTQuestionStep';
import ReframeReviewStep from './steps/ReframeReviewStep';
import SelfCompassionStep from './steps/SelfCompassionStep';
import SummaryStep from './steps/SummaryStep';
import GroundingStep from './steps/GroundingStep';
import ChoiceButtonsStep from './steps/ChoiceButtonsStep';
import ActionPlanStep from './steps/ActionPlanStep';
import SleepWindDownStep from './steps/SleepWindDownStep';
import DreamTrailsGame from './steps/DreamTrailsGame';

export default function StepRenderer({ step, onSubmit, loading }) {
    const [showEducation, setShowEducation] = useState(false);
    const [pendingAnswer, setPendingAnswer] = useState(null);

    const handleAnswerChange = (partial) => {
        setPendingAnswer((prev) => ({
            ...(prev || {}),
            ...(partial || {}),
        }));
    };

    const handleStepSubmit = (fallbackAnswer = { completed: true }) => {
        const answerToSend = pendingAnswer || fallbackAnswer;
        setPendingAnswer(null);
        onSubmit(answerToSend);
    };

    const renderStepContent = () => {
        switch (step.step_type) {
            case 'intro':
                return (
                    <View style={styles.introContainer}>
                        <Text style={styles.title}>{step.title}</Text>
                        {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}
                        {step.description && <Text style={styles.description}>{step.description}</Text>}
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleStepSubmit({ completed: true })}
                            disabled={loading}
                        >
                            <Text style={styles.primaryButtonText}>{step.primary_cta?.label || 'Next'}</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'intensity_scale':
                return <IntensitySlider step={step} onSubmit={onSubmit} loading={loading} />;

            case 'dump_text':
            case 'dump_voice':
                return <TextDumpStep step={step} onSubmit={onSubmit} loading={loading} />;

            case 'breathing':
                return (
                    <View>
                        <Text style={styles.title}>{step.title}</Text>
                        {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}
                        <BreathingPacer
                            onComplete={() => handleStepSubmit({ completed: true })}
                            duration={step.ui?.props?.breath_count * (step.ui?.props?.inhale_sec + step.ui?.props?.exhale_sec) || 60}
                        />
                    </View>
                );

            case 'grounding_5_4_3_2_1':
                return (
                    <View>
                        <GroundingStep step={step} onAnswerChange={handleAnswerChange} />
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleStepSubmit()}
                            disabled={loading}
                        >
                            <Text style={styles.primaryButtonText}>{step.primary_cta?.label || 'Done'}</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'choice_buttons':
            case 'context_check':
            case 'body_choice':
            case 'sleep_or_action_choice':
                return (
                    <View>
                        <Text style={styles.title}>{step.title}</Text>
                        {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}
                        <ChoiceButtonsStep step={step} onAnswerChange={(answer) => {
                            handleAnswerChange(answer);
                            // For choice steps, auto-submit on selection
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setTimeout(() => onSubmit(answer), 300);
                        }} />
                    </View>
                );

            case 'spiral_title':
                return (
                    <View>
                        <Text style={styles.title}>{step.title}</Text>
                        {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}
                        <TextInput
                            style={styles.singleLineInput}
                            placeholder={step.ui?.props?.placeholder || "Tonight's spiral is called..."}
                            placeholderTextColor="#6B7280"
                            value={pendingAnswer?.title || ''}
                            onChangeText={(text) => handleAnswerChange({ title: text, text })}
                            maxLength={100}
                        />
                        {step.ui?.props?.examples && (
                            <View style={styles.examplesContainer}>
                                <Text style={styles.examplesLabel}>Examples:</Text>
                                {step.ui.props.examples.slice(0, 3).map((ex, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.exampleChip}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            handleAnswerChange({ title: ex, text: ex });
                                        }}
                                    >
                                        <Text style={styles.exampleChipText}>{ex}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleStepSubmit()}
                            disabled={loading || !pendingAnswer?.title}
                        >
                            <Text style={styles.primaryButtonText}>{step.primary_cta?.label || 'Next'}</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'action_plan':
                return (
                    <View>
                        <ActionPlanStep step={step} onAnswerChange={handleAnswerChange} />
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleStepSubmit()}
                            disabled={loading}
                        >
                            <Text style={styles.primaryButtonText}>{step.primary_cta?.label || 'Save this'}</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'sleep_wind_down':
                return (
                    <View>
                        <SleepWindDownStep step={step} onAnswerChange={handleAnswerChange} />
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleStepSubmit()}
                            disabled={loading}
                        >
                            <Text style={styles.primaryButtonText}>{step.primary_cta?.label || "I'm ready to put my phone down"}</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'cbt_question':
            case 'defusion':
            case 'acceptance':
                return <CBTQuestionStep step={step} onSubmit={onSubmit} loading={loading} />;

            case 'final_intensity':
                return <IntensitySlider step={step} onSubmit={onSubmit} loading={loading} />;

            case 'future_orientation':
                return (
                    <View style={styles.futureContainer}>
                        <Text style={styles.title}>{step.title}</Text>
                        {step.ui?.props?.actionPlan && (
                            <View style={styles.actionPlanBox}>
                                <Text style={styles.actionPlanLabel}>Your plan for tomorrow:</Text>
                                <Text style={styles.actionPlanText}>{step.ui.props.actionPlan}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => handleStepSubmit({ completed: true })}
                            disabled={loading}
                        >
                            <Text style={styles.primaryButtonText}>{step.primary_cta?.label || 'Next'}</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'reframe_review':
                return <ReframeReviewStep step={step} onSubmit={onSubmit} loading={loading} />;

            case 'self_compassion_script':
                return <SelfCompassionStep step={step} onSubmit={onSubmit} loading={loading} />;

            case 'summary':
                return <SummaryStep step={step} onSubmit={onSubmit} loading={loading} />;

            case 'dream_trails_game':
                return (
                    <DreamTrailsGame
                        step={step}
                        onSubmit={onSubmit}
                        loading={loading}
                        suggestedTrail={step.ui?.props?.suggested_trail}
                    />
                );

            default:
                return (
                    <View style={styles.fallbackContainer}>
                        <Text style={styles.title}>{step.title || 'Continuing...'}</Text>
                        {step.description && <Text style={styles.description}>{step.description}</Text>}
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => onSubmit({ completed: true })}
                            disabled={loading}
                        >
                            <Text style={styles.primaryButtonText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                );
        }
    };

    return (
        <View style={styles.container}>
            {/* Progress Indicator */}
            {step.meta?.show_progress && (
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>
                        Step {step.meta.step_index} of {step.meta.step_count}
                    </Text>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${(step.meta.step_index / step.meta.step_count) * 100}%` },
                            ]}
                        />
                    </View>
                </View>
            )}

            {/* Educational Badge */}
            {step.educational_content && (
                <TouchableOpacity
                    style={styles.educationBadge}
                    onPress={() => setShowEducation(true)}
                >
                    <Ionicons name="information-circle" size={16} color="#FFD700" />
                    <Text style={styles.educationBadgeText}>Why this helps</Text>
                </TouchableOpacity>
            )}

            {/* Step Content */}
            {renderStepContent()}

            {/* Educational Modal */}
            <Modal visible={showEducation} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {step.educational_content?.technique_name || 'Why this helps'}
                        </Text>
                        <Text style={styles.modalText}>
                            {step.educational_content?.why_this_matters}
                        </Text>
                        {step.educational_content?.learn_more && (
                            <Text style={styles.modalLearnMore}>
                                {step.educational_content.learn_more}
                            </Text>
                        )}
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setShowEducation(false)}
                        >
                            <Text style={styles.modalButtonText}>Got it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    progressContainer: {
        marginBottom: 24,
    },
    progressText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginBottom: 8,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 2,
    },
    educationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 16,
    },
    educationBadgeText: {
        color: '#FFD700',
        fontSize: 13,
        marginLeft: 6,
        fontWeight: '500',
    },
    introContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    primaryButton: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 48,
        marginTop: 16,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    fallbackContainer: {
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.3)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFD700',
        marginBottom: 12,
    },
    modalText: {
        fontSize: 15,
        color: '#fff',
        lineHeight: 22,
        marginBottom: 12,
    },
    modalLearnMore: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 20,
        marginBottom: 16,
    },
    modalButton: {
        backgroundColor: 'rgba(255,215,0,0.2)',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignSelf: 'center',
    },
    modalButtonText: {
        color: '#FFD700',
        fontSize: 16,
        fontWeight: '600',
    },
    // New styles for 7-phase flow
    singleLineInput: {
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        marginTop: 16,
    },
    examplesContainer: {
        marginTop: 20,
    },
    examplesLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        marginBottom: 10,
    },
    exampleChip: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    exampleChipText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
    },
    futureContainer: {
        alignItems: 'center',
    },
    actionPlanBox: {
        backgroundColor: 'rgba(129, 140, 248, 0.15)',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        borderLeftWidth: 3,
        borderLeftColor: '#818CF8',
        alignSelf: 'stretch',
    },
    actionPlanLabel: {
        color: '#818CF8',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    actionPlanText: {
        color: '#D1D5DB',
        fontSize: 16,
        lineHeight: 24,
    },
});
