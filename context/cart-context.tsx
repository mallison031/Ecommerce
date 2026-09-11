"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  priceKobo: number;
  imageUrl?: string;
  quantity: number;
  customEngraving?: string;
  engravingFont?: string;
  giftWrap?: boolean;
  itemKey?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (itemKeyOrProductId: string) => void;
  updateQuantity: (itemKeyOrProductId: string, quantity: number) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotalKobo: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "ecommerce_cart_session";

function getItemKey(item: { productId: string; customEngraving?: string; giftWrap?: boolean }): string {
  return `${item.productId}__${item.customEngraving || ""}__${item.giftWrap ? "gw" : "std"}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from sessionStorage (per architecture: session-based, not permanent cross-device)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed loading cart from sessionStorage:", e);
    }
    setIsInitialized(true);
  }, []);

  // Sync to sessionStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed saving cart to sessionStorage:", e);
    }
  }, [items, isInitialized]);

  const addItem = (product: Omit<CartItem, "quantity">, qty = 1) => {
    const key = getItemKey(product);
    setItems((prev) => {
      const existing = prev.find((item) => (item.itemKey || getItemKey(item)) === key);
      if (existing) {
        return prev.map((item) =>
          (item.itemKey || getItemKey(item)) === key
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { ...product, itemKey: key, quantity: qty }];
    });
  };

  const removeItem = (itemKeyOrProductId: string) => {
    setItems((prev) =>
      prev.filter((item) => {
        const key = item.itemKey || getItemKey(item);
        return key !== itemKeyOrProductId && item.productId !== itemKeyOrProductId;
      })
    );
  };

  const updateQuantity = (itemKeyOrProductId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemKeyOrProductId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        const key = item.itemKey || getItemKey(item);
        if (key === itemKeyOrProductId || item.productId === itemKeyOrProductId) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalKobo = items.reduce(
    (sum, item) => sum + (item.priceKobo + (item.giftWrap ? 150000 : 0)) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItemsCount,
        subtotalKobo,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
