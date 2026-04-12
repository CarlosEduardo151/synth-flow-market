import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Eye, Brain, Flame, Snowflake, ThermometerSun } from "lucide-react";

interface Props {
  customerProductId: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  interest: string;
  sentiment: string;
  purchase_intent_score: number;
  next_step: string;
  tags: string[];
  total_interactions: number;
  stage?: string;
}

const KANBAN_COLUMNS = [
  { key: "novo", label: "Novo Contato", color: "bg-blue-500/10 border-blue-500/30" },
  { key: "interessado", label: "Interessado", color: "bg-yellow-500/10 border-yellow-500/30" },
  { key: "orcamento", label: "Orçamento Enviado", color: "bg-purple-500/10 border-purple-500/30" },
  { key: "fechado", label: "Fechado ✅", color: "bg-green-500/10 border-green-500/30" },
];

function getLeadStage(lead: Lead): string {
  if (lead.stage) return lead.stage;
  const score = lead.purchase_intent_score || 0;
  if (score >= 8) return "fechado";
  if (score >= 6) return "orcamento";
  if (score >= 3) return "interessado";
  return "novo";
}

function getTemperature(score: number) {
  if (score >= 7) return { label: "Quente", color: "bg-orange-500", textColor: "text-orange-400", icon: Flame, pct: Math.min(score * 10, 100) };
  if (score >= 4) return { label: "Morno", color: "bg-yellow-500", textColor: "text-yellow-400", icon: ThermometerSun, pct: score * 10 };
  return { label: "Frio", color: "bg-blue-400", textColor: "text-blue-400", icon: Snowflake, pct: Math.max(score * 10, 10) };
}

function LeadCard({ lead }: { lead: Lead }) {
  const temp = getTemperature(lead.purchase_intent_score || 0);
  const TempIcon = temp.icon;

  return (
    <div className="p-3 rounded-lg border bg-card hover:shadow-md transition-shadow space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{lead.name || "Sem nome"}</p>
          <p className="text-[11px] text-muted-foreground">{lead.phone}</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-sm" side="left">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm">Resumo da IA</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {lead.interest
                  ? `Este cliente busca ${lead.interest}${lead.sentiment ? `, demonstra sentimento ${lead.sentiment}` : ""}${lead.next_step ? `. Próximo passo: ${lead.next_step}` : ""}.`
                  : "Sem dados suficientes para resumo."}
              </p>
              {lead.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lead.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className="pt-1 border-t text-[11px] text-muted-foreground">
                {lead.total_interactions || 1} interações registradas
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Temperature Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <TempIcon className={`h-3 w-3 ${temp.textColor}`} />
            <span className={`text-[10px] font-medium ${temp.textColor}`}>{temp.label}</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">{lead.purchase_intent_score || 0}/10</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${temp.color} transition-all`}
            style={{ width: `${temp.pct}%` }}
          />
        </div>
      </div>

      {lead.source && (
        <Badge variant="secondary" className="text-[10px]">{lead.source}</Badge>
      )}
    </div>
  );
}

export function MicroBizCRM({ customerProductId }: Props) {
  const { data: leads, isLoading } = useQuery({
    queryKey: ["micro-biz-leads", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_leads" as any)
        .select("*")
        .eq("customer_product_id", customerProductId)
        .order("last_contact_at", { ascending: false });
      return (data || []) as Lead[];
    },
    enabled: !!customerProductId,
  });

  if (isLoading) return <div className="text-center p-8 text-muted-foreground">Carregando...</div>;

  const leadsByStage: Record<string, Lead[]> = { novo: [], interessado: [], orcamento: [], fechado: [] };
  (leads || []).forEach((lead) => {
    const stage = getLeadStage(lead);
    if (leadsByStage[stage]) leadsByStage[stage].push(lead);
    else leadsByStage.novo.push(lead);
  });

  const totalLeads = leads?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" /> CRM Invisível — Pipeline
          </h3>
          <p className="text-xs text-muted-foreground">Leads extraídos automaticamente de conversas WhatsApp via IA.</p>
        </div>
        <Badge variant="outline">{totalLeads} leads</Badge>
      </div>

      {!totalLeads ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Nenhum lead capturado ainda. Conecte seu WhatsApp para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.key} className={`rounded-xl border p-3 space-y-3 ${col.color}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{col.label}</h4>
                <Badge variant="secondary" className="text-[10px] h-5">{leadsByStage[col.key]?.length || 0}</Badge>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {(leadsByStage[col.key] || []).map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
