import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function TrainingFlowScreen({ navigation, route }) {
  const { skill } = route.params;
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flowComplete, setFlowComplete] = useState(false);
  const [practiceInput, setPracticeInput] = useState('');

  useEffect(() => {
    startSession();
  }, []);

  const startSession = async () => {
    try {
      setLoading(true);
      const res = await api.post('/training/start', { skill });
      const session = res.data.data.session;
      setSessionId(session.id);
      await getNextStep(session.id);
    } catch (err) {
      console.error('Error starting training:', err);
      setError('Failed to start training session');
    } finally {
      setLoading(false);
    }
  };

  const getNextStep = async (sid) => {
    try {
      setLoading(true);
      const res = await api.get(`/training/${sid}/next_step`);
      
      if (res.data.flow_complete) {
        setFlowComplete(true);
        return;
      }
      
      setCurrentStep(res.data.data.step);
      setPracticeInput('');
    } catch (err) {
      console.error('Error getting step:', err);
      setError('Failed to load step');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answer = {}) => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      await api.post(`/training/${sessionId}/steps/${currentStep?.step_id}/answer`, {
        answer: {
          ...answer,
          practiceResponse: practiceInput || undefined,
        },
      });
      await getNextStep(sessionId);
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleFinish = () => {
    navigation.navigate('MainTabs');
  };

  const renderStepContent = () => {
    if (!currentStep) return null;
    
    const stepType = currentStep.step_type;
    
    switch (stepType) {
      case 'training_intro':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{currentStep.title}</Text>
            <Text style={styles.subtitle}>{currentStep.subtitle}</Text>
            {currentStep.description && (
              <Text style={styles.description}>{currentStep.description}</Text>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => submitAnswer({ completed: true })}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>Let's start</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'training_concept':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{currentStep.title}</Text>
            {currentStep.content?.map((item, index) => (
              <View key={index} style={styles.conceptItem}>
                <Text style={styles.conceptText}>{item}</Text>
              </View>
            ))}
            {currentStep.example && (
              <View style={styles.exampleBox}>
                <Ionicons name="bulb" size={18} color="#F9E66A" />
                <Text style={styles.exampleText}>{currentStep.example}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => submitAnswer({ completed: true })}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'training_practice':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{currentStep.title}</Text>
            <Text style={styles.prompt}>{currentStep.prompt}</Text>
            {currentStep.instructions && (
              <View style={styles.instructionsList}>
                {currentStep.instructions.map((inst, index) => (
                  <Text key={index} style={styles.instruction}>
                    {index + 1}. {inst}
                  </Text>
                ))}
              </View>
            )}
            <TextInput
              style={styles.practiceInput}
              placeholder="Type your thoughts here..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={practiceInput}
              onChangeText={setPracticeInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {currentStep.followUp && (
              <Text style={styles.followUp}>{currentStep.followUp}</Text>
            )}
            {currentStep.tip && (
              <Text style={styles.tip}>💡 {currentStep.tip}</Text>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => submitAnswer({ completed: true })}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'training_summary':
        return (
          <View style={styles.stepContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#4ade80" style={styles.summaryIcon} />
            <Text style={styles.title}>{currentStep.title}</Text>
            {currentStep.points?.map((point, index) => (
              <View key={index} style={styles.summaryPoint}>
                <Ionicons name="checkmark" size={18} color="#4ade80" />
                <Text style={styles.summaryPointText}>{point}</Text>
              </View>
            ))}
            {currentStep.nextStep && (
              <View style={styles.nextStepBox}>
                <Ionicons name="arrow-forward-circle" size={20} color="#F9E66A" />
                <Text style={styles.nextStepText}>{currentStep.nextStep}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => submitAnswer({ completed: true })}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{currentStep.title || 'Continue'}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => submitAnswer({ completed: true })}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  if (flowComplete) {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.completeContainer}>
            <Ionicons name="trophy" size={64} color="#F9E66A" />
            <Text style={styles.completeTitle}>Skill unlocked! 🎯</Text>
            <Text style={styles.completeText}>
              You've practiced a new technique. It's ready for you next time you need it.
            </Text>
            <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
              <Text style={styles.finishButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
              <Text style={styles.primaryButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {currentStep?.meta?.show_progress && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Step {currentStep.meta.step_index} of {currentStep.meta.step_count}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(currentStep.meta.step_index / currentStep.meta.step_count) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading && !currentStep ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            renderStepContent()
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 8,
    width: 40,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 6,
  },
  progressBar: {
    width: 120,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F9E66A',
    borderRadius: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  description: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  conceptItem: {
    marginBottom: 16,
  },
  conceptText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 24,
  },
  exampleBox: {
    backgroundColor: 'rgba(249, 230, 106, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 230, 106, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exampleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 22,
    marginLeft: 12,
    flex: 1,
    fontStyle: 'italic',
  },
  prompt: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  instructionsList: {
    marginBottom: 20,
  },
  instruction: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
  },
  practiceInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  followUp: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  tip: {
    color: 'rgba(249, 230, 106, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  summaryPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryPointText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 10,
    flex: 1,
  },
  nextStepBox: {
    backgroundColor: 'rgba(249, 230, 106, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextStepText: {
    color: 'rgba(249, 230, 106, 0.9)',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    marginTop: 20,
    alignSelf: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  completeTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  completeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  finishButton: {
    backgroundColor: '#F9E66A',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 64,
  },
  finishButtonText: {
    color: '#0f0c29',
    fontSize: 17,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
});
