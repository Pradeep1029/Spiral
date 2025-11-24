import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

// Step components
import IntroStep from '../components/steps/IntroStep';
import IntensityScaleStep from '../components/steps/IntensityScaleStep';
import DumpTextStep from '../components/steps/DumpTextStep';
import BreathingStep from '../components/steps/BreathingStep';
import GroundingStep from '../components/steps/GroundingStep';
import ChoiceButtonsStep from '../components/steps/ChoiceButtonsStep';
import CBTQuestionStep from '../components/steps/CBTQuestionStep';
import ReframeReviewStep from '../components/steps/ReframeReviewStep';
import SelfCompassionStep from '../components/steps/SelfCompassionStep';
import ActionPlanStep from '../components/steps/ActionPlanStep';
import SleepWindDownStep from '../components/steps/SleepWindDownStep';
import SummaryStep from '../components/steps/SummaryStep';

export default function FlowScreen({ route, navigation }) {
  const { context = 'spiral' } = route.params || {};
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Initialize session
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      setInitializing(true);
      const response = await api.post('/sessions', { context });
      const { session } = response.data.data;
      setSessionId(session.id);
      
      // Get first step
      await fetchNextStep(session.id);
    } catch (error) {
      console.error('Error initializing session:', error);
      alert('Failed to start session. Please try again.');
      navigation.goBack();
    } finally {
      setInitializing(false);
    }
  };

  const fetchNextStep = async (sid = sessionId) => {
    try {
      setLoading(true);
      const response = await api.get(`/sessions/${sid}/next_step`);
      
      if (response.data.flow_complete) {
        // Flow is complete
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
        return;
      }

      setCurrentStep(response.data.data.step);
      setCurrentAnswer(null); // Reset answer for new step
    } catch (error) {
      console.error('Error fetching next step:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentAnswer || !currentStep) return;

    try {
      setLoading(true);
      
      console.log('Submitting answer:', {
        sessionId,
        stepId: currentStep.step_id,
        answer: currentAnswer,
      });
      
      const response = await api.post(
        `/sessions/${sessionId}/steps/${currentStep.step_id}/answer`,
        { answer: currentAnswer }
      );

      console.log('Answer submitted successfully');

      // Check if crisis was detected
      if (response.data.crisis_detected) {
        setCurrentStep(response.data.next_step);
        setCurrentAnswer(null);
        return;
      }

      // Get next step
      await fetchNextStep();
    } catch (error) {
      console.error('Error submitting answer:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to submit: ${error.response?.data?.message || error.message}`);
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!currentStep) return;

    try {
      setLoading(true);
      
      // Submit empty/skipped answer
      await api.post(
        `/sessions/${sessionId}/steps/${currentStep.step_id}/answer`,
        { answer: { skipped: true } }
      );

      // Get next step
      await fetchNextStep();
    } catch (error) {
      console.error('Error skipping step:', error);
      alert('Failed to skip. Please try again.');
      setLoading(false);
    }
  };

  const handleAnswerChange = (answer) => {
    setCurrentAnswer(answer);
  };

  const renderStep = () => {
    if (!currentStep) return null;

    const { step_type } = currentStep;

    switch (step_type) {
      case 'intro':
        // Intro doesn't need answer, auto-set it
        if (!currentAnswer) {
          setCurrentAnswer({ completed: true });
        }
        return <IntroStep step={currentStep} />;

      case 'intensity_scale':
        return (
          <IntensityScaleStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      case 'dump_text':
        return (
          <DumpTextStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      case 'breathing':
        return (
          <BreathingStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      case 'grounding_5_4_3_2_1':
        return (
          <GroundingStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      case 'choice_buttons':
        return (
          <ChoiceButtonsStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      case 'cbt_question':
        return (
          <CBTQuestionStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      case 'reframe_review':
        return (
          <ReframeReviewStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      case 'self_compassion_script':
        return (
          <SelfCompassionStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      case 'action_plan':
        return (
          <ActionPlanStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      case 'sleep_wind_down':
        return (
          <SleepWindDownStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      case 'crisis_info':
        // Auto-set completed
        if (!currentAnswer) {
          setCurrentAnswer({ completed: true });
        }
        return (
          <View style={styles.crisisContainer}>
            <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
            <Text style={styles.crisisTitle}>{currentStep.title}</Text>
            {currentStep.subtitle && (
              <Text style={styles.crisisSubtitle}>{currentStep.subtitle}</Text>
            )}
            {currentStep.description && (
              <Text style={styles.crisisDescription}>{currentStep.description}</Text>
            )}
          </View>
        );

      case 'summary':
        return (
          <SummaryStep
            step={currentStep}
            onAnswerChange={handleAnswerChange}
          />
        );

      default:
        return (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>
              Step type "{step_type}" not yet implemented
            </Text>
            <Text style={styles.placeholderSubtext}>
              This will be available soon!
            </Text>
          </View>
        );
    }
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#0f0c29', '#302b63', '#24243e']}
          style={styles.gradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Preparing your rescue flow...</Text>
        </LinearGradient>
      </View>
    );
  }

  const { meta, primary_cta, secondary_cta, skippable } = currentStep || {};
  const canSubmit = currentAnswer && Object.keys(currentAnswer).length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.gradient}
      >
        {/* Header with progress */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          {meta?.show_progress && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Step {meta.step_index} of {meta.step_count}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(meta.step_index / meta.step_count) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Step content */}
        <ScrollView
          style={styles.stepContainer}
          contentContainerStyle={styles.stepContent}
        >
          {renderStep()}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {secondary_cta && skippable && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>
                {secondary_cta.label || 'Skip'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canSubmit || loading) && styles.primaryButtonDisabled,
            ]}
            onPress={submitAnswer}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {primary_cta?.label || 'Next'}
              </Text>
            )}
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 12,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(98, 126, 234, 0.8)',
  },
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryButton: {
    backgroundColor: 'rgba(98, 126, 234, 0.3)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(98, 126, 234, 0.5)',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
  },
  crisisContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  crisisTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  crisisSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
  crisisDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  placeholderText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
