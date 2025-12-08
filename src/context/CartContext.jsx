// src/context/CartContext.jsx
import { createContext, useContext, useMemo, useState } from 'react';

const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  // item: { id, categoryTitle, title, description, image_path, qty, priceMode: 'rub'|'points', unitPriceRub, unitPricePoints }

  function addItem(item) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id && i.priceMode === item.priceMode);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + item.qty };
        return copy;
      }
      return [...prev, item];
    });
  }

  function updateQty(id, priceMode, qty) {
    setItems(prev =>
      prev.map(i =>
        i.id === id && i.priceMode === priceMode
          ? { ...i, qty: Math.max(1, qty) }
          : i
      )
    );
  }

  function removeItem(id, priceMode) {
    setItems(prev => prev.filter(i => !(i.id === id && i.priceMode === priceMode)));
  }

  // ✅ новый метод очистки корзины
  function clearCart() {
    setItems([]);
  }

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);

  return (
    <CartCtx.Provider
      value={{ items, addItem, updateQty, removeItem, clearCart, count }}
    >
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
