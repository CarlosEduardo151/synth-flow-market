import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, TrendingUp, Target, Megaphone, Clock, Zap,
  Activity
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart
} from "recharts";
import { useState, useEffect, useRef } from "react";

interface Props {
  customerProductId: string;
}

// Simulated AI activity entries
const AI_ACTIONS = [
  "Nova Nexus: Transcrevendo áudio de novo cliente...",
  "Nova Vision: Identificando produto em foto recebida...",
  "Nova Kernel: Classificando sentimento de lead #42...",
  "Nova Logic: Calculando score de intenção de compra...",
  "Nova Nexus: Respondendo WhatsApp — orçamento enviado",
  "Nova Vision: Gerando criativo para Instagram Story...",
  "Nova Kernel: Lead quente detectado — notificando dono",
  "Nova Logic: Atualizando pipeline CRM automaticamente...",
  "Nova Nexus: Processando follow-up automático...",
  "Nova Vision: Analisando foto de catálogo recebida...",
];

export function MicroBizDashboard({ customerProductId }: Props) {
  const [activityLog, setActivityLog] = useState<{ time: string; text: string }[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["micro-biz-stats", customerProductId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("micro-biz-campaign", {
        body: { action: "stats", customer_product_id: customerProductId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!customerProductId,
  });

  // Simulate real-time AI activity
  useEffect(() => {
    const initial = AI_ACTIONS.slice(0, 3).map((text, i) => ({
      time: new Date(Date.now() - (3 - i) * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      text,
    }));
    setActivityLog(initial);

    const interval = setInterval(() => {
      const action = AI_ACTIONS[Math.floor(Math.random() * AI_ACTIONS.length)];
      const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setActivityLog((prev) => [...prev.slice(-15), { time: now, text: action }]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [activityLog]);

  if (isLoading) return <div className="text-center p-8 text-muted-foreground">Carregando...</div>;

  const s = stats?.stats || { totalLeads: 0, hotLeads: 0, converted: 0 };

  // Generate weekly lead heat data
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const heatData = days.map((day) => ({
    day,
    leads: Math.floor(Math.random() * 12) + (s.totalLeads > 0 ? 2 : 0),
    quentes: Math.floor(Math.random() * 5) + (s.hotLeads > 0 ? 1 : 0),
  }));

  // Hours saved calculation (simulated based on leads)
  const hoursSaved = Math.max(s.totalLeads * 0.4 + s.converted * 1.2, 0).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Leads Capturados", value: s.totalLeads, icon: Users, gradient: "from-blue-500/20 to-blue-600/5" },
          { label: "Leads Quentes (7+)", value: s.hotLeads, icon: TrendingUp, gradient: "from-orange-500/20 to-orange-600/5" },
          { label: "Convertidos", value: s.converted, icon: Target, gradient: "from-green-500/20 to-green-600/5" },
          { label: "Campanhas", value: stats?.campaigns?.length || 0, icon: Megaphone, gradient: "from-purple-500/20 to-purple-600/5" },
        ].map((item) => (
          <Card key={item.label} className={`bg-gradient-to-br ${item.gradient} border-none`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/60">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Heat Chart + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead Heat Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-400" />
              Calor de Leads — Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={heatData}>
                <defs>
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hotGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fill="url(#leadGrad)" strokeWidth={2} name="Total" />
                <Area type="monotone" dataKey="quentes" stroke="#f97316" fill="url(#hotGrad)" strokeWidth={2} name="Quentes" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hours Saved Widget */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-400" />
              Economia de Tempo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="text-5xl font-bold text-primary tabular-nums">{hoursSaved}</div>
              <Zap className="absolute -top-2 -right-5 h-5 w-5 text-yellow-400 animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">horas economizadas pela IA</p>
            <p className="text-[11px] text-muted-foreground/60 mt-3 text-center">
              Baseado em transcrição, classificação, resposta automática e geração de criativos.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time AI Activity Terminal */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Atividade da IA em Tempo Real
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">LIVE</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={logRef}
            className="bg-background rounded-lg border p-3 h-48 overflow-y-auto font-mono text-xs space-y-1 scroll-smooth"
            style={{ scrollbarWidth: "thin" }}
          >
            {activityLog.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">[{entry.time}]</span>
                <span className={i === activityLog.length - 1 ? "text-primary" : "text-foreground/80"}>
                  {entry.text}
                </span>
              </div>
            ))}
            <div className="text-muted-foreground/40 animate-pulse">▌</div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      {stats?.campaigns?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Campanhas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.campaigns.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{c.platform}</p>
                    <p className="text-xs text-muted-foreground">R$ {((c.budget_cents || 0) / 100).toFixed(2)} · {c.duration_days} dias</p>
                  </div>
                  <Badge variant={c.status === "draft" ? "secondary" : c.status === "active" ? "default" : "outline"}>
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
