import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Trail item lists - neutral, cozy, pictureable words
const TRAIL_ITEMS = {
  soft_objects: [
    'pillow', 'blanket', 'cushion', 'mug', 'teapot', 'cup', 'sock', 'sweater',
    'scarf', 'book', 'notebook', 'candle', 'chair', 'slippers', 'teddy bear',
    'lamp', 'yarn', 'quilt', 'robe', 'mittens', 'hoodie', 'towel', 'rug',
    'curtain', 'beanbag', 'coaster', 'plush toy', 'hot cocoa', 'tissue box',
  ],
  tiny_adventures: [
    'bicycle', 'key', 'small door', 'ladder', 'map', 'suitcase', 'paper boat',
    'kite', 'balloon', 'coin', 'ticket', 'umbrella', 'bridge', 'mailbox',
    'train', 'bus', 'compass', 'backpack', 'lantern', 'tent', 'canoe',
    'stepping stones', 'treehouse', 'swing', 'sandbox', 'wagon', 'scooter',
  ],
  nature_bits: [
    'cloud', 'river', 'leaf', 'tree', 'mountain', 'shell', 'pebble', 'flower',
    'field', 'moon', 'star', 'lake', 'bird', 'hill', 'raindrop', 'forest path',
    'moss', 'fern', 'creek', 'meadow', 'sunset', 'dewdrop', 'butterfly',
    'acorn', 'mushroom', 'pine cone', 'snowflake', 'rainbow', 'firefly',
  ],
};

const TRAIL_CONFIG = {
  soft_objects: {
    label: 'Soft Objects',
    description: 'Mugs, blankets, cushions, socks…',
    icon: 'bed-outline',
    color: '#8B7EC8',
  },
  tiny_adventures: {
    label: 'Tiny Adventures',
    description: 'Little journeys. Nothing intense.',
    icon: 'compass-outline',
    color: '#7CA8C8',
  },
  nature_bits: {
    label: 'Nature Bits',
    description: 'Gentle bits of nature.',
    icon: 'leaf-outline',
    color: '#7CC88B',
  },
};

const DEFAULT_SCENES = 6;
const DEFAULT_TILES_PER_SCENE = 4;
const SCENE_TITLE_PROMPT_INTERVAL = 2; // Show title prompt every N scenes

// Game States
const GAME_STATES = {
  INTRO: 'intro',
  TRAIL_SELECT: 'trail_select',
  SCENE: 'scene',
  END: 'end',
};

