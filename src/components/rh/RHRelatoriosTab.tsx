import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileText, TrendingUp, Users, Briefcase, Clock, Star, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RHRelatoriosTabProps {
  userId: string;
}

export function RHRelatoriosTab({ userId }: RHRelatoriosTabProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVagas: 0,
    vagasAtivas: 0,
    totalCandidatos: 0,
    candidatosNovos: 0,
    entrevistasAgendadas: 0,
    contratados: 0,
    mediaAvaliacao: 0
  });
  const [etapasData, setEtapasData] = useState<any[]>([]);
  const [candidatosPorDia, setCandidatosPorDia] = useState<any[]>([]);
  const [topVagas, setTopVagas] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      const [vagasRes, candidatosRes, entrevistasRes] = await Promise.all([
        supabase.from('rh_vagas').select('*').eq('user_id', userId),
        supabase.from('rh_candidatos').select('*').eq('user_id', userId),
        supabase.from('rh_entrevistas').select('*').eq('user_id', userId)
      ]);

      const vagas = vagasRes.data || [];
      const candidatos = candidatosRes.data || [];
      const entrevistas = entrevistasRes.data || [];

      // Basic stats
      const vagasAtivas = vagas.filter(v => v.status === 'ativa').length;
      const candidatosNovos = candidatos.filter(c => c.etapa === 'triagem').length;
      const entrevistasAgendadas = entrevistas.filter(e => e.status === 'agendada' && new Date(e.data_hora) > new Date()).length;
      const contratados = candidatos.filter(c => c.etapa === 'contratado').length;
      
      const avaliacoes = candidatos.filter(c => c.avaliacao !== null).map(c => c.avaliacao as number);
      const mediaAvaliacao = avaliacoes.length > 0 ? avaliacoes.reduce((a, b) => a + b, 0) / avaliacoes.length : 0;

      setStats({
        totalVagas: vagas.length,
        vagasAtivas,
        totalCandidatos: candidatos.length,
        candidatosNovos,
        entrevistasAgendadas,
        contratados,
        mediaAvaliacao
      });

      // Etapas distribution
      const etapas = ['triagem', 'entrevista', 'teste', 'oferta', 'contratado', 'rejeitado'];
      const etapasCount = etapas.map(etapa => ({
        name: etapa.charAt(0).toUpperCase() + etapa.slice(1),
        value: candidatos.filter(c => c.etapa === etapa).length
      }));
      setEtapasData(etapasCount);

      // Candidatos por dia (últimos 30 dias)
      const today = new Date();
      const thirtyDaysAgo = subMonths(today, 1);
      const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });
      const candidatosByDay = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = candidatos.filter(c => format(new Date(c.created_at), 'yyyy-MM-dd') === dayStr).length;
        return { date: format(day, 'dd/MM'), candidatos: count };
      });
      setCandidatosPorDia(candidatosByDay);

      // Top vagas by candidatos
      const vagasWithCount = vagas.map(v => ({
        titulo: v.titulo.length > 20 ? v.titulo.substring(0, 20) + '...' : v.titulo,
        candidatos: candidatos.filter(c => c.vaga_id === v.id).length
      })).sort((a, b) => b.candidatos - a.candidatos).slice(0, 5);
      setTopVagas(vagasWithCount);

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#22c55e', '#ef4444'];

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vagas Ativas</p>
                <p className="text-2xl font-bold">{stats.vagasAtivas}</p>
                <p className="text-xs text-muted-foreground">de {stats.totalVagas} total</p>
              </div>
              <Briefcase className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Candidatos</p>
                <p className="text-2xl font-bold">{stats.totalCandidatos}</p>
                <Badge variant="secondary" className="text-xs mt-1">{stats.candidatosNovos} novos</Badge>
              </div>
              <Users className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Entrevistas</p>
                <p className="text-2xl font-bold">{stats.entrevistasAgendadas}</p>
                <p className="text-xs text-muted-foreground">agendadas</p>
              </div>
              <Clock className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Contratados</p>
                <p className="text-2xl font-bold">{stats.contratados}</p>
                <p className="text-xs text-muted-foreground">este mês</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pipeline de Recrutamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {etapasData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={etapasData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  >
                    {etapasData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados de candidatos
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Vagas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Vagas com Mais Candidatos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topVagas.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topVagas} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="titulo" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="candidatos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados de vagas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Candidatos Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Candidatos Recebidos (Últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={candidatosPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="candidatos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Average Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            Avaliação Média dos Candidatos (IA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <Star
                  key={n}
                  className={`h-6 w-6 ${n <= Math.round(stats.mediaAvaliacao) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                />
              ))}
            </div>
            <span className="text-2xl font-bold">{stats.mediaAvaliacao.toFixed(1)}</span>
            <span className="text-muted-foreground">/ 10</span>
          </div>
          <Progress value={stats.mediaAvaliacao * 10} className="mt-4 h-2" />
        </CardContent>
      </Card>
    </div>
  );
}
