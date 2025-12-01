import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet, Switch } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';

const TOPIC_OPTIONS = [
  { key: 'work_study', label: 'Work / study' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'money', label: 'Money' },
  { key: 'health', label: 'Health' },
  { key: 'family', label: 'Family' },
  { key: 'myself', label: 'Myself / who I am' },
  { key: 'future_direction', label: 'The future / direction of my life' },
];

const EMOTION_OPTIONS = [
  { key: 'anxiety_fear', label: 'Anxiety / fear' },
  { key: 'shame_defective', label: 'Shame / feeling defective' },
  { key: 'sadness_grief', label: 'Sadness / grief' },
  { key: 'anger_resentment', label: 'Anger or resentment' },
  { key: 'guilt', label: 'Guilt' },
  { key: 'all_over', label: 'All over the place' },
];

const HELP_STYLE_OPTIONS = [
  {
    key: 'think_clearly',
    label: 'Help me think more clearly',
    description: 'Gently sort through the thoughts and see them more accurately.',
  },
  {
    key: 'kinder_to_self',
    label: 'Help me be kinder to myself',
    description: 'Shift the self-talk away from attacks and into something human.',
  },
  {
    key: 'calm_body',
    label: 'Help me calm my body and detach',
    description: 'Grounding and sleep-friendly tools before more thinking.',
  },
  {
    key: 'not_sure',
    label: "I'm not sure yet",
    description: "I'm open to a mix and want to experiment.",
  },
];

const ENERGY_OPTIONS = [
  { key: 'some_energy', label: 'Energy for a few questions' },
  { key: 'low_energy', label: 'Almost no energy – keep it simple' },
];

const TIME_OPTIONS = ['20:30', '21:30', '22:30', '23:30'];

const AUTOPILOT_OPTIONS = [
  {
    key: 'enabled',
    label: 'Yes, help me catch spirals early',
    description: 'I\'ll get gentle nudges at key moments - you can always customize or turn these off.',
  },
  {
    key: 'disabled',
    label: 'Not yet',
    description: 'I\'ll use the app when I need it. I can enable this later in settings.',
  },
];

function getDefaultTimeForTiming(spiralTiming) {
  switch (spiralTiming) {
    case 'before_sleep':
      return '22:30';
    case 'middle_night':
      return '02:00';
    case 'evenings':
      return '21:00';
    case 'anytime':
    default:
      return '20:30';
  }
}

