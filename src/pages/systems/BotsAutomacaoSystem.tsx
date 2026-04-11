import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useProductAccess } from '@/hooks/useProductAccess';
import { Bot, Loader2 } from 'lucide-react';

const BotsAutomacaoSystem = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const access = useProductAccess('bots-automacao');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (!user || access.loading) return;

    if (!access.hasAccess || !access.customerId) {
      navigate('/meus-produtos');
      return;
    }

    // Go directly to WhatsApp config
    navigate(`/sistema/bots-automacao/whatsapp/${access.customerId}`);
  }, [user, loading, access.loading, access.hasAccess, access.customerId, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-primary/30 animate-spin border-t-primary" />
          <Bot className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Carregando painel...</p>
      </div>
    </div>
  );
};

export default BotsAutomacaoSystem;
