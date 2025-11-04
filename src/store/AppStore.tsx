import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/contexts/CartContext';
import { Product, getProducts } from '@/data/products';
import { Category, getCategories } from '@/data/categories';

// Estado global centralizado
interface AppState {
  // Auth
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  isAdmin: boolean;
  
  // Cart
  cartItems: CartItem[];
  cartTotal: number;
  cartItemCount: number;
  
  // Products & Categories
  products: Product[];
  categories: Category[];
  featuredProducts: Product[];
  loading: boolean;
  
  // UI State
  currentView: 'home' | 'products' | 'cart' | 'profile' | 'orders' | 'journey';
  searchQuery: string;
  selectedCategory: string | null;
}

// Actions
type AppAction =
  | { type: 'SET_AUTH'; payload: { user: User | null; session: Session | null } }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_ADMIN'; payload: boolean }
  | { type: 'ADD_TO_CART'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { slug: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_VIEW'; payload: AppState['currentView'] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_CATEGORY'; payload: string | null };

const initialState: AppState = {
  user: null,
  session: null,
  authLoading: true,
  isAdmin: false,
  cartItems: [],
  cartTotal: 0,
  cartItemCount: 0,
  products: [],
  categories: [],
  featuredProducts: [],
  loading: true,
  currentView: 'home',
  searchQuery: '',
  selectedCategory: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, user: action.payload.user, session: action.payload.session };
    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.payload };
    case 'SET_ADMIN':
      return { ...state, isAdmin: action.payload };
    case 'ADD_TO_CART': {
      const existingItem = state.cartItems.find(item => item.slug === action.payload.slug);
      let newItems;
      if (existingItem) {
        newItems = state.cartItems.map(item =>
          item.slug === action.payload.slug
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...state.cartItems, { ...action.payload, quantity: 1 }];
      }
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      return { ...state, cartItems: newItems, cartTotal: total, cartItemCount: itemCount };
    }
    case 'REMOVE_FROM_CART': {
      const newItems = state.cartItems.filter(item => item.slug !== action.payload);
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      return { ...state, cartItems: newItems, cartTotal: total, cartItemCount: itemCount };
    }
    case 'UPDATE_CART_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return appReducer(state, { type: 'REMOVE_FROM_CART', payload: action.payload.slug });
      }
      const newItems = state.cartItems.map(item =>
        item.slug === action.payload.slug ? { ...item, quantity: action.payload.quantity } : item
      );
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      return { ...state, cartItems: newItems, cartTotal: total, cartItemCount: itemCount };
    }
    case 'CLEAR_CART':
      return { ...state, cartItems: [], cartTotal: 0, cartItemCount: 0 };
    case 'SET_PRODUCTS': {
      const featuredProducts = action.payload.slice(0, 4);
      return { ...state, products: action.payload, featuredProducts };
    }
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_SELECTED_CATEGORY':
      return { ...state, selectedCategory: action.payload };
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    addToCart: (item: Omit<CartItem, 'quantity'>) => void;
    removeFromCart: (slug: string) => void;
    updateCartQuantity: (slug: string, quantity: number) => void;
    clearCart: () => void;
    setView: (view: AppState['currentView']) => void;
    setSearchQuery: (query: string) => void;
    setSelectedCategory: (category: string | null) => void;
  };
} | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Auth effects
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        dispatch({ type: 'SET_AUTH', payload: { user: session?.user ?? null, session } });
        dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_AUTH', payload: { user: session?.user ?? null, session } });
      dispatch({ type: 'SET_AUTH_LOADING', payload: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  // Admin check effect
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!state.user) {
        dispatch({ type: 'SET_ADMIN', payload: false });
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', state.user.id)
          .single();

        dispatch({ type: 'SET_ADMIN', payload: profile?.role === 'admin' });
      } catch (error) {
        console.error('Error checking admin status:', error);
        dispatch({ type: 'SET_ADMIN', payload: false });
      }
    };

    checkAdminStatus();
  }, [state.user]);

  // Load products and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        const products = getProducts();
        const categories = getCategories();
        dispatch({ type: 'SET_PRODUCTS', payload: products });
        dispatch({ type: 'SET_CATEGORIES', payload: categories });
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    loadData();
  }, []);

  // Cart persistence
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const cartItems = JSON.parse(savedCart);
      cartItems.forEach((item: CartItem) => {
        for (let i = 0; i < item.quantity; i++) {
          dispatch({ 
            type: 'ADD_TO_CART', 
            payload: { 
              slug: item.slug, 
              title: item.title, 
              price: item.price, 
              image: item.image,
              acquisitionType: item.acquisitionType || 'purchase' // Default para compra
            } 
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state.cartItems));
  }, [state.cartItems]);

  // Actions
  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error && (email === 'admin@loja.com' || email === 'caduxim0@gmail.com')) {
      try {
        setTimeout(async () => {
          await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('email', email);
        }, 1000);
      } catch (adminError) {
        console.error('Error setting admin role:', adminError);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_TO_CART', payload: item });
  };

  const removeFromCart = (slug: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: slug });
  };

  const updateCartQuantity = (slug: string, quantity: number) => {
    dispatch({ type: 'UPDATE_CART_QUANTITY', payload: { slug, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const setView = (view: AppState['currentView']) => {
    dispatch({ type: 'SET_VIEW', payload: view });
  };

  const setSearchQuery = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  };

  const setSelectedCategory = (category: string | null) => {
    dispatch({ type: 'SET_SELECTED_CATEGORY', payload: category });
  };

  const actions = {
    signUp,
    signIn,
    signOut,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    setView,
    setSearchQuery,
    setSelectedCategory,
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}