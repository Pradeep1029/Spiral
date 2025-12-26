import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Screen from '../components/Screen';
import { Title, Subtitle, Body } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import api from '../services/api';

const STEPS = {
  resumePrompt: 'resumePrompt',
  prime: 'prime',
  intensity: 'intensity',
  regulate: 'regulate',
  regulateCheck: 'regulateCheck',
  capture: 'capture',
  cbt: 'cbt',
  closure: 'closure',
  summary: 'summary',
};

const DRAFT_KEY = 'reset_session_draft_v3';

const OBJECTS = {
  breathing_orb: 'breathing_orb',
  grounding_tap: 'grounding_tap',
  hum_hold: 'hum_hold',
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

function fallbackObjectFor(objectId) {
  if (objectId === OBJECTS.breathing_orb) return OBJECTS.grounding_tap;
  if (objectId === OBJECTS.grounding_tap) return OBJECTS.hum_hold;
  return OBJECTS.grounding_tap;
}

export default function ResetSessionScreen({ navigation }) {
  const startedAtRef = useRef(null);
  const sessionIdRef = useRef(null);

  const eventsRef = useRef([]);
  const pendingEventsRef = useRef([]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [resumeStep, setResumeStep] = useState(null);

  const [sessionError, setSessionError] = useState(null);

  const [step, setStep] = useState(STEPS.prime);
  const [quickFinish, setQuickFinish] = useState(false);
  const [intensityPre, setIntensityPre] = useState(7);

  const [plan, setPlan] = useState(null);
  const [objectId, setObjectId] = useState(OBJECTS.breathing_orb);

  const [spiralText, setSpiralText] = useState('');
  const [voiceRecording, setVoiceRecording] = useState(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [cbtIndex, setCbtIndex] = useState(0);
  const [cbtAnswers, setCbtAnswers] = useState({});

  const [timerRemaining, setTimerRemaining] = useState(null);
  const timerInterval = useRef(null);

  const [intensityMid, setIntensityMid] = useState(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  const [closureMiniTimer, setClosureMiniTimer] = useState(null);
  const closureTimerInterval = useRef(null);

  const [actionDone, setActionDone] = useState(null);
  const [intensityPost, setIntensityPost] = useState(5);
  const [confidencePost, setConfidencePost] = useState(6);

  const [summaryWhatHelped, setSummaryWhatHelped] = useState([]);
  const [summaryNextLine, setSummaryNextLine] = useState('');
  const [summaryTimer, setSummaryTimer] = useState(null);
  const summaryTimerInterval = useRef(null);

  const orbScale = useRef(new Animated.Value(1)).current;
  const humming = useRef(false);
  const humInterval = useRef(null);

  const stepsTotal = useMemo(() => {
    // prime, intensity, regulate, capture, cbt, closure, summary
    return 7;
  }, []);

  const currentStepIndex = useMemo(() => {
    if (step === STEPS.prime) return 0;
    if (step === STEPS.intensity) return 1;
    if (step === STEPS.regulate || step === STEPS.regulateCheck) return 2;
    if (step === STEPS.capture) return 3;
    if (step === STEPS.cbt) return 4;
    if (step === STEPS.closure) return 5;
    if (step === STEPS.summary) return 6;
    return 0;
  }, [step]);

  const progressPct = useMemo(() => {
    return Math.round(((currentStepIndex + 1) / stepsTotal) * 100);
  }, [currentStepIndex, stepsTotal]);

  const stepsLeftLabel = useMemo(() => {
    const left = Math.max(0, stepsTotal - (currentStepIndex + 1));
    if (left === 1) return '1 step left';
    return `${left} steps left`;
  }, [currentStepIndex, stepsTotal]);

  const logEvent = (type, data = {}) => {
    const evt = { type, ts: Date.now(), data };
    eventsRef.current.push(evt);
    pendingEventsRef.current.push(evt);
  };

  const getDurationSec = () => {
    const startedAt = startedAtRef.current;
    if (!startedAt) return null;
    return Math.round((Date.now() - startedAt) / 1000);
  };

  const syncProgress = async (partial = {}) => {
    if (!sessionIdRef.current) return;

    const events = pendingEventsRef.current.splice(0, pendingEventsRef.current.length);

    try {
      await api.patch(`/reset/sessions/${sessionIdRef.current}/progress`, {
        intensity_pre: intensityPre,
        intensity_mid: intensityMid,
        intensity_post: intensityPost,
        confidence_post: confidencePost,
        action_done: actionDone,
        duration_sec: getDurationSec(),
        object: objectId,
        fallback_used: fallbackUsed,
        spiral_text: spiralText?.trim() || null,
        quick_finish: quickFinish,
        path: plan?.path || null,
        label: plan?.label || null,
        distortion: plan?.distortion || null,
        steps: plan?.steps || null,
        cbt_answers: cbtAnswers,
        closure_line: plan?.closure_line || null,
        current_step: step,
        summary_what_helped: summaryWhatHelped,
        summary_next_line: summaryNextLine?.trim() || null,
        summary_skipped: false,
        events,
        ...partial,
      });
    } catch (e) {
      // If progress sync fails, push events back so we don't lose them.
      if (events.length) pendingEventsRef.current.unshift(...events);
    }
  };

  const ensureSession = async ({ quick }) => {
    if (sessionIdRef.current) return true;
    try {
      const created = await api.post('/reset/sessions', {
        emotion: 'worry',
        intensity_pre: null,
        quick_finish: !!quick,
        current_step: STEPS.prime,
        events: pendingEventsRef.current.splice(0, pendingEventsRef.current.length),
      });
      const id = created.data?.data?.session?.id;
      if (id) sessionIdRef.current = id;
      return !!id;
    } catch {
      return false;
    }
  };

  const saveDraft = async (nextStep) => {
    try {
      const draft = {
        step: nextStep,
        quickFinish,
        startedAt: startedAtRef.current,
        sessionId: sessionIdRef.current,
        intensityPre,
        intensityMid,
        fallbackUsed,
        objectId,
        spiralText,
        plan,
        cbtIndex,
        cbtAnswers,
        actionDone,
        intensityPost,
        confidencePost,
        events: eventsRef.current,
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch {}
  };

  const resetTimer = (durationSec) => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    if (!durationSec) {
      setTimerRemaining(null);
      return;
    }

    setTimerRemaining(durationSec);
    timerInterval.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (humInterval.current) clearInterval(humInterval.current);
      if (closureTimerInterval.current) clearInterval(closureTimerInterval.current);
      if (summaryTimerInterval.current) clearInterval(summaryTimerInterval.current);
    };
  }, []);

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
      logEvent('voice_recording_started');
    } catch (e) {
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

      logEvent('voice_recording_stopped');

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
      logEvent('spiral_text_captured', {
        length: text.length,
        voice_or_text: 'voice',
      });
    } catch (e) {
      setVoiceError('Transcription failed. You can type instead.');
    } finally {
      setVoiceBusy(false);
    }
  };

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) {
          setDraftLoaded(true);
          return;
        }

        const draft = JSON.parse(raw);
        if (!draft || !draft.step) {
          setDraftLoaded(true);
          return;
        }

        setResumeStep(draft.step);

        startedAtRef.current = draft.startedAt || null;
        sessionIdRef.current = draft.sessionId || null;
        eventsRef.current = Array.isArray(draft.events) ? draft.events : [];

        setQuickFinish(!!draft.quickFinish);
        setIntensityPre(draft.intensityPre ?? 7);
        setIntensityMid(draft.intensityMid ?? null);
        setFallbackUsed(!!draft.fallbackUsed);
        setObjectId(draft.objectId || OBJECTS.breathing_orb);
        setSpiralText(draft.spiralText || '');
        setPlan(draft.plan || null);
        setCbtIndex(draft.cbtIndex ?? 0);
        setCbtAnswers(draft.cbtAnswers || {});
        setActionDone(draft.actionDone ?? null);
        setIntensityPost(draft.intensityPost ?? 5);
        setConfidencePost(draft.confidencePost ?? 6);

        setStep(STEPS.resumePrompt);
      } catch {
        // Ignore corrupt drafts
      } finally {
        setDraftLoaded(true);
      }
    };

    loadDraft();
  }, []);

  useEffect(() => {
    if (step !== STEPS.regulate && step !== STEPS.cbt) {
      resetTimer(null);
    }

    if (step === STEPS.regulate) {
      const seconds = quickFinish
        ? objectId === OBJECTS.breathing_orb
          ? 60
          : 55
        : objectId === OBJECTS.breathing_orb
          ? 75
          : 70;
      resetTimer(seconds);
    }

    if (step === STEPS.cbt) {
      const current = plan?.steps?.[cbtIndex];
      if (current?.type === 'timer_action') {
        resetTimer(quickFinish ? 60 : Number(current.seconds || 120));
      }
    }
  }, [step, objectId, plan, cbtIndex, quickFinish]);

  useEffect(() => {
    if (!draftLoaded) return;
    saveDraft(step);
  }, [draftLoaded, step, quickFinish, intensityPre, intensityMid, fallbackUsed, objectId, spiralText, plan, cbtIndex, cbtAnswers, actionDone, intensityPost, confidencePost]);

  useEffect(() => {
    if (!draftLoaded) return;
    syncProgress({ current_step: step });
  }, [draftLoaded, step]);

  useEffect(() => {
    if (objectId === OBJECTS.breathing_orb && step === STEPS.regulate) {
      const breatheIn = Animated.timing(orbScale, {
        toValue: 1.25,
        duration: 4200,
        useNativeDriver: true,
      });
      const breatheOut = Animated.timing(orbScale, {
        toValue: 0.9,
        duration: 6200,
        useNativeDriver: true,
      });
      const loop = Animated.loop(Animated.sequence([breatheIn, breatheOut]));
      loop.start();
      return () => loop.stop();
    }
  }, [objectId, step, orbScale]);

  const startHum = async () => {
    if (humming.current) return;
    humming.current = true;
    if (humInterval.current) clearInterval(humInterval.current);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    humInterval.current = setInterval(() => {
      if (!humming.current) return;
      Haptics.selectionAsync().catch(() => {});
    }, 900);
  };

  const stopHum = async () => {
    humming.current = false;
    if (humInterval.current) {
      clearInterval(humInterval.current);
      humInterval.current = null;
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const startPrime = async ({ quick }) => {
    setQuickFinish(!!quick);
    startedAtRef.current = Date.now();
    eventsRef.current = [];
    pendingEventsRef.current = [];
    sessionIdRef.current = null;
    setSessionError(null);
    logEvent('prime_shown');
    if (quick) logEvent('quick_finish_selected');
    logEvent('commit_tapped', { quick: !!quick });

    const ok = await ensureSession({ quick: !!quick });
    if (!ok) {
      setSessionError('Can\'t connect to server. Try again.');
      return;
    }

    await syncProgress({ current_step: STEPS.intensity, quick_finish: !!quick });
    setStep(STEPS.intensity);
  };

  useEffect(() => {
    if (step === STEPS.regulate && timerRemaining === 0) {
      if (intensityMid === null) setIntensityMid(clamp(intensityPre, 0, 10));
      logEvent('regulation_done', { mode: objectId });
      setStep(STEPS.regulateCheck);
    }
  }, [step, timerRemaining, intensityPre, intensityMid, objectId]);

  const confirmRegulationCheck = () => {
    const mid = intensityMid === null ? intensityPre : intensityMid;
    const improvement = intensityPre - mid;

    if (!fallbackUsed && improvement < 1) {
      const nextObject = fallbackObjectFor(objectId);
      setFallbackUsed(true);
      setObjectId(nextObject);
      logEvent('regulation_started', { mode: nextObject, fallback: true });
      setStep(STEPS.regulate);
      return;
    }

    setStep(STEPS.capture);
  };

  useEffect(() => {
    if (step === STEPS.cbt && timerRemaining === 0) {
      const current = plan?.steps?.[cbtIndex];
      if (current?.type === 'timer_action') {
        if (actionDone === null) setActionDone(false);
        setStep(STEPS.closure);
      }
    }
  }, [step, timerRemaining, actionDone, plan, cbtIndex]);

  const fetchPlanAndCreateSession = async () => {
    const ok = await ensureSession({ quick: quickFinish });
    if (!ok) {
      setSessionError('Can\'t connect to server. Try again.');
      return;
    }

    const payload = {
      emotion: 'worry',
      intensity_pre: intensityPre,
      intensity_mid: intensityMid,
      spiral_text: spiralText?.trim() || null,
      quick_finish: quickFinish,
    };

    let decided = null;
    try {
      const res = await api.post('/reset/plan', payload);
      decided = res.data?.data || res.data;
    } catch (error) {
      console.error('Failed to fetch AI plan:', error);
      decided = null;
    }

    const safe = {
      object: decided?.object || objectId,
      path: decided?.path || 'REFRAME',
      label: decided?.label || 'Thinking-trap spiral',
      distortion: decided?.distortion || null,
      steps: Array.isArray(decided?.steps) ? decided.steps : [],
      closure_line: decided?.closure_line || "You're back in control of the next step.",
      label_summary: decided?.label_summary || '',
      ai_reasoning: decided?.ai_reasoning || null,
    };

    if (safe.ai_reasoning) {
      logEvent('path_chosen', { 
        path: safe.path, 
        ai_reasoning: safe.ai_reasoning,
        ai_generated: true
      });
    } else {
      logEvent('path_chosen', { 
        path: safe.path,
        ai_generated: false
      });
    }

    setPlan(safe);
    setObjectId(safe.object);
    setCbtIndex(0);
    setCbtAnswers({});
    setActionDone(null);

    await syncProgress({
      intensity_pre: intensityPre,
      intensity_mid: intensityMid,
      object: safe.object,
      path: safe.path,
      label: safe.label,
      distortion: safe.distortion,
      steps: safe.steps,
      closure_line: safe.closure_line,
      current_step: STEPS.cbt,
      ai_reasoning: safe.ai_reasoning,
      ai_generated: !!safe.ai_reasoning,
    });
  };

  const finish = async ({ summarySkipped }) => {
    const durationSec = getDurationSec();
    const events = pendingEventsRef.current.splice(0, pendingEventsRef.current.length);

    try {
      if (sessionIdRef.current) {
        await api.patch(`/reset/sessions/${sessionIdRef.current}/end`, {
          intensity_mid: intensityMid,
          intensity_post: intensityPost,
          confidence_post: confidencePost,
          action_done: actionDone === true,
          duration_sec: durationSec,
          object: objectId,
          fallback_used: fallbackUsed,
          spiral_text: spiralText?.trim() || null,
          quick_finish: quickFinish,
          path: plan?.path || null,
          label: plan?.label || null,
          distortion: plan?.distortion || null,
          steps: plan?.steps || null,
          cbt_answers: cbtAnswers,
          closure_line: plan?.closure_line || null,
          current_step: STEPS.summary,
          dropoff_step: null,
          summary_what_helped: summaryWhatHelped,
          summary_next_line: summaryNextLine?.trim() || null,
          summary_skipped: !!summarySkipped,
          events,
        });
      } else {
        // DB required: if we don't have a session id, surface error.
        setSessionError('Session not saved. Please try again.');
        if (events.length) pendingEventsRef.current.unshift(...events);
        return;
      }
    } catch {}

    await clearDraft();
    navigation.goBack();
  };

  const handleExit = async ({ isCrisis }) => {
    logEvent('exit', { crisis: !!isCrisis });
    if (sessionIdRef.current) {
      await syncProgress({ dropoff_step: step, current_step: step });
    }
    navigation.goBack();
  };

  const renderProgress = () => {
    return (
      <View style={styles.progressWrap}>
        <View style={styles.progressMetaRow}>
          <Text style={styles.progressMetaText}>{stepsLeftLabel}</Text>
          <Text style={styles.progressMetaText}>{progressPct}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>
    );
  };

  const renderHeaderRow = () => {
    return (
      <View style={styles.headerRow}>
        <Pressable onPress={() => handleExit({ isCrisis: false })} style={styles.headerChip}>
          <Text style={styles.headerChipText}>Exit</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            handleExit({ isCrisis: true });
          }}
          style={[styles.headerChip, { opacity: 0.85 }]}
        >
          <Text style={styles.headerChipText}>Crisis</Text>
        </Pressable>
      </View>
    );
  };

  const renderResumePrompt = () => {
    return (
      <Screen>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Finish the last 90 seconds.</Title>
        <Body style={{ marginTop: 10, marginBottom: 18 }}>
          You started a reset session. Want to land the plane?
        </Body>
        <PrimaryButton
          label="Resume"
          onPress={() => {
            logEvent('resume_selected');
            const next = resumeStep && resumeStep !== STEPS.resumePrompt ? resumeStep : STEPS.prime;
            setStep(next);
          }}
        />
        <SecondaryButton
          label="Discard"
          onPress={async () => {
            await clearDraft();
            startedAtRef.current = null;
            sessionIdRef.current = null;
            eventsRef.current = [];
            setPlan(null);
            setSpiralText('');
            setIntensityMid(null);
            setFallbackUsed(false);
            setCbtIndex(0);
            setCbtAnswers({});
            setActionDone(null);
            logEvent('resume_discarded');
            setStep(STEPS.prime);
          }}
        />
      </Screen>
    );
  };

  const renderPrime = () => {
    return (
      <Screen>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Give me 4 minutes.</Title>
        <Body style={{ marginTop: 10, marginBottom: 14 }}>We’ll end with a calm reset.</Body>
        {!!sessionError && <Body style={{ marginBottom: 10, color: '#F9E66A' }}>{sessionError}</Body>}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>If I feel like quitting, then I’ll do the next 20 seconds.</Text>
        </View>
        <View style={{ marginTop: 18 }}>
          <PrimaryButton label="Start (I’m in)" onPress={() => startPrime({ quick: false })} />
          <SecondaryButton label="Quick finish (2 min)" onPress={() => startPrime({ quick: true })} />
        </View>
      </Screen>
    );
  };

  const renderIntensity = () => {
    return (
      <Screen>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>How intense is it?</Title>
        <Body style={{ marginTop: 10, marginBottom: 10 }}>Right now.</Body>
        <Text style={styles.intensityValue}>{intensityPre}</Text>
        <Slider
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={intensityPre}
          onValueChange={(v) => setIntensityPre(v)}
          minimumTrackTintColor="#F9E66A"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#F9E66A"
        />

        <PrimaryButton
          label="Continue"
          onPress={() => {
            logEvent('intensity_pre', { value: intensityPre });
            const suggested = intensityPre >= 8 ? OBJECTS.grounding_tap : OBJECTS.breathing_orb;
            setObjectId(suggested);
            logEvent('regulation_started', { 
              mode: suggested, 
              quick: quickFinish,
              intensity_triggered: intensityPre >= 8
            });
            setStep(STEPS.regulate);
          }}
        />
      </Screen>
    );
  };

  const renderBreathingOrb = () => {
    return (
      <View style={styles.objectBox}>
        <Animated.View style={[styles.orb, { transform: [{ scale: orbScale }] }]} />
        <Body style={{ marginTop: 18, textAlign: 'center' }}>Follow the orb. Exhale a little longer.</Body>
      </View>
    );
  };

  const [tapCount, setTapCount] = useState(0);
  const [tapIndex, setTapIndex] = useState(0);

  useEffect(() => {
    if (step !== STEPS.regulate || objectId !== OBJECTS.grounding_tap) {
      setTapCount(0);
      setTapIndex(0);
    }
  }, [step, objectId]);

  const renderGroundingTap = () => {
    const corners = [0, 1, 2, 3];

    return (
      <View style={styles.objectBox}>
        <View style={styles.tapBoard}>
          {corners.map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                if (c !== tapIndex) return;
                setTapCount((n) => n + 1);
                setTapIndex((i) => (i + 1) % 4);
                Haptics.selectionAsync().catch(() => {});
              }}
              style={[
                styles.tapDot,
                c === 0 && styles.tapDotTL,
                c === 1 && styles.tapDotTR,
                c === 2 && styles.tapDotBR,
                c === 3 && styles.tapDotBL,
                c === tapIndex && styles.tapDotActive,
              ]}
            />
          ))}
        </View>
        <Body style={{ marginTop: 16, textAlign: 'center' }}>Tap the lit corner. Feel your fingers.</Body>
        <Body style={{ marginTop: 8, textAlign: 'center', opacity: 0.8 }}>Taps: {tapCount}</Body>
      </View>
    );
  };

  const renderHumHold = () => {
    return (
      <View style={styles.objectBox}>
        <Pressable
          onPressIn={startHum}
          onPressOut={stopHum}
          style={({ pressed }) => [styles.humButton, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.humText}>Press + hum</Text>
        </Pressable>
        <Body style={{ marginTop: 16, textAlign: 'center' }}>Hum gently. Feel vibration in your chest/throat.</Body>
      </View>
    );
  };

  const renderRegulate = () => {
    const objectTitle = objectId === OBJECTS.breathing_orb ? 'Breathing' : objectId === OBJECTS.grounding_tap ? 'Grounding' : 'Humming';

    return (
      <Screen>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>{objectTitle}</Title>
        <Body style={{ marginTop: 8, marginBottom: 8 }}>Do this with me for one minute.</Body>
        {timerRemaining !== null && <Subtitle style={{ marginTop: 4 }}>About {formatSeconds(timerRemaining)}</Subtitle>}

        {objectId === OBJECTS.breathing_orb && renderBreathingOrb()}
        {objectId === OBJECTS.grounding_tap && renderGroundingTap()}
        {objectId === OBJECTS.hum_hold && renderHumHold()}

        <SecondaryButton
          label="Skip"
          onPress={() => {
            setIntensityMid(intensityPre);
            logEvent('regulation_done', { mode: objectId, skipped: true });
            setStep(STEPS.regulateCheck);
          }}
        />
      </Screen>
    );
  };

  const renderRegulationCheck = () => {
    const mid = intensityMid === null ? intensityPre : intensityMid;

    return (
      <Screen>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Any shift?</Title>
        <Body style={{ marginTop: 10, marginBottom: 10 }}>Intensity now?</Body>
        <Text style={styles.intensityValue}>{mid}</Text>
        <Slider
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={mid}
          onValueChange={(v) => setIntensityMid(v)}
          minimumTrackTintColor="#F9E66A"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#F9E66A"
        />
        <PrimaryButton
          label="Continue"
          onPress={() => {
            logEvent('intensity_mid', { value: intensityMid === null ? intensityPre : intensityMid });
            confirmRegulationCheck();
          }}
        />
        <SecondaryButton
          label="Skip"
          onPress={() => {
            setIntensityMid(null);
            setStep(STEPS.capture);
          }}
        />
      </Screen>
    );
  };

  const renderCapture = () => {
    return (
      <Screen scrollable>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Say it in one sentence.</Title>
        <Body style={{ marginTop: 10, marginBottom: 10 }}>Short. Honest. One line is enough.</Body>

        {!!voiceError && (
          <Body style={{ marginBottom: 10, color: '#F9E66A' }}>{voiceError}</Body>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          {!voiceRecording ? (
            <Pressable
              onPress={startVoiceRecording}
              disabled={voiceBusy}
              style={({ pressed }) => [styles.voiceBtn, pressed && { opacity: 0.85 }, voiceBusy && { opacity: 0.6 }]}
            >
              <Text style={styles.voiceBtnText}>{voiceBusy ? 'Starting…' : 'Hold to talk'}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={stopVoiceRecordingAndTranscribe}
              disabled={voiceBusy}
              style={({ pressed }) => [styles.voiceBtnActive, pressed && { opacity: 0.85 }, voiceBusy && { opacity: 0.6 }]}
            >
              <Text style={styles.voiceBtnText}>{voiceBusy ? 'Transcribing…' : 'Stop + transcribe'}</Text>
            </Pressable>
          )}
        </View>

        <TextInput
          value={spiralText}
          onChangeText={setSpiralText}
          placeholder="One sentence..."
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.textInput}
          multiline
        />

        {!!spiralText.trim() && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>“{spiralText.trim()}”</Text>
          </View>
        )}

        <PrimaryButton
          label="That’s it"
          onPress={async () => {
            logEvent('spiral_text_captured', {
              length: spiralText.trim().length,
              voice_or_text: 'text',
            });

            await fetchPlanAndCreateSession();
            await syncProgress({ current_step: STEPS.cbt });
            setStep(STEPS.cbt);
          }}
        />
        <SecondaryButton
          label="Skip"
          onPress={async () => {
            await fetchPlanAndCreateSession();
            setStep(STEPS.cbt);
          }}
        />
      </Screen>
    );
  };

  const renderCbt = () => {
    const current = plan?.steps?.[cbtIndex];

    if (!plan || !current) {
      return (
        <Screen>
          {renderHeaderRow()}
          {renderProgress()}
          <Title>Loading plan...</Title>
        </Screen>
      );
    }

    if (plan.path === 'CRISIS_ROUTE') {
      return (
        <Screen>
          {renderHeaderRow()}
          {renderProgress()}
          <Title>Get support now.</Title>
          <Body style={{ marginTop: 12, marginBottom: 18 }}>
            If you might hurt yourself or someone else, stop this session and get immediate support from local emergency services or a trusted person right now.
          </Body>
          <PrimaryButton
            label="Exit session"
            onPress={async () => {
              logEvent('crisis_route_exit');
              await clearDraft();
              navigation.goBack();
            }}
          />
        </Screen>
      );
    }

    const title = plan.path === 'SOLVE'
      ? 'Solve'
      : plan.path === 'REFRAME'
        ? 'Reframe'
        : plan.path === 'PARK'
          ? 'Park'
          : plan.path === 'CONNECT'
            ? 'Connect'
            : 'Support';

    const answerKey = `step_${cbtIndex}`;
    const answerValue = cbtAnswers?.[answerKey] ?? '';

    const advance = () => {
      const next = cbtIndex + 1;
      if (next >= plan.steps.length) {
        setStep(STEPS.closure);
      } else {
        setCbtIndex(next);
      }
    };

    const setAnswer = (value) => {
      setCbtAnswers((prev) => ({ ...prev, [answerKey]: value }));
    };

    return (
      <Screen scrollable>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>{title}</Title>
        <Body style={{ marginTop: 8, marginBottom: 8 }}>{plan.label}</Body>
        {!!plan.distortion && <Body style={{ marginBottom: 14, opacity: 0.85 }}>Loop: {plan.distortion}</Body>}

        <Subtitle style={{ marginBottom: 10 }}>{current.text}</Subtitle>

        {current.type === 'choice' && (
          <View style={{ marginBottom: 12 }}>
            {(current.options || []).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  setAnswer(opt);
                  Haptics.selectionAsync().catch(() => {});
                }}
                style={({ pressed }) => [
                  styles.choiceRow,
                  pressed && { opacity: 0.85 },
                  answerValue === opt && styles.choiceRowSelected,
                ]}
              >
                <Text style={styles.choiceRowText}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {current.type === 'prompt' && (
          <TextInput
            value={String(answerValue)}
            onChangeText={setAnswer}
            placeholder="One bullet..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.textInput}
            multiline
          />
        )}

        {current.type === 'action' && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{current.text}</Text>
          </View>
        )}

        {current.type === 'timer_action' && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{current.text}</Text>
            {timerRemaining !== null && (
              <Text style={[styles.noteText, { marginTop: 10, fontSize: 22 }]}>{formatSeconds(timerRemaining)}</Text>
            )}
          </View>
        )}

        <View style={{ marginTop: 18 }}>
          {current.type !== 'timer_action' && current.type !== 'action' && (
            <PrimaryButton
              label="Continue"
              onPress={() => {
                logEvent('cbt_step_completed', { 
                  index: cbtIndex, 
                  type: current.type, 
                  path: plan.path,
                  answer_length: answerValue?.length || 0
                });
                advance();
              }}
            />
          )}

          {current.type === 'action' && (
            <PrimaryButton
              label={current.button || 'Done'}
              onPress={() => {
                logEvent('cbt_action', { 
                  index: cbtIndex, 
                  path: plan.path,
                  button_text: current.button || 'Done'
                });
                advance();
              }}
            />
          )}

          {current.type === 'timer_action' && (
            <>
              <PrimaryButton
                label="I did it"
                onPress={() => {
                  setActionDone(true);
                  logEvent('timer_action_done', { 
                    path: plan.path,
                    timer_duration: current.seconds || 120
                  });
                  setStep(STEPS.closure);
                }}
              />
              <SecondaryButton
                label="Skip"
                onPress={() => {
                  setActionDone(false);
                  logEvent('timer_action_skipped', { 
                    path: plan.path,
                    timer_duration: current.seconds || 120
                  });
                  setStep(STEPS.closure);
                }}
              />
            </>
          )}
        </View>
      </Screen>
    );
  };

  const startClosureMini = () => {
    if (closureTimerInterval.current) {
      clearInterval(closureTimerInterval.current);
      closureTimerInterval.current = null;
    }
    setClosureMiniTimer(quickFinish ? 20 : 30);
    closureTimerInterval.current = setInterval(() => {
      setClosureMiniTimer((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (closureTimerInterval.current) {
            clearInterval(closureTimerInterval.current);
            closureTimerInterval.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const renderClosure = () => {
    const closureLine = plan?.closure_line || 'You’re back in control of the next step.';

    return (
      <Screen>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Close it.</Title>
        <Body style={{ marginTop: 10, marginBottom: 10 }}>{closureLine}</Body>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>3 slow breaths. Feel the exhale.</Text>
          {closureMiniTimer === null ? (
            <Pressable
              onPress={() => {
                logEvent('closure_started');
                startClosureMini();
              }}
              style={({ pressed }) => [styles.humButton, { width: 180, height: 60, borderRadius: 14 }, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.humText}>Start</Text>
            </Pressable>
          ) : (
            <Text style={[styles.noteText, { marginTop: 10, fontSize: 22 }]}>{formatSeconds(closureMiniTimer)}</Text>
          )}
        </View>

        <Body style={{ marginTop: 18, marginBottom: 10 }}>Intensity now?</Body>
        <Text style={styles.intensityValue}>{intensityPost}</Text>
        <Slider
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={intensityPost}
          onValueChange={(v) => setIntensityPost(v)}
          minimumTrackTintColor="#F9E66A"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#F9E66A"
        />

        <Body style={{ marginTop: 14, marginBottom: 10 }}>Confidence to cope?</Body>
        <Text style={styles.intensityValue}>{confidencePost}</Text>
        <Slider
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={confidencePost}
          onValueChange={(v) => setConfidencePost(v)}
          minimumTrackTintColor="#F9E66A"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#F9E66A"
        />

        <PrimaryButton
          label="Finish"
          onPress={async () => {
            logEvent('intensity_post', { value: intensityPost });
            logEvent('confidence_post', { value: confidencePost });
            setStep(STEPS.summary);
          }}
        />
      </Screen>
    );
  };

  const toggleHelped = (key) => {
    setSummaryWhatHelped((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      return [...prev, key];
    });
  };

  useEffect(() => {
    if (step !== STEPS.summary) {
      setSummaryTimer(null);
      if (summaryTimerInterval.current) {
        clearInterval(summaryTimerInterval.current);
        summaryTimerInterval.current = null;
      }
      return;
    }

    setSummaryTimer(10);
    summaryTimerInterval.current = setInterval(() => {
      setSummaryTimer((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (summaryTimerInterval.current) {
            clearInterval(summaryTimerInterval.current);
            summaryTimerInterval.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [step]);

  useEffect(() => {
    if (step === STEPS.summary && summaryTimer === 0) {
      finish({ summarySkipped: true });
    }
  }, [step, summaryTimer]);

  const renderSummary = () => {
    const helpedOptions = [
      { id: 'regulation', label: 'Breathing / grounding' },
      { id: 'spiral_capture', label: 'Putting it into one sentence' },
      { id: 'cbt_core', label: 'The plan (CBT)' },
      { id: 'timer_action', label: 'The 2-minute action' },
      { id: 'closure', label: 'Closing breaths' },
    ];

    return (
      <Screen scrollable>
        {renderHeaderRow()}
        {renderProgress()}
        <Title>Summary</Title>
        <Body style={{ marginTop: 10, marginBottom: 8 }}>
          What helped?
        </Body>

        {helpedOptions.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => toggleHelped(o.id)}
            style={({ pressed }) => [
              styles.choiceRow,
              pressed && { opacity: 0.85 },
              summaryWhatHelped.includes(o.id) && styles.choiceRowSelected,
            ]}
          >
            <Text style={styles.choiceRowText}>{o.label}</Text>
          </Pressable>
        ))}

        <Body style={{ marginTop: 14, marginBottom: 8 }}>What to do next time?</Body>
        <TextInput
          value={summaryNextLine}
          onChangeText={setSummaryNextLine}
          placeholder="One line..."
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.textInput}
          multiline
        />

        <Body style={{ marginTop: 10, opacity: 0.75 }}>Auto-skipping in {summaryTimer ?? 10}s</Body>

        <View style={{ marginTop: 18 }}>
          <PrimaryButton
            label="Done"
            onPress={() => finish({ summarySkipped: false })}
          />
          <SecondaryButton
            label="Skip"
            onPress={() => finish({ summarySkipped: true })}
          />
        </View>
      </Screen>
    );
  };

  if (!draftLoaded) {
    return (
      <Screen>
        {renderHeaderRow()}
        <Title>Loading...</Title>
      </Screen>
    );
  }

  if (step === STEPS.resumePrompt) return renderResumePrompt();
  if (step === STEPS.prime) return renderPrime();
  if (step === STEPS.intensity) return renderIntensity();
  if (step === STEPS.regulate) return renderRegulate();
  if (step === STEPS.regulateCheck) return renderRegulationCheck();
  if (step === STEPS.capture) return renderCapture();
  if (step === STEPS.cbt) return renderCbt();
  if (step === STEPS.closure) return renderClosure();
  if (step === STEPS.summary) return renderSummary();

  return (
    <Screen>
      <Title>Reset session</Title>
      <PrimaryButton label="Done" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressWrap: {
    marginBottom: 14,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressMetaText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(249, 230, 106, 0.85)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerChipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  choiceRow: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  choiceRowSelected: {
    backgroundColor: 'rgba(249, 230, 106, 0.14)',
    borderColor: 'rgba(249, 230, 106, 0.6)',
  },
  choiceRowText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  intensityValue: {
    fontSize: 44,
    fontWeight: '700',
    color: '#F9E66A',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
  },
  objectBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  orb: {
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(249, 230, 106, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(249, 230, 106, 0.55)',
    shadowColor: '#F9E66A',
    shadowOpacity: 0.25,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  tapBoard: {
    width: 240,
    height: 240,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tapDot: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  tapDotActive: {
    backgroundColor: 'rgba(249, 230, 106, 0.22)',
    borderColor: 'rgba(249, 230, 106, 0.8)',
  },
  tapDotTL: { top: 16, left: 16 },
  tapDotTR: { top: 16, right: 16 },
  tapDotBR: { bottom: 16, right: 16 },
  tapDotBL: { bottom: 16, left: 16 },
  humButton: {
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  humText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  noteBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  noteText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '600',
  },
  voiceBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnActive: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 230, 106, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 230, 106, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
