import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { store, useData } from '@/data/store';

interface FavoritesApi {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => boolean; // returns the new state (true = now a favorite)
  remove: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesApi>({ ids: [], has: () => false, toggle: () => false, remove: () => {} });

/** Favorites live in the shared AppData document, so they sync across devices
 *  along with products and orders. While data is loading we keep local state. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const [localIds, setLocalIds] = useState<string[]>([]);
  const ids = data?.favoriteIds ?? localIds;

  // Keep the local copy current for the brief loading window and offline use.
  useEffect(() => { if (data?.favoriteIds) setLocalIds(data.favoriteIds); }, [data?.favoriteIds]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => {
    const nowFavorite = !ids.includes(id);
    const next = nowFavorite ? [...ids, id] : ids.filter((x) => x !== id);
    setLocalIds(next);
    store.setFavorites(next);
    return nowFavorite;
  }, [ids]);
  const remove = useCallback((id: string) => {
    const next = ids.filter((x) => x !== id);
    setLocalIds(next);
    store.setFavorites(next);
  }, [ids]);

  const value = useMemo(() => ({ ids, has, toggle, remove }), [ids, has, toggle, remove]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
