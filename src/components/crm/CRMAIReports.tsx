import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText, Loader2, RefreshCw, Trash2, Eye, Download, Brain, TrendingUp,
  AlertTriangle, Target, Users, Zap, Shield, BarChart3, ChevronDown, ChevronUp,
  Clock, ArrowUpRight, ArrowDownRight, Minus, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";
import { generateCRMReportPDF } from "@/lib/generateCRMReportPDF";
import { FileDown } from "lucide-react";

interface Report {
  id: string;
  title: string;
  report_type: string;
  content: string | null;
  user_id: string;
  generated_at: string | null;
}

interface PredictiveReport {
  resumo_executivo?: string;
  indicadores_chave?: { nome: string; valor: string; tendencia: string; descricao: string }[];
  analise_funil?: { total_leads: number; taxa_conversao_estimada: number; gargalos: string[]; recomendacoes: string[] };
  previsao_demanda?: { proximos_30_dias: string; proximos_90_dias: string; confianca_pct: number; fatores: string[] };
  riscos_identificados?: { risco: string; severidade: string; impacto: string; mitigacao: string }[];
  principais_causas_problemas?: { causa: string; evidencia: string; frequencia: string }[];
  acoes_recomendadas?: { acao: string; prioridade: string; prazo_sugerido: string; impacto_esperado: string; responsavel_sugerido: string }[];
  segmentacao_clientes?: { segmento: string; quantidade: number; comportamento: string; estrategia: string }[];
  sentimento_geral?: { score: number; classificacao: string; principais_drivers_positivos: string[]; principais_drivers_negativos: string[] };
  oportunidades_crescimento?: { oportunidade: string; potencial_receita: string; dificuldade: string; descricao: string }[];
  metricas_engajamento?: { taxa_resposta_estimada: string; tempo_medio_resposta: string; canais_mais_ativos: string[]; horarios_pico: string[] };
  conclusao?: string;
  raw_response?: string;
  parse_error?: boolean;
}

interface CRMAIReportsProps {
  customerProductId?: string | null;
}

const SeverityBadge = ({ severity }: { severity: string }) => {
  const colors: Record<string, string> = {
    critico: "bg-red-500/10 text-red-600 border-red-500/20",
    alto: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    medio: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    baixo: "bg-green-500/10 text-green-600 border-green-500/20",
  };
  return <Badge variant="outline" className={colors[severity] || ""}>{severity}</Badge>;
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors: Record<string, string> = {
    urgente: "bg-red-500/10 text-red-600 border-red-500/20",
    alta: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    media: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    baixa: "bg-green-500/10 text-green-600 border-green-500/20",
  };
  return <Badge variant="outline" className={colors[priority] || ""}>{priority}</Badge>;
};

const FrequencyBadge = ({ freq }: { freq: string }) => {
  const colors: Record<string, string> = {
    recorrente: "bg-red-500/10 text-red-600",
    ocasional: "bg-yellow-500/10 text-yellow-700",
    raro: "bg-green-500/10 text-green-600",
  };
  return <Badge variant="secondary" className={colors[freq] || ""}>{freq}</Badge>;
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "alta") return <ArrowUpRight className="h-4 w-4 text-green-500" />;
  if (trend === "baixa") return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const DifficultyBadge = ({ diff }: { diff: string }) => {
  const colors: Record<string, string> = {
    facil: "bg-green-500/10 text-green-600",
    medio: "bg-yellow-500/10 text-yellow-700",
    dificil: "bg-red-500/10 text-red-600",
  };
  return <Badge variant="secondary" className={colors[diff] || ""}>{diff}</Badge>;
};