export default function DreamTrailsGame({
  step,
  onSubmit,
  loading,
  isStandalone = false,
  onExit,
  suggestedTrail = null,
}) {
  const [gameState, setGameState] = useState(GAME_STATES.INTRO);
  const [needsIntro, setNeedsIntro] = useState(true);
  const [selectedTrail, setSelectedTrail] = useState(suggestedTrail);
  const [currentScene, setCurrentScene] = useState(0);
  const [tilesRevealed, setTilesRevealed] = useState([]);
  const [sceneItems, setSceneItems] = useState([]);
  const [totalTilesRevealed, setTotalTilesRevealed] = useState(0);
  const [showTitlePrompt, setShowTitlePrompt] = useState(false);
  const [sceneTitle, setSceneTitle] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [startTime] = useState(Date.now());
  const [usedItems, setUsedItems] = useState(new Set());
  
  const numScenes = step?.ui?.props?.scenes || DEFAULT_SCENES;
  const tilesPerScene = step?.ui?.props?.tiles_per_scene || DEFAULT_TILES_PER_SCENE;
  
  // Animation refs for tiles
  const tileAnimations = useRef(
    Array(tilesPerScene).fill(null).map(() => new Animated.Value(0))
  ).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Check if user has seen intro before
  useEffect(() => {
    checkIntroStatus();
  }, []);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [gameState]);

  const checkIntroStatus = async () => {
    try {
      const introduced = await AsyncStorage.getItem('dream_trails_introduced');
      if (introduced === 'true') {
        setNeedsIntro(false);
        setGameState(GAME_STATES.TRAIL_SELECT);
      }
    } catch (e) {
      console.log('Error checking intro status:', e);
    }
  };

  const handleIntroComplete = async () => {
    try {
      await AsyncStorage.setItem('dream_trails_introduced', 'true');
    } catch (e) {
      console.log('Error saving intro status:', e);
    }
    setNeedsIntro(false);
    fadeTransition(GAME_STATES.TRAIL_SELECT);
  };

  const fadeTransition = (newState) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setGameState(newState);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  };

  const selectTrail = (trailId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTrail(trailId);
  };

  const startTrail = () => {
    if (!selectedTrail) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateSceneItems();
    fadeTransition(GAME_STATES.SCENE);
  };

  const generateSceneItems = () => {
    const items = TRAIL_ITEMS[selectedTrail];
    const newSceneItems = [];
    const tempUsed = new Set(usedItems);
    
    for (let i = 0; i < tilesPerScene; i++) {
      // Get available items (not recently used)
      let available = items.filter(item => !tempUsed.has(item));
      
      // If we've used too many, reset the used set
      if (available.length < tilesPerScene) {
        tempUsed.clear();
        available = items;
      }
      
      const randomIndex = Math.floor(Math.random() * available.length);
      const item = available[randomIndex];
      newSceneItems.push(item);
      tempUsed.add(item);
    }
    
    setUsedItems(tempUsed);
    setSceneItems(newSceneItems);
    setTilesRevealed(Array(tilesPerScene).fill(false));
    setShowTitlePrompt(false);
    setSceneTitle('');
    
    // Reset tile animations
    tileAnimations.forEach(anim => anim.setValue(0));
  };

  const revealTile = (index) => {
    if (tilesRevealed[index]) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newRevealed = [...tilesRevealed];
    newRevealed[index] = true;
    setTilesRevealed(newRevealed);
    setTotalTilesRevealed(prev => prev + 1);
    
    // Animate the tile
    Animated.spring(tileAnimations[index], {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
    
    // Check if all tiles revealed
    const allRevealed = newRevealed.every(r => r);
    if (allRevealed) {
      // Show title prompt on certain scenes
      if ((currentScene + 1) % SCENE_TITLE_PROMPT_INTERVAL === 0 && currentScene < numScenes - 1) {
        setTimeout(() => setShowTitlePrompt(true), 800);
      }
    }
  };

  const allTilesRevealed = tilesRevealed.length > 0 && tilesRevealed.every(r => r);
  const atLeastOneRevealed = tilesRevealed.some(r => r);

  const nextScene = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentScene >= numScenes - 1) {
      // End of trail
      fadeTransition(GAME_STATES.END);
    } else {
      setCurrentScene(prev => prev + 1);
      generateSceneItems();
    }
  };

  const skipScene = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextScene();
  };

  const handleExit = (confirm = false) => {
    if (!confirm) {
      setShowExitModal(true);
      return;
    }
    
    setShowExitModal(false);
    completeGame(true);
  };

  const completeGame = (endedEarly = false) => {
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    const answer = {
      trail_selected: selectedTrail,
      scenes_targeted: numScenes,
      scenes_completed: endedEarly ? currentScene : currentScene + 1,
      tiles_per_scene: tilesPerScene,
      tiles_revealed_total: totalTilesRevealed,
      duration_seconds: duration,
      ended_early: endedEarly,
      entry_point: isStandalone ? 'home_standalone' : 'rescue_flow',
      completed: true,
    };
    
    if (isStandalone && onExit) {
      onExit(answer);
    } else {
      onSubmit(answer);
    }
  };

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeGame(false);
  };

  // Render Intro Screen
  const renderIntro = () => (
    <Animated.View style={[styles.screenContainer, { opacity: fadeAnim }]}>
      <View style={styles.introContent}>
        <Ionicons name="cloudy-night-outline" size={64} color="rgba(255,255,255,0.6)" />
        <Text style={styles.introTitle}>We're going to shuffle your thoughts.</Text>
        <Text style={styles.introBody}>
          When your brain is stuck on one painful story, imagining random, harmless scenes 
          can pull you off the spiral and make it easier to drift off.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleIntroComplete}>
          <Text style={styles.primaryButtonText}>Show me</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Render Trail Selection
  const renderTrailSelect = () => (
    <Animated.View style={[styles.screenContainer, { opacity: fadeAnim }]}>
      <View style={styles.selectHeader}>
        <Text style={styles.selectTitle}>Pick tonight's trail</Text>
        <Text style={styles.selectSubtitle}>
          You'll see tiny, random scenes from this theme.{'\n'}There's no right choice.
        </Text>
      </View>
      
      <View style={styles.trailCards}>
        {Object.entries(TRAIL_CONFIG).map(([id, config]) => (
          <TouchableOpacity
            key={id}
            style={[
              styles.trailCard,
              selectedTrail === id && styles.trailCardSelected,
              { borderColor: selectedTrail === id ? config.color : 'rgba(255,255,255,0.15)' },
            ]}
            onPress={() => selectTrail(id)}
            activeOpacity={0.7}
          >
            <View style={[styles.trailIconContainer, { backgroundColor: `${config.color}20` }]}>
              <Ionicons name={config.icon} size={28} color={config.color} />
            </View>
            <View style={styles.trailCardContent}>
              <Text style={styles.trailLabel}>{config.label}</Text>
              <Text style={styles.trailDescription}>{config.description}</Text>
            </View>
            {selectedTrail === id && (
              <Ionicons name="checkmark-circle" size={24} color={config.color} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <TouchableOpacity
        style={[styles.primaryButton, !selectedTrail && styles.primaryButtonDisabled]}
        onPress={startTrail}
        disabled={!selectedTrail}
      >
        <Text style={styles.primaryButtonText}>Start trail</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render Scene
  const renderScene = () => (
    <Animated.View style={[styles.screenContainer, { opacity: fadeAnim }]}>
      {/* Scene Header */}
      <View style={styles.sceneHeader}>
        <Text style={styles.sceneCount}>Scene {currentScene + 1} of {numScenes}</Text>
        <Text style={styles.sceneInstruction}>
          Tap a tile, picture what you see for a moment, then tap the next.
        </Text>
      </View>
      
      {/* Tiles Grid */}
      <View style={styles.tilesContainer}>
        {sceneItems.map((item, index) => {
          const isRevealed = tilesRevealed[index];
          const scale = tileAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.95, 1],
          });
          
          return (
            <TouchableOpacity
              key={index}
              onPress={() => revealTile(index)}
              activeOpacity={0.8}
              disabled={isRevealed}
            >
              <Animated.View
                style={[
                  styles.tile,
                  isRevealed && styles.tileRevealed,
                  { transform: [{ scale }] },
                ]}
              >
                {isRevealed ? (
                  <View style={styles.tileContent}>
                    <Text style={styles.tileWord}>{item}</Text>
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color="rgba(255,255,255,0.4)" 
                      style={styles.tileCheck}
                    />
                  </View>
                ) : (
                  <View style={styles.tilePlaceholder}>
                    <Ionicons name="sparkles" size={24} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Picture Prompt */}
      {atLeastOneRevealed && (
        <Text style={styles.picturePrompt}>Picture it for a few seconds…</Text>
      )}
      
      {/* Scene Title Prompt (optional) */}
      {showTitlePrompt && (
        <View style={styles.titlePromptContainer}>
          <Text style={styles.titlePromptLabel}>
            If this was a photo, what would you call it? (Optional)
          </Text>
          <TextInput
            style={styles.titleInput}
            placeholder='Example: "Pillow Boat Party"'
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={sceneTitle}
            onChangeText={setSceneTitle}
            maxLength={50}
          />
        </View>
      )}
      
      {/* Bottom Actions */}
      <View style={styles.sceneActions}>
        {allTilesRevealed ? (
          <TouchableOpacity style={styles.primaryButton} onPress={nextScene}>
            <Text style={styles.primaryButtonText}>
              {currentScene >= numScenes - 1 ? 'Finish trail' : 'Next scene'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.primaryButtonDisabled}>
            <Text style={styles.primaryButtonTextDisabled}>
              Reveal all tiles to continue
            </Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.skipButton} onPress={skipScene}>
          <Text style={styles.skipButtonText}>Skip scene</Text>
        </TouchableOpacity>
      </View>
      
      {/* Exit Button */}
      <TouchableOpacity style={styles.exitButton} onPress={() => handleExit(false)}>
        <Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
    </Animated.View>
  );

  // Render End Screen
  const renderEnd = () => (
    <Animated.View style={[styles.screenContainer, { opacity: fadeAnim }]}>
      <View style={styles.endContent}>
        <Ionicons name="moon-outline" size={64} color="rgba(255,255,255,0.6)" />
        <Text style={styles.endTitle}>Nice wandering.</Text>
        <Text style={styles.endBody}>
          {isStandalone
            ? "You just gave your brain something gentle and random to chew on instead of the usual spiral."
            : "You just walked through a few random scenes instead of replaying your spiral. That's a real shift for your brain."}
        </Text>
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
          <Text style={styles.primaryButtonText}>
            {isStandalone ? "Done for tonight" : "I'm ready to put my phone down"}
          </Text>
        </TouchableOpacity>
        
        {isStandalone && (
          <Text style={styles.endHint}>
            If you're still awake later, you can always take another trail.
          </Text>
        )}
      </View>
    </Animated.View>
  );

  // Exit Confirmation Modal
  const renderExitModal = () => (
    <Modal visible={showExitModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Leave Dream Trails?</Text>
          <Text style={styles.modalBody}>
            You can come back any time if your brain is still spinning.
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => setShowExitModal(false)}
            >
              <Text style={styles.modalButtonSecondaryText}>Stay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={() => handleExit(true)}
            >
              <Text style={styles.modalButtonPrimaryText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {gameState === GAME_STATES.INTRO && renderIntro()}
      {gameState === GAME_STATES.TRAIL_SELECT && renderTrailSelect()}
      {gameState === GAME_STATES.SCENE && renderScene()}
      {gameState === GAME_STATES.END && renderEnd()}
      {renderExitModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  
  // Intro Screen
  introContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 20,
    lineHeight: 36,
  },
  introBody: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 48,
  },
  
  // Trail Selection
  selectHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  selectTitle: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  selectSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  trailCards: {
    flex: 1,
    gap: 16,
  },
  trailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  trailCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  trailIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  trailCardContent: {
    flex: 1,
  },
  trailLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trailDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  
  // Scene
  sceneHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sceneCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sceneInstruction: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  tilesContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  tile: {
    width: (width - 80) / 2,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tileRevealed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tilePlaceholder: {
    opacity: 0.5,
  },
  tileContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  tileWord: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tileCheck: {
    position: 'absolute',
    top: -40,
    right: -30,
  },
  picturePrompt: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  titlePromptContainer: {
    marginBottom: 24,
  },
  titlePromptLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 12,
  },
  titleInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sceneActions: {
    gap: 12,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'underline',
  },
  exitButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  
  // End Screen
  endContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  endTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  endBody: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 48,
  },
  endHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  
  // Buttons
  primaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  primaryButtonTextDisabled: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
