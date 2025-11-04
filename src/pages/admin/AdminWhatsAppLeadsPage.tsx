import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Phone, Package, Calendar, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface WhatsAppLead {
  id: string;
  phone_number: string;
  product_slug: string;
  product_title: string;
  status: string;
  first_message: string;
  created_at: string;
  updated_at: string;
}

interface WhatsAppMessage {
  id: string;
  lead_id: string;
  phone_number: string;
  message: string;
  direction: 'sent' | 'received';
  status: string;
  created_at: string;
}

interface ZApiConnection {
  id: string;
  instance_id: string;
  phone_number: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminWhatsAppLeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<WhatsAppLead[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [connections, setConnections] = useState<ZApiConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      checkAdminAndLoadData();
    }
  }, [user, authLoading, navigate]);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user?.id)
        .single();

      if (profile?.role !== "admin") {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      await loadData();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar leads
      const { data: leadsData, error: leadsError } = await supabase
        .from("whatsapp_leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;
      setLeads(leadsData || []);

      // Carregar mensagens
      const { data: messagesData, error: messagesError } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;
      setMessages((messagesData || []) as WhatsAppMessage[]);

      // Carregar conexões
      const { data: connectionsData, error: connectionsError } = await supabase
        .from("zapi_connections")
        .select("*")
        .order("created_at", { ascending: false });

      if (connectionsError) throw connectionsError;
      setConnections(connectionsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      novo: { variant: "default", label: "Novo" },
      interessado: { variant: "secondary", label: "Interessado" },
      negociando: { variant: "outline", label: "Negociando" },
      convertido: { variant: "default", label: "Convertido" },
      perdido: { variant: "destructive", label: "Perdido" },
    };

    const config = variants[status] || { variant: "default", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const stats = {
    totalLeads: leads.length,
    novos: leads.filter((l) => l.status === "novo").length,
    interessados: leads.filter((l) => l.status === "interessado").length,
    conexoesAtivas: connections.filter((c) => c.is_active).length,
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Leads do WhatsApp</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie leads e mensagens da integração Z-API
            </p>
          </div>

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Total de Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLeads}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Novos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.novos}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-500" />
                  Interessados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">{stats.interessados}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-500" />
                  Conexões Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-500">
                  {stats.conexoesAtivas}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="leads" className="space-y-4">
            <TabsList>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
              <TabsTrigger value="connections">Conexões</TabsTrigger>
            </TabsList>

            <TabsContent value="leads" className="space-y-4">
              {leads.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum lead encontrado
                  </CardContent>
                </Card>
              ) : (
                leads.map((lead) => (
                  <Card key={lead.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{lead.product_title}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {lead.phone_number}
                          </CardDescription>
                        </div>
                        {getStatusBadge(lead.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <strong>Primeira mensagem:</strong> {lead.first_message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              {messages.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma mensagem encontrada
                  </CardContent>
                </Card>
              ) : (
                messages.map((msg) => (
                  <Card key={msg.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            msg.direction === "sent"
                              ? "bg-primary/10"
                              : "bg-secondary"
                          }`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              {msg.direction === "sent" ? "Enviada" : "Recebida"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {msg.phone_number}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="connections" className="space-y-4">
              {connections.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma conexão encontrada
                  </CardContent>
                </Card>
              ) : (
                connections.map((conn) => (
                  <Card key={conn.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            Instância: {conn.instance_id}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {conn.phone_number}
                          </CardDescription>
                        </div>
                        <Badge variant={conn.is_active ? "default" : "secondary"}>
                          {conn.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Criada em {new Date(conn.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