function ReportViewer({ report }: { report: PredictiveReport }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    resumo: true, indicadores: true, funil: true, previsao: true, riscos: true,
    causas: true, acoes: true, segmentacao: true, sentimento: true,
    oportunidades: true, engajamento: true, conclusao: true,
  });

  const toggle = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  if (report.parse_error) {
    return (
      <div className="border rounded-lg p-4 bg-muted/50">
        <pre className="whitespace-pre-wrap text-sm">{report.raw_response}</pre>
      </div>
    );
  }

  const Section = ({ id, icon: Icon, title, children, iconColor }: {
    id: string; icon: any; title: string; children: React.ReactNode; iconColor?: string;
  }) => (
    <div className="border rounded-lg overflow-hidden">
      <button onClick={() => toggle(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor || "text-primary"}`} />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {expandedSections[id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expandedSections[id] && <div className="px-4 pb-4 border-t">{children}</div>}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Resumo Executivo */}
      {report.resumo_executivo && (
        <Section id="resumo" icon={FileText} title="Resumo Executivo" iconColor="text-blue-500">
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{report.resumo_executivo}</p>
        </Section>
      )}

      {/* Indicadores Chave */}
      {report.indicadores_chave && report.indicadores_chave.length > 0 && (
        <Section id="indicadores" icon={BarChart3} title="Indicadores-Chave" iconColor="text-indigo-500">
          <div className="grid gap-3 sm:grid-cols-2 mt-3">
            {report.indicadores_chave.map((ind, i) => (
              <div key={i} className="border rounded-lg p-3 bg-card">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{ind.nome}</span>
                  <TrendIcon trend={ind.tendencia} />
                </div>
                <p className="text-lg font-bold">{ind.valor}</p>
                <p className="text-xs text-muted-foreground mt-1">{ind.descricao}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Análise de Funil */}
      {report.analise_funil && (
        <Section id="funil" icon={Target} title="Análise de Funil" iconColor="text-purple-500">
          <div className="mt-3 space-y-3">
            <div className="flex gap-4">
              <div className="border rounded-lg p-3 flex-1 text-center">
                <p className="text-2xl font-bold">{report.analise_funil.total_leads}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
              <div className="border rounded-lg p-3 flex-1 text-center">
                <p className="text-2xl font-bold">{report.analise_funil.taxa_conversao_estimada}%</p>
                <p className="text-xs text-muted-foreground">Taxa Conversão</p>
              </div>
            </div>
            {report.analise_funil.gargalos?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 mb-1">⚠ Gargalos</p>
                <ul className="space-y-1">
                  {report.analise_funil.gargalos.map((g, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.analise_funil.recomendacoes?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-500 mb-1">✓ Recomendações</p>
                <ul className="space-y-1">
                  {report.analise_funil.recomendacoes.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Previsão de Demanda */}
      {report.previsao_demanda && (
        <Section id="previsao" icon={TrendingUp} title="Previsão de Demanda" iconColor="text-emerald-500">
          <div className="mt-3 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="border rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Próximos 30 dias</p>
                <p className="text-sm">{report.previsao_demanda.proximos_30_dias}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Próximos 90 dias</p>
                <p className="text-sm">{report.previsao_demanda.proximos_90_dias}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Confiança da previsão</span>
                <span className="font-medium">{report.previsao_demanda.confianca_pct}%</span>
              </div>
              <Progress value={report.previsao_demanda.confianca_pct} />
            </div>
            {report.previsao_demanda.fatores?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Fatores considerados:</p>
                <div className="flex flex-wrap gap-1">
                  {report.previsao_demanda.fatores.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Riscos Identificados */}
      {report.riscos_identificados && report.riscos_identificados.length > 0 && (
        <Section id="riscos" icon={Shield} title="Riscos Identificados" iconColor="text-red-500">
          <div className="mt-3 space-y-3">
            {report.riscos_identificados.map((risk, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{risk.risco}</p>
                  <SeverityBadge severity={risk.severidade} />
                </div>
                <p className="text-xs text-muted-foreground"><strong>Impacto:</strong> {risk.impacto}</p>
                <p className="text-xs text-green-600"><strong>Mitigação:</strong> {risk.mitigacao}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Principais Causas */}
      {report.principais_causas_problemas && report.principais_causas_problemas.length > 0 && (
        <Section id="causas" icon={AlertTriangle} title="Principais Causas de Problemas" iconColor="text-orange-500">
          <div className="mt-3 space-y-3">
            {report.principais_causas_problemas.map((c, i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium">{c.causa}</p>
                  <FrequencyBadge freq={c.frequencia} />
                </div>
                <p className="text-xs text-muted-foreground">{c.evidencia}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Ações Recomendadas */}
      {report.acoes_recomendadas && report.acoes_recomendadas.length > 0 && (
        <Section id="acoes" icon={Zap} title="Ações Recomendadas" iconColor="text-yellow-500">
          <div className="mt-3 space-y-3">
            {report.acoes_recomendadas.map((a, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{a.acao}</p>
                  <PriorityBadge priority={a.prioridade} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div><Clock className="h-3 w-3 inline mr-1" />{a.prazo_sugerido}</div>
                  <div><Users className="h-3 w-3 inline mr-1" />{a.responsavel_sugerido}</div>
                </div>
                <p className="text-xs text-muted-foreground"><strong>Impacto:</strong> {a.impacto_esperado}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Segmentação */}
      {report.segmentacao_clientes && report.segmentacao_clientes.length > 0 && (
        <Section id="segmentacao" icon={Users} title="Segmentação de Clientes" iconColor="text-blue-500">
          <div className="mt-3 space-y-3">
            {report.segmentacao_clientes.map((s, i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{s.segmento}</p>
                  <Badge variant="secondary">{s.quantidade} clientes</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{s.comportamento}</p>
                <p className="text-xs text-primary"><strong>Estratégia:</strong> {s.estrategia}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Sentimento Geral */}
      {report.sentimento_geral && (
        <Section id="sentimento" icon={Brain} title="Sentimento Geral" iconColor="text-pink-500">
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold">{report.sentimento_geral.score}/100</div>
              <Badge variant="outline" className="text-sm">{report.sentimento_geral.classificacao}</Badge>
            </div>
            <Progress value={report.sentimento_geral.score} />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-green-500 mb-1">👍 Drivers Positivos</p>
                <ul className="space-y-1">
                  {report.sentimento_geral.principais_drivers_positivos?.map((d, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-500 mb-1">👎 Drivers Negativos</p>
                <ul className="space-y-1">
                  {report.sentimento_geral.principais_drivers_negativos?.map((d, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {d}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Oportunidades de Crescimento */}
      {report.oportunidades_crescimento && report.oportunidades_crescimento.length > 0 && (
        <Section id="oportunidades" icon={Sparkles} title="Oportunidades de Crescimento" iconColor="text-emerald-500">
          <div className="mt-3 space-y-3">
            {report.oportunidades_crescimento.map((o, i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium">{o.oportunidade}</p>
                  <DifficultyBadge diff={o.dificuldade} />
                </div>
                <p className="text-xs text-muted-foreground">{o.descricao}</p>
                <p className="text-xs text-green-600 mt-1"><strong>Potencial:</strong> {o.potencial_receita}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Métricas de Engajamento */}
      {report.metricas_engajamento && (
        <Section id="engajamento" icon={BarChart3} title="Métricas de Engajamento" iconColor="text-cyan-500">
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Taxa de Resposta</p>
              <p className="text-lg font-bold">{report.metricas_engajamento.taxa_resposta_estimada}</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Tempo Médio Resposta</p>
              <p className="text-lg font-bold">{report.metricas_engajamento.tempo_medio_resposta}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {report.metricas_engajamento.canais_mais_ativos?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Canais mais ativos</p>
                <div className="flex flex-wrap gap-1">
                  {report.metricas_engajamento.canais_mais_ativos.map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            {report.metricas_engajamento.horarios_pico?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Horários de pico</p>
                <div className="flex flex-wrap gap-1">
                  {report.metricas_engajamento.horarios_pico.map((h, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{h}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Conclusão */}
      {report.conclusao && (
        <Section id="conclusao" icon={FileText} title="Conclusão e Visão Estratégica" iconColor="text-primary">
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{report.conclusao}</p>
        </Section>
      )}
    </div>
  );
}

export function CRMAIReports({ customerProductId }: CRMAIReportsProps) {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [parsedReport, setParsedReport] = useState<PredictiveReport | null>(null);

  useEffect(() => {
    if (user?.id) fetchReports();
  }, [user?.id]);

  const fetchReports = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("crm_ai_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch {
      toast.error("Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!user?.id || !customerProductId) {
      toast.error("Produto CRM não encontrado");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-predictive-report', {
        body: { user_id: user.id, customer_product_id: customerProductId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // If the edge function failed to save to DB, save client-side
      if (data?.saved_to_db === false && data?.report_content) {
        await supabase.from("crm_ai_reports").insert({
          user_id: user.id,
          title: data.title || `Relatório Preditivo - ${new Date().toLocaleDateString('pt-BR')}`,
          report_type: 'predictive_analysis',
          content: data.report_content,
        });
      }

      toast.success("Relatório preditivo gerado com sucesso!");
      await fetchReports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar relatório");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("crm_ai_reports").delete().eq("id", id);
      if (error) throw error;
      toast.success("Relatório excluído");
      fetchReports();
    } catch {
      toast.error("Erro ao excluir relatório");
    }
  };

  const handleView = (report: Report) => {
    setSelectedReport(report);
    try {
      const parsed = report.content ? JSON.parse(report.content) : null;
      setParsedReport(parsed);
    } catch {
      setParsedReport({ raw_response: report.content || "", parse_error: true });
    }
  };

  const handleExport = (report: Report) => {
    const blob = new Blob([JSON.stringify(JSON.parse(report.content || "{}"), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-preditivo-${format(new Date(report.generated_at || new Date()), "yyyy-MM-dd-HHmm")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = (report: Report) => {
    try {
      const parsed = JSON.parse(report.content || "{}");
      generateCRMReportPDF({
        title: report.title,
        generatedAt: report.generated_at
          ? format(new Date(report.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
          : "—",
        report: parsed,
      });
      toast.success("PDF gerado");
    } catch (e) {
      toast.error("Não foi possível gerar o PDF");
    }
  };

  if (loading) {
    return (
      <Card><CardContent className="py-8"><div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></CardContent></Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Relatórios Preditivos com IA
              </CardTitle>
              <CardDescription>
                Análises completas geradas pela IA com previsões, riscos, causas e ações recomendadas
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchReports}>
                <RefreshCw className="h-4 w-4 mr-2" />Atualizar
              </Button>
              <Button size="sm" onClick={generateReport} disabled={generating}>
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando Relatório...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Gerar Relatório Preditivo</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">Nenhum relatório gerado ainda</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Gerar Relatório Preditivo" para a IA analisar todos os dados do seu CRM
                </p>
              </div>
              <Button onClick={generateReport} disabled={generating}>
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Gerar Primeiro Relatório</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id}
                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-medium text-sm truncate">{report.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {report.generated_at && format(new Date(report.generated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {report.report_type === 'predictive_analysis' ? 'Análise Preditiva' : report.report_type}
                      </Badge>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleView(report)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExportPDF(report)} title="Exportar PDF">
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport(report)} title="Exportar JSON">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(report.id)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReport} onOpenChange={() => { setSelectedReport(null); setParsedReport(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {selectedReport?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.generated_at && format(new Date(selectedReport.generated_at), "dd/MM/yyyy HH:mm")}
              {" • Análise Preditiva com IA"}
            </DialogDescription>
          </DialogHeader>
          {parsedReport && <ReportViewer report={parsedReport} />}
          {selectedReport && parsedReport && !parsedReport.parse_error && (
            <div className="pt-4 border-t flex justify-end">
              <Button size="sm" onClick={() => handleExportPDF(selectedReport)}>
                <FileDown className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
