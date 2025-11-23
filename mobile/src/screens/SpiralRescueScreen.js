import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import Screen from '../components/Screen';
import { Title, Subtitle, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import api from '../services/api';

export default function SpiralRescueScreen({ navigation }) {
  const [step, setStep] = useState(0); // 0 = intro/intensity, 1-4 = steps
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [intensityBefore, setIntensityBefore] = useState(4);

  const [dumpText, setDumpText] = useState('');

  const [path, setPath] = useState('think_through');
  const [fearQuestion, setFearQuestion] = useState('');
  const [evidenceFor, setEvidenceFor] = useState('');
  const [evidenceAgainst, setEvidenceAgainst] = useState('');
  const [reframe, setReframe] = useState('');
  const [reframeAccepted, setReframeAccepted] = useState(false);
  const [reframeEdited, setReframeEdited] = useState('');
  const [selfCompassionLine, setSelfCompassionLine] = useState('');

  const [letGoMetaphor, setLetGoMetaphor] = useState('cloud');
  const [letGoGroundingDone, setLetGoGroundingDone] = useState(false);

  const [intensityAfter, setIntensityAfter] = useState(3);
  const [nextAction, setNextAction] = useState('try_sleep');
  const [sleepWindDownCompleted, setSleepWindDownCompleted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleStart = async () => {
    try {
      setLoading(true);
      setError(null);
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
      // Non-fatal; user experience continues
    }
  };

  const handleBreathingNext = async (skipped = false) => {
    await updateStep(1, {
      skipped,
      completed: !skipped,
    });
    setStep(2);
  };

  const handleDumpNext = async () => {
    await updateStep(2, {
      text: dumpText,
    });
    setStep(3);
  };

  const generateTemplateReframe = () => {
    const baseAgainst = (evidenceAgainst || 'the story might not be as harsh as it feels').toLowerCase();
    return (
      "I get why this feels so intense right now. But looking at it a bit more gently, " +
      baseAgainst +
      ". One night or one moment doesnt define all of me."
    );
  };

  const handleGenerateReframe = () => {
    const text = generateTemplateReframe();
    setReframe(text);
    setReframeEdited(text);
    setReframeAccepted(true);
  };

  const handleThinkThroughNext = async () => {
    await updateStep(3, {
      pathChosen: 'think_through',
      thinkThrough: {
        fearQuestion,
        evidenceFor,
        evidenceAgainst,
        reframe,
        reframeAccepted,
        reframeEdited,
        selfCompassionLine,
      },
    });
    setStep(4);
  };

  const handleLetGoNext = async () => {
    await updateStep(3, {
      pathChosen: 'let_go',
      letGo: {
        metaphorUsed: letGoMetaphor,
        groundingCompleted: letGoGroundingDone,
      },
    });
    setStep(4);
  };

  const handleComplete = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      await api.put(`/spirals/${sessionId}/complete`, {
        intensityAfter: Math.round(intensityAfter),
        nextAction,
        sleepWindDownCompleted,
      });
      setCompleted(true);
    } catch (e) {
      setError('Could not complete session. It will still be saved.');
      setCompleted(true);
    } finally {
      setLoading(false);
    }
  };

  const renderIntro = () => (
    <Screen scrollable>
      <Title>Rescue in progress · Step 0 of 4</Title>
      <Body style={{ marginBottom: 24 }}>
        Before we start, how loud does this spiral feel right now?
      </Body>
      <Subtitle>Spiral intensity (1–5)</Subtitle>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>1</Text>
        <Slider
          style={{ flex: 1 }}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={intensityBefore}
          minimumTrackTintColor="#F9E66A"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#F9E66A"
          onValueChange={setIntensityBefore}
        />
        <Text style={styles.sliderLabel}>5</Text>
      </View>
      <Body style={{ marginTop: 8, marginBottom: 32 }}>
        Right now: {Math.round(intensityBefore)} / 5
      </Body>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <PrimaryButton label="Start rescue" onPress={handleStart} disabled={loading} />
    </Screen>
  );

  const renderStep1 = () => (
    <Screen scrollable>
      <Title>Rescue in progress · Step 1 of 4</Title>
      <Subtitle>Ground the body</Subtitle>
      <Body style={{ marginBottom: 24 }}>
        Lets calm your body first.
      </Body>
      <Body>
        Inhale through the nose… 2… 3… 4…{"\n"}
        Hold… 2…{"\n"}
        Exhale… 2… 3… 4… 5… 6…
      </Body>
      <Body style={{ marginTop: 16 }}>
        You can follow this for about a minute, or move on when you feel calm enough.
      </Body>
      <PrimaryButton
        label="Ive done a few breaths"
        onPress={() => handleBreathingNext(false)}
        style={{ marginTop: 32 }}
      />
      <SecondaryButton
        label="Skip (Im calm enough)"
        onPress={() => handleBreathingNext(true)}
      />
      <Body style={{ marginTop: 24 }}>
        Nice. Youre telling your nervous system youre not in danger.
      </Body>
    </Screen>
  );

  const renderStep2 = () => (
    <Screen scrollable>
      <Title>Rescue in progress · Step 2 of 4</Title>
      <Subtitle>Dump the spiral</Subtitle>
      <Body style={{ marginBottom: 16 }}>
        Type whatever is looping in your head. It doesnt have to make sense.
      </Body>
      <TextInput
        style={styles.textArea}
        multiline
        placeholder="Start typing here..."
        placeholderTextColor="rgba(255,255,255,0.4)"
        value={dumpText}
        onChangeText={setDumpText}
      />
      <PrimaryButton
        label="Next"
        onPress={handleDumpNext}
        disabled={!dumpText.trim()}
      />
      <Body style={{ marginTop: 16 }}>
        Thats enough for now. Lets sort this out together.
      </Body>
    </Screen>
  );

  const renderThinkThrough = () => (
    <Screen scrollable>
      <Title>Step 3 · Think it through</Title>
      <Body style={{ marginBottom: 16 }}>
        Well gently question the story your brain is telling.
      </Body>
      <Subtitle>What exactly are you afraid will happen?</Subtitle>
      <TextInput
        style={styles.input}
        placeholder="Im afraid that..."
        placeholderTextColor="rgba(255,255,255,0.4)"
        value={fearQuestion}
        onChangeText={setFearQuestion}
      />
      <Subtitle>What evidence do you have that this will happen?</Subtitle>
      <TextInput
        style={styles.input}
        placeholder="Evidence for..."
        placeholderTextColor="rgba(255,255,255,0.4)"
        value={evidenceFor}
        onChangeText={setEvidenceFor}
      />
      <Subtitle>What evidence do you have that it might not be as bad?</Subtitle>
      <TextInput
        style={styles.input}
        placeholder="Evidence against..."
        placeholderTextColor="rgba(255,255,255,0.4)"
        value={evidenceAgainst}
        onChangeText={setEvidenceAgainst}
      />
      {!reframe ? (
        <PrimaryButton
          label="Show me a more balanced way to see this"
          onPress={handleGenerateReframe}
          style={{ marginTop: 16 }}
          disabled={!evidenceAgainst.trim()}
        />
      ) : (
        <View style={{ marginTop: 24 }}>
          <Subtitle>Heres a more balanced way to see this:</Subtitle>
          <TextInput
            style={styles.textArea}
            multiline
            value={reframeEdited}
            onChangeText={setReframeEdited}
          />
          <Subtitle>If a friend said this, what kind thing would you say back?</Subtitle>
          <TextInput
            style={styles.input}
            placeholder="One kind thing I can say to myself..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={selfCompassionLine}
            onChangeText={setSelfCompassionLine}
          />
          <PrimaryButton
            label="Lock this in for tonight"
            onPress={handleThinkThroughNext}
            style={{ marginTop: 16 }}
            disabled={!selfCompassionLine.trim()}
          />
        </View>
      )}
    </Screen>
  );

  const renderLetGo = () => (
    <Screen scrollable>
      <Title>Step 3 · Let it float by</Title>
      <Body style={{ marginBottom: 16 }}>
        Youve thought about this enough for tonight. Lets practice not engaging.
      </Body>
      <Subtitle>Visual metaphor</Subtitle>
      <Body style={{ marginBottom: 8 }}>
        Picture the thought as text on a cloud or leaf. It drifts past; you dont chase it.
      </Body>
      <View style={styles.row}>
        {['cloud', 'leaf', 'river'].map((m) => (
          <Pressable
            key={m}
            onPress={() => setLetGoMetaphor(m)}
            style={[styles.chip, letGoMetaphor === m && styles.chipSelected]}
          >
            <Text style={styles.chipLabel}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <Subtitle style={{ marginTop: 24 }}>5–4–3–2–1 grounding</Subtitle>
      <Body>
        • Name 5 things you can see{"\n"}
        • 4 things you can feel{"\n"}
        • 3 things you can hear{"\n"}
        • 2 things you can smell{"\n"}
        • 1 thing you can taste
      </Body>
      <SecondaryButton
        label="Ive done this"
        onPress={() => setLetGoGroundingDone(true)}
        style={{ marginTop: 16 }}
      />
      <PrimaryButton
        label="Next"
        onPress={handleLetGoNext}
        disabled={!letGoGroundingDone}
        style={{ marginTop: 8 }}
      />
    </Screen>
  );

  const renderStep3 = () => (
    <Screen scrollable>
      <Title>Rescue in progress · Step 3 of 4</Title>
      <Body style={{ marginBottom: 16 }}>
        Now we have two ways out tonight.
      </Body>
      <View style={styles.row}>
        <Pressable
          onPress={() => setPath('think_through')}
          style={[styles.card, path === 'think_through' && styles.cardSelected]}
        >
          <Text style={styles.cardTitle}>🧠 Think it through</Text>
          <Text style={styles.cardText}>
            Question the thoughts and find a more balanced version.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPath('let_go')}
          style={[styles.card, path === 'let_go' && styles.cardSelected]}
        >
          <Text style={styles.cardTitle}>🌊 Let it float by</Text>
          <Text style={styles.cardText}>
            Practice not engaging with the thought at all.
          </Text>
        </Pressable>
      </View>
      <View style={{ marginTop: 24 }}>
        {path === 'think_through' ? renderThinkThrough() : renderLetGo()}
      </View>
    </Screen>
  );

  const renderStep4 = () => (
    <Screen scrollable>
      <Title>Rescue in progress · Step 4 of 4</Title>
      <Subtitle>Sleep mode & close</Subtitle>
      <Body style={{ marginBottom: 16 }}>
        How do you feel right now?
      </Body>
      <Subtitle>Feeling right now (1–5)</Subtitle>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>1</Text>
        <Slider
          style={{ flex: 1 }}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={intensityAfter}
          minimumTrackTintColor="#F9E66A"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#F9E66A"
          onValueChange={setIntensityAfter}
        />
        <Text style={styles.sliderLabel}>5</Text>
      </View>
      <Body style={{ marginTop: 8, marginBottom: 24 }}>
        Now: {Math.round(intensityAfter)} / 5
      </Body>
      <Subtitle>What do you want now?</Subtitle>
      <View style={styles.row}>
        <Pressable
          onPress={() => setNextAction('try_sleep')}
          style={[styles.card, nextAction === 'try_sleep' && styles.cardSelected]}
        >
          <Text style={styles.cardTitle}>Try to sleep</Text>
        </Pressable>
        <Pressable
          onPress={() => setNextAction('calm_more')}
          style={[styles.card, nextAction === 'calm_more' && styles.cardSelected]}
        >
          <Text style={styles.cardTitle}>Just calm down more</Text>
        </Pressable>
      </View>
      {nextAction === 'try_sleep' ? (
        <View style={{ marginTop: 24 }}>
          <Subtitle>2-minute sleep wind-down</Subtitle>
          <Body>
            Imagine simple, random things: apple, train, pillow, tree, shoe… just for a second
            each. Nothing dramatic.
          </Body>
          <SecondaryButton
            label={sleepWindDownCompleted ? 'Wind-down practiced' : 'Ive done a short wind-down'}
            onPress={() => setSleepWindDownCompleted(true)}
            style={{ marginTop: 12 }}
          />
        </View>
      ) : (
        <View style={{ marginTop: 24 }}>
          <Subtitle>2-minute self-compassion burst</Subtitle>
          <Body>
            Hand on chest if that feels okay.{"\n"}
            This is a hard moment. Hard moments are part of being human. May I be gentle with
            myself tonight.
          </Body>
        </View>
      )}
      <PrimaryButton
        label="Rescue complete"
        onPress={handleComplete}
        style={{ marginTop: 32 }}
      />
      {completed && (
        <Body style={{ marginTop: 24 }}>
          Rescue complete. Youre okay. Sleep if you can; rest if you cant.
        </Body>
      )}
      {completed && (
        <SecondaryButton
          label="Back to home"
          onPress={() => navigation.navigate('Home')}
          style={{ marginTop: 12 }}
        />
      )}
    </Screen>
  );

  if (step === 0) return renderIntro();
  if (step === 1) return renderStep1();
  if (step === 2) return renderStep2();
  if (step === 3) return renderStep3();
  if (step === 4) return renderStep4();

  return null;
}

const styles = StyleSheet.create({
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  sliderLabel: {
    color: 'rgba(255,255,255,0.7)',
    marginHorizontal: 8,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    color: '#F7FAFC',
    backgroundColor: 'rgba(15,23,42,0.8)',
    marginBottom: 16,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    color: '#F7FAFC',
    backgroundColor: 'rgba(15,23,42,0.8)',
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  cardSelected: {
    borderColor: '#F9E66A',
    backgroundColor: 'rgba(249,230,106,0.06)',
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 8,
  },
  chipSelected: {
    borderColor: '#F9E66A',
    backgroundColor: 'rgba(249,230,106,0.1)',
  },
  chipLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
});
