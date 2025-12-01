import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function InsightsScreen() {
  const [insights, setInsights] = useState(null);
  const [archetypes, setArchetypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [insightsRes, archetypesRes] = await Promise.all([
        api.get('/insights?days=30'),
        api.get('/archetypes').catch(() => ({ data: { data: { archetypes: [] } } })),
      ]);
      setInsights(insightsRes.data.data);
      setArchetypes(archetypesRes.data.data?.archetypes || []);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#0f0c29', '#302b63', '#24243e']}
          style={styles.gradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
        </LinearGradient>
      </View>
    );
  }

  const { summary, patterns } = insights || {};

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>My Brain Map</Text>
            <Text style={styles.subtitle}>
              Last {summary?.daysAnalyzed || 30} days
            </Text>
          </View>

          {/* Sessions Count */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Sessions</Text>
            <Text style={styles.cardValue}>{summary?.totalSessions || 0}</Text>
            <Text style={styles.cardSubtext}>
              {summary?.totalSessions > 0
                ? 'Times you used Unspiral'
                : 'Start your first session'}
            </Text>
          </View>

          {/* Intensity Change */}
          {summary?.avgIntensityBefore > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Average Intensity Change</Text>
              <View style={styles.intensityRow}>
                <View style={styles.intensityItem}>
                  <Text style={styles.intensityLabel}>Before</Text>
                  <Text style={styles.intensityValue}>
                    {summary.avgIntensityBefore.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
                <View style={styles.intensityItem}>
                  <Text style={styles.intensityLabel}>After</Text>
                  <Text style={styles.intensityValue}>
                    {summary.avgIntensityAfter.toFixed(1)}
                  </Text>
                </View>
              </View>
              {summary.avgImprovement > 0 && (
                <Text style={styles.improvementText}>
                  ✓ {summary.avgImprovement}% improvement
                </Text>
              )}
            </View>
          )}

          {/* Top Topics */}
          {patterns?.topTopics?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Most Common Topics</Text>
              <View style={styles.pills}>
                {patterns.topTopics.map((topic, index) => (
                  <View key={index} style={styles.pill}>
                    <Text style={styles.pillText}>
                      {topic.charAt(0).toUpperCase() + topic.slice(1)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Peak Hour */}
          {patterns?.peakHour && patterns.peakHour !== 'unknown' && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Most Common Time</Text>
              <Text style={styles.cardValue}>{patterns.peakHour}</Text>
              <Text style={styles.cardSubtext}>
                When you spiral most often
              </Text>
            </View>
          )}

          {/* v2: Spiral Archetypes */}
          {archetypes.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="layers-outline" size={18} color="rgba(255,255,255,0.6)" />
                <Text style={[styles.cardLabel, { marginLeft: 8, marginBottom: 0 }]}>Your Usual Spirals</Text>
              </View>
              {archetypes.map((archetype, index) => (
                <View key={archetype.id || index} style={styles.archetypeItem}>
                  <View style={styles.archetypeHeader}>
                    <Text style={styles.archetypeName}>{archetype.name}</Text>
                    <View style={styles.archetypeCount}>
                      <Text style={styles.archetypeCountText}>{archetype.stats?.totalOccurrences || 0}×</Text>
                    </View>
                  </View>
                  <View style={styles.archetypeDetails}>
                    {archetype.typicalTimeWindows?.length > 0 && (
                      <View style={styles.archetypeDetail}>
                        <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.archetypeDetailText}>
                          {archetype.typicalTimeWindows.map(t => formatTimeWindow(t)).join(', ')}
                        </Text>
                      </View>
                    )}
                    {archetype.typicalEmotions?.length > 0 && (
                      <View style={styles.archetypeDetail}>
                        <Ionicons name="heart-outline" size={12} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.archetypeDetailText}>
                          {archetype.typicalEmotions.slice(0, 2).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {archetype.stats?.averageReduction && (
                    <Text style={styles.archetypeReduction}>
                      Avg. {archetype.stats.averageIntensityBefore} → {archetype.stats.averageIntensityAfter}
                    </Text>
                  )}
                  {archetype.effectiveMethods?.length > 0 && (
                    <View style={styles.effectiveMethodsContainer}>
                      <Text style={styles.effectiveMethodsLabel}>What helps most:</Text>
                      <Text style={styles.effectiveMethodsList}>
                        {archetype.effectiveMethods.slice(0, 3).map(m => formatInterventionName(m.method)).join(' → ')}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Top Interventions */}
          {patterns?.topInterventions?.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="flash-outline" size={18} color="rgba(255,255,255,0.6)" />
                <Text style={[styles.cardLabel, { marginLeft: 8, marginBottom: 0 }]}>What Helps You Most</Text>
              </View>
              {patterns.topInterventions.map((item, index) => (
                <View key={index} style={styles.interventionRow}>
                  <Text style={styles.interventionName}>
                    {formatInterventionName(item.intervention)}
                  </Text>
                  <Text style={styles.interventionCount}>{item.count}×</Text>
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {summary?.totalSessions === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No data yet. Start using Unspiral to see your patterns and progress.
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function formatInterventionName(name) {
  const nameMap = {
    breathing: 'Breathing',
    grounding: 'Grounding',
    brief_cbt: 'CBT Questions',
    deep_cbt: 'Deep CBT',
    defusion: 'Thought Defusion',
    self_compassion: 'Self-Compassion',
    sleep_wind_down: 'Sleep Wind-Down',
    acceptance_values: 'Acceptance',
    behavioral_micro_plan: 'Action Plan',
    expressive_release: 'Expressive Writing',
  };
  return nameMap[name] || name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimeWindow(time) {
  const timeMap = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    late_night: 'Late night',
    middle_of_night: '2-4am',
  };
  return timeMap[time] || time;
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  intensityItem: {
    alignItems: 'center',
  },
  intensityLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  intensityValue: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  arrow: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  improvementText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 8,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: 'rgba(98, 126, 234, 0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  interventionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  interventionName: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  interventionCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  archetypeItem: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  archetypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  archetypeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  archetypeCount: {
    backgroundColor: 'rgba(249, 230, 106, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  archetypeCountText: {
    color: 'rgba(249, 230, 106, 0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  archetypeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  archetypeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  archetypeDetailText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 4,
  },
  archetypeReduction: {
    fontSize: 13,
    color: '#4ade80',
    marginTop: 4,
  },
  effectiveMethodsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  effectiveMethodsLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  effectiveMethodsList: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
});
