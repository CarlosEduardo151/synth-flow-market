import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAuth';

interface ProductAccess {
  hasAccess: boolean;
  accessType: 'purchase' | 'rental' | 'trial' | null;
  customerId: string | null;
  expiresAt: string | null;
  loading: boolean;
}

export function useProductAccess(productSlug: string): ProductAccess {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [state, setState] = useState<ProductAccess>({
    hasAccess: false,
    accessType: null,
    customerId: null,
    expiresAt: null,
    loading: true
  });

  useEffect(() => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    if (adminLoading) return;

    // Admin has access to all products — find or create a customer_product row
    if (isAdmin) {
      const grantAdminAccess = async () => {
        try {
          // Check if admin already has a customer_product for this slug
          const { data: existing } = await supabase
            .from('customer_products')
            .select('id, access_expires_at')
            .eq('user_id', user.id)
            .eq('product_slug', productSlug)
            .eq('is_active', true)
            .maybeSingle();

          if (existing) {
            setState({
              hasAccess: true,
              accessType: 'purchase',
              customerId: existing.id,
              expiresAt: existing.access_expires_at,
              loading: false
            });
          } else {
            // Auto-provision for admin
            const { data: created, error } = await (supabase
              .from('customer_products') as any)
              .insert({
                user_id: user.id,
                product_slug: productSlug,
                product_title: productSlug,
                acquisition_type: 'purchase',
                is_active: true,
              })
              .select('id')
              .single();

            if (error) throw error;

            setState({
              hasAccess: true,
              accessType: 'purchase',
              customerId: created.id,
              expiresAt: null,
              loading: false
            });
          }
        } catch (err) {
          console.error('Error granting admin access:', err);
          setState({
            hasAccess: true,
            accessType: 'purchase',
            customerId: null,
            expiresAt: null,
            loading: false
          });
        }
      };
      grantAdminAccess();
      return;
    }

    const checkAccess = async () => {
      try {
        // First update expired trials
        await supabase.rpc('update_expired_trials');

        // Check for active free trial
        const { data: trial } = await supabase
          .from('free_trials')
          .select('id, expires_at')
          .eq('user_id', user.id)
          .eq('product_slug', productSlug)
          .eq('status', 'active')
          .maybeSingle();

        if (trial) {
          const trialExpired = new Date(trial.expires_at) < new Date();
          if (!trialExpired) {
            setState({
              hasAccess: true,
              accessType: 'trial',
              customerId: `trial-${trial.id}`,
              expiresAt: trial.expires_at,
              loading: false
            });
            return;
          }
        }

        // Check for purchased/rented product
        const { data: customerProduct } = await supabase
          .from('customer_products')
          .select('id, acquisition_type, access_expires_at, is_active')
          .eq('user_id', user.id)
          .eq('product_slug', productSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (customerProduct) {
          const expired = customerProduct.access_expires_at 
            ? new Date(customerProduct.access_expires_at) < new Date()
            : false;

          if (!expired) {
            setState({
              hasAccess: true,
              accessType: customerProduct.acquisition_type as 'purchase' | 'rental',
              customerId: customerProduct.id,
              expiresAt: customerProduct.access_expires_at,
              loading: false
            });
            return;
          }
        }

        setState({
          hasAccess: false,
          accessType: null,
          customerId: null,
          expiresAt: null,
          loading: false
        });
      } catch (error) {
        console.error('Error checking product access:', error);
        setState({
          hasAccess: false,
          accessType: null,
          customerId: null,
          expiresAt: null,
          loading: false
        });
      }
    };

    checkAccess();
  }, [user, productSlug, isAdmin, adminLoading]);

  return state;
}
