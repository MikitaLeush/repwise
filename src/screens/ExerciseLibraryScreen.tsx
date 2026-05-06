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
import type { ExerciseDBEntry } from '../types';

const ALL_FILTER = 'all';

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
      <PageHeader title="Exercises" />
      <View style={styles.header}>
        <Text style={styles.subtitle}>{exercises.length} exercises</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises…"
          placeholderTextColor="#555555"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
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
            <Text style={styles.actionTitle} numberOfLines={2}>
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

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function capitalize(s: string): string {
  return s
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  subtitle: {
    color: '#555555',
    fontSize: 13,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  filters: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 4,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  chipActive: {
    backgroundColor: '#C8FF0015',
    borderColor: '#C8FF00',
  },
  chipText: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#C8FF00',
    fontWeight: '600',
  },
  list: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#444444',
    fontSize: 15,
  },

  // Action modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 4,
  },
  actionTitle: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionBtn: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#C8FF00',
    fontSize: 16,
    fontWeight: '500',
  },
  actionBtnDestructive: {
    color: '#FF5722',
  },
  actionCancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  actionCancelText: {
    color: '#555555',
    fontSize: 15,
  },
});
