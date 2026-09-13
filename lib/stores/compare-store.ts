"use client";

import { useSyncExternalStore } from "react";

export interface CompareProductItem {
  id: string;
  name: string;
  slug: string;
  sector_slug: string;
  price_kobo: number;
  image_url: string;
  stock_qty: number;
  supports_engraving: boolean;
  description?: string;
}

const STORAGE_KEY = "aura_compare_store";
let memoryItems: CompareProductItem[] = [];
let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function loadInitialItems(): CompareProductItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

if (typeof window !== "undefined") {
  memoryItems = loadInitialItems();
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      memoryItems = loadInitialItems();
      notifyListeners();
    }
  });
}

function saveItems(items: CompareProductItem[]) {
  memoryItems = items;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save compare items:", e);
    }
  }
  notifyListeners();
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): CompareProductItem[] {
  return memoryItems;
}

function getServerSnapshot(): CompareProductItem[] {
  return [];
}

export function useCompareStore() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = (item: CompareProductItem): boolean => {
    if (memoryItems.some((i) => i.id === item.id)) {
      return true;
    }
    if (memoryItems.length >= 4) {
      if (typeof window !== "undefined") {
        alert("You can compare up to 4 products at a time. Please remove one before adding another.");
      }
      return false;
    }
    saveItems([...memoryItems, item]);
    return true;
  };

  const removeItem = (id: string) => {
    saveItems(memoryItems.filter((i) => i.id !== id));
  };

  const clear = () => {
    saveItems([]);
  };

  const isInCompare = (id: string): boolean => {
    return items.some((i) => i.id === id);
  };

  return {
    items,
    addItem,
    removeItem,
    clear,
    isInCompare,
  };
}
