import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  slug: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  acquisitionType: 'purchase' | 'rental'; // Tipo de aquisição
  rentalMonths?: number; // Quantidade de meses (para aluguel)
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setItems(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems(current => {
      // Para aluguel, considerar tipo de aquisição e meses na comparação
      const existingItem = current.find(item => 
        item.slug === newItem.slug && 
        item.acquisitionType === newItem.acquisitionType &&
        item.rentalMonths === newItem.rentalMonths
      );
      if (existingItem) {
        return current.map(item =>
          item.slug === newItem.slug && 
          item.acquisitionType === newItem.acquisitionType &&
          item.rentalMonths === newItem.rentalMonths
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { ...newItem, quantity: 1 }];
    });
  };

  const removeItem = (slug: string) => {
    setItems(current => current.filter(item => item.slug !== slug));
  };

  const updateQuantity = (slug: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(slug);
      return;
    }
    setItems(current =>
      current.map(item =>
        item.slug === slug ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}