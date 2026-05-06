import { useCallback } from 'react';
import { useAsyncStorage } from './useAsyncStorage';

interface FavoritesData {
  favorites: string[];
  hidden: string[];
}

const DEFAULT: FavoritesData = { favorites: [], hidden: [] };

export function useExerciseFavorites() {
  const [data, setData] = useAsyncStorage<FavoritesData>('repwise_exercise_favorites', DEFAULT);

  const toggleFavorite = useCallback(
    (id: string) => {
      setData((prev) => ({
        ...prev,
        favorites: prev.favorites.includes(id)
          ? prev.favorites.filter((f) => f !== id)
          : [...prev.favorites, id],
      }));
    },
    [setData]
  );

  const toggleHidden = useCallback(
    (id: string) => {
      setData((prev) => ({
        ...prev,
        hidden: prev.hidden.includes(id)
          ? prev.hidden.filter((h) => h !== id)
          : [...prev.hidden, id],
      }));
    },
    [setData]
  );

  const isFavorite = useCallback((id: string) => data.favorites.includes(id), [data.favorites]);
  const isHidden = useCallback((id: string) => data.hidden.includes(id), [data.hidden]);

  return {
    favorites: data.favorites,
    hidden: data.hidden,
    toggleFavorite,
    toggleHidden,
    isFavorite,
    isHidden,
  };
}
