import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';
import { useThemeContext } from '@/context/ThemeContext';

const MIN_RADIUS = 100;
const MAX_RADIUS = 1000;
const RADIUS_STEP = 50;

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export interface GeofenceFormValues {
  name: string;
  event_name: string;
  radius_metres: number;
}

interface GeofenceFormProps {
  latitude: number;
  longitude: number;
  initial?: Partial<GeofenceFormValues>;
  submitLabel: string;
  onSubmit: (values: GeofenceFormValues) => void;
  onRadiusChange?: (radius: number) => void;
  footerExtra?: React.ReactNode;
}

export function GeofenceForm({
  latitude,
  longitude,
  initial,
  submitLabel,
  onSubmit,
  onRadiusChange,
  footerExtra,
}: GeofenceFormProps) {
  const { colors: C } = useThemeContext();
  const [name, setName] = useState(initial?.name ?? '');
  const [eventName, setEventName] = useState(initial?.event_name ?? '');
  const [radius, setRadius] = useState(initial?.radius_metres ?? 300);

  function handleNameChange(v: string) {
    setName(v);
    if (!eventName || eventName === slugify(name)) {
      setEventName(slugify(v));
    }
  }

  function handleRadiusChange(v: number) {
    setRadius(v);
    onRadiusChange?.(v);
  }

  function handleSubmit() {
    const n = name.trim();
    const e = eventName.trim();
    if (!n || !e) {
      Alert.alert('required', 'name and event name are required.');
      return;
    }
    onSubmit({ name: n, event_name: e, radius_metres: radius });
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 4 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            fontFamily: MONO,
            color: C.textSecondary,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          coordinates
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: MONO,
            color: C.text,
            fontVariant: ['tabular-nums'],
          }}
        >
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: C.hairline, marginHorizontal: 20 }} />

      <View style={{ padding: 20, gap: 16 }}>
        <Field C={C} label="name">
          <TextInput
            value={name}
            onChangeText={handleNameChange}
            placeholder="home, office, ..."
            placeholderTextColor={C.textSecondary}
            style={inputStyle(C)}
            autoFocus
            returnKeyType="next"
          />
        </Field>

        <Field C={C} label="event name">
          <TextInput
            value={eventName}
            onChangeText={setEventName}
            placeholder="arrive_home"
            placeholderTextColor={C.textSecondary}
            style={inputStyle(C)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </Field>

        <Field C={C} label={`radius · ${radius}m`}>
          <RadiusControl C={C} value={radius} onChange={handleRadiusChange} />
        </Field>
      </View>
      </ScrollView>

      <View style={{ padding: 20, gap: 10, borderTopWidth: 1, borderTopColor: C.hairline }}>
        {footerExtra}
        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => ({
            backgroundColor: C.text,
            paddingVertical: 14,
            alignItems: 'center',
            borderRadius: 4,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', fontFamily: MONO, color: C.background }}>
            {submitLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  C,
  label,
  children,
}: {
  C: ThemeColors;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          fontFamily: MONO,
          color: C.textSecondary,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function RadiusControl({
  C,
  value,
  onChange,
}: {
  C: ThemeColors;
  value: number;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(MIN_RADIUS, value - RADIUS_STEP));
  const inc = () => onChange(Math.min(MAX_RADIUS, value + RADIUS_STEP));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        onPress={dec}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderWidth: 1,
          borderColor: C.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 20, fontFamily: MONO, color: C.text }}>−</Text>
      </Pressable>
      <View
        style={{
          flex: 1,
          height: 44,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: C.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.backgroundElement,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: MONO, color: C.text }}>
          {value}m
        </Text>
      </View>
      <Pressable
        onPress={inc}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderWidth: 1,
          borderColor: C.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ fontSize: 20, fontFamily: MONO, color: C.text }}>+</Text>
      </Pressable>
    </View>
  );
}

function inputStyle(C: ThemeColors) {
  return {
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.backgroundElement,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: MONO,
    color: C.text,
    borderRadius: 4,
  } as const;
}
