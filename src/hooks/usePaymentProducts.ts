import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  slug: string;
  title: string;
  description?: string;
  price: number;
  in_stock: boolean;
}

export function usePaymentProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('mp-products', {
        method: 'GET',
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncProductFromCart = async (cartItem: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('mp-products', {
        method: 'POST',
        body: {
          title: cartItem.title,
          description: cartItem.title,
          price: cartItem.price,
          slug: cartItem.slug,
          in_stock: true,
        },
      });

      if (error) throw error;
      
      return data?.data?.id;
    } catch (error) {
      console.error('Erro ao sincronizar produto:', error);
      return null;
    }
  };

  return { products, loading, syncProductFromCart };
}
