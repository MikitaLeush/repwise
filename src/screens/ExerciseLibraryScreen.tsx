import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ListRenderItem,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ExerciseCard } from '../components/ExerciseCard';
import { useExerciseDB } from '../hooks/useExerciseDB';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { BODY_PARTS } from '../data/muscleMapping';
import { MONO, MONO_BOLD } from '../utils/fonts';
import type { ExerciseDBEntry } from '../types';

const ALL_FILTER = 'all';

const ACCENT = '#5BD1A0';
const BG = '#0B0F0E';
const CARD = '#11181A';
const BORDER = '#1f2825';

export function ExerciseLibraryScreen() {
  const router = useRouter();
  const { byBodyPartAndQuery } = useExerciseDB();
  const { exerciseFavorites } = useApp();

  const [query, setQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState<string>(ALL_FILTER);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [actionTarget, setActionTarget] = useState<ExerciseDBEntry | null>(null);

  const exercises = useMemo(() => {
    let results = byBodyPartAndQuery(selectedPart, query);
    if (!showHidden) {
      results = results.filter((e) => !exerciseFavorites.isHidden(e.id));
    }
    if (showFavoritesOnly) {
      results = results.filter((e) => exerciseFavorites.isFavorite(e.id));
    }
    return results;
  }, [selectedPart, query, byBodyPartAndQuery, showHidden, showFavoritesOnly, exerciseFavorites]);

  const renderItem: ListRenderItem<ExerciseDBEntry> = useCallback(
    ({ item }) => (
      <ExerciseCard
        exercise={item}
        onPress={() => router.push(`/exercise/${item.id}`)}
        onLongPress={() => setActionTarget(item)}
        isFavorite={exerciseFavorites.isFavorite(item.id)}
      />
    ),
    [router, exerciseFavorites]
  );

  const keyExtractor = useCallback((item: ExerciseDBEntry) => item.id, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageHeader title="Exercises" sub={`${exercises.length} exercises`} />

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises…"
            placeholderTextColor="#5A6663"
            value={query}
            onChangeText={setQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filters}
      >
        <FilterChip
          label="All"
          active={selectedPart === ALL_FILTER && !showFavoritesOnly}
          onPress={() => {
            setSelectedPart(ALL_FILTER);
            setShowFavoritesOnly(false);
          }}
        />
        <FilterChip
          label="★ Favorites"
          active={showFavoritesOnly}
          onPress={() => setShowFavoritesOnly((v) => !v)}
        />
        <FilterChip
          label={showHidden ? 'Hide Hidden' : 'Show Hidden'}
          active={showHidden}
          onPress={() => setShowHidden((v) => !v)}
        />
        {BODY_PARTS.map((part) => (
          <FilterChip
            key={part}
            label={capitalize(part)}
            active={selectedPart === part && !showFavoritesOnly}
            onPress={() => {
              setShowFavoritesOnly(false);
              setSelectedPart(part === selectedPart ? ALL_FILTER : part);
            }}
          />
        ))}
      </ScrollView>

      {/* Exercise list */}
      <FlatList
        data={exercises}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No exercises found</Text>
          </View>
        }
      />

      {/* Long-press action modal */}
      <Modal
        visible={actionTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionTarget(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActionTarget(null)}>
          <Pressable style={styles.actionSheet} onPress={() => {}}>
            <Text style={[styles.actionTitle, { fontFamily: MONO }]} numberOfLines={2}>
              {actionTarget ? capitalize(actionTarget.name) : ''}
            </Text>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                if (actionTarget) exerciseFavorites.toggleFavorite(actionTarget.id);
                setActionTarget(null);
              }}
            >
              <Text style={styles.actionBtnText}>
                {actionTarget && exerciseFavorites.isFavorite(actionTarget.id)
                  ? '★  Remove from Favorites'
                  : '☆  Add to Favorites'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                if (actionTarget) exerciseFavorites.toggleHidden(actionTarget.id);
                setActionTarget(null);
              }}
            >
              <Text style={[styles.actionBtnText, styles.actionBtnDestructive]}>
                {actionTarget && exerciseFavorites.isHidden(actionTarget.id)
                  ? '○  Unhide Exercise'
                  : '✕  Hide Exercise'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCancelBtn} onPress={() => setActionTarget(null)}>
              <Text style={styles.actionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function capitalize(s: string): string {
  return s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER,
  },
  searchIcon: { color: '#5A6663', fontSize: 18, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 11, color: '#E6F1ED', fontSize: 14 },

  filters: { flexGrow: 0, flexShrink: 0, marginBottom: 4 },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 4, gap: 6 },
  chip: {
    backgroundColor: CARD, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: BORDER,
  },
  chipActive: { backgroundColor: ACCENT + '22', borderColor: ACCENT },
  chipText: { color: '#7E8A86', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: ACCENT, fontWeight: '600' },

  list: { paddingTop: 8, paddingBottom: 20 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#3A4541', fontSize: 15 },

  // Action modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  actionSheet: {
    backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40, gap: 4,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  actionTitle: {
    color: '#7E8A86', fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 12, paddingHorizontal: 4,
  },
  actionBtn: { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 10 },
  actionBtnText: { color: ACCENT, fontSize: 16, fontWeight: '500' },
  actionBtnDestructive: { color: '#FF5722' },
  actionCancelBtn: { marginTop: 8, paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: BORDER },
  actionCancelText: { color: '#5A6663', fontSize: 15 },
});
