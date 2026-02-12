import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Phone,
  Mail,
  MessageSquare,
  Users,
  Linkedin,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar
} from 'lucide-react';

interface SalesFollowUpsProps {
  customerProductId: string;
}

interface Lead {
  id: string;
  name: string;
  company: string | null;
}

interface FollowUp {
  id: string;
  lead_id: string;
  type: string;
  subject: string | null;
  content: string | null;
  status: string;
  scheduled_at: string;
  completed_at: string | null;
  outcome: string | null;
  lead?: Lead;
}

const TYPE_OPTIONS = [
  { value: 'call', label: 'Ligação', icon: Phone, color: 'text-blue-500' },
  { value: 'email', label: 'Email', icon: Mail, color: 'text-purple-500' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-500' },
  { value: 'meeting', label: 'Reunião', icon: Users, color: 'text-amber-500' },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
  { value: 'other', label: 'Outro', icon: MoreHorizontal, color: 'text-gray-500' },
];

export function SalesFollowUps({ customerProductId }: SalesFollowUpsProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const [formData, setFormData] = useState({
    lead_id: '',
    type: 'call',
    subject: '',
    content: '',
    scheduled_at: ''
  });

  useEffect(() => {
    loadData();
  }, [customerProductId]);

  const loadData = async () => {
    setIsLoading(true);

    // Use as any to bypass type errors for non-existent tables
    const [leadsRes, followUpsRes] = await Promise.all([
      (supabase as any)
        .from('sales_leads')
        .select('id, name, company')
        .eq('customer_product_id', customerProductId),
      (supabase as any)
        .from('sales_follow_ups')
        .select(`
          *,
          sales_leads!inner(id, name, company, customer_product_id)
        `)
        .eq('sales_leads.customer_product_id', customerProductId)
        .order('scheduled_at', { ascending: true })
    ]);

    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    if (followUpsRes.data) {
      const mappedFollowUps = (followUpsRes.data as any[]).map(f => ({
        ...f,
        lead: f.sales_leads
      }));
      setFollowUps(mappedFollowUps as FollowUp[]);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.lead_id || !formData.scheduled_at) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const { error } = await (supabase as any).from('sales_follow_ups').insert({
      lead_id: formData.lead_id,
      type: formData.type,
      subject: formData.subject || null,
      content: formData.content || null,
      scheduled_at: formData.scheduled_at
    });

    if (error) {
      toast({ title: 'Erro ao criar follow-up', variant: 'destructive' });
    } else {
      toast({ title: 'Follow-up agendado!' });
      setIsDialogOpen(false);
      setFormData({ lead_id: '', type: 'call', subject: '', content: '', scheduled_at: '' });
      loadData();
    }
  };

  const handleComplete = async (id: string, outcome: string) => {
    const { error } = await (supabase as any)
      .from('sales_follow_ups')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        outcome 
      })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao completar follow-up', variant: 'destructive' });
    } else {
      toast({ title: 'Follow-up concluído!' });
      loadData();
    }
  };

  const filteredFollowUps = followUps.filter(f => {
    if (filter === 'pending') return f.status === 'pending';
    if (filter === 'completed') return f.status === 'completed';
    return true;
  });

  const getStatusIcon = (followUp: FollowUp) => {
    if (followUp.status === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    const scheduledDate = parseISO(followUp.scheduled_at);
    if (isPast(scheduledDate)) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return <Clock className="h-5 w-5 text-amber-500" />;
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd 'de' MMM", { locale: ptBR });
  };

  const getTypeInfo = (type: string) => {
    return TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[5];
  };

  // Group by date
  const groupedFollowUps = filteredFollowUps.reduce((acc, followUp) => {
    const dateKey = format(parseISO(followUp.scheduled_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(followUp);
    return acc;
  }, {} as Record<string, FollowUp[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Follow-ups</h2>
          <p className="text-muted-foreground">
            {followUps.filter(f => f.status === 'pending').length} pendentes
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: 'all' | 'pending' | 'completed') => setFilter(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Follow-up
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{followUps.filter(f => f.status === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {followUps.filter(f => f.status === 'pending' && isPast(parseISO(f.scheduled_at))).length}
                </p>
                <p className="text-sm text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {followUps.filter(f => f.status === 'pending' && isToday(parseISO(f.scheduled_at))).length}
                </p>
                <p className="text-sm text-muted-foreground">Para Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{followUps.filter(f => f.status === 'completed').length}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="p-6">
          {Object.keys(groupedFollowUps).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum follow-up encontrado
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedFollowUps).map(([date, items]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-sm">
                      {getDateLabel(items[0].scheduled_at)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(items[0].scheduled_at), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {items.map((followUp) => {
                      const typeInfo = getTypeInfo(followUp.type);
                      const TypeIcon = typeInfo.icon;
                      
                      return (
                        <div
                          key={followUp.id}
                          className={`
                            flex items-start gap-4 p-4 rounded-lg border
                            ${followUp.status === 'completed' ? 'bg-muted/30 opacity-60' : 'bg-card'}
                          `}
                        >
                          <div className={`p-2 rounded-lg bg-muted ${typeInfo.color}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{followUp.lead?.name}</p>
                              {followUp.lead?.company && (
                                <span className="text-sm text-muted-foreground">
                                  • {followUp.lead.company}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {followUp.subject || typeInfo.label}
                            </p>
                            {followUp.content && (
                              <p className="text-sm mt-2">{followUp.content}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(parseISO(followUp.scheduled_at), "HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(followUp)}
                            {followUp.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const outcome = prompt('Qual foi o resultado deste follow-up?');
                                  if (outcome !== null) {
                                    handleComplete(followUp.id, outcome);
                                  }
                                }}
                              >
                                Concluir
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Follow-up</DialogTitle>
            <DialogDescription>Agende um novo follow-up com um lead</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lead *</Label>
              <Select value={formData.lead_id} onValueChange={(v) => setFormData({ ...formData, lead_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} {lead.company && `(${lead.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data e Hora *</Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Assunto do follow-up"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Detalhes do follow-up..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Agendar Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
