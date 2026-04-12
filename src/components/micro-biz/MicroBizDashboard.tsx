import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, TrendingUp, Target, Megaphone, Activity, AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

interface Props {
  customerProductId: string;
}

export function MicroBizDashboard({ customerProductId }: Props) {
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

  // Real leads data for chart
  const { data: leadsHistory } = useQuery({
    queryKey: ["micro-biz-leads-history", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_leads" as any)
        .select("created_at, purchase_intent_score")
        .eq("customer_product_id", customerProductId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!customerProductId,
  });

  // Real conversation logs for activity
  const { data: recentLogs } = useQuery({
    queryKey: ["micro-biz-activity", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_conversations" as any)
        .select("created_at, direction, channel")
        .eq("customer_product_id", customerProductId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!customerProductId,
  });

  if (isLoading) return <div className="text-center p-8 text-muted-foreground">Carregando...</div>;

  const s = stats?.stats || { totalLeads: 0, hotLeads: 0, converted: 0 };

  // Build chart from real leads data grouped by day
  const chartData = (() => {
    const leads = leadsHistory as any[] || [];
    const dayMap: Record<string, { leads: number; quentes: number }> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("pt-BR", { weekday: "short" });
      dayMap[key] = { leads: 0, quentes: 0 };
    }
    leads.forEach((l: any) => {
      const d = new Date(l.created_at);
      const key = d.toLocaleDateString("pt-BR", { weekday: "short" });
      if (dayMap[key]) {
        dayMap[key].leads++;
        if ((l.purchase_intent_score || 0) >= 7) dayMap[key].quentes++;
      }
    });
    return Object.entries(dayMap).map(([day, v]) => ({ day, ...v }));
  })();

  const activityEntries = (recentLogs as any[] || []).map((log: any) => ({
    time: new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    text: log.direction === "inbound"
      ? `Mensagem recebida via ${log.channel || "WhatsApp"}`
      : `Resposta enviada via ${log.channel || "WhatsApp"}`,
  })).reverse();

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

      {/* Lead Heat Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-400" />
            Leads Capturados — Últimos 7 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.every((d) => d.leads === 0) ? (
            <div className="flex items-center justify-center gap-2 h-48 text-muted-foreground text-sm">
              <AlertCircle className="h-4 w-4" />
              Nenhum lead registrado nos últimos 7 dias.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
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
          )}
        </CardContent>
      </Card>

      {/* Real Activity Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityEntries.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              Nenhuma atividade registrada ainda. Conecte o WhatsApp para começar.
            </p>
          ) : (
            <div className="bg-background rounded-lg border p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1" style={{ scrollbarWidth: "thin" }}>
              {activityEntries.map((entry, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">[{entry.time}]</span>
                  <span className="text-foreground/80">{entry.text}</span>
                </div>
              ))}
            </div>
          )}
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
