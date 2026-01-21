'use client';

import { useSyncExternalStore, useCallback } from 'react';

function createLocalStorageStore<T>(key: string, initialValue: T) {
  let currentValue: T = initialValue;
  const listeners = new Set<() => void>();

  // Initialize from localStorage
  if (typeof window !== 'undefined') {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        currentValue = JSON.parse(item);
      }
    } catch {
      // Use initial value on error
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): T {
      return currentValue;
    },
    getServerSnapshot(): T {
      return initialValue;
    },
    setValue(value: T | ((prev: T) => T)) {
      const newValue = value instanceof Function ? value(currentValue) : value;
      currentValue = newValue;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(key, JSON.stringify(newValue));
        } catch {
          // Ignore write errors
        }
      }
      listeners.forEach((listener) => listener());
    },
  };
}

// Cache stores by key to prevent recreation
const storeCache = new Map<string, ReturnType<typeof createLocalStorageStore<unknown>>>();

function getStore<T>(key: string, initialValue: T) {
  if (!storeCache.has(key)) {
    storeCache.set(key, createLocalStorageStore(key, initialValue));
  }
  return storeCache.get(key) as ReturnType<typeof createLocalStorageStore<T>>;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const store = getStore(key, initialValue);

  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      store.setValue(newValue);
    },
    [store]
  );

  return [value, setValue];
}
