import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function InsightsScreen() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await api.get('/insights?days=30');
      setInsights(response.data.data);
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

          {/* Top Interventions */}
          {patterns?.topInterventions?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Most Used Techniques</Text>
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
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
});
