import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3, TrendingDown, TrendingUp, DollarSign, Wrench,
  Car, FileDown, Loader2, Building2, Calendar, PieChart,
  Shield, Clock, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell,
  LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import type { FleetVehicle, FleetServiceOrder } from '@/hooks/useFleetData';

interface BudgetRow {
  id: string;
  service_order_id: string;
  total_pecas: number;
  total_mao_de_obra: number;
  total_bruto: number;
  total_liquido: number;
  comissao_pct: number;
  status: string;
  urgencia: string;
  created_at: string;
}

interface AuditRow {
  id: string;
  budget_id: string;
  total_orcamento: number;
  total_mercado: number;
  economia_potencial: number;
  status: string;
}

interface Props {
  customerProductId: string;
  vehicles: FleetVehicle[];
  serviceOrders: FleetServiceOrder[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(199, 89%, 48%)',
  'hsl(24, 95%, 53%)',
];

type Period = '30d' | '90d' | '6m' | '12m' | 'all';

export function FleetReports({ customerProductId, vehicles, serviceOrders }: Props) {
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('90d');

  useEffect(() => {
    if (!customerProductId) return;
    const load = async () => {
      setLoading(true);
      const [bRes, aRes] = await Promise.all([
        supabase.from('fleet_budgets').select('*').eq('customer_product_id', customerProductId).order('created_at', { ascending: true }),
        supabase.from('fleet_budget_audit_results').select('*').eq('customer_product_id', customerProductId).eq('status', 'done'),
      ]);
      setBudgets((bRes.data || []) as BudgetRow[]);
      setAudits((aRes.data || []) as AuditRow[]);
      setLoading(false);
    };
    load();
  }, [customerProductId]);

  const periodStart = useMemo(() => {
    const now = new Date();
    switch (period) {
      case '30d': return new Date(now.getTime() - 30 * 86400000);
      case '90d': return new Date(now.getTime() - 90 * 86400000);
      case '6m': return new Date(now.getFullYear(), now.getMonth() - 6, 1);
      case '12m': return new Date(now.getFullYear(), now.getMonth() - 12, 1);
      default: return new Date(2020, 0, 1);
    }
  }, [period]);

  const filteredBudgets = useMemo(() =>
    budgets.filter(b => new Date(b.created_at) >= periodStart),
  [budgets, periodStart]);

  const filteredOrders = useMemo(() =>
    serviceOrders.filter(so => so.created_at && new Date(so.created_at) >= periodStart),
  [serviceOrders, periodStart]);

  // ── KPIs ──
  const totalGasto = filteredBudgets.filter(b => b.status === 'aprovado').reduce((s, b) => s + b.total_bruto, 0);
  const totalPecas = filteredBudgets.filter(b => b.status === 'aprovado').reduce((s, b) => s + b.total_pecas, 0);
  const totalMaoDeObra = filteredBudgets.filter(b => b.status === 'aprovado').reduce((s, b) => s + b.total_mao_de_obra, 0);
  const totalAuditSavings = audits.reduce((s, a) => s + a.economia_potencial, 0);
  const avgTicket = filteredBudgets.filter(b => b.status === 'aprovado').length > 0
    ? totalGasto / filteredBudgets.filter(b => b.status === 'aprovado').length : 0;
  const totalOS = filteredOrders.length;
  const osFinalizadas = filteredOrders.filter(so => so.stage === 'veiculo_entregue').length;

  // ── Monthly spend chart ──
  const monthlyData = useMemo(() => {
    const map = new Map<string, { pecas: number; mao_de_obra: number; total: number; count: number }>();
    filteredBudgets.filter(b => b.status === 'aprovado').forEach(b => {
      const d = new Date(b.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cur = map.get(key) || { pecas: 0, mao_de_obra: 0, total: 0, count: 0 };
      cur.pecas += b.total_pecas;
      cur.mao_de_obra += b.total_mao_de_obra;
      cur.total += b.total_bruto;
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        ...data,
      }));
  }, [filteredBudgets]);

  // ── Cost per vehicle ──
  const vehicleCosts = useMemo(() => {
    const map = new Map<string, { placa: string; total: number; count: number }>();
    filteredBudgets.filter(b => b.status === 'aprovado').forEach(b => {
      const so = serviceOrders.find(o => o.id === b.service_order_id);
      if (!so) return;
      const v = vehicles.find(veh => veh.id === so.vehicle_id);
      const placa = v?.placa || 'N/A';
      const cur = map.get(placa) || { placa, total: 0, count: 0 };
      cur.total += b.total_bruto;
      cur.count += 1;
      map.set(placa, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredBudgets, serviceOrders, vehicles]);

  // ── Cost split (pie) ──
  const costSplit = useMemo(() => {
    if (totalPecas === 0 && totalMaoDeObra === 0) return [];
    return [
      { name: 'Peças', value: totalPecas },
      { name: 'Mão de Obra', value: totalMaoDeObra },
    ];
  }, [totalPecas, totalMaoDeObra]);

  // ── Stage distribution (pie) ──
  const stageDistribution = useMemo(() => {
    const labels: Record<string, string> = {
      checkin: 'Check-In',
      orcamento_enviado: 'Orç. Enviado',
      orcamento_analise: 'Em Análise',
      orcamento_aprovado: 'Aprovado',
      veiculo_finalizado: 'Finalizado',
      veiculo_entregue: 'Entregue',
    };
    const map = new Map<string, number>();
    filteredOrders.forEach(so => {
      const label = labels[so.stage] || so.stage;
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // ── Workshop ranking ──
  const workshopRanking = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; count: number }>();
    filteredBudgets.filter(b => b.status === 'aprovado').forEach(b => {
      const so = serviceOrders.find(o => o.id === b.service_order_id);
      const nome = so?.oficina_nome || 'Sem oficina';
      const cur = map.get(nome) || { nome, total: 0, count: 0 };
      cur.total += b.total_bruto;
      cur.count += 1;
      map.set(nome, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredBudgets, serviceOrders]);

  // ── Export CSV ──
  const exportCSV = () => {
    const rows = [['Data', 'Placa', 'Oficina', 'Descrição', 'Status', 'Peças', 'Mão de Obra', 'Total']];
    filteredBudgets.forEach(b => {
      const so = serviceOrders.find(o => o.id === b.service_order_id);
      const v = so ? vehicles.find(veh => veh.id === so.vehicle_id) : null;
      rows.push([
        new Date(b.created_at).toLocaleDateString('pt-BR'),
        v?.placa || 'N/A',
        so?.oficina_nome || 'N/A',
        so?.descricao_servico || '',
        b.status,
        b.total_pecas.toFixed(2),
        b.total_mao_de_obra.toFixed(2),
        b.total_bruto.toFixed(2),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-frota-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Relatórios & Análises</h2>
          <p className="text-sm text-muted-foreground">Visão analítica completa da sua operação</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <FileDown className="w-4 h-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Gasto', value: fmt(totalGasto), icon: DollarSign, color: 'text-primary' },
          { label: 'Ticket Médio', value: fmt(avgTicket), icon: BarChart3, color: 'text-primary' },
          { label: 'Economia VERO', value: fmt(totalAuditSavings), icon: Shield, color: 'text-emerald-500' },
          { label: 'OS Concluídas', value: `${osFinalizadas}/${totalOS}`, icon: Wrench, color: 'text-amber-500' },
        ].map(kpi => (
          <Card key={kpi.label} className="border border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground truncate">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row 1: Monthly spend + Cost split */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Gastos Mensais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período selecionado</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmt(v), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="pecas" name="Peças" stackId="1" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" />
                  <Area type="monotone" dataKey="mao_de_obra" name="Mão de Obra" stackId="1" fill="hsl(142, 76%, 36%, 0.3)" stroke="hsl(142, 76%, 36%)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-muted-foreground" />
              Composição de Custos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costSplit.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RPieChart>
                  <Pie data={costSplit} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {costSplit.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Vehicle costs + Stage distribution */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Car className="w-4 h-4 text-muted-foreground" />
              Custo por Veículo (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicleCosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={vehicleCosts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="placa" tick={{ fontSize: 11, fontFamily: 'monospace' }} stroke="hsl(var(--muted-foreground))" width={80} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmt(v), 'Total']}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Status das OS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stageDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RPieChart>
                  <Pie data={stageDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {stageDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workshop ranking table */}
      {workshopRanking.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Ranking de Oficinas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border/30">
                <span>Oficina</span>
                <span className="text-center">Serviços</span>
                <span className="text-right">Total</span>
                <span className="text-right">Ticket Médio</span>
              </div>
              {workshopRanking.map((w, i) => (
                <div key={w.nome} className="grid grid-cols-4 gap-2 px-3 py-2.5 text-xs border-b border-border/10 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-foreground truncate">{w.nome}</span>
                  </div>
                  <span className="text-center text-foreground">{w.count}</span>
                  <span className="text-right font-semibold text-foreground">{fmt(w.total)}</span>
                  <span className="text-right text-muted-foreground">{fmt(w.total / w.count)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed statement */}
      {filteredBudgets.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Extrato Detalhado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border/50 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/30">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Data</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Placa</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Oficina</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Peças</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Mão de Obra</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBudgets.slice().reverse().map(b => {
                    const so = serviceOrders.find(o => o.id === b.service_order_id);
                    const v = so ? vehicles.find(veh => veh.id === so.vehicle_id) : null;
                    const statusColor = b.status === 'aprovado'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : b.status === 'pendente'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-muted text-muted-foreground border-border/30';
                    return (
                      <tr key={b.id} className="border-b border-border/10 last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 text-foreground">{new Date(b.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-3 py-2 font-mono font-bold text-foreground">{v?.placa || 'N/A'}</td>
                        <td className="px-3 py-2 text-foreground">{so?.oficina_nome || 'N/A'}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
                            {b.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right text-foreground">{fmt(b.total_pecas)}</td>
                        <td className="px-3 py-2 text-right text-foreground">{fmt(b.total_mao_de_obra)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{fmt(b.total_bruto)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 border-t border-border/30">
                    <td colSpan={4} className="px-3 py-2 font-bold text-foreground text-right">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-foreground">{fmt(filteredBudgets.reduce((s, b) => s + b.total_pecas, 0))}</td>
                    <td className="px-3 py-2 text-right font-bold text-foreground">{fmt(filteredBudgets.reduce((s, b) => s + b.total_mao_de_obra, 0))}</td>
                    <td className="px-3 py-2 text-right font-bold text-foreground">{fmt(filteredBudgets.reduce((s, b) => s + b.total_bruto, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
