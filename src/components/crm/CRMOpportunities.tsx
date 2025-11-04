import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Opportunity {
  id: string;
  customer_id: string;
  title: string;
  value: number;
  stage: string;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
}

interface CRMOpportunitiesProps {
  opportunities: Opportunity[];
  customers: any[];
  onRefresh: () => void;
}

const stages = [
  { value: 'novo_lead', label: 'Novo Lead', color: 'bg-blue-100 text-blue-800' },
  { value: 'contato_feito', label: 'Contato Feito', color: 'bg-purple-100 text-purple-800' },
  { value: 'em_negociacao', label: 'Em Negociação', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'fechado_ganho', label: 'Fechado (Ganho)', color: 'bg-green-100 text-green-800' },
  { value: 'fechado_perdido', label: 'Fechado (Perdido)', color: 'bg-red-100 text-red-800' }
];

export const CRMOpportunities = ({ opportunities, customers, onRefresh }: CRMOpportunitiesProps) => {
  const [isAddingOpportunity, setIsAddingOpportunity] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleAddOpportunity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const { error } = await supabase.from('crm_opportunities').insert({
      customer_id: formData.get('customer_id') as string,
      title: formData.get('title') as string,
      value: parseFloat(formData.get('value') as string) || 0,
      stage: formData.get('stage') as string || 'novo_lead',
      expected_close_date: formData.get('expected_close_date') as string || null,
      notes: formData.get('notes') as string || null
    });

    if (!error) {
      toast({ title: "Oportunidade criada com sucesso!" });
      setIsAddingOpportunity(false);
      onRefresh();
    } else {
      toast({ title: "Erro ao criar oportunidade", variant: "destructive" });
    }
  };

  const handleDragStart = (opportunityId: string) => {
    setDraggedItem(opportunityId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStage: string) => {
    if (!draggedItem) return;

    const { error } = await supabase
      .from('crm_opportunities')
      .update({ stage: newStage })
      .eq('id', draggedItem);

    if (!error) {
      toast({ title: "Oportunidade atualizada!" });
      onRefresh();
    }
    setDraggedItem(null);
  };

  const getOpportunitiesByStage = (stage: string) => {
    return opportunities.filter(opp => opp.stage === stage);
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Cliente Desconhecido';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pipeline de Oportunidades</h2>
        <Dialog open={isAddingOpportunity} onOpenChange={setIsAddingOpportunity}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddOpportunity}>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Oportunidade</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="customer_id">Cliente *</Label>
                  <Select name="customer_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="value">Valor Potencial (R$)</Label>
                  <Input id="value" name="value" type="number" step="0.01" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stage">Estágio</Label>
                  <Select name="stage" defaultValue="novo_lead">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(stage => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expected_close_date">Data Prevista de Fechamento</Label>
                  <Input id="expected_close_date" name="expected_close_date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" name="notes" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Criar Oportunidade</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stages.map(stage => {
          const stageOpportunities = getOpportunitiesByStage(stage.value);
          const totalValue = stageOpportunities.reduce((sum, opp) => sum + Number(opp.value), 0);

          return (
            <div
              key={stage.value}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.value)}
              className="flex flex-col"
            >
              <Card className="flex-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {stage.label}
                    <Badge variant="outline" className="ml-2">
                      {stageOpportunities.length}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Total: R$ {totalValue.toFixed(2)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stageOpportunities.map(opportunity => (
                    <Card
                      key={opportunity.id}
                      draggable
                      onDragStart={() => handleDragStart(opportunity.id)}
                      className="cursor-move hover:shadow-md transition-shadow p-3"
                    >
                      <h4 className="font-semibold text-sm mb-1">{opportunity.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {getCustomerName(opportunity.customer_id)}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-primary">
                          <DollarSign className="h-3 w-3" />
                          R$ {Number(opportunity.value).toFixed(2)}
                        </div>
                        {opportunity.expected_close_date && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(opportunity.expected_close_date).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  {stageOpportunities.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhuma oportunidade
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};