import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function VoiceInput({ onRecordingComplete }) {
    const [recording, setRecording] = useState();
    const [isRecording, setIsRecording] = useState(false);
    const [permissionResponse, requestPermission] = Audio.usePermissions();

    async function startRecording() {
        try {
            if (permissionResponse.status !== 'granted') {
                console.log('Requesting permission..');
                await requestPermission();
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        console.log('Stopping recording..');
        setRecording(undefined);
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);

        if (onRecordingComplete) {
            onRecordingComplete(uri);
        }
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordingActive]}
                onPressIn={startRecording}
                onPressOut={stopRecording}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={isRecording ? "mic" : "mic-outline"}
                    size={40}
                    color="white"
                />
            </TouchableOpacity>
            <Text style={styles.hint}>
                {isRecording ? "Listening..." : "Hold to Speak"}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    recordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#5C6BC0',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    recordingActive: {
        backgroundColor: '#EF5350',
        transform: [{ scale: 1.1 }],
    },
    hint: {
        marginTop: 12,
        color: '#ccc',
        fontSize: 14,
    },
});
