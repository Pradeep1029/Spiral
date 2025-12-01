import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../PrimaryButton';

export default function ReframeReviewStep({ step, onSubmit, loading }) {
  const aiReframe = step.ui?.props?.ai_reframe || '';
  const [editedReframe, setEditedReframe] = useState(aiReframe);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = () => {
    onSubmit({
      reframe: editedReframe,
      accepted: true,
      edited: editedReframe !== aiReframe,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}

      <View style={styles.reframeCard}>
        <View style={styles.reframeHeader}>
          <Ionicons name="bulb" size={24} color="#FFD700" />
          <Text style={styles.reframeLabel}>Balanced Thought</Text>
        </View>

        {isEditing ? (
          <TextInput
            style={styles.textInput}
            multiline
            value={editedReframe}
            onChangeText={setEditedReframe}
            textAlignVertical="top"
          />
        ) : (
          <Text style={styles.reframeText}>{editedReframe}</Text>
        )}

        {step.ui?.props?.editable && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons
              name={isEditing ? 'checkmark-circle' : 'create'}
              size={20}
              color="#FFD700"
            />
            <Text style={styles.editButtonText}>
              {isEditing ? 'Done editing' : 'Edit this thought'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {step.description && (
        <Text style={styles.description}>{step.description}</Text>
      )}

      <PrimaryButton
        label={step.primary_cta?.label || 'Accept'}
        onPress={handleSubmit}
        disabled={loading || !editedReframe.trim()}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
    textAlign: 'center',
  },
  reframeCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  reframeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reframeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 8,
  },
  reframeText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    marginBottom: 12,
  },
  textInput: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    minHeight: 80,
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  editButtonText: {
    color: '#FFD700',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    width: '100%',
  },
});
