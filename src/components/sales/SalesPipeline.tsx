import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { DollarSign, Building2, GripVertical } from 'lucide-react';

interface SalesPipelineProps {
  customerProductId: string;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  ai_score: number;
  priority?: string;
  estimated_value?: number;
}

const STAGES = [
  { id: 'new', label: 'Novos', color: 'from-blue-500 to-blue-600' },
  { id: 'contacted', label: 'Contatados', color: 'from-purple-500 to-purple-600' },
  { id: 'qualified', label: 'Qualificados', color: 'from-amber-500 to-amber-600' },
  { id: 'proposal', label: 'Proposta', color: 'from-pink-500 to-pink-600' },
  { id: 'negotiation', label: 'Negociação', color: 'from-teal-500 to-teal-600' },
  { id: 'won', label: 'Ganhos', color: 'from-green-500 to-green-600' },
];

export function SalesPipeline({ customerProductId }: SalesPipelineProps) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (user) loadLeads();
  }, [user]);

  const loadLeads = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('sales_leads')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'lost')
      .order('ai_score', { ascending: false });

    if (!error && data) setLeads(data);
    setIsLoading(false);
  };

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null);
      return;
    }

    const { error } = await (supabase as any)
      .from('sales_leads')
      .update({ status: newStatus })
      .eq('id', draggedLead.id);

    if (error) {
      toast({ title: 'Erro ao mover lead', variant: 'destructive' });
    } else {
      toast({ title: 'Lead movido com sucesso!' });
      loadLeads();
    }
    setDraggedLead(null);
  };

  const getLeadsByStage = (stageId: string) => {
    return leads.filter(lead => lead.status === stageId);
  };

  const getStageValue = (stageId: string) => {
    return leads
      .filter(lead => lead.status === stageId)
      .reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pipeline de Vendas</h2>
        <p className="text-muted-foreground">
          Arraste os leads entre as etapas do funil
        </p>
      </div>

      {/* Pipeline Total */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total do Pipeline</p>
              <p className="text-3xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0)
                )}
              </p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leads Ganhos</p>
                <p className="text-2xl font-bold text-green-500">
                  {leads.filter(l => l.status === 'won').length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          const stageValue = getStageValue(stage.id);

          return (
            <div
              key={stage.id}
              className="min-w-[280px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <Card className="h-full">
                <CardHeader className={`bg-gradient-to-r ${stage.color} text-white rounded-t-lg py-3`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {stageLeads.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/80">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(stageValue)}
                  </p>
                </CardHeader>
                <CardContent className="p-2 space-y-2 min-h-[300px] bg-muted/30">
                  {stageLeads.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                      Arraste leads aqui
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead)}
                        className={`
                          bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing
                          hover:shadow-md transition-all duration-200
                          ${draggedLead?.id === lead.id ? 'opacity-50 scale-95' : ''}
                        `}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm truncate">{lead.name}</p>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(lead.priority)}`} />
                            </div>
                            
                            {lead.company && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Building2 className="h-3 w-3" />
                                <span className="truncate">{lead.company}</span>
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-emerald-500" />
                                <span className="text-xs font-medium">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(lead.estimated_value)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                                <span className="text-[10px] font-medium">{lead.ai_score || 0}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
