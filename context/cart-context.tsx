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

  const [lastAddedToast, setLastAddedToast] = useState<{
    name: string;
    imageUrl?: string;
    qty: number;
  } | null>(null);

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

    // Trigger cart addition notification with smooth pop animation
    setLastAddedToast({
      name: product.name,
      imageUrl: product.imageUrl,
      qty,
    });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (!lastAddedToast) return;
    const timer = setTimeout(() => {
      setLastAddedToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [lastAddedToast]);

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

      {/* Floating Animated Cart Addition Notification */}
      {lastAddedToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 animate-bounce">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-xs truncate">
                <p className="font-bold text-slate-100 truncate">Added to Cart!</p>
                <p className="text-slate-400 text-[11px] truncate">
                  {lastAddedToast.qty}x {lastAddedToast.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/cart"
                className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-[11px] font-bold text-white transition-transform active:scale-95 shadow-sm"
              >
                View Cart
              </a>
              <button
                type="button"
                onClick={() => setLastAddedToast(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
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
