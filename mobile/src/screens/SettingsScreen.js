import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Platform, Alert, TouchableOpacity } from 'react-native';
import Screen from '../components/Screen';
import { Title, Body, Subtitle } from '../components/Typography';
import PrimaryButton from '../components/PrimaryButton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState({ enableNotifications: true, checkInTime: '22:30' });
  const [autopilot, setAutopilot] = useState({
    enabled: false,
    lateNightPromptsEnabled: true,
    daytimeFollowupsEnabled: true,
    eveningCheckinsEnabled: true,
    maxPromptsPerDay: 2,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [notifRes, autopilotRes] = await Promise.all([
          api.get('/notifications/preferences').catch(() => ({ data: { data: prefs } })),
          api.get('/autopilot/settings').catch(() => ({ data: { data: { settings: autopilot } } })),
        ]);
        setPrefs(notifRes.data.data || prefs);
        setAutopilot(autopilotRes.data.data?.settings || autopilot);
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

  const toggleAutopilot = async (value) => {
    setAutopilot((p) => ({ ...p, enabled: value }));
    try {
      if (value) {
        await registerPushToken();
      }
      await api.post('/autopilot/toggle', { enabled: value });
    } catch (e) {
      // ignore for now
    }
  };

  const updateAutopilotSetting = async (key, value) => {
    setAutopilot((p) => ({ ...p, [key]: value }));
    try {
      await api.patch('/autopilot/settings', { [key]: value });
    } catch (e) {
      // ignore for now
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

      {/* v2: Autopilot Settings */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Subtitle>Autopilot check-ins</Subtitle>
          <Switch
            value={autopilot.enabled}
            onValueChange={toggleAutopilot}
          />
        </View>
        <Body style={{ marginBottom: 12 }}>
          Catch spirals before they start with gentle, context-aware nudges.
        </Body>
        {autopilot.enabled && (
          <View style={styles.autopilotOptions}>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Evening buffer prompts</Text>
              <Switch
                value={autopilot.eveningCheckinsEnabled}
                onValueChange={(val) => updateAutopilotSetting('eveningCheckinsEnabled', val)}
              />
            </View>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Late-night rescue prompts</Text>
              <Switch
                value={autopilot.lateNightPromptsEnabled}
                onValueChange={(val) => updateAutopilotSetting('lateNightPromptsEnabled', val)}
              />
            </View>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Daytime follow-ups</Text>
              <Switch
                value={autopilot.daytimeFollowupsEnabled}
                onValueChange={(val) => updateAutopilotSetting('daytimeFollowupsEnabled', val)}
              />
            </View>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Max prompts per day</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => updateAutopilotSetting('maxPromptsPerDay', Math.max(1, autopilot.maxPromptsPerDay - 1))}
                >
                  <Text style={styles.counterButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{autopilot.maxPromptsPerDay}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => updateAutopilotSetting('maxPromptsPerDay', Math.min(3, autopilot.maxPromptsPerDay + 1))}
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  autopilotOptions: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  optionLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    flex: 1,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  counterValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
  },
});