export default function OnboardingTopicsScreen({ route, navigation }) {
  const { spiralPatterns, spiralTiming } = route.params || {};
  const { completeOnboarding } = useAuth();

  const [step, setStep] = useState(1);
  const [topics, setTopics] = useState([]);
  const [emotions, setEmotions] = useState([]);
  const [helpStyle, setHelpStyle] = useState(null);
  const [nightEnergy, setNightEnergy] = useState(null);
  const [checkInEnabled, setCheckInEnabled] = useState(true);
  const [checkInTime, setCheckInTime] = useState(
    getDefaultTimeForTiming(spiralTiming)
  );
  const [autopilotEnabled, setAutopilotEnabled] = useState(null);
  const [saving, setSaving] = useState(false);

  const toggleTopic = (key) => {
    setTopics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleEmotion = (key) => {
    setEmotions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const cycleTime = () => {
    const idx = TIME_OPTIONS.indexOf(checkInTime);
    const nextIndex = idx === -1 ? 0 : (idx + 1) % TIME_OPTIONS.length;
    setCheckInTime(TIME_OPTIONS[nextIndex]);
  };

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
      setStep(5);
      return;
    }

    try {
      setSaving(true);
      await completeOnboarding({
        spiralPatterns,
        spiralTiming,
        spiralTopics: topics,
        spiralEmotions: emotions,
        helpStyle,
        nightEnergy,
        checkInPreferences: {
          enabled: checkInEnabled,
          time: checkInEnabled ? checkInTime : null,
        },
        autopilotConsent: autopilotEnabled === 'enabled',
      });
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete onboarding: ' + (error?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return topics.length > 0;
    if (step === 2) return emotions.length > 0;
    if (step === 3) return !!helpStyle && !!nightEnergy;
    if (step === 4) return true; // Check-in is optional
    if (step === 5) return !!autopilotEnabled;
    return !saving;
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <>
          <Title>What do your spirals usually orbit around?</Title>
          <Body style={{ marginBottom: 24 }}>You can pick more than one.</Body>
          <View style={{ gap: 12 }}>
            {TOPIC_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => toggleTopic(opt.key)}
                style={[
                  styles.card,
                  topics.includes(opt.key) && styles.cardSelected,
                ]}
              >
                <Text style={styles.cardLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Title>What do your spirals feel like on the inside?</Title>
          <Body style={{ marginBottom: 24 }}>Pick what fits most often.</Body>
          <View style={{ gap: 12 }}>
            {EMOTION_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => toggleEmotion(opt.key)}
                style={[
                  styles.card,
                  emotions.includes(opt.key) && styles.cardSelected,
                ]}
              >
                <Text style={styles.cardLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <Title>What usually helps you most?</Title>
          <Body style={{ marginBottom: 16 }}>
            Even if you're not sure, pick what sounds best.
          </Body>
          <Body style={{ marginBottom: 12 }}>When things are hard, I want…</Body>
          <View style={{ gap: 12, marginBottom: 24 }}>
            {HELP_STYLE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setHelpStyle(opt.key)}
                style={[
                  styles.card,
                  helpStyle === opt.key && styles.cardSelected,
                ]}
              >
                <Text style={styles.cardTitle}>{opt.label}</Text>
                {opt.description && (
                  <Text style={styles.cardDescription}>{opt.description}</Text>
                )}
              </Pressable>
            ))}
          </View>

          <Body style={{ marginBottom: 12 }}>At night I have…</Body>
          <View style={styles.chipRow}>
            {ENERGY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setNightEnergy(opt.key)}
                style={[
                  styles.chip,
                  nightEnergy === opt.key && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    nightEnergy === opt.key && styles.chipLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      );
    }

    if (step === 4) {
      // Step 4 – Nightly check-in setup
      return (
        <>
          <Title>Want a gentle check-in on your rough nights?</Title>
          <Body style={{ marginBottom: 24 }}>
            I can lightly check in once a day around your usual spiral time.
          </Body>

          <View style={styles.rowBetween}>
            <Body>Yes, send me a check-in</Body>
            <Switch
              value={checkInEnabled}
              onValueChange={setCheckInEnabled}
            />
          </View>

          {checkInEnabled && (
            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>Check-in time</Text>
              <Pressable style={styles.timePill} onPress={cycleTime}>
                <Text style={styles.timeText}>{checkInTime}</Text>
                <Text style={styles.timeHint}>Tap to change</Text>
              </Pressable>
            </View>
          )}
        </>
      );
    }

    // Step 5 – Autopilot consent (v2)
    return (
      <>
        <Title>Want Unspiral to catch you before you spiral?</Title>
        <Body style={{ marginBottom: 8 }}>
          Autopilot can notice when you're likely to spiral and offer a quick
          intervention – like a 2-minute buffer before bed or a gentle nudge
          when you're awake at 3am.
        </Body>
        <Body style={{ marginBottom: 24, color: 'rgba(255,255,255,0.6)' }}>
          This uses time-of-day patterns. We never read your other apps or messages.
        </Body>

        <View style={{ gap: 12 }}>
          {AUTOPILOT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setAutopilotEnabled(opt.key)}
              style={[
                styles.card,
                autopilotEnabled === opt.key && styles.cardSelected,
              ]}
            >
              <Text style={styles.cardTitle}>{opt.label}</Text>
              {opt.description && (
                <Text style={styles.cardDescription}>{opt.description}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </>
    );
  };

  return (
    <Screen scrollable>
      {renderStep()}
      <PrimaryButton
        label={step === 5 ? 'Finish setup' : 'Next'}
        onPress={handleNext}
        disabled={!canProceed()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  cardSelected: {
    borderColor: '#F9E66A',
    backgroundColor: 'rgba(249,230,106,0.08)',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
  },
  chipSelected: {
    borderColor: '#F9E66A',
    backgroundColor: 'rgba(249,230,106,0.12)',
  },
  chipLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  chipLabelSelected: {
    color: 'rgba(17,24,39,0.95)',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 24,
  },
  timeContainer: {
    marginBottom: 24,
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    marginBottom: 8,
  },
  timePill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  timeText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    fontWeight: '600',
  },
  timeHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
});
