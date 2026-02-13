import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useProductAccess } from '@/hooks/useProductAccess';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, ArrowRight, Bot, Sparkles, Check, Zap, Shield, Clock, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlatformConfig {
  platform: 'whatsapp' | 'telegram' | null;
  configured_at: string | null;
}

const BotsAutomacaoSystem = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const access = useProductAccess('bots-automacao');
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<'whatsapp' | 'telegram' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

    const loadPlatformConfig = async () => {
      try {
        const { data: cfg, error } = await (supabase as any)
          .from('ai_control_config')
          .select('configuration')
          .eq('customer_product_id', access.customerId)
          .maybeSingle();

        if (error) throw error;

        const configuration = cfg?.configuration as any;
        const platform = configuration?.bots_automacao?.platform as PlatformConfig['platform'] | undefined;
        const configured_at = configuration?.bots_automacao?.configured_at as string | undefined;

        if (platform) {
          setPlatformConfig({ platform, configured_at: configured_at ?? null });
        }
      } catch (error) {
        console.error('Error loading bots config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlatformConfig();
  }, [user, loading, access.loading, access.hasAccess, access.customerId, navigate]);

  const handleSelectPlatform = async (platform: 'whatsapp' | 'telegram') => {
    if (!access.customerId || !user) return;

    setIsSaving(true);
    setSelectedPlatform(platform);

    try {
      const now = new Date().toISOString();
      const { data: existingRow } = await (supabase as any)
        .from('ai_control_config')
        .select('id, configuration')
        .eq('customer_product_id', access.customerId)
        .maybeSingle();

      const prevConfiguration = (existingRow?.configuration ?? {}) as any;
      const nextConfiguration = {
        ...prevConfiguration,
        bots_automacao: {
          ...(prevConfiguration?.bots_automacao ?? {}),
          platform,
          configured_at: now,
        },
      };

      const { error } = existingRow?.id
        ? await (supabase as any)
            .from('ai_control_config')
            .update({ configuration: nextConfiguration, is_active: true, user_id: user.id })
            .eq('id', existingRow.id)
        : await (supabase as any)
            .from('ai_control_config')
            .insert({ customer_product_id: access.customerId, user_id: user.id, is_active: true, configuration: nextConfiguration });

      if (error) throw error;

      if (platform === 'whatsapp') {
        navigate(`/sistema/bots-automacao/whatsapp/${access.customerId}`);
      } else {
        setPlatformConfig({ platform: 'telegram', configured_at: now });
      }
    } catch (error) {
      console.error('Error saving platform:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading || access.loading) {
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
  }

  // If platform already configured, redirect
  if (platformConfig?.platform === 'whatsapp') {
    navigate(`/sistema/bots-automacao/whatsapp/${access.customerId}`);
    return null;
  }

  if (platformConfig?.platform === 'telegram') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto text-center"
          >
            <div className="mx-auto w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
              <Send className="h-10 w-10 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Bot Telegram</h1>
            <p className="text-muted-foreground mb-6">Em breve você terá acesso ao painel completo de configuração.</p>
            <Badge variant="outline" className="text-blue-500 border-blue-500/30 px-4 py-2 text-sm">
              <Clock className="h-3.5 w-3.5 mr-2" />
              Em desenvolvimento
            </Badge>
            <div className="mt-8">
              <Button variant="ghost" onClick={() => setPlatformConfig(null)}>
                ← Alterar plataforma
              </Button>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // Platform selection screen
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Configuração Inicial
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Bots de Automação
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Escolha a plataforma para configurar seu bot de automação com IA
            </p>
          </motion.div>

          {/* Platform Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* WhatsApp */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card
                className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 border-2 group ${
                  selectedPlatform === 'whatsapp'
                    ? 'border-green-500 shadow-green-500/20 shadow-xl'
                    : 'border-border/50 hover:border-green-500/50'
                }`}
                onClick={() => !isSaving && handleSelectPlatform('whatsapp')}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <MessageCircle className="h-7 w-7 text-green-500" />
                    </div>
                    <Badge className="bg-green-500/90 text-white border-0 shadow-lg shadow-green-500/25">
                      Recomendado
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl mt-4">WhatsApp</CardTitle>
                  <CardDescription className="text-base">
                    Bot inteligente com IA avançada para WhatsApp Business
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Zap, text: 'Atendimento 24/7' },
                      { icon: Bot, text: 'IA Conversacional' },
                      { icon: Globe, text: 'Multilingue' },
                      { icon: Shield, text: 'Memória contextual' },
                    ].map(({ icon: Icon, text }, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-3.5 w-3.5 text-green-500" />
                        </div>
                        {text}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Button
                      className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium text-base shadow-lg shadow-green-600/25 hover:shadow-green-600/40 transition-all"
                      disabled={isSaving}
                    >
                      {isSaving && selectedPlatform === 'whatsapp' ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Configurando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Configurar WhatsApp
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Telegram */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card
                className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 border-2 group ${
                  selectedPlatform === 'telegram'
                    ? 'border-blue-500 shadow-blue-500/20 shadow-xl'
                    : 'border-border/50 hover:border-blue-500/50'
                }`}
                onClick={() => !isSaving && handleSelectPlatform('telegram')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Send className="h-7 w-7 text-blue-500" />
                    </div>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                      <Clock className="h-3 w-3 mr-1" />
                      Em breve
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl mt-4">Telegram</CardTitle>
                  <CardDescription className="text-base">
                    Bot personalizado com recursos avançados para Telegram
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Bot, text: 'Bot personalizado' },
                      { icon: Zap, text: 'Comandos custom' },
                      { icon: Globe, text: 'Grupos & canais' },
                      { icon: Shield, text: 'Webhooks' },
                    ].map(({ icon: Icon, text }, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        {text}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Button
                      className="w-full h-12 font-medium text-base"
                      variant="outline"
                      disabled={isSaving}
                    >
                      {isSaving && selectedPlatform === 'telegram' ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                          Configurando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Configurar Telegram
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Footer tip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-10 text-center"
          >
            <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Você pode alterar sua escolha a qualquer momento nas configurações
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BotsAutomacaoSystem;
