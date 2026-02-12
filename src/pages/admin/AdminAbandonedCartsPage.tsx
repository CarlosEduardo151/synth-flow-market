import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { Bot, Phone, RefreshCcw, Send, ShoppingCart, CreditCard, User } from 'lucide-react';

type AbandonedCartRow = {
  id: string;
  user_id: string;
  stage: string;
  status: string;
  total_amount: number | null;
  cart_items: any;
  recommended_message: string | null;
  recommended_actions: any;
  updated_at: string;
  last_event_at: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

type ZapiConnection = {
  instance_id: string;
  token: string;
};

export default function AdminAbandonedCartsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AbandonedCartRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [zapi, setZapi] = useState<ZapiConnection | null>(null);
  const [draftMessageByCart, setDraftMessageByCart] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: carts, error: cartsError } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('status', 'open')
        .order('last_event_at', { ascending: false })
        .limit(200);
      if (cartsError) throw cartsError;

      const list = (carts || []) as any as AbandonedCartRow[];
      setRows(list);

      const userIds = Array.from(new Set(list.map((c) => c.user_id)));
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, phone')
          .in('user_id', userIds);
        const map: Record<string, ProfileRow> = {};
        (profs || []).forEach((p: any) => {
          map[p.user_id] = p;
        });
        setProfiles(map);
      } else {
        setProfiles({});
      }

      // Pega a conexão Z-API do admin logado (para enviar mensagens)
      const { data: conns } = await supabase
        .from('zapi_connections')
        .select('instance_id, token')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);
      const conn = Array.isArray(conns) ? conns[0] : null;
      setZapi(conn ? { instance_id: conn.instance_id, token: conn.token } : null);

      // Inicializa drafts com a recomendação (se existir)
      const nextDraft: Record<string, string> = {};
      list.forEach((c) => {
        if (c.recommended_message) nextDraft[c.id] = c.recommended_message;
      });
      setDraftMessageByCart((prev) => ({ ...prev, ...nextDraft }));
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Erro ao carregar abandonos',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate('/auth');
      else if (!isAdmin) navigate('/');
      else load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, adminLoading, isAdmin]);

  const stageLabel = (stage: string) => {
    if (stage === 'checkout') return 'Checkout';
    return 'Carrinho';
  };

  const stageIcon = (stage: string) => {
    return stage === 'checkout' ? CreditCard : ShoppingCart;
  };

  const stats = useMemo(() => {
    const cart = rows.filter((r) => r.stage !== 'checkout').length;
    const checkout = rows.filter((r) => r.stage === 'checkout').length;
    return { total: rows.length, cart, checkout };
  }, [rows]);

  const handleGenerateAI = async (cartId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('abandoned-cart-ai', {
        body: { cartId },
      });
      if (error) throw error;

      toast({ title: 'IA gerou recomendação', description: 'Atualizando lista…' });
      if (data?.recommended_message) {
        setDraftMessageByCart((p) => ({ ...p, [cartId]: data.recommended_message }));
      }
      await load();
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Erro na IA',
        description: e?.message || 'Não foi possível gerar recomendação agora.',
        variant: 'destructive',
      });
    }
  };

  const handleSendWhatsApp = async (cart: AbandonedCartRow) => {
    const profile = profiles[cart.user_id];
    const phone = profile?.phone;
    const message = (draftMessageByCart[cart.id] || '').trim();

    if (!phone) {
      toast({ title: 'Sem telefone', description: 'Este cliente não tem telefone no perfil.', variant: 'destructive' });
      return;
    }
    if (!message) {
      toast({ title: 'Mensagem vazia', description: 'Preencha a mensagem antes de enviar.', variant: 'destructive' });
      return;
    }
    if (!zapi) {
      toast({
        title: 'Z-API não configurada',
        description: 'Cadastre uma conexão Z-API no seu usuário admin (zapi_connections).',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          instanceId: zapi.instance_id,
          token: zapi.token,
          phoneNumber: phone,
          message,
          productSlug: 'abandoned_cart',
          productTitle: 'Recuperação de Carrinho',
        },
      });
      if (error) throw error;

      toast({ title: 'Mensagem enviada', description: 'WhatsApp enviado via Z-API.' });

      // Marcar como “em_contato” (sem fechar automaticamente)
      await supabase
        .from('abandoned_carts')
        .update({ status: 'in_contact', updated_at: new Date().toISOString() })
        .eq('id', cart.id);
      await load();
      return data;
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Falha ao enviar', description: e?.message || 'Erro no envio.', variant: 'destructive' });
    }
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Recuperação de Carrinhos</h1>
            <p className="text-muted-foreground">
              Lista de clientes que quase compraram (carrinho e checkout abandonados) + recomendação da IA para ação manual.
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total abertos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Abandono no carrinho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cart}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Abandono no checkout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.checkout}</div>
            </CardContent>
          </Card>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum carrinho abandonado em aberto.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map((cart) => {
              const profile = profiles[cart.user_id];
              const StageIco = stageIcon(cart.stage);
              const totalBRL = (cart.total_amount ?? 0) / 100;
              return (
                <Card key={cart.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <StageIco className="h-5 w-5 text-primary" />
                          {stageLabel(cart.stage)} abandonado
                          <Badge variant="outline">{(cart.cart_items?.length ?? 0)} itens</Badge>
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="inline-flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            {profile?.full_name || profile?.email || cart.user_id}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            {profile?.phone || 'sem telefone'}
                          </span>
                          <span className="font-medium">Total: R$ {totalBRL.toFixed(2)}</span>
                        </CardDescription>
                      </div>
                      <Badge variant={cart.stage === 'checkout' ? 'default' : 'secondary'}>
                        {cart.stage === 'checkout' ? 'Alta intenção' : 'Média intenção'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Ações recomendadas (IA)</h3>
                          <Button size="sm" variant="outline" onClick={() => handleGenerateAI(cart.id)}>
                            <Bot className="h-4 w-4 mr-2" />
                            Gerar/Atualizar
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Array.isArray(cart.recommended_actions)
                            ? cart.recommended_actions.map((a: any, idx: number) => (
                                <div key={idx}>• {String(a)}</div>
                              ))
                            : cart.recommended_actions
                            ? <div>• {JSON.stringify(cart.recommended_actions)}</div>
                            : <div>Nenhuma ação gerada ainda.</div>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Mensagem sugerida</h3>
                          <Button size="sm" onClick={() => handleSendWhatsApp(cart)}>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar WhatsApp
                          </Button>
                        </div>
                        <Textarea
                          value={draftMessageByCart[cart.id] ?? ''}
                          onChange={(e) =>
                            setDraftMessageByCart((p) => ({ ...p, [cart.id]: e.target.value }))
                          }
                          placeholder="Clique em ‘Gerar/Atualizar’ para a IA criar uma mensagem, ou escreva manualmente."
                          className="min-h-[120px]"
                        />
                        {!zapi && (
                          <p className="text-xs text-muted-foreground">
                            Dica: configure sua Z-API no usuário admin (tabela <code>zapi_connections</code>) para habilitar envio.
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">Ver itens do carrinho (JSON)</summary>
                      <pre className="mt-2 p-3 rounded-md bg-muted overflow-auto text-xs">
                        {JSON.stringify(cart.cart_items, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
