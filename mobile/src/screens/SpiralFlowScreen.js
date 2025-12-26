import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import Screen from '../components/Screen';
import { Title, Subtitle, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import api from '../services/api';

const COLORS = {
  bg: '#0A1128',
  surface: '#152238',
  primary: '#2A9D8F',
  terracotta: '#E76F51',
  text: '#F8F9FA',
  muted: 'rgba(248,249,250,0.6)',
};

const BODY_LOCATIONS = [
  { id: 'head', label: 'Head' },
  { id: 'chest', label: 'Chest' },
  { id: 'belly', label: 'Belly' },
  { id: 'hands', label: 'Hands' },
];

const ANCHORS = [
  'Three physiological sighs',
  'Name the body feeling',
  'Reframe the worst-case',
  'Do one tiny action',
];

const STEPS = {
  arrival: 'arrival',
  sigh1: 'sigh1',
  bodyScan: 'bodyScan',
  spiralText: 'spiralText',
  path: 'path',
  closureSigh: 'closureSigh',
  closureCheck: 'closureCheck',
  anchor: 'anchor',
  done: 'done',
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatSeconds(sec) {
  const s = Math.max(0, sec | 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function SpiralFlowScreen({ navigation }) {
  const startedAtRef = useRef(null);
  const sessionIdRef = useRef(null);

  const [step, setStep] = useState(STEPS.arrival);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  const [greeting, setGreeting] = useState('');

  const [sighRemaining, setSighRemaining] = useState(null);
  const sighIntervalRef = useRef(null);

  const [bodyLocationPre, setBodyLocationPre] = useState(null);
  const [bodyText, setBodyText] = useState('');
  const [intensityPre, setIntensityPre] = useState(6);

  const [spiralText, setSpiralText] = useState('');
  const [voiceRecording, setVoiceRecording] = useState(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState(null);

  const [pathDecision, setPathDecision] = useState(null);
  const [prompts, setPrompts] = useState(null);
  const [answers, setAnswers] = useState(['', '', '']);
  const [promptIndex, setPromptIndex] = useState(0);

  const [closureSighRemaining, setClosureSighRemaining] = useState(null);
  const closureIntervalRef = useRef(null);
  const [bodyLocationPost, setBodyLocationPost] = useState(null);
  const [intensityPost, setIntensityPost] = useState(4);
  const [closureText, setClosureText] = useState('');

  const [anchorRecommended, setAnchorRecommended] = useState(0);
  const [anchorSelected, setAnchorSelected] = useState(null);

  const progress = useMemo(() => {
    const order = [
      STEPS.arrival,
      STEPS.sigh1,
      STEPS.bodyScan,
      STEPS.spiralText,
      STEPS.path,
      STEPS.closureSigh,
      STEPS.closureCheck,
      STEPS.anchor,
    ];
    const idx = order.indexOf(step);
    const pct = Math.round(((Math.max(0, idx) + 1) / order.length) * 100);
    return clamp(pct, 0, 100);
  }, [step]);

  const stopTimer = (ref, setFn) => {
    if (ref.current) {
      clearInterval(ref.current);
      ref.current = null;
    }
    setFn(null);
  };

  const startTimer = (seconds, ref, setFn, onDone) => {
    stopTimer(ref, setFn);
    setFn(seconds);
    ref.current = setInterval(() => {
      setFn((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (ref.current) {
            clearInterval(ref.current);
            ref.current = null;
          }
          onDone?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const syncProgress = async (partial = {}) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    try {
      await api.patch(`/spiral/sessions/${sessionId}/progress`, {
        current_step: step,
        body_location_pre: bodyLocationPre,
        body_location_post: bodyLocationPost,
        intensity_pre: intensityPre,
        intensity_post: intensityPost,
        spiral_text: spiralText?.trim() || null,
        path: pathDecision?.path || null,
        path_confidence: pathDecision?.confidence ?? null,
        path_reasoning: pathDecision?.reasoning || null,
        path_prompts: prompts || null,
        path_answers: answers || null,
        closure_validation: closureText || null,
        anchor_recommended: anchorRecommended,
        anchor_selected: anchorSelected,
        arrival_greeting: greeting || null,
        ...partial,
      });
    } catch {}
  };

  const ensureSession = async () => {
    if (sessionIdRef.current) return true;
    try {
      const res = await api.post('/spiral/sessions', { entry_point: 'home' });
      const id = res.data?.data?.session?.id;
      if (!id) return false;
      sessionIdRef.current = id;
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    startedAtRef.current = Date.now();

    const boot = async () => {
      setLoading(true);
      setSessionError(null);
      const ok = await ensureSession();
      if (!ok) {
        setSessionError("Can't connect to server. Try again.");
        setLoading(false);
        return;
      }

      let greet = '';
      try {
        const res = await api.post('/spiral/arrival-greeting', { session_id: sessionIdRef.current });
        greet = res.data?.data?.greeting_text || '';
      } catch {
        greet = '';
      }

      setGreeting(
        greet ||
          "Your nervous system is on high alert. In 3 minutes, we’ll calm your body first, then untangle the thought."
      );
      setLoading(false);
      await syncProgress({ current_step: STEPS.arrival });
    };

    boot();

    return () => {
      stopTimer(sighIntervalRef, setSighRemaining);
      stopTimer(closureIntervalRef, setClosureSighRemaining);
    };
  }, []);

  useEffect(() => {
    syncProgress({ current_step: step });
  }, [step]);

  const startVoiceRecording = async () => {
    if (voiceBusy) return;
    setVoiceError(null);
    setVoiceBusy(true);

    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm?.granted) {
        setVoiceError('Microphone permission is required for voice capture.');
        setVoiceBusy(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      setVoiceRecording(recording);

      try {
        await Haptics.selectionAsync();
      } catch {}
    } catch {
      setVoiceError('Could not start recording.');
    } finally {
      setVoiceBusy(false);
    }
  };

  const stopVoiceRecordingAndTranscribe = async () => {
    if (voiceBusy) return;
    if (!voiceRecording) return;
    setVoiceError(null);
    setVoiceBusy(true);

    try {
      await voiceRecording.stopAndUnloadAsync();
      const uri = voiceRecording.getURI();
      setVoiceRecording(null);

      if (!uri) {
        setVoiceError('Recording failed.');
        setVoiceBusy(false);
        return;
      }

      const form = new FormData();
      form.append('audio', {
        uri,
        name: 'spiral.m4a',
        type: 'audio/m4a',
      });

      const res = await api.post('/voice/transcribe', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const text = (res.data?.data?.text || '').trim();
      if (!text) {
        setVoiceError('Could not transcribe. You can type instead.');
        return;
      }

      setSpiralText(text);
    } catch {
      setVoiceError('Transcription failed. You can type instead.');
    } finally {
      setVoiceBusy(false);
    }
  };

  const runSigh90 = async () => {
    await syncProgress({ current_step: STEPS.sigh1 });

    startTimer(90, sighIntervalRef, setSighRemaining, async () => {
      setStep(STEPS.bodyScan);
    });
  };

  const runClosureSigh = async () => {
    await syncProgress({ current_step: STEPS.closureSigh });

    startTimer(30, closureIntervalRef, setClosureSighRemaining, async () => {
      setStep(STEPS.closureCheck);
    });
  };

  const chooseBodyLocation = async (loc) => {
    setBodyLocationPre(loc);
    await syncProgress({ body_location_pre: loc });

    let txt = '';
    try {
      const res = await api.post('/spiral/body-scan', {
        session_id: sessionIdRef.current,
        location_tapped: loc,
      });
      txt = res.data?.data?.body_text || '';
    } catch {
      txt = '';
    }

    setBodyText(txt || 'That makes sense. Your body is trying to protect you. It can soften as you breathe.');
  };

  const analyzeSpiral = async () => {
    const text = String(spiralText || '').trim();
    if (!text) {
      setSessionError('Add one sentence so we can work with it.');
      return;
    }

    setSessionError(null);

    await syncProgress({ current_step: STEPS.spiralText, spiral_text: text, intensity_pre: intensityPre });

    let decision = null;
    try {
      const res = await api.post('/spiral/path-decision', {
        session_id: sessionIdRef.current,
        spiral_text: text,
      });
      decision = res.data?.data || null;
    } catch {
      decision = null;
    }

    const safeDecision = decision?.path ? decision : { path: 'CLARITY', confidence: 60, reasoning: '' };
    setPathDecision(safeDecision);

    let p = null;
    try {
      const res = await api.post('/spiral/path-prompts', {
        session_id: sessionIdRef.current,
        path: safeDecision.path,
        spiral_text: text,
      });
      p = res.data?.data?.prompts || null;
    } catch {
      p = null;
    }

    if (!Array.isArray(p) || p.length !== 3) {
      p = [
        'What is the simplest version of this thought loop?',
        'What is one fact you know for sure right now?',
        'What is one next step you can take in the next 10 minutes?',
      ];
    }

    setPrompts(p);
    setAnswers(['', '', '']);
    setPromptIndex(0);

    await syncProgress({
      path: safeDecision.path,
      path_confidence: safeDecision.confidence,
      path_reasoning: safeDecision.reasoning || null,
      path_prompts: p,
      current_step: STEPS.path,
    });

    setStep(STEPS.path);
  };

  const submitPromptAnswer = async () => {
    const nextAnswers = [...answers];
    nextAnswers[promptIndex] = nextAnswers[promptIndex] || '';

    const nextIdx = promptIndex + 1;

    setAnswers(nextAnswers);
    await syncProgress({ path_answers: nextAnswers });

    if (pathDecision?.path === 'CRISIS') {
      setStep(STEPS.anchor);
      return;
    }

    if (nextIdx >= 3) {
      setStep(STEPS.closureSigh);
      runClosureSigh();
      return;
    }

    setPromptIndex(nextIdx);
  };

  const fetchClosureValidation = async () => {
    if (!bodyLocationPost) {
      setSessionError('Pick a body location.');
      return;
    }

    setSessionError(null);

    let txt = '';
    try {
      const res = await api.post('/spiral/closure-validation', {
        session_id: sessionIdRef.current,
        intensity_pre: intensityPre,
        intensity_post: intensityPost,
        path_used: pathDecision?.path || 'CLARITY',
        body_location_before: bodyLocationPre,
        body_location_after: bodyLocationPost,
      });
      txt = res.data?.data?.closure_text || '';
    } catch {
      txt = '';
    }

    setClosureText(txt || 'You stayed with it. That’s the practice.');

    let rec = 0;
    try {
      const res = await api.post('/spiral/anchor-recommendation', {
        session_id: sessionIdRef.current,
        path_used: pathDecision?.path || 'CLARITY',
        intensity_pre: intensityPre,
        intensity_post: intensityPost,
      });
      rec = Number(res.data?.data?.recommended);
      if (![0, 1, 2, 3].includes(rec)) rec = 0;
    } catch {
      rec = 0;
    }

    setAnchorRecommended(rec);

    await syncProgress({
      closure_validation: txt,
      anchor_recommended: rec,
      current_step: STEPS.anchor,
      body_location_post: bodyLocationPost,
      intensity_post: intensityPost,
    });

    setStep(STEPS.anchor);
  };

  const finish = async () => {
    if (anchorSelected === null) {
      setSessionError('Pick one anchor for next time.');
      return;
    }

    setSessionError(null);

    const durationSec = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : null;

    try {
      await api.patch(`/spiral/sessions/${sessionIdRef.current}/end`, {
        current_step: 'done',
        body_location_post: bodyLocationPost,
        intensity_post: intensityPost,
        anchor_selected: anchorSelected,
        duration_sec: durationSec,
      });
    } catch {}

    navigation.goBack();
  };

  const renderProgress = () => {
    return (
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}%</Text>
      </View>
    );
  };

  const renderHeaderRow = () => {
    return (
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerChip}>
          <Text style={styles.headerChipText}>Exit</Text>
        </Pressable>
      </View>
    );
  };

  const renderArrival = () => {
    return (
      <Screen>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>{greeting || '...'}</Title>
        <Body style={{ marginTop: 10, marginBottom: 14 }}>
          In 3 minutes: calm your body, understand the spiral, get one clear next step.
        </Body>
        <Body style={{ marginBottom: 22, color: COLORS.muted }}>
          Put both feet flat on the floor. Feel them touching the ground.
        </Body>
        {!!sessionError && <Body style={{ marginBottom: 10, color: '#F9E66A' }}>{sessionError}</Body>}
        <PrimaryButton
          label={loading ? 'Loading…' : "I'm ready"}
          disabled={loading}
          onPress={async () => {
            setStep(STEPS.sigh1);
            runSigh90();
          }}
        />
      </Screen>
    );
  };

  const breatheCueFor = (remaining, total) => {
    const elapsed = total - remaining;
    const phase = elapsed % 6;
    if (phase === 0 || phase === 1) return 'In';
    if (phase === 2) return 'In again';
    return 'Out slow';
  };

  const renderSigh = () => {
    const remaining = sighRemaining ?? 90;
    const cue = breatheCueFor(remaining, 90);

    return (
      <Screen center>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Physiological sigh</Title>
        <Body style={{ marginTop: 8, marginBottom: 18, color: COLORS.muted }}>
          Two quick inhales, one long exhale.
        </Body>

        <View style={styles.sighCard}>
          <Text style={styles.sighCue}>{cue}</Text>
          <Text style={styles.sighTimer}>{formatSeconds(remaining)}</Text>
        </View>

        <SecondaryButton
          label="Skip"
          onPress={() => {
            stopTimer(sighIntervalRef, setSighRemaining);
            setStep(STEPS.bodyScan);
          }}
        />
      </Screen>
    );
  };

  const renderBodyScan = () => {
    return (
      <Screen>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Where do you feel it?</Title>
        <Body style={{ marginTop: 10, marginBottom: 14, color: COLORS.muted }}>
          Tap one location.
        </Body>

        <View style={styles.grid}>
          {BODY_LOCATIONS.map((b) => {
            const selected = bodyLocationPre === b.id;
            return (
              <Pressable
                key={b.id}
                onPress={() => chooseBodyLocation(b.id)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{b.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {!!bodyText && <Body style={{ marginTop: 14, marginBottom: 18 }}>{bodyText}</Body>}

        <Subtitle style={{ marginTop: 4 }}>Intensity</Subtitle>
        <Text style={styles.intensityValue}>{intensityPre}</Text>
        <Slider
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={intensityPre}
          onValueChange={(v) => setIntensityPre(v)}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor={COLORS.primary}
        />

        {!!sessionError && <Body style={{ marginBottom: 10, color: '#F9E66A' }}>{sessionError}</Body>}
        <PrimaryButton
          label="Continue"
          disabled={!bodyLocationPre}
          onPress={async () => {
            await syncProgress({ current_step: STEPS.bodyScan, intensity_pre: intensityPre });
            setStep(STEPS.spiralText);
          }}
        />
      </Screen>
    );
  };

  const renderSpiralText = () => {
    return (
      <Screen scrollable>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>What’s the thought loop?</Title>
        <Body style={{ marginTop: 10, marginBottom: 10, color: COLORS.muted }}>
          Don’t make it perfect. The sentence that keeps replaying.
        </Body>

        <TextInput
          value={spiralText}
          onChangeText={setSpiralText}
          placeholder="Type it here…"
          placeholderTextColor="rgba(248,249,250,0.35)"
          multiline
          style={styles.textArea}
        />

        {!!voiceError && <Body style={{ marginTop: 10, color: '#F9E66A' }}>{voiceError}</Body>}

        <View style={{ marginTop: 12 }}>
          {!voiceRecording ? (
            <SecondaryButton label={voiceBusy ? '…' : 'Hold to speak'} onPress={startVoiceRecording} />
          ) : (
            <SecondaryButton label={voiceBusy ? '…' : 'Stop recording'} onPress={stopVoiceRecordingAndTranscribe} />
          )}
        </View>

        {!!sessionError && <Body style={{ marginTop: 10, color: '#F9E66A' }}>{sessionError}</Body>}

        <PrimaryButton label="Continue" onPress={analyzeSpiral} />
      </Screen>
    );
  };

  const renderPath = () => {
    const path = pathDecision?.path || 'CLARITY';
    const isReframe = path === 'REFRAME';

    const title =
      path === 'REFRAME'
        ? "Let’s reality-test this."
        : path === 'COMPASSION'
          ? 'Let’s soften the self-attack.'
          : path === 'ACT'
            ? 'Let’s find one tiny next step.'
            : path === 'PARK'
              ? 'Let’s park this loop for now.'
              : path === 'CRISIS'
                ? 'This sounds like a crisis.'
                : 'Let’s get clarity.';

    const currentPrompt = prompts?.[promptIndex] || '';

    const displayPrompt =
      isReframe && promptIndex === 2
        ? "Now write a version that’s more accurate but still honest — not ‘everything’s fine,’ just less extreme."
        : currentPrompt;

    return (
      <Screen scrollable>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>{title}</Title>
        {!!pathDecision?.reasoning && (
          <Body style={{ marginTop: 8, marginBottom: 8, color: COLORS.muted }}>{pathDecision.reasoning}</Body>
        )}

        <Subtitle style={{ marginTop: 10, marginBottom: 8 }}>{displayPrompt}</Subtitle>

        {path === 'CRISIS' ? (
          <View style={styles.crisisBox}>
            <Body style={{ marginBottom: 10 }}>
              If you might hurt yourself or someone else, stop and get immediate support.
            </Body>
            <Body style={{ color: COLORS.muted }}>
              Call local emergency services or contact a trusted person right now.
            </Body>
          </View>
        ) : (
          <TextInput
            value={answers[promptIndex]}
            onChangeText={(t) => {
              const next = [...answers];
              next[promptIndex] = t;
              setAnswers(next);
            }}
            placeholder="Write a few words…"
            placeholderTextColor="rgba(248,249,250,0.35)"
            multiline
            style={styles.textArea}
          />
        )}

        <PrimaryButton
          label={promptIndex === 2 ? 'Continue' : 'Next'}
          onPress={submitPromptAnswer}
        />
      </Screen>
    );
  };

  const renderClosureSigh = () => {
    const remaining = closureSighRemaining ?? 30;
    const cue = breatheCueFor(remaining, 30);

    return (
      <Screen center>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Closing breaths</Title>
        <Body style={{ marginTop: 8, marginBottom: 18, color: COLORS.muted }}>Three cycles.</Body>

        <View style={styles.sighCard}>
          <Text style={styles.sighCue}>{cue}</Text>
          <Text style={styles.sighTimer}>{formatSeconds(remaining)}</Text>
        </View>

        <SecondaryButton
          label="Skip"
          onPress={() => {
            stopTimer(closureIntervalRef, setClosureSighRemaining);
            setStep(STEPS.closureCheck);
          }}
        />
      </Screen>
    );
  };

  const renderClosureCheck = () => {
    return (
      <Screen>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Check in again</Title>
        <Body style={{ marginTop: 10, marginBottom: 14, color: COLORS.muted }}>
          Tap the main place you feel it now.
        </Body>

        <View style={styles.grid}>
          {BODY_LOCATIONS.map((b) => {
            const selected = bodyLocationPost === b.id;
            return (
              <Pressable
                key={b.id}
                onPress={() => setBodyLocationPost(b.id)}
                style={[styles.pill, selected && styles.pillSelected]}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{b.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Subtitle style={{ marginTop: 4 }}>Intensity</Subtitle>
        <Text style={styles.intensityValue}>{intensityPost}</Text>
        <Slider
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={intensityPost}
          onValueChange={(v) => setIntensityPost(v)}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor={COLORS.primary}
        />

        {!!sessionError && <Body style={{ marginTop: 10, color: '#F9E66A' }}>{sessionError}</Body>}

        <PrimaryButton label="Continue" onPress={fetchClosureValidation} />
      </Screen>
    );
  };

  const renderAnchor = () => {
    return (
      <Screen scrollable>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Next time this spiral starts, what will you do first?</Title>
        {!!closureText && <Body style={{ marginTop: 10, marginBottom: 18 }}>{closureText}</Body>}

        <View style={styles.anchorList}>
          {ANCHORS.map((label, idx) => {
            const isRec = idx === anchorRecommended;
            const selected = idx === anchorSelected;
            return (
              <Pressable
                key={label}
                onPress={() => {
                  setAnchorSelected(idx);
                  syncProgress({ anchor_selected: idx });
                }}
                style={[
                  styles.anchorItem,
                  isRec && styles.anchorItemRec,
                  selected && styles.anchorItemSelected,
                ]}
              >
                <Text style={styles.anchorLabel}>{label}</Text>
                {isRec && <Text style={styles.anchorRecTag}>Suggested</Text>}
              </Pressable>
            );
          })}
        </View>

        {!!sessionError && <Body style={{ marginTop: 10, color: '#F9E66A' }}>{sessionError}</Body>}

        <PrimaryButton label="Finish" onPress={finish} />
      </Screen>
    );
  };

  if (step === STEPS.arrival) return renderArrival();
  if (step === STEPS.sigh1) return renderSigh();
  if (step === STEPS.bodyScan) return renderBodyScan();
  if (step === STEPS.spiralText) return renderSpiralText();
  if (step === STEPS.path) return renderPath();
  if (step === STEPS.closureSigh) return renderClosureSigh();
  if (step === STEPS.closureCheck) return renderClosureCheck();
  return renderAnchor();
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248,249,250,0.12)',
    backgroundColor: 'rgba(21,34,56,0.55)',
  },
  headerChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  progressWrap: {
    marginBottom: 18,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(248,249,250,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.primary,
  },
  progressText: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'right',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(21,34,56,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(248,249,250,0.12)',
  },
  pillSelected: {
    borderColor: 'rgba(42,157,143,0.9)',
    backgroundColor: 'rgba(42,157,143,0.12)',
  },
  pillText: {
    color: 'rgba(248,249,250,0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: COLORS.text,
  },
  intensityValue: {
    fontSize: 42,
    color: COLORS.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  textArea: {
    backgroundColor: 'rgba(21,34,56,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(248,249,250,0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 120,
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 22,
  },
  sighCard: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(21,34,56,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(248,249,250,0.12)',
    alignItems: 'center',
  },
  sighCue: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  sighTimer: {
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  crisisBox: {
    marginTop: 10,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(231,111,81,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(231,111,81,0.35)',
  },
  anchorList: {
    marginTop: 10,
    gap: 10,
  },
  anchorItem: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(21,34,56,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(248,249,250,0.12)',
  },
  anchorItemRec: {
    borderColor: 'rgba(42,157,143,0.6)',
  },
  anchorItemSelected: {
    backgroundColor: 'rgba(42,157,143,0.14)',
    borderColor: 'rgba(42,157,143,0.95)',
  },
  anchorLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  anchorRecTag: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});
