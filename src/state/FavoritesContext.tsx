import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'luma.favorites.v1';

interface FavoritesApi {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => boolean; // returns the new state (true = now a favorite)
  remove: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesApi>({ ids: [], has: () => false, toggle: () => false, remove: () => {} });

/** Shared, persistent favorites. Reads/writes localStorage once at the provider level,
 *  so the product page, cards and favorites page always agree. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(ids)); }, [ids]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => {
    let nowFavorite = false;
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      nowFavorite = true;
      return [...prev, id];
    });
    return nowFavorite;
  }, []);
  const remove = useCallback((id: string) => setIds((prev) => prev.filter((x) => x !== id)), []);

  const value = useMemo(() => ({ ids, has, toggle, remove }), [ids, has, toggle, remove]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
