import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import Screen from '../components/Screen';
import { Title, Subtitle, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import BreathingPacer from '../components/BreathingPacer';
import VoiceInput from '../components/VoiceInput';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

const EMOTIONS = [
  { id: 'anxious', label: 'Anxious', color: '#EF5350' },
  { id: 'overwhelmed', label: 'Overwhelmed', color: '#AB47BC' },
  { id: 'sad', label: 'Sad', color: '#5C6BC0' },
  { id: 'angry', label: 'Angry', color: '#EF5350' },
  { id: 'lonely', label: 'Lonely', color: '#8D6E63' },
  { id: 'scared', label: 'Scared', color: '#FFA726' },
  { id: 'guilty', label: 'Guilty', color: '#78909C' },
  { id: 'shame', label: 'Shame', color: '#546E7A' },
];

export default function SpiralRescueScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 0: Intensity
  const [intensityBefore, setIntensityBefore] = useState(5);

  // Step 2: Dump
  const [audioUri, setAudioUri] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [dumpText, setDumpText] = useState(''); // Fallback text input

  // Step 3: Process
  const [technique, setTechnique] = useState(null); // 'defusion' | 'weighing'

  // Defusion State
  const [floatingThoughts, setFloatingThoughts] = useState([]);

  // Weighing State
  const [beliefStrength, setBeliefStrength] = useState(80);
  const [evidenceFor, setEvidenceFor] = useState('');
  const [evidenceAgainst, setEvidenceAgainst] = useState('');

  // Step 4: Close
  const [finalMood, setFinalMood] = useState(5);
  const [nextAction, setNextAction] = useState('sleep');
  const [completed, setCompleted] = useState(false);

  const handleStart = async () => {
    try {
      setLoading(true);
      const res = await api.post('/spirals/start', {
        intensityBefore: Math.round(intensityBefore),
      });
      setSessionId(res.data.data.session._id || res.data.data.session.id);
      setStep(1);
    } catch (e) {
      setError('Could not start rescue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateStep = async (stepNumber, stepData) => {
    if (!sessionId) return;
    try {
      await api.put(`/spirals/${sessionId}/step`, {
        stepNumber,
        stepData,
      });
    } catch (e) {
      console.log('Step update failed', e);
    }
  };

  const handleBreathingNext = async (skipped = false) => {
    await updateStep(1, { skipped, completed: !skipped });
    setStep(2);
  };

  const toggleTag = (tag) => {
    Haptics.selectionAsync();
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleDumpNext = async () => {
    let transcribedText = dumpText;

    // If user recorded audio, upload and transcribe it
    if (audioUri && sessionId) {
      try {
        setLoading(true);

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('audio', {
          uri: audioUri,
          type: 'audio/m4a',
          name: 'recording.m4a',
        });

        // Upload and transcribe
        const response = await api.post(`/spirals/${sessionId}/transcribe`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        transcribedText = response.data.data.text;
        console.log('Transcription successful:', transcribedText);
      } catch (error) {
        console.error('Transcription failed:', error);
        // Continue with whatever text was entered manually
      } finally {
        setLoading(false);
      }
    }

    await updateStep(2, {
      text: transcribedText,
      audioUrl: audioUri,
      isVoiceEntry: !!audioUri,
      selectedTags,
    });
    setStep(3);
  };

  const addFloatingThought = () => {
    const text = dumpText || selectedTags[0] || "My Worry";
    const id = Date.now();
    setFloatingThoughts([...floatingThoughts, { id, text }]);
  };

  const handleProcessNext = async () => {
    await updateStep(3, {
      techniqueUsed: technique,
      defusion: technique === 'defusion' ? {
        visualTheme: 'clouds',
        thoughtsReleased: floatingThoughts.length
      } : undefined,
      weighing: technique === 'weighing' ? {
        beliefStrengthBefore: 80, // mocked for now
        evidenceFor: [evidenceFor],
        evidenceAgainst: [evidenceAgainst],
        beliefStrengthAfter: beliefStrength
      } : undefined
    });
    setStep(4);
  };

  const handleComplete = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      await api.put(`/spirals/${sessionId}/complete`, {
        finalMood: Math.round(finalMood),
        nextAction,
      });
      setCompleted(true);
    } catch (e) {
      setError('Could not complete session.');
      setCompleted(true);
    } finally {
      setLoading(false);
    }
  };

  // --- Render Steps ---

  const renderIntro = () => (
    <Screen>
      <View style={styles.centerContent}>
        <Title>Spiral Rescue</Title>
        <Subtitle style={{ textAlign: 'center', marginTop: 10 }}>
          Let's slow things down. How loud is the noise right now?
        </Subtitle>

        <View style={styles.intensityContainer}>
          <Text style={styles.intensityNumber}>{intensityBefore}</Text>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={intensityBefore}
            minimumTrackTintColor="#FF7043"
            maximumTrackTintColor="#374151"
            thumbTintColor="#FF7043"
            onValueChange={v => {
              setIntensityBefore(v);
              Haptics.selectionAsync();
            }}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.label}>Quiet</Text>
            <Text style={styles.label}>Deafening</Text>
          </View>
        </View>

        <PrimaryButton
          label="Start Rescue"
          onPress={handleStart}
          disabled={loading}
          style={{ marginTop: 40 }}
        />
      </View>
    </Screen>
  );

  const renderStep1 = () => (
    <Screen>
      <View style={styles.centerContent}>
        <Title>Breathe</Title>
        <Subtitle style={{ marginBottom: 30 }}>Sync your breath with the circle.</Subtitle>
        <BreathingPacer isActive={true} />

        <PrimaryButton
          label="I feel a bit steadier"
          onPress={() => handleBreathingNext(false)}
          style={{ marginTop: 50 }}
        />
        <SecondaryButton
          label="Skip"
          onPress={() => handleBreathingNext(true)}
          style={{ marginTop: 10 }}
        />
      </View>
    </Screen>
  );

  const renderStep2 = () => (
    <Screen scrollable>
      <Title>Get it Out</Title>
      <Subtitle>Speak it or tap what you feel. Don't hold it in.</Subtitle>

      <View style={styles.voiceContainer}>
        <VoiceInput onRecordingComplete={setAudioUri} />
        {audioUri && <Text style={styles.audioConfirm}>Audio captured</Text>}
      </View>

      <Text style={styles.sectionHeader}>Or tap what you feel:</Text>
      <View style={styles.bubbleContainer}>
        {EMOTIONS.map(emo => (
          <Pressable
            key={emo.id}
            onPress={() => toggleTag(emo.label)}
            style={[
              styles.bubble,
              selectedTags.includes(emo.label) && { backgroundColor: emo.color, borderColor: emo.color }
            ]}
          >
            <Text style={[
              styles.bubbleText,
              selectedTags.includes(emo.label) && { color: 'white', fontWeight: 'bold' }
            ]}>
              {emo.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionHeader}>Or just type (optional):</Text>
      <TextInput
        style={styles.input}
        placeholder="Briefly, what's wrong?"
        placeholderTextColor="#666"
        value={dumpText}
        onChangeText={setDumpText}
      />

      <PrimaryButton
        label="Next"
        onPress={handleDumpNext}
        style={{ marginTop: 20 }}
      />
    </Screen>
  );

  const renderDefusion = () => (
    <View style={{ flex: 1 }}>
      <Subtitle>Visualize your thoughts floating away like leaves on a stream.</Subtitle>
      <View style={styles.skyContainer}>
        {floatingThoughts.map((thought, index) => (
          <FloatingThought key={thought.id} text={thought.text} index={index} />
        ))}
      </View>
      <SecondaryButton
        label="+ Release a thought"
        onPress={() => {
          addFloatingThought();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        style={{ marginBottom: 10 }}
      />
      <PrimaryButton label="I feel lighter" onPress={handleProcessNext} />
    </View>
  );

  const renderWeighing = () => (
    <View>
      <Subtitle>Let's weigh the evidence.</Subtitle>

      <Text style={styles.label}>Evidence FOR the worry:</Text>
      <TextInput
        style={styles.input}
        multiline
        value={evidenceFor}
        onChangeText={setEvidenceFor}
        placeholder="It might happen because..."
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>Evidence AGAINST the worry:</Text>
      <TextInput
        style={styles.input}
        multiline
        value={evidenceAgainst}
        onChangeText={setEvidenceAgainst}
        placeholder="It might not happen because..."
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>How true does the worry feel now? ({beliefStrength}%)</Text>
      <Slider
        style={{ width: '100%', height: 40 }}
        minimumValue={0}
        maximumValue={100}
        step={5}
        value={beliefStrength}
        minimumTrackTintColor="#EF5350"
        maximumTrackTintColor="#374151"
        onValueChange={setBeliefStrength}
      />

      <PrimaryButton label="Done Weighing" onPress={handleProcessNext} style={{ marginTop: 20 }} />
    </View>
  );

  const renderStep3 = () => (
    <Screen scrollable>
      <Title>Process</Title>
      {!technique ? (
        <View>
          <Subtitle>Choose a path for tonight:</Subtitle>
          <Pressable style={styles.card} onPress={() => setTechnique('defusion')}>
            <Text style={styles.cardTitle}>🍃 Defusion</Text>
            <Text style={styles.cardDesc}>Watch thoughts float away. Good for looping worries.</Text>
          </Pressable>
          <Pressable style={styles.card} onPress={() => setTechnique('weighing')}>
            <Text style={styles.cardTitle}>⚖️ Weighing</Text>
            <Text style={styles.cardDesc}>Check the facts. Good for "what if" scenarios.</Text>
          </Pressable>
        </View>
      ) : (
        technique === 'defusion' ? renderDefusion() : renderWeighing()
      )}
    </Screen>
  );

  const renderStep4 = () => (
    <Screen>
      <View style={styles.centerContent}>
        <Title>Closing</Title>
        <Subtitle>How are you feeling now?</Subtitle>

        <View style={styles.intensityContainer}>
          <Text style={styles.intensityNumber}>{finalMood}</Text>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={finalMood}
            minimumTrackTintColor="#66BB6A"
            maximumTrackTintColor="#374151"
            thumbTintColor="#66BB6A"
            onValueChange={setFinalMood}
          />
        </View>

        {!completed ? (
          <PrimaryButton label="Finish Session" onPress={handleComplete} style={{ marginTop: 30 }} />
        ) : (
          <View>
            <Text style={styles.successText}>Session Saved.</Text>
            <SecondaryButton label="Back Home" onPress={() => navigation.navigate('Home')} />
          </View>
        )}
      </View>
    </Screen>
  );

  if (step === 0) return renderIntro();
  if (step === 1) return renderStep1();
  if (step === 2) return renderStep2();
  if (step === 3) return renderStep3();
  if (step === 4) return renderStep4();

  return null;
}

// Helper for Defusion Animation
function FloatingThought({ text, index }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(-400, { duration: 8000 + index * 1000, easing: Easing.linear });
    translateX.value = withTiming(Math.random() * 100 - 50, { duration: 8000 });
    opacity.value = withDelay(6000, withTiming(0, { duration: 2000 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.floatingThought, style]}>
      <Text style={styles.floatingText}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  intensityContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 30,
  },
  intensityNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  label: {
    color: '#9CA3AF',
    marginTop: 10,
  },
  voiceContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  audioConfirm: {
    color: '#66BB6A',
    marginTop: 10,
  },
  bubbleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4B5563',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
  },
  bubbleText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  sectionHeader: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1F2937',
    color: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    minHeight: 50,
  },
  card: {
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardDesc: {
    color: '#9CA3AF',
  },
  skyContainer: {
    height: 300,
    backgroundColor: '#111827',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  floatingThought: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 10,
  },
  floatingText: {
    color: 'white',
  },
  successText: {
    color: '#66BB6A',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
});
