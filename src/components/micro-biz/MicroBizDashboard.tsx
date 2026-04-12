import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, TrendingUp, Target, Megaphone, Activity, AlertCircle,
  Zap, Brain, Eye, MessageCircle, Clock, BarChart3, Cpu,
  Gauge, Signal, Wifi, ShieldCheck, Rocket
} from "lucide-react";
import {
  ResponsiveContainer, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip,
  RadialBarChart, RadialBar, PieChart, Pie, Cell, BarChart, Bar,
  Legend
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

  const { data: leadsHistory } = useQuery({
    queryKey: ["micro-biz-leads-history", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_leads" as any)
        .select("created_at, purchase_intent_score, sentiment, source, name")
        .eq("customer_product_id", customerProductId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!customerProductId,
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["micro-biz-activity", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_conversations" as any)
        .select("created_at, direction, channel")
        .eq("customer_product_id", customerProductId)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!customerProductId,
  });

  const { data: products } = useQuery({
    queryKey: ["micro-biz-products-count", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_products" as any)
        .select("id, created_at")
        .eq("customer_product_id", customerProductId);
      return data || [];
    },
    enabled: !!customerProductId,
  });

  const { data: creatives } = useQuery({
    queryKey: ["micro-biz-creatives-count", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_creatives" as any)
        .select("id, status, created_at")
        .eq("customer_product_id", customerProductId);
      return data || [];
    },
    enabled: !!customerProductId,
  });

  const { data: tokenUsage } = useQuery({
    queryKey: ["micro-biz-tokens-dash", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bot_usage_metrics" as any)
        .select("tokens_total, processing_ms, created_at, model")
        .eq("customer_product_id", customerProductId);
      return data || [];
    },
    enabled: !!customerProductId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-mono">Inicializando módulos...</p>
      </div>
    );
  }

  const s = stats?.stats || { totalLeads: 0, hotLeads: 0, converted: 0 };
  const leads = (leadsHistory as any[]) || [];
  const logs = (recentLogs as any[]) || [];
  const prods = (products as any[]) || [];
  const crvs = (creatives as any[]) || [];
  const tokens = (tokenUsage as any[]) || [];

  // Derived metrics
  const totalTokens = tokens.reduce((a, t) => a + (t.tokens_total || 0), 0);
  const avgProcessingMs = tokens.length > 0
    ? Math.round(tokens.reduce((a, t) => a + (t.processing_ms || 0), 0) / tokens.length)
    : 0;
  const totalMessages = logs.length;
  const inbound = logs.filter((l: any) => l.direction === "inbound").length;
  const outbound = logs.filter((l: any) => l.direction === "outbound").length;
  const conversionRate = s.totalLeads > 0 ? ((s.converted / s.totalLeads) * 100).toFixed(1) : "0.0";

  // Sentiment distribution
  const sentiments: Record<string, number> = { positivo: 0, neutro: 0, negativo: 0 };
  leads.forEach((l: any) => {
    const sent = (l.sentiment || "neutro").toLowerCase();
    if (sent.includes("positiv")) sentiments.positivo++;
    else if (sent.includes("negativ")) sentiments.negativo++;
    else sentiments.neutro++;
  });
  const sentimentData = [
    { name: "Positivo", value: sentiments.positivo, color: "hsl(var(--success))" },
    { name: "Neutro", value: sentiments.neutro, color: "hsl(var(--muted-foreground))" },
    { name: "Negativo", value: sentiments.negativo, color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  // Lead heat chart from real data
  const chartData = (() => {
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

  // Score distribution
  const scoreDistribution = [
    { range: "1-3", count: leads.filter((l: any) => (l.purchase_intent_score || 0) <= 3).length, fill: "hsl(210 80% 55%)" },
    { range: "4-6", count: leads.filter((l: any) => { const s = l.purchase_intent_score || 0; return s >= 4 && s <= 6; }).length, fill: "hsl(45 100% 55%)" },
    { range: "7-8", count: leads.filter((l: any) => { const s = l.purchase_intent_score || 0; return s >= 7 && s <= 8; }).length, fill: "hsl(30 100% 55%)" },
    { range: "9-10", count: leads.filter((l: any) => (l.purchase_intent_score || 0) >= 9).length, fill: "hsl(var(--success))" },
  ];

  // AI engine uptime (based on token activity)
  const engineActive = tokens.length > 0;
  const modelsUsed = [...new Set(tokens.map((t: any) => t.model).filter(Boolean))];

  const activityEntries = logs.map((log: any) => ({
    time: new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    text: log.direction === "inbound"
      ? `↓ Mensagem recebida via ${log.channel || "WhatsApp"}`
      : `↑ Resposta IA enviada via ${log.channel || "WhatsApp"}`,
    direction: log.direction,
  })).reverse();

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${engineActive ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-[11px] font-mono text-muted-foreground">
              MOTOR {engineActive ? "ATIVO" : "EM ESPERA"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Signal className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-mono text-muted-foreground">
              {modelsUsed.length} MODELO{modelsUsed.length !== 1 ? "S" : ""} EM USO
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-mono text-muted-foreground">
              {totalMessages} MSG PROCESSADAS
            </span>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono gap-1">
          <ShieldCheck className="h-3 w-3" /> SISTEMA PROTEGIDO
        </Badge>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Leads", value: s.totalLeads, icon: Users, sub: "capturados", accent: "text-blue-400" },
          { label: "Quentes", value: s.hotLeads, icon: TrendingUp, sub: "score ≥ 7", accent: "text-orange-400" },
          { label: "Convertidos", value: s.converted, icon: Target, sub: `${conversionRate}% taxa`, accent: "text-green-400" },
          { label: "Campanhas", value: stats?.campaigns?.length || 0, icon: Megaphone, sub: "ativas", accent: "text-purple-400" },
          { label: "Produtos", value: prods.length, icon: Eye, sub: "catalogados", accent: "text-cyan-400" },
          { label: "Criativos", value: crvs.length, icon: Rocket, sub: "gerados", accent: "text-pink-400" },
        ].map((item) => (
          <Card key={item.label} className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <item.icon className={`h-4 w-4 ${item.accent}`} />
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{item.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.sub}</p>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${item.accent.replace("text-", "bg-")} opacity-40`} />
          </Card>
        ))}
      </div>

      {/* Row 2: Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Lead Heat — 7 cols */}
        <Card className="lg:col-span-7 border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-1 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 font-mono">
                <Activity className="h-4 w-4 text-orange-400" />
                CAPTAÇÃO DE LEADS · 7 DIAS
              </CardTitle>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Total</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" /> Quentes</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-2">
            {chartData.every((d) => d.leads === 0) ? (
              <div className="flex items-center justify-center gap-2 h-44 text-muted-foreground text-xs font-mono">
                <AlertCircle className="h-4 w-4" />
                AGUARDANDO DADOS DOS LEADS
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="hotGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb923c" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  />
                  <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fill="url(#leadGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="quentes" stroke="#fb923c" fill="url(#hotGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Right column — 5 cols split into 2 rows */}
        <div className="lg:col-span-5 grid grid-rows-2 gap-4">
          {/* Score Distribution */}
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2 font-mono">
                <Gauge className="h-4 w-4 text-cyan-400" />
                DISTRIBUIÇÃO DE INTENÇÃO
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2 px-2">
              {leads.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground text-xs font-mono">SEM DADOS AINDA</div>
              ) : (
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={scoreDistribution} barSize={28}>
                    <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: "monospace",
                      }}
                      formatter={(value: number) => [`${value} leads`, "Quantidade"]}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {scoreDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Sentiment Pie */}
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2 font-mono">
                <Brain className="h-4 w-4 text-purple-400" />
                ANÁLISE DE SENTIMENTO
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2 px-2">
              {sentimentData.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground text-xs font-mono">SEM DADOS AINDA</div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={90} height={80}>
                    <PieChart>
                      <Pie data={sentimentData} dataKey="value" cx="50%" cy="50%" innerRadius={22} outerRadius={36} paddingAngle={3} strokeWidth={0}>
                        {sentimentData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1">
                    {sentimentData.map((s) => (
                      <div key={s.name} className="flex items-center gap-2 text-[11px]">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className="font-mono font-bold">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Engine Telemetry + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Engine Telemetry — 4 cols */}
        <Card className="lg:col-span-4 border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 font-mono">
              <Cpu className="h-4 w-4 text-cyan-400" />
              TELEMETRIA DO MOTOR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-3">
            {/* Tokens */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground font-mono">TOKENS CONSUMIDOS</span>
                <span className="font-mono font-bold">{(totalTokens / 1_000_000).toFixed(2)}M</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                  style={{ width: `${Math.min((totalTokens / 40_000_000) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">de 40M disponíveis</p>
            </div>

            {/* Avg Latency */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-[11px] font-mono text-muted-foreground">LATÊNCIA MÉDIA</span>
              </div>
              <span className="text-sm font-mono font-bold tabular-nums">{avgProcessingMs}ms</span>
            </div>

            {/* Messages throughput */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-green-400" />
                <span className="text-[11px] font-mono text-muted-foreground">FLUXO DE MSGS</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-bold tabular-nums">{inbound}</span>
                <span className="text-[10px] text-muted-foreground"> ↓ </span>
                <span className="text-sm font-mono font-bold tabular-nums">{outbound}</span>
                <span className="text-[10px] text-muted-foreground"> ↑</span>
              </div>
            </div>

            {/* Active Models */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-muted-foreground">MODELOS ATIVOS</span>
              <div className="flex flex-wrap gap-1">
                {modelsUsed.length > 0 ? modelsUsed.map((m: string) => (
                  <Badge key={m} variant="outline" className="text-[9px] font-mono">{m}</Badge>
                )) : (
                  <span className="text-[10px] text-muted-foreground font-mono">Nenhum modelo ativado</span>
                )}
              </div>
            </div>

            {/* Conversion Gauge */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-mono text-muted-foreground">TX. CONVERSÃO</span>
              </div>
              <span className="text-lg font-mono font-bold tabular-nums text-primary">{conversionRate}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log — 8 cols */}
        <Card className="lg:col-span-8 border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 font-mono">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                FLUXO DE ATIVIDADE
              </CardTitle>
              <Badge variant="outline" className="text-[9px] font-mono gap-1">
                {activityEntries.length} EVENTOS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {activityEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Wifi className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-muted-foreground text-xs font-mono">AGUARDANDO CONEXÃO COM WHATSAPP</p>
                <p className="text-muted-foreground/60 text-[10px]">Conecte uma instância para acompanhar a atividade em tempo real.</p>
              </div>
            ) : (
              <div
                className="rounded-lg border border-border/30 bg-background/50 p-3 max-h-56 overflow-y-auto font-mono text-[11px] space-y-0.5"
                style={{ scrollbarWidth: "thin" }}
              >
                {activityEntries.map((entry, i) => (
                  <div key={i} className="flex gap-2 py-0.5 hover:bg-muted/20 px-1 rounded transition-colors">
                    <span className="text-muted-foreground/60 shrink-0">[{entry.time}]</span>
                    <span className={
                      entry.direction === "inbound"
                        ? "text-cyan-400/80"
                        : "text-green-400/80"
                    }>
                      {entry.text}
                    </span>
                  </div>
                ))}
                <div className="text-muted-foreground/30 animate-pulse pt-1">▌</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Campaigns */}
      {stats?.campaigns?.length > 0 && (
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 font-mono">
              <Megaphone className="h-4 w-4 text-purple-400" />
              CONTROLE DE CAMPANHAS
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {stats.campaigns.slice(0, 6).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                  <div>
                    <p className="text-xs font-mono font-medium">{c.platform}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      R$ {((c.budget_cents || 0) / 100).toFixed(2)} · {c.duration_days}d
                    </p>
                  </div>
                  <Badge
                    variant={c.status === "active" ? "default" : "secondary"}
                    className="text-[9px] font-mono"
                  >
                    {c.status?.toUpperCase()}
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
