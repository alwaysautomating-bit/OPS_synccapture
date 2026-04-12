import { useEffect, useState } from 'react';

const STORAGE_PREFIX = 'synccapture:';

const mergeSeedData = <T extends { id: string }>(seedData: T[], storedData: T[]) => {
  const storedIds = new Set(storedData.map(item => item.id));
  return [...storedData, ...seedData.filter(item => !storedIds.has(item.id))];
};

export const usePersistentCollection = <T extends { id: string }>(key: string, seedData: T[]) => {
  const storageKey = `${STORAGE_PREFIX}${key}`;

  const [items, setItems] = useState<T[]>(() => {
    if (typeof window === 'undefined') return seedData;

    try {
      const rawValue = window.localStorage.getItem(storageKey);
      if (!rawValue) return seedData;

      const storedData = JSON.parse(rawValue) as T[];
      if (!Array.isArray(storedData)) return seedData;

      return mergeSeedData(seedData, storedData);
    } catch (error) {
      console.warn(`Could not load ${storageKey} from local storage`, error);
      return seedData;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.warn(`Could not save ${storageKey} to local storage`, error);
    }
  }, [items, storageKey]);

  return [items, setItems] as const;
};
