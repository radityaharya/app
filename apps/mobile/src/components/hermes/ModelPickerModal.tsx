import type { HermesModelOptions } from '@/types/hermesDashboard';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MONO, type ThemeColors } from '@/components/tokens';

interface ModelPickerModalProps {
  visible: boolean;
  onClose: () => void;
  options: HermesModelOptions | null;
  loading?: boolean;
  currentProvider?: string;
  currentModel?: string;
  onSelect: (provider: string, model: string) => Promise<void>;
  C: ThemeColors;
}

export function ModelPickerModal({
  visible,
  onClose,
  options,
  loading,
  currentProvider,
  currentModel,
  onSelect,
  C,
}: ModelPickerModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  const providers = useMemo(
    () => (options?.providers ?? []).filter((p) => p.authenticated && p.models.length > 0),
    [options],
  );

  const activeProvider =
    providers.find((p) => p.slug === selectedProvider) ??
    providers.find((p) => p.is_current) ??
    providers[0] ??
    null;

  const filteredModels = useMemo(() => {
    if (!activeProvider) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return activeProvider.models;
    return activeProvider.models.filter((m) => m.toLowerCase().includes(q));
  }, [activeProvider, filter]);

  async function handleSelect(model: string) {
    if (!activeProvider || saving) return;
    setSaving(true);
    try {
      await onSelect(activeProvider.slug, model);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.hairline,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', fontFamily: MONO, color: C.text }}>
            main model
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary }}>close</Text>
          </Pressable>
        </View>

        {loading || !options ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={C.textSecondary} />
          </View>
        ) : providers.length === 0 ? (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary, lineHeight: 20 }}>
              no authenticated providers. configure api keys on the hermes dashboard.
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
              style={{ maxHeight: 52, borderBottomWidth: 1, borderBottomColor: C.hairline }}
            >
              {providers.map((p) => {
                const active = p.slug === activeProvider?.slug;
                return (
                  <Pressable
                    key={p.slug}
                    onPress={() => {
                      setSelectedProvider(p.slug);
                      setFilter('');
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: active ? C.text : C.hairline,
                      backgroundColor: active ? C.text : C.background,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: MONO,
                        color: active ? C.background : C.text,
                      }}
                    >
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <TextInput
                value={filter}
                onChangeText={setFilter}
                placeholder="filter models…"
                placeholderTextColor={C.textSecondary}
                style={{
                  borderWidth: 1,
                  borderColor: C.hairline,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 12,
                  fontFamily: MONO,
                  color: C.text,
                }}
              />
              {currentProvider && currentModel ? (
                <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textSecondary, marginTop: 8 }}>
                  current: {currentProvider} · {currentModel}
                </Text>
              ) : null}
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              {filteredModels.map((model) => {
                const isCurrent =
                  activeProvider?.slug === currentProvider && model === currentModel;
                return (
                  <Pressable
                    key={model}
                    onPress={() => handleSelect(model)}
                    disabled={saving}
                    style={({ pressed }) => ({
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      borderTopWidth: 1,
                      borderTopColor: C.hairline,
                      opacity: pressed || saving ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: MONO,
                        color: isCurrent ? C.accent : C.text,
                      }}
                    >
                      {isCurrent ? '[x] ' : '[ ] '}
                      {model}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
