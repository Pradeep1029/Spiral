import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body } from '../components/Typography';
import api from '../services/api';

export default function HistoryScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/spirals/history');
        setItems(res.data.data.items || res.data.data);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const renderItem = ({ item }) => {
    const before = item.intensityBefore ?? item.intensity_before;
    const after = item.intensityAfter ?? item.intensity_after;
    const improvement = before != null && after != null ? before - after : null;
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {new Date(item.startedAt || item.started_at).toLocaleString()}
        </Text>
        <Text style={styles.cardText}>
          Topic: {item.primaryTopic || '—'} · Path: {item.pathChosen || '—'}
        </Text>
        {improvement != null && (
          <Text style={styles.cardText}>
            Intensity {before} → {after} ({improvement >= 0 ? '-' : '+'}
            {Math.abs(improvement)})
          </Text>
        )}
      </View>
    );
  };

  return (
    <Screen>
      <Title>Recent rescues</Title>
      <Body style={{ marginBottom: 16 }}>
        A quick look at how youve pulled yourself out of spirals.
      </Body>
      {loading ? (
        <Body>Loading…</Body>
      ) : items.length === 0 ? (
        <Body>No spiral sessions yet. The first one will appear here.</Body>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
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
  cardTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
});
