import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';

export default function GroundingStep({ step, onAnswerChange }) {
  const [items, setItems] = useState({
    seen: ['', '', '', '', ''],
    felt: ['', '', '', ''],
    heard: ['', '', ''],
    smelled: [''],
    tasted: [''],
  });

  useEffect(() => {
    // Update answer whenever items change
    const answer = {
      seen: items.seen.filter(x => x.trim()),
      felt: items.felt.filter(x => x.trim()),
      heard: items.heard.filter(x => x.trim()),
      smelled: items.smelled.filter(x => x.trim()),
      tasted: items.tasted.filter(x => x.trim()),
    };
    onAnswerChange(answer);
  }, [items]);

  const updateItem = (category, index, value) => {
    setItems(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) => i === index ? value : item),
    }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle && (
        <Text style={styles.subtitle}>{step.subtitle}</Text>
      )}
      {step.description && (
        <Text style={styles.description}>{step.description}</Text>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5 things you can see</Text>
        {items.seen.map((item, idx) => (
          <TextInput
            key={`seen-${idx}`}
            style={styles.input}
            value={item}
            onChangeText={(text) => updateItem('seen', idx, text)}
            placeholder={`Thing ${idx + 1}`}
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4 things you can feel</Text>
        {items.felt.map((item, idx) => (
          <TextInput
            key={`felt-${idx}`}
            style={styles.input}
            value={item}
            onChangeText={(text) => updateItem('felt', idx, text)}
            placeholder={`Thing ${idx + 1}`}
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3 things you can hear</Text>
        {items.heard.map((item, idx) => (
          <TextInput
            key={`heard-${idx}`}
            style={styles.input}
            value={item}
            onChangeText={(text) => updateItem('heard', idx, text)}
            placeholder={`Thing ${idx + 1}`}
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2 things you can smell</Text>
        {items.smelled.map((item, idx) => (
          <TextInput
            key={`smelled-${idx}`}
            style={styles.input}
            value={item}
            onChangeText={(text) => updateItem('smelled', idx, text)}
            placeholder={`Thing ${idx + 1}`}
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1 thing you can taste</Text>
        {items.tasted.map((item, idx) => (
          <TextInput
            key={`tasted-${idx}`}
            style={styles.input}
            value={item}
            onChangeText={(text) => updateItem('tasted', idx, text)}
            placeholder="Thing 1"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});
