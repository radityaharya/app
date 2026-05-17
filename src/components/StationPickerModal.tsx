import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COORDINATED_STATION_IDS } from '@/constants/stops';
import { useThemeContext } from '@/context/ThemeContext';
import { type Station } from '@/lib/api';

interface Props {
  visible: boolean;
  stations: Station[];
  /** Stations the user has already picked — shown with a checkmark. */
  selectedIds?: Set<string>;
  /** If true, only show stations that have coordinates (usable for alerts). */
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
  title = 'Select station',
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
            paddingVertical: 14,
            backgroundColor: pressed ? C.backgroundSelected : 'transparent',
            gap: 14,
          })}
        >
          {/* Indicator dot — green if already monitored, grey outline if not */}
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: checked ? 0 : 1.5,
              borderColor: C.backgroundSelected,
              backgroundColor: checked ? C.statusActive : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {checked && (
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '500',
                color: C.text,
              }}
              numberOfLines={1}
            >
              {item.name.replace(/\bSTASIUN\b/g, '').trim()}
            </Text>
            <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>
              {item.id}
              {!hasCoords && '  ·  schedule only'}
            </Text>
          </View>

          {/* Proximity badge */}
          {hasCoords && (
            <View
              style={{
                backgroundColor: C.accentSubtle,
                borderRadius: 6,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: C.accent, letterSpacing: 0.3 }}>
                ALERT
              </Text>
            </View>
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
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: C.backgroundSelected,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: C.text,
                letterSpacing: -0.3,
              }}
            >
              {title}
            </Text>
            <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
              {filtered.length} station{filtered.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              backgroundColor: C.backgroundElement,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 7,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>Done</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: C.backgroundElement,
            borderRadius: 12,
            paddingHorizontal: 13,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 15, color: C.textSecondary }}>⌕</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search stations…"
            placeholderTextColor={C.textSecondary}
            style={{ flex: 1, fontSize: 15, color: C.text, padding: 0 }}
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
                backgroundColor: C.backgroundSelected,
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
