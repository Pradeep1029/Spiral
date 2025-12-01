import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import VoiceInput from '../VoiceInput';
import PrimaryButton from '../PrimaryButton';

export default function TextDumpStep({ step, onSubmit, loading }) {
    const [text, setText] = useState('');
    const [audioUri, setAudioUri] = useState(null);

    const handleSubmit = () => {
        onSubmit({
            text: text || '(voice recording)',
            audioUri,
            isVoiceEntry: !!audioUri,
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{step.title}</Text>
            {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}
            {step.description && <Text style={styles.description}>{step.description}</Text>}

            <VoiceInput onRecordingComplete={setAudioUri} style={styles.voiceInput} />

            <Text style={styles.orText}>— or type —</Text>

            <TextInput
                style={styles.textInput}
                placeholder={step.ui?.props?.placeholder || "What's on your mind?"}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={6}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
            />

            <PrimaryButton
                label={step.primary_cta?.label || 'Next'}
                onPress={handleSubmit}
                disabled={loading || (!text && !audioUri)}
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
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    voiceInput: {
        marginBottom: 16,
    },
    orText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.4)',
        marginVertical: 12,
    },
    textInput: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        minHeight: 120,
        marginBottom: 24,
    },
    button: {
        width: '100%',
    },
});
