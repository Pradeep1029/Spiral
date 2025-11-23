import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body, Subtitle } from '../components/Typography';
import api from '../services/api';

export default function ProgressScreen() {
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, insightsRes, streakRes] = await Promise.all([
          api.get('/progress/stats'),
          api.get('/progress/insights'),
          api.get('/progress/streak'),
        ]);
        setStats(statsRes.data.data);
        setInsights(insightsRes.data.data.insights || []);
        setStreak(streakRes.data.data);
      } catch (e) {
        // ignore for now
      }
    };
    load();
  }, []);

  const renderBars = () => {
    if (!stats) return null;
    const before = stats.averageIntensityBefore || 0;
    const after = stats.averageIntensityAfter || 0;
    const max = Math.max(before, after, 1);
    return (
      <View style={styles.barsContainer}>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>Before</Text>
          <View style={styles.barBackground}>
            <View
              style={[styles.barFillBefore, { flex: before / max }]}
            />
          </View>
          <Text style={styles.barValue}>{before.toFixed(1)}</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>After</Text>
          <View style={styles.barBackground}>
            <View
              style={[styles.barFillAfter, { flex: after / max }]}
            />
          </View>
          <Text style={styles.barValue}>{after.toFixed(1)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Screen scrollable>
      <Title>Your progress</Title>
      <Body style={{ marginBottom: 16 }}>
        Not a stats app — just enough to see that this is working for you.
      </Body>
      {stats && (
        <View style={styles.card}>
          <Subtitle>Last {stats.period}</Subtitle>
          <Body>
            Youve rescued yourself {stats.totalSpirals} times.
          </Body>
          <Body>
            On average, spirals go from {stats.averageIntensityBefore.toFixed(1)} →
            {` ${stats.averageIntensityAfter.toFixed(1)}`} ({
              stats.improvementPercentage
            }
            % drop).
          </Body>
          {renderBars()}
        </View>
      )}
      {streak && (
        <View style={styles.card}>
          <Subtitle>Your streak</Subtitle>
          <Body>
            Current streak: {streak.currentStreak || 0} days. Longest streak:{' '}
            {streak.maxStreak || 0} days.
          </Body>
        </View>
      )}
      {insights.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Subtitle>Little reflections</Subtitle>
          {insights.map((ins, idx) => (
            <View key={idx} style={styles.insightCard}>
              <Text style={styles.insightTitle}>
                {ins.icon || ''} {ins.title}
              </Text>
              <Text style={styles.insightText}>{ins.message}</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(15,23,42,0.9)',
    marginBottom: 12,
  },
  barsContainer: {
    marginTop: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    color: 'rgba(255,255,255,0.8)',
    width: 60,
  },
  barBackground: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,1)',
    overflow: 'hidden',
    marginHorizontal: 8,
    flexDirection: 'row',
  },
  barFillBefore: {
    backgroundColor: '#F97373',
  },
  barFillAfter: {
    backgroundColor: '#4ADE80',
  },
  barValue: {
    color: 'rgba(255,255,255,0.8)',
    width: 40,
    textAlign: 'right',
  },
  insightCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(15,23,42,0.95)',
  },
  insightTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    marginBottom: 4,
  },
  insightText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
});
