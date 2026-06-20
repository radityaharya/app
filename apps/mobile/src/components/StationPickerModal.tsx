import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COORDINATED_STATION_IDS } from '@/constants/stops';
import { useThemeContext } from '@/context/ThemeContext';
import { type Station } from '@/lib/api';

const MONO: string = 'monospace';

interface Props {
  visible: boolean;
  stations: Station[];
  selectedIds?: Set<string>;
  coordsOnly?: boolean;
  onSelect: (station: Station) => void;
  onClose: () => void;
  title?: string;
}

export function StationPickerModal({
  visible,
  stations,
  selectedIds = new Set(),
  coordsOnly = false,
  onSelect,
  onClose,
  title = 'select station',
}: Props) {
  const { colors: C } = useThemeContext();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const pool = useMemo(
    () =>
      stations.filter(
        (s) =>
          s.type === 'KRL' &&
          s.metadata?.origin?.fg_enable !== 0 &&
          (!coordsOnly || COORDINATED_STATION_IDS.has(s.id)),
      ),
    [stations, coordsOnly],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return pool;
    return pool.filter((s) => s.name.includes(q) || s.id.includes(q));
  }, [pool, query]);

  const handleSelect = useCallback(
    (station: Station) => {
      onSelect(station);
      setQuery('');
    },
    [onSelect],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Station; index: number }) => {
      const checked = selectedIds.has(item.id);
      const hasCoords = COORDINATED_STATION_IDS.has(item.id);
      return (
        <Pressable
          onPress={() => handleSelect(item)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 13,
            backgroundColor: pressed ? C.backgroundSelected : 'transparent',
            gap: 14,
          })}
        >
          {/* Check indicator — text-based, no icon */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              fontFamily: MONO,
              color: checked ? C.statusActive : C.textSecondary,
              width: 20,
              textAlign: 'center',
            }}
          >
            {checked ? '[+]' : '[ ]'}
          </Text>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                fontFamily: MONO,
                color: C.text,
                letterSpacing: -0.1,
              }}
              numberOfLines={1}
            >
              {item.name.replace(/\bSTASIUN\b/g, '').trim().toLowerCase()}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 2, letterSpacing: 0.2 }}>
              {item.id}
              {!hasCoords && '  ·  schedule only'}
            </Text>
          </View>

          {/* Proximity-capable label */}
          {hasCoords && (
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                fontFamily: MONO,
                color: C.accent,
                letterSpacing: 0.4,
              }}
            >
              alert
            </Text>
          )}
        </Pressable>
      );
    },
    [C, selectedIds, handleSelect],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={() => setTimeout(() => inputRef.current?.focus(), 100)}
    >
      <View style={{ flex: 1, backgroundColor: C.background }}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.hairline,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                fontFamily: MONO,
                color: C.text,
                letterSpacing: -0.3,
              }}
            >
              {title}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: MONO, color: C.textSecondary, marginTop: 2, letterSpacing: 0.2 }}>
              {filtered.length} station{filtered.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              borderWidth: 1,
              borderColor: C.hairline,
              borderRadius: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', fontFamily: MONO, color: C.text }}>
              done
            </Text>
          </Pressable>
        </View>

        {/* Search */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 12,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: C.hairline,
            paddingHorizontal: 13,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: MONO, color: C.textSecondary }}>⌕</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="search stations…"
            placeholderTextColor={C.textSecondary}
            style={{
              flex: 1,
              fontSize: 14,
              fontFamily: MONO,
              color: C.text,
              padding: 0,
            }}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                backgroundColor: C.hairline,
                marginHorizontal: 20,
              }}
            />
          )}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      </View>
    </Modal>
  );
}
