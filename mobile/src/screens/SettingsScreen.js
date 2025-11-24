import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Platform, Alert, TouchableOpacity } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body, Subtitle } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState({ enableNotifications: true, checkInTime: '22:30' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/notifications/preferences');
        setPrefs(res.data.data || prefs);
      } catch (e) {
        // ignore, use defaults
      }
    };
    load();
  }, []);

  const registerPushToken = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Notifications disabled', 'You can change this in system settings later.');
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data;
    if (!token) return null;
    try {
      await api.post('/notifications/token', {
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
    } catch (e) {
      // ignore for now
    }
    return token;
  };

  const toggleNotifications = async (value) => {
    setPrefs((p) => ({ ...p, enableNotifications: value }));
    try {
      setLoading(true);
      if (value) {
        await registerPushToken();
      }
      await api.put('/notifications/preferences', {
        enableNotifications: value,
      });
    } catch (e) {
      // ignore for now
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <Title>Settings</Title>
      <Body style={{ marginBottom: 24 }}>
        Unspiral is a self-help tool, not therapy or medical care.
      </Body>
      <View style={styles.card}>
        <Subtitle>Nightly check-in</Subtitle>
        <Body>
          One gentle nudge around {prefs.checkInTime || '22:30'} to ask how your mind is doing.
        </Body>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Enable notifications</Text>
          <Switch
            value={prefs.enableNotifications}
            onValueChange={toggleNotifications}
          />
        </View>
      </View>
      <View style={styles.card}>
        <Subtitle>Recommend to a friend</Subtitle>
        <Body>
          If this has helped you out of a few spirals, you might know someone who needs it too.
        </Body>
        <Body style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
          (Use your phones share sheet with a message like: "This app has actually helped me
          when my brain spins at night.")
        </Body>
      </View>
      <View style={styles.card}>
        <Subtitle>Safety</Subtitle>
        <Body>
          If you are in immediate danger or thinking of harming yourself, please contact local
          emergency services or a crisis hotline instead of this app.
        </Body>
      </View>

      <View style={styles.card}>
        <Subtitle>Account</Subtitle>
        <Body style={{ marginBottom: 12 }}>
          Logged in as: {user?.email || 'Unknown'}
        </Body>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: logout },
              ]
            );
          }}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: '500',
    fontSize: 15,
  },
});
