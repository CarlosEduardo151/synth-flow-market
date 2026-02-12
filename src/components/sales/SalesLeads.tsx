import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Phone,
  Mail,
  Building2,
  Trash2,
  Edit,
  UserPlus,
  Brain,
  Sparkles,
  Loader2,
  Wand2,
  MessageSquare
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SalesLeadsProps {
  customerProductId: string;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  source: string;
  ai_score: number;
  ai_sentiment: string | null;
  ai_analysis: string | null;
  status: string;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Novo', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contatado', color: 'bg-purple-500' },
  { value: 'qualified', label: 'Qualificado', color: 'bg-amber-500' },
  { value: 'proposal', label: 'Proposta', color: 'bg-pink-500' },
  { value: 'negotiation', label: 'Negociação', color: 'bg-emerald-500' },
  { value: 'won', label: 'Ganho', color: 'bg-green-500' },
  { value: 'lost', label: 'Perdido', color: 'bg-red-500' },
];

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Indicação' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'event', label: 'Evento' },
  { value: 'crm_sync', label: 'Sincronizado do CRM' },
  { value: 'other', label: 'Outro' },
];

export function SalesLeads({ customerProductId }: SalesLeadsProps) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scoringLeadId, setScoringLeadId] = useState<string | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState<string | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'manual',
    status: 'new',
    notes: ''
  });

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
      .order('created_at', { ascending: false });

    if (!error && data) setLeads(data);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      source: 'manual',
      status: 'new',
      notes: ''
    });
    setEditingLead(null);
  };

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        position: lead.position || '',
        source: lead.source,
        status: lead.status,
        notes: lead.notes || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !formData.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    const leadData = {
      user_id: user.id,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      company: formData.company || null,
      position: formData.position || null,
      source: formData.source,
      status: formData.status,
      notes: formData.notes || null
    };

    let error;
    if (editingLead) {
      ({ error } = await supabase.from('sales_leads').update(leadData).eq('id', editingLead.id));
    } else {
      ({ error } = await supabase.from('sales_leads').insert(leadData));
    }

    if (error) {
      toast({ title: 'Erro ao salvar lead', variant: 'destructive' });
    } else {
      toast({ title: editingLead ? 'Lead atualizado!' : 'Lead criado com sucesso!' });
      setIsDialogOpen(false);
      resetForm();
      loadLeads();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;

    const { error } = await supabase.from('sales_leads').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir lead', variant: 'destructive' });
    } else {
      toast({ title: 'Lead excluído!' });
      loadLeads();
    }
  };

  const handleAIScore = async (lead: Lead) => {
    if (!user) return;
    setScoringLeadId(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke('sales-ai', {
        body: { 
          action: 'score_lead', 
          userId: user.id,
          data: { lead }
        }
      });

      if (error) throw error;
      if (data?.success && data?.data) {
        const result = data.data;
        await supabase.from('sales_leads').update({
          ai_score: result.score || 0,
          ai_analysis: result.recommendation || null
        }).eq('id', lead.id);

        toast({ 
          title: `Score: ${result.score}/100`,
          description: result.recommendation?.substring(0, 100)
        });
        loadLeads();
      }
    } catch (error: any) {
      toast({ title: 'Erro ao pontuar lead', description: error.message, variant: 'destructive' });
    } finally {
      setScoringLeadId(null);
    }
  };

  const handleGenerateEmail = async (lead: Lead, type: string = 'follow-up') => {
    if (!user) return;
    setGeneratingEmail(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke('sales-ai', {
        body: { 
          action: 'generate_email', 
          userId: user.id,
          data: { lead, type }
        }
      });

      if (error) throw error;
      if (data?.success && data?.data) {
        setGeneratedEmail({ subject: data.data.subject, body: data.data.body });
        setShowEmailDialog(true);
      }
    } catch (error: any) {
      toast({ title: 'Erro ao gerar email', description: error.message, variant: 'destructive' });
    } finally {
      setGeneratingEmail(null);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return <Badge className={`${statusOption?.color} text-white`}>{statusOption?.label}</Badge>;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Leads</h2>
          <p className="text-muted-foreground">{leads.length} leads cadastrados</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score IA</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        {lead.company && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {lead.company}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.email && (
                          <p className="text-sm flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {lead.email}
                          </p>
                        )}
                        {lead.phone && (
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {lead.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                            style={{ width: `${lead.ai_score || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{lead.ai_score || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{SOURCE_OPTIONS.find(s => s.value === lead.source)?.label || lead.source}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAIScore(lead)} disabled={scoringLeadId === lead.id}>
                            {scoringLeadId === lead.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                            Pontuar com IA
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateEmail(lead)} disabled={generatingEmail === lead.id}>
                            {generatingEmail === lead.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                            Gerar Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenDialog(lead)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(lead.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
            <DialogDescription>
              {editingLead ? 'Atualize as informações do lead' : 'Adicione um novo lead ao pipeline'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do lead" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Nome da empresa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input id="position" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} placeholder="Cargo do lead" />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map(source => (
                    <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observações sobre o lead..." rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingLead ? 'Salvar' : 'Criar Lead'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Email Gerado pela IA
            </DialogTitle>
          </DialogHeader>
          {generatedEmail && (
            <div className="space-y-4">
              <div>
                <Label>Assunto</Label>
                <Input value={generatedEmail.subject} readOnly className="mt-1" />
              </div>
              <div>
                <Label>Corpo do Email</Label>
                <Textarea value={generatedEmail.body} readOnly className="mt-1 min-h-[200px]" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(`Assunto: ${generatedEmail.subject}\n\n${generatedEmail.body}`)}>
                  Copiar
                </Button>
                <Button onClick={() => setShowEmailDialog(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
