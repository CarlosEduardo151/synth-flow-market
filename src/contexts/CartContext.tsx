import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { closeOpenAbandonedCarts, logFunnelEvent, upsertOpenAbandonedCart } from '@/lib/abandonedCart';

export interface CartItem {
  slug: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  acquisitionType: 'purchase' | 'rental' | 'subscription'; // Tipo de aquisição
  rentalMonths?: number; // Quantidade de meses (para aluguel)
  // Campos para pacotes/assinaturas
  isPackage?: boolean;
  packageId?: string;
  subscriptionPlan?: 'monthly' | 'semiannual'; // Plano mensal ou semestral
  includedProducts?: { name: string; slug: string }[]; // Produtos inclusos no pacote
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (slug: string, packageId?: string) => void;
  updateQuantity: (slug: string, quantity: number, packageId?: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { user } = useAuth();

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

  // Persist carrinho/funil para recuperação de abandono (somente quando logado)
  useEffect(() => {
    if (!user) return;

    const t = window.setTimeout(async () => {
      try {
        if (items.length === 0) {
          await closeOpenAbandonedCarts(user.id, 'cleared');
          await logFunnelEvent(user.id, 'cart_cleared');
          return;
        }

        const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        await upsertOpenAbandonedCart({
          userId: user.id,
          stage: 'cart',
          items,
          totalAmount,
        });
        await logFunnelEvent(user.id, 'cart_updated', { itemsCount: items.length, totalAmount });
      } catch (e) {
        console.error('Error persisting abandoned cart:', e);
      }
    }, 800);

    return () => window.clearTimeout(t);
  }, [items, user]);

  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems(current => {
      // Para pacotes, usar packageId na comparação
      if (newItem.isPackage && newItem.packageId) {
        const existingPackage = current.find(item => 
          item.isPackage && 
          item.packageId === newItem.packageId &&
          item.subscriptionPlan === newItem.subscriptionPlan
        );
        if (existingPackage) {
          return current.map(item =>
            item.isPackage && 
            item.packageId === newItem.packageId &&
            item.subscriptionPlan === newItem.subscriptionPlan
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...current, { ...newItem, quantity: 1 }];
      }
      
      // Para aluguel/compra normal, considerar tipo de aquisição e meses na comparação
      const existingItem = current.find(item => 
        item.slug === newItem.slug && 
        item.acquisitionType === newItem.acquisitionType &&
        item.rentalMonths === newItem.rentalMonths &&
        !item.isPackage
      );
      if (existingItem) {
        return current.map(item =>
          item.slug === newItem.slug && 
          item.acquisitionType === newItem.acquisitionType &&
          item.rentalMonths === newItem.rentalMonths &&
          !item.isPackage
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { ...newItem, quantity: 1 }];
    });
  };

  const removeItem = (slug: string, packageId?: string) => {
    setItems(current => current.filter(item => {
      if (packageId) {
        return !(item.isPackage && item.packageId === packageId);
      }
      return item.slug !== slug || item.isPackage;
    }));
  };

  const updateQuantity = (slug: string, quantity: number, packageId?: string) => {
    if (quantity <= 0) {
      removeItem(slug, packageId);
      return;
    }
    setItems(current =>
      current.map(item => {
        if (packageId && item.isPackage && item.packageId === packageId) {
          return { ...item, quantity };
        }
        if (!packageId && item.slug === slug && !item.isPackage) {
          return { ...item, quantity };
        }
        return item;
      })
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