import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import Screen from '../components/Screen';
import { Title, Subtitle, Body, Guidance, Context } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import api from '../services/api';

const COLORS = {
  bg: '#0B1016',
  surface: '#161C24',
  primary: '#2A9D8F',
  terracotta: '#E76F51',
  text: '#FFFFFF',
  guidance: 'rgba(248,249,250,0.9)',
  muted: 'rgba(248,249,250,0.55)',
  faint: 'rgba(248,249,250,0.15)',
  inputBg: 'rgba(255,255,255,0.03)',
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
  microCheck: 'microCheck',
  compassionPause: 'compassionPause',
  closureSigh: 'closureSigh',
  closureCheck: 'closureCheck',
  anchor: 'anchor',
  completion: 'completion',
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

function countWords(text) {
  const t = String(text || '').trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function getPhaseMeta(step) {
  if (step === STEPS.sigh1 || step === STEPS.bodyScan) {
    return { label: 'Body work', time: 'About 2 min left' };
  }

  if (step === STEPS.spiralText || step === STEPS.path) {
    return { label: 'Thinking part', time: 'About 1 min left' };
  }

  if (step === STEPS.closureSigh || step === STEPS.closureCheck || step === STEPS.anchor) {
    return { label: 'Almost done', time: 'About 30 sec left' };
  }

  return { label: 'Start', time: 'About 3 min' };
}

function safeImpact(kind) {
  try {
    if (kind === 'light') return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (kind === 'medium') return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (kind === 'heavy') return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
  return null;
}

export default function SpiralFlowScreen({ navigation }) {
  const startedAtRef = useRef(null);
  const sessionIdRef = useRef(null);

  const [step, setStep] = useState(STEPS.arrival);
  const [reduceMotion, setReduceMotion] = useState(false);
  const transitionOpacity = useRef(new Animated.Value(1)).current;
  const transitioningRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  const [greeting, setGreeting] = useState('');

  const [sighRemaining, setSighRemaining] = useState(null);
  const sighIntervalRef = useRef(null);

  const breathAnim = useRef(new Animated.Value(0.18)).current;
  const breathSeqCancelRef = useRef({ cancelled: false });
  const [breathCue, setBreathCue] = useState('');

  const [microCheckRemaining, setMicroCheckRemaining] = useState(null);
  const microCheckIntervalRef = useRef(null);
  const [microCheckText, setMicroCheckText] = useState('');
  const [microCheckLine2, setMicroCheckLine2] = useState('');
  const microCheckTextTimersRef = useRef([]);
  const microCheckGlowChest = useRef(new Animated.Value(0)).current;
  const microCheckGlowBelly = useRef(new Animated.Value(0)).current;
  const microCheckGlowBoth = useRef(new Animated.Value(0)).current;
  const microCheckBreath = useRef(new Animated.Value(0)).current;
  const microCheckPulse = useRef(null);

  const [compassionRemaining, setCompassionRemaining] = useState(null);
  const compassionIntervalRef = useRef(null);
  const compassionPulse = useRef(null);
  const compassionChest = useRef(new Animated.Value(0)).current;
  const compassionDoneRef = useRef(false);

  const [bodyLocationPre, setBodyLocationPre] = useState(null);
  const [bodyText, setBodyText] = useState('');
  const [intensityPre, setIntensityPre] = useState(6);

  const [spiralText, setSpiralText] = useState('');
  const [spiralPlaceholder, setSpiralPlaceholder] = useState("Example: I'm going to fail this presentation");
  const [spiralFocused, setSpiralFocused] = useState(false);
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

  const [completionPhase, setCompletionPhase] = useState(1);

  const phaseMeta = useMemo(() => getPhaseMeta(step), [step]);

  const stopTimer = (ref, setFn) => {
    if (ref.current) {
      clearInterval(ref.current);
      ref.current = null;
    }
    setFn(null);
  };

  const renderCompassionPause = () => {
    return (
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen center>
          {renderHeaderRow()}
          <Guidance style={{ marginTop: 16, textAlign: 'center' }}>
            Hand on heart.
          </Guidance>
          <Guidance style={{ marginTop: 10, textAlign: 'center' }}>
            Say the kind version to yourself.
          </Guidance>

          <View style={styles.torsoWrap}>
            <View style={styles.torsoOutline}>
              <Animated.View pointerEvents="none" style={[styles.torsoGlowChest, { opacity: compassionChest }]} />
            </View>
          </View>
        </Screen>
      </Animated.View>
    );
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

    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => setReduceMotion(!!v))
      .catch(() => setReduceMotion(false));

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
      stopTimer(microCheckIntervalRef, setMicroCheckRemaining);
      stopTimer(compassionIntervalRef, setCompassionRemaining);
      if (microCheckTextTimersRef.current?.length) {
        microCheckTextTimersRef.current.forEach((t) => clearTimeout(t));
        microCheckTextTimersRef.current = [];
      }
      if (microCheckPulse.current) {
        try {
          microCheckPulse.current.stop();
        } catch {}
        microCheckPulse.current = null;
      }
      if (compassionPulse.current) {
        try {
          compassionPulse.current.stop();
        } catch {}
        compassionPulse.current = null;
      }
      breathSeqCancelRef.current.cancelled = true;
    };
  }, []);

  useEffect(() => {
    syncProgress({ current_step: step });
  }, [step]);

  const goToStep = async (nextStep) => {
    if (nextStep === step) return;
    if (transitioningRef.current) {
      setStep(nextStep);
      return;
    }

    if (reduceMotion) {
      setStep(nextStep);
      return;
    }

    transitioningRef.current = true;

    await new Promise((resolve) => {
      Animated.timing(transitionOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => resolve());
    });

    await new Promise((r) => setTimeout(r, 200));

    setStep(nextStep);

    await new Promise((resolve) => {
      Animated.timing(transitionOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => resolve());
    });

    transitioningRef.current = false;
  };

  useEffect(() => {
    const examples = [
      "Example: I'm going to fail this presentation",
      "Example: I can't do anything right",
      "Example: What if they think I'm stupid",
    ];
    let idx = 0;
    const id = setInterval(() => {
      if (spiralFocused) return;
      if (String(spiralText || '').trim()) return;
      idx = (idx + 1) % examples.length;
      setSpiralPlaceholder(examples[idx]);
    }, 4000);
    return () => clearInterval(id);
  }, [spiralFocused, spiralText]);

  const withSliderHaptics = (setter) => {
    const lastRef = { current: null };
    return async (v) => {
      const next = Number(v);
      const prev = lastRef.current;
      lastRef.current = next;
      setter(next);
      if (prev === null || prev === next) return;
      if (next === 0 || next === 10) await safeImpact('heavy');
      else if (next === 5) await safeImpact('medium');
      else await safeImpact('light');
    };
  };

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

  const startBreathSequence = () => {
    breathSeqCancelRef.current = { cancelled: false };
    const token = breathSeqCancelRef.current;

    const run = async () => {
      const animateTo = (toValue, duration) =>
        new Promise((resolve) => {
          if (token.cancelled) return resolve();
          Animated.timing(breathAnim, {
            toValue,
            duration,
            useNativeDriver: false,
          }).start(() => resolve());
        });

      const phase1End = Date.now() + 20000;
      while (!token.cancelled && Date.now() < phase1End) {
        setBreathCue('In');
        await animateTo(0.92, 3000);
        setBreathCue('Out');
        await animateTo(0.18, 3000);
      }

      const phase2End = Date.now() + 30000;
      while (!token.cancelled && Date.now() < phase2End) {
        setBreathCue('In');
        await animateTo(0.92, 3500);
        setBreathCue('Out');
        await animateTo(0.18, 4500);
      }

      const phase3End = Date.now() + 40000;
      while (!token.cancelled && Date.now() < phase3End) {
        setBreathCue('In');
        await animateTo(0.78, 2000);
        setBreathCue('Top up');
        await animateTo(0.92, 1000);
        setBreathCue('Out');
        await animateTo(0.18, 8000);
        setBreathCue('Pause');
        await animateTo(0.18, 2000);
      }

      setBreathCue('');
    };

    run();
  };

  const runSigh90 = async () => {
    await syncProgress({ current_step: STEPS.sigh1 });

    startBreathSequence();

    startTimer(90, sighIntervalRef, setSighRemaining, async () => {
      breathSeqCancelRef.current.cancelled = true;
      goToStep(STEPS.bodyScan);
    });
  };

  const runClosureSigh = async () => {
    await syncProgress({ current_step: STEPS.closureSigh });

    startTimer(30, closureIntervalRef, setClosureSighRemaining, async () => {
      goToStep(STEPS.closureCheck);
    });
  };

  const runMicroCheck = async ({ seconds, text, nextStep }) => {
    await syncProgress({ current_step: STEPS.microCheck });

    setMicroCheckText(text);
    setMicroCheckLine2('');

    if (microCheckTextTimersRef.current?.length) {
      microCheckTextTimersRef.current.forEach((t) => clearTimeout(t));
      microCheckTextTimersRef.current = [];
    }

    try {
      await safeImpact('light');
    } catch {}

    microCheckGlowChest.setValue(0);
    microCheckGlowBelly.setValue(0);
    microCheckGlowBoth.setValue(0);
    microCheckBreath.setValue(0);

    if (reduceMotion) {
      setMicroCheckLine2('Feel your feet on the floor.');
      microCheckTextTimersRef.current = [
        setTimeout(() => {
          setMicroCheckLine2('One slow breath with me.');
        }, 2000),
      ];

      stopTimer(microCheckIntervalRef, setMicroCheckRemaining);
      startTimer(seconds, microCheckIntervalRef, setMicroCheckRemaining, async () => {
        try {
          await safeImpact('medium');
        } catch {}
        goToStep(nextStep);
      });
      return;
    }

    Animated.sequence([
      Animated.timing(microCheckGlowChest, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1700),
      Animated.timing(microCheckGlowChest, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(microCheckGlowBelly, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1700),
      Animated.timing(microCheckGlowBelly, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(microCheckGlowBoth, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    microCheckPulse.current = Animated.loop(
      Animated.sequence([
        Animated.timing(microCheckGlowBoth, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(microCheckGlowBoth, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ]),
      { iterations: 5 }
    );
    microCheckPulse.current.start();

    Animated.sequence([
      Animated.delay(4000),
      Animated.timing(microCheckBreath, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(microCheckBreath, { toValue: 0, duration: 5000, useNativeDriver: true }),
    ]).start();

    microCheckTextTimersRef.current = [
      setTimeout(() => {
        setMicroCheckLine2('Feel your feet on the floor.');
      }, 2000),
      setTimeout(() => {
        setMicroCheckLine2('One slow breath with me.');
      }, 4000),
    ];

    stopTimer(microCheckIntervalRef, setMicroCheckRemaining);
    startTimer(seconds, microCheckIntervalRef, setMicroCheckRemaining, async () => {
      try {
        await safeImpact('medium');
      } catch {}
      goToStep(nextStep);
    });
  };

  const runCompassionPause = async () => {
    await syncProgress({ current_step: STEPS.compassionPause });

    try {
      await safeImpact('light');
    } catch {}

    compassionChest.setValue(0);

    if (!reduceMotion) {
      compassionPulse.current = Animated.loop(
        Animated.sequence([
          Animated.timing(compassionChest, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(compassionChest, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        ]),
        { iterations: 6 }
      );
      compassionPulse.current.start();
    } else {
      compassionChest.setValue(0.5);
    }

    stopTimer(compassionIntervalRef, setCompassionRemaining);
    startTimer(10, compassionIntervalRef, setCompassionRemaining, async () => {
      try {
        await safeImpact('medium');
      } catch {}

      const next = [...answers];
      next[1] = next[1] || 'Hand on heart (10s)';
      setAnswers(next);
      await syncProgress({ path_answers: next });

      compassionDoneRef.current = true;
      setPromptIndex(2);
      goToStep(STEPS.path);
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

    goToStep(STEPS.path);
  };

  useEffect(() => {
    const path = pathDecision?.path || null;
    if (!path) return;
    if (path !== 'COMPASSION') return;
    if (step !== STEPS.path) return;
    if (promptIndex !== 1) return;
    if (compassionDoneRef.current) return;

    goToStep(STEPS.compassionPause);
    runCompassionPause();
  }, [step, promptIndex, pathDecision]);

  const submitPromptAnswer = async () => {
    const nextAnswers = [...answers];
    nextAnswers[promptIndex] = nextAnswers[promptIndex] || '';

    const nextIdx = promptIndex + 1;

    setAnswers(nextAnswers);
    await syncProgress({ path_answers: nextAnswers });

    if (pathDecision?.path === 'CRISIS') {
      goToStep(STEPS.anchor);
      return;
    }

    if (nextIdx >= 3) {
      goToStep(STEPS.closureSigh);
      runClosureSigh();
      return;
    }

    const path = pathDecision?.path || 'CLARITY';

    const shouldMicroCheck =
      path !== 'ACT' &&
      ((path === 'CLARITY' && nextIdx === 2) || (path !== 'CLARITY' && nextIdx === 1));

    if (shouldMicroCheck) {
      setPromptIndex(nextIdx);
      goToStep(STEPS.microCheck);
      runMicroCheck({
        seconds: 12,
        text: 'Quick reset.',
        nextStep: STEPS.path,
      });
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

    goToStep(STEPS.anchor);
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

    setCompletionPhase(1);
    goToStep(STEPS.completion);
  };

  const renderPhaseMeta = () => {
    return (
      <View style={styles.phaseMetaWrap}>
        <Text style={styles.phaseMetaText}>{`${phaseMeta.label} • ${phaseMeta.time}`}</Text>
      </View>
    );
  };

  const renderHeaderRow = () => {
    return (
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => {
            breathSeqCancelRef.current.cancelled = true;
            navigation.goBack();
          }}
          style={styles.headerChip}
        >
          <Text style={styles.headerChipText}>Exit</Text>
        </Pressable>
      </View>
    );
  };

  const renderArrival = () => {
    return (
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen>
          {renderHeaderRow()}
          {renderPhaseMeta()}
          <Title>{greeting || '...'}</Title>
          <Guidance style={{ marginTop: 16 }}>
            In 3 minutes: calm your body, understand the spiral, get one clear next step.
          </Guidance>
          <Context style={{ marginTop: 12, marginBottom: 24 }}>
            Put both feet flat on the floor. Feel them touching the ground.
          </Context>
          {!!sessionError && <Context style={{ marginBottom: 10, color: COLORS.terracotta }}>{sessionError}</Context>}
          <PrimaryButton
            label={loading ? 'Loading…' : "I'm ready"}
            disabled={loading}
            onPress={async () => {
              goToStep(STEPS.sigh1);
              runSigh90();
            }}
          />
        </Screen>
      </Animated.View>
    );
  };

  const renderLungs = () => {
    const fill = breathAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.08, 0.55],
    });

    const scale = breathAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.92, 1.04],
    });

    return (
      <Animated.View style={[styles.lungsWrap, { transform: [{ scale }] }]}>
        <View style={styles.lungsRow}>
          <View style={styles.lungShell}>
            <Animated.View style={[styles.lungFill, { opacity: fill }]} />
          </View>
          <View style={styles.lungShell}>
            <Animated.View style={[styles.lungFill, { opacity: fill }]} />
          </View>
        </View>
        <Text style={styles.lungsLabel}>Your lungs</Text>
      </Animated.View>
    );
  };

  const renderSigh = () => {
    const remaining = sighRemaining ?? 90;

    return (
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen center>
          {renderHeaderRow()}
          {renderPhaseMeta()}
          <Title>One breath with me</Title>
          <Guidance style={{ marginTop: 16, marginBottom: 24, textAlign: 'center' }}>
            Follow the lungs. We’ll start fast, then slow.
          </Guidance>

          {renderLungs()}

          <View style={styles.breathStatusRow}>
            <Text style={styles.breathCue}>{breathCue || ' '}</Text>
            <Text style={styles.breathTimer}>{formatSeconds(remaining)}</Text>
          </View>

          <SecondaryButton
            label="Skip"
            onPress={() => {
              stopTimer(sighIntervalRef, setSighRemaining);
              breathSeqCancelRef.current.cancelled = true;
              goToStep(STEPS.bodyScan);
            }}
          />
        </Screen>
      </Animated.View>
    );
  };

  const renderMicroCheck = () => {
    const breathScale = microCheckBreath.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1.15],
    });
    return (
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen center>
          {renderHeaderRow()}
          <Guidance style={{ marginTop: 16, textAlign: 'center' }}>{microCheckText}</Guidance>
          {!!microCheckLine2 && (
            <Guidance style={{ marginTop: 10, textAlign: 'center' }}>{microCheckLine2}</Guidance>
          )}
          <View style={styles.torsoWrap}>
            <View style={styles.torsoOutline}>
              <Animated.View
                pointerEvents="none"
                style={[styles.torsoGlowChest, { opacity: microCheckGlowChest }]}
              />
              <Animated.View
                pointerEvents="none"
                style={[styles.torsoGlowBelly, { opacity: microCheckGlowBelly }]}
              />
              <Animated.View
                pointerEvents="none"
                style={[styles.torsoGlowBoth, { opacity: microCheckGlowBoth }]}
              />
            </View>
          </View>

          <Animated.View style={[styles.breathLine, { transform: [{ scaleX: breathScale }] }]} />
        </Screen>
      </Animated.View>
    );
  };

  const renderBodyScan = () => {
    return (
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen>
          {renderHeaderRow()}
          {renderPhaseMeta()}
          <Title>Where do you feel it?</Title>
          <Guidance style={{ marginTop: 16, marginBottom: 24 }}>Tap one location.</Guidance>

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

        <Subtitle style={{ marginTop: 16 }}>Intensity</Subtitle>
        <Text style={styles.intensityValue}>{intensityPre}</Text>
        <Slider
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={intensityPre}
          onValueChange={withSliderHaptics(setIntensityPre)}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor="rgba(248,249,250,0.15)"
          thumbTintColor={COLORS.primary}
        />

        {!!sessionError && <Context style={{ marginBottom: 10, color: COLORS.terracotta }}>{sessionError}</Context>}
          <PrimaryButton
            label="Continue"
            disabled={!bodyLocationPre}
            onPress={async () => {
              await syncProgress({ current_step: STEPS.bodyScan, intensity_pre: intensityPre });
              goToStep(STEPS.spiralText);
            }}
          />
        </Screen>
      </Animated.View>
    );
  };

  const renderSpiralText = () => {
    const words = countWords(spiralText);
    const enough = words >= 5;

    return (
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen scrollable>
          {renderHeaderRow()}
          {renderPhaseMeta()}
          <Title>What’s the thought loop?</Title>
        <Guidance style={{ marginTop: 16 }}>
          Don’t make it perfect. The sentence that keeps replaying.
        </Guidance>
        <Context style={{ marginTop: 12, marginBottom: 24 }}>
          If you freeze, copy the example and change one word.
        </Context>

        <TextInput
          value={spiralText}
          onChangeText={setSpiralText}
          placeholder={spiralPlaceholder}
          placeholderTextColor="rgba(248,249,250,0.55)"
          multiline
          onFocus={() => setSpiralFocused(true)}
          onBlur={() => setSpiralFocused(false)}
          style={[styles.textArea, spiralFocused && styles.textAreaFocused]}
        />

        <View style={styles.inputMetaRow}>
          <Text style={styles.wordCount}>{`${words} words`}</Text>
          {enough ? <Text style={styles.enoughTag}>✓ That's enough to work with</Text> : <Text style={styles.enoughTagMuted}> </Text>}
        </View>

        {!!voiceError && <Context style={{ marginTop: 10, color: COLORS.terracotta }}>{voiceError}</Context>}

        <View style={{ marginTop: 12 }}>
          {!voiceRecording ? (
            <SecondaryButton label={voiceBusy ? '…' : 'Hold to speak'} onPress={startVoiceRecording} />
          ) : (
            <SecondaryButton label={voiceBusy ? '…' : 'Stop recording'} onPress={stopVoiceRecordingAndTranscribe} />
          )}
        </View>

        {!!sessionError && <Context style={{ marginTop: 10, color: COLORS.terracotta }}>{sessionError}</Context>}

          <PrimaryButton label="Continue" onPress={analyzeSpiral} />
        </Screen>
      </Animated.View>
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
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen scrollable>
          {renderHeaderRow()}
          {renderPhaseMeta()}
          <Title>{title}</Title>
        {!!pathDecision?.reasoning && (
          <Context style={{ marginTop: 12 }}>{pathDecision.reasoning}</Context>
        )}

        <Subtitle style={{ marginTop: 24, marginBottom: 12 }}>{displayPrompt}</Subtitle>

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
            placeholderTextColor="rgba(248,249,250,0.55)"
            multiline
            style={styles.textArea}
          />
        )}

          <PrimaryButton
            label={promptIndex === 2 ? 'Continue' : 'Next'}
            onPress={submitPromptAnswer}
          />
        </Screen>
      </Animated.View>
    );
  };

  const renderClosureSigh = () => {
    const remaining = closureSighRemaining ?? 30;
    const cue = remaining > 20 ? 'In' : remaining > 10 ? 'Out' : 'In';

    return (
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen center>
          {renderHeaderRow()}
          {renderPhaseMeta()}
          <Title>Closing breaths</Title>
        <Guidance style={{ marginTop: 16, marginBottom: 24, textAlign: 'center' }}>Three cycles.</Guidance>

        <View style={styles.sighCard}>
          <Text style={styles.sighCue}>{cue}</Text>
          <Text style={styles.sighTimer}>{formatSeconds(remaining)}</Text>
        </View>

          <SecondaryButton
            label="Skip"
            onPress={() => {
              stopTimer(closureIntervalRef, setClosureSighRemaining);
              goToStep(STEPS.closureCheck);
            }}
          />
        </Screen>
      </Animated.View>
    );
  };

  const renderClosureCheck = () => {
    return (
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen>
          {renderHeaderRow()}
          {renderPhaseMeta()}
          <Title>Check in again</Title>
        <Guidance style={{ marginTop: 16, marginBottom: 24 }}>Tap the main place you feel it now.</Guidance>

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
          onValueChange={withSliderHaptics(setIntensityPost)}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor="rgba(248,249,250,0.15)"
          thumbTintColor={COLORS.primary}
        />

        {!!sessionError && <Context style={{ marginTop: 10, color: COLORS.terracotta }}>{sessionError}</Context>}

          <PrimaryButton label="Continue" onPress={fetchClosureValidation} />
        </Screen>
      </Animated.View>
    );
  };

  const renderAnchor = () => {
    return (
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen scrollable>
          {renderHeaderRow()}
          {renderPhaseMeta()}
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

        {!!sessionError && <Context style={{ marginTop: 10, color: COLORS.terracotta }}>{sessionError}</Context>}

          <PrimaryButton label="Finish" onPress={finish} />
        </Screen>
      </Animated.View>
    );
  };

  const renderCompletion = () => {
    const text =
      typeof intensityPre === 'number' && typeof intensityPost === 'number' && intensityPost < intensityPre
        ? `Your body came down ${intensityPre - intensityPost} points. You did that.`
        : 'You stayed with it. That’s the practice.';

    return (
      <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>
        <Screen center>
          {renderPhaseMeta()}
          {completionPhase === 1 ? (
            <>
              <Title>One final breath</Title>
              <Guidance style={{ marginTop: 16, textAlign: 'center' }}>In slowly for five seconds.</Guidance>
              <View style={{ marginTop: 24 }}>{renderLungs()}</View>
              <Context style={{ marginTop: 6, textAlign: 'center' }}> </Context>
            </>
          ) : (
            <>
              <Title>✓</Title>
              <Guidance style={{ marginTop: 16, textAlign: 'center' }}>You regulated. You’re building the skill.</Guidance>
              <Context style={{ marginTop: 12, textAlign: 'center' }}>{text}</Context>
              <PrimaryButton
                label="Done"
                onPress={async () => {
                  try {
                    await safeImpact('medium');
                    await safeImpact('light');
                    await safeImpact('light');
                  } catch {}
                  navigation.goBack();
                }}
              />
            </>
          )}
        </Screen>
      </Animated.View>
    );
  };

  useEffect(() => {
    if (step !== STEPS.completion) return;
    if (reduceMotion) {
      setCompletionPhase(2);
      return;
    }

    setCompletionPhase(1);
    Animated.timing(breathAnim, { toValue: 0.18, duration: 0, useNativeDriver: false }).start();
    Animated.timing(breathAnim, { toValue: 0.92, duration: 5000, useNativeDriver: false }).start();

    const t = setTimeout(() => {
      setCompletionPhase(2);
    }, 5000);
    return () => clearTimeout(t);
  }, [step, reduceMotion]);

  if (step === STEPS.arrival) return renderArrival();
  if (step === STEPS.sigh1) return renderSigh();
  if (step === STEPS.bodyScan) return renderBodyScan();
  if (step === STEPS.spiralText) return renderSpiralText();
  if (step === STEPS.path) return renderPath();
  if (step === STEPS.microCheck) return renderMicroCheck();
  if (step === STEPS.compassionPause) return renderCompassionPause();
  if (step === STEPS.closureSigh) return renderClosureSigh();
  if (step === STEPS.closureCheck) return renderClosureCheck();
  if (step === STEPS.anchor) return renderAnchor();
  return renderCompletion();
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
    borderColor: COLORS.faint,
    backgroundColor: COLORS.surface,
  },
  headerChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  phaseMetaWrap: {
    position: 'absolute',
    top: 12,
    right: 16,
  },
  phaseMetaText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '500',
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.faint,
  },
  pillSelected: {
    borderColor: 'rgba(42,157,143,0.9)',
    backgroundColor: 'rgba(42,157,143,0.10)',
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
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: 'rgba(248,249,250,0.10)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 80,
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 22,
  },
  textAreaFocused: {
    borderWidth: 2,
    borderColor: 'rgba(42,157,143,0.40)',
  },
  inputMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  enoughTag: {
    color: 'rgba(42,157,143,0.85)',
    fontSize: 12,
    fontWeight: '700',
  },
  enoughTagMuted: {
    color: 'transparent',
    fontSize: 12,
  },
  sighCard: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.faint,
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
  lungsWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 22,
  },
  lungsLabel: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  lungsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  lungShell: {
    width: 108,
    height: 140,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(248,249,250,0.18)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  lungFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42,157,143,0.75)',
  },
  breathStatusRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  breathCue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  breathTimer: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  torsoWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  torsoOutline: {
    width: 160,
    height: 220,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(248,249,250,0.18)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  torsoGlowChest: {
    position: 'absolute',
    top: 44,
    left: 28,
    right: 28,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(42,157,143,0.30)',
  },
  torsoGlowBelly: {
    position: 'absolute',
    top: 110,
    left: 34,
    right: 34,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(42,157,143,0.30)',
  },
  torsoGlowBoth: {
    position: 'absolute',
    top: 44,
    left: 28,
    right: 28,
    height: 126,
    borderRadius: 40,
    backgroundColor: 'rgba(42,157,143,0.22)',
  },
  breathLine: {
    marginTop: 18,
    width: 120,
    height: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(42,157,143,0.85)',
    backgroundColor: 'rgba(42,157,143,0.10)',
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.faint,
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
