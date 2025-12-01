import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const SKILL_ICONS = {
  defusion: 'cloud-outline',
  self_compassion: 'heart-outline',
  sleep_beliefs: 'moon-outline',
  cognitive_reframe: 'swap-horizontal-outline',
  grounding: 'footsteps-outline',
  acceptance: 'leaf-outline',
};

export default function TrainingSelectionScreen({ navigation }) {
  const [skills, setSkills] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const [skillsRes, recommendRes] = await Promise.all([
        api.get('/training/skills'),
        api.get('/training/recommend'),
      ]);
      setSkills(skillsRes.data.data.skills);
      setRecommended(recommendRes.data.data);
    } catch (err) {
      console.error('Error loading training skills:', err);
      setError('Failed to load training skills');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSkill = (skillId) => {
    navigation.navigate('TrainingFlow', { skill: skillId });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator size="large" color="#fff" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daylight Drills</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.subtitle}>
            Build skills when you're calm so they're ready when you need them.
          </Text>

          {/* Recommended Skill */}
          {recommended?.recommendedSkill && (
            <View style={styles.recommendedSection}>
              <Text style={styles.sectionLabel}>Recommended for you</Text>
              <TouchableOpacity
                style={styles.recommendedCard}
                onPress={() => handleSelectSkill(recommended.recommendedSkill)}
                activeOpacity={0.8}
              >
                <View style={styles.recommendedBadge}>
                  <Ionicons name="star" size={12} color="#0f0c29" />
                  <Text style={styles.recommendedBadgeText}>Best next step</Text>
                </View>
                <Ionicons
                  name={SKILL_ICONS[recommended.recommendedSkill] || 'bulb-outline'}
                  size={32}
                  color="#F9E66A"
                />
                <Text style={styles.recommendedName}>{recommended.details?.name}</Text>
                <Text style={styles.recommendedDesc}>{recommended.details?.description}</Text>
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.durationText}>{recommended.details?.duration}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* All Skills */}
          <View style={styles.allSkillsSection}>
            <Text style={styles.sectionLabel}>All skills</Text>
            <View style={styles.skillsGrid}>
              {skills.map((skill) => (
                <TouchableOpacity
                  key={skill.id}
                  style={[
                    styles.skillCard,
                    skill.completedRecently && styles.skillCardCompleted,
                  ]}
                  onPress={() => handleSelectSkill(skill.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={SKILL_ICONS[skill.id] || 'bulb-outline'}
                    size={24}
                    color={skill.completedRecently ? 'rgba(255,255,255,0.5)' : '#fff'}
                  />
                  <Text style={[
                    styles.skillName,
                    skill.completedRecently && styles.skillNameCompleted,
                  ]}>
                    {skill.name}
                  </Text>
                  <Text style={styles.skillDuration}>{skill.duration}</Text>
                  {skill.completedRecently && (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
                      <Text style={styles.completedText}>Done recently</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  recommendedSection: {
    marginBottom: 32,
  },
  recommendedCard: {
    backgroundColor: 'rgba(249, 230, 106, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 230, 106, 0.3)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9E66A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  recommendedBadgeText: {
    color: '#0f0c29',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  recommendedName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  recommendedDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginLeft: 4,
  },
  allSkillsSection: {
    marginBottom: 20,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skillCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  skillCardCompleted: {
    opacity: 0.6,
  },
  skillName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  skillNameCompleted: {
    color: 'rgba(255,255,255,0.6)',
  },
  skillDuration: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  completedText: {
    color: '#4ade80',
    fontSize: 11,
    marginLeft: 4,
  },
});
