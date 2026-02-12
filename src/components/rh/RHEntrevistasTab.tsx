import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Plus, Pencil, Trash2, MapPin, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Entrevista {
  id: string;
  candidato_id: string | null;
  vaga_id: string | null;
  data_hora: string;
  tipo: string | null;
  entrevistador: string | null;
  local: string | null;
  notas: string | null;
  status: string | null;
  created_at: string | null;
  user_id: string;
  candidato?: { nome: string };
  vaga?: { titulo: string };
}

interface Candidato {
  id: string;
  nome: string;
}

interface Vaga {
  id: string;
  titulo: string;
}

interface RHEntrevistasTabProps {
  userId: string;
}

export function RHEntrevistasTab({ userId }: RHEntrevistasTabProps) {
  const { toast } = useToast();
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntrevista, setEditingEntrevista] = useState<Entrevista | null>(null);
  const [formData, setFormData] = useState({
    candidato_id: '',
    vaga_id: '',
    data_hora: '',
    tipo: 'online',
    local: '',
    notas: '',
    status: 'agendada',
    entrevistador: ''
  });

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [entrevistasRes, candidatosRes, vagasRes] = await Promise.all([
        supabase.from('rh_entrevistas').select('*').eq('user_id', userId).order('data_hora', { ascending: true }),
        supabase.from('rh_candidatos').select('id, nome').eq('user_id', userId),
        supabase.from('rh_vagas').select('id, titulo').eq('user_id', userId)
      ]);

      if (entrevistasRes.error) throw entrevistasRes.error;
      if (candidatosRes.error) throw candidatosRes.error;
      if (vagasRes.error) throw vagasRes.error;

      const candidatosMap = new Map(candidatosRes.data?.map(c => [c.id, c.nome]) || []);
      const vagasMap = new Map(vagasRes.data?.map(v => [v.id, v.titulo]) || []);
      
      const entrevistasWithNames = (entrevistasRes.data || []).map(e => ({
        ...e,
        candidato: e.candidato_id ? { nome: candidatosMap.get(e.candidato_id) || 'Desconhecido' } : undefined,
        vaga: e.vaga_id ? { titulo: vagasMap.get(e.vaga_id) || 'Sem vaga' } : undefined
      }));

      setEntrevistas(entrevistasWithNames);
      setCandidatos(candidatosRes.data || []);
      setVagas(vagasRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.candidato_id || !formData.data_hora) {
      toast({ title: 'Erro', description: 'Candidato e data/hora são obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      const entrevistaData = {
        user_id: userId,
        candidato_id: formData.candidato_id,
        vaga_id: formData.vaga_id || null,
        data_hora: new Date(formData.data_hora).toISOString(),
        tipo: formData.tipo,
        local: formData.local || null,
        notas: formData.notas || null,
        status: formData.status,
        entrevistador: formData.entrevistador || null
      };

      if (editingEntrevista) {
        const { error } = await supabase.from('rh_entrevistas').update(entrevistaData).eq('id', editingEntrevista.id);
        if (error) throw error;
        toast({ title: 'Entrevista atualizada!' });
      } else {
        const { error } = await supabase.from('rh_entrevistas').insert(entrevistaData);
        if (error) throw error;
        toast({ title: 'Entrevista agendada!' });
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (entrevista: Entrevista) => {
    setEditingEntrevista(entrevista);
    setFormData({
      candidato_id: entrevista.candidato_id || '',
      vaga_id: entrevista.vaga_id || '',
      data_hora: format(new Date(entrevista.data_hora), "yyyy-MM-dd'T'HH:mm"),
      tipo: entrevista.tipo || 'online',
      local: entrevista.local || '',
      notas: entrevista.notas || '',
      status: entrevista.status || 'agendada',
      entrevistador: entrevista.entrevistador || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta entrevista?')) return;
    try {
      const { error } = await supabase.from('rh_entrevistas').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Entrevista excluída!' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingEntrevista(null);
    setFormData({
      candidato_id: '',
      vaga_id: '',
      data_hora: '',
      tipo: 'online',
      local: '',
      notas: '',
      status: 'agendada',
      entrevistador: ''
    });
  };

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      agendada: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      realizada: 'bg-green-500/10 text-green-500 border-green-500/20',
      cancelada: 'bg-red-500/10 text-red-500 border-red-500/20',
      remarcada: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    };
    return <Badge variant="outline" className={styles[status || ''] || ''}>{status || 'N/A'}</Badge>;
  };

  const isUpcoming = (date: string) => new Date(date) > new Date();

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agenda de Entrevistas
          </CardTitle>
          <CardDescription>Agende e gerencie entrevistas com candidatos</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Agendar Entrevista</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEntrevista ? 'Editar Entrevista' : 'Agendar Entrevista'}</DialogTitle>
              <DialogDescription>Preencha os detalhes da entrevista</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Candidato *</Label>
                <Select value={formData.candidato_id} onValueChange={(v) => setFormData({ ...formData, candidato_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o candidato" /></SelectTrigger>
                  <SelectContent>
                    {candidatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Vaga</Label>
                <Select value={formData.vaga_id} onValueChange={(v) => setFormData({ ...formData, vaga_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a vaga" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem vaga específica</SelectItem>
                    {vagas.map(v => <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Data e Hora *</Label>
                <Input type="datetime-local" value={formData.data_hora} onChange={(e) => setFormData({ ...formData, data_hora: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendada">Agendada</SelectItem>
                      <SelectItem value="realizada">Realizada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                      <SelectItem value="remarcada">Remarcada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Local</Label>
                <Input value={formData.local} onChange={(e) => setFormData({ ...formData, local: e.target.value })} placeholder="Local ou link da reunião..." />
              </div>
              <div className="grid gap-2">
                <Label>Notas</Label>
                <Textarea value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} placeholder="Observações sobre a entrevista..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editingEntrevista ? 'Salvar' : 'Agendar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {entrevistas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma entrevista agendada</p>
            <p className="text-sm">Clique em "Agendar Entrevista" para começar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entrevistas.map((e) => (
                <TableRow key={e.id} className={!isUpcoming(e.data_hora) ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {e.candidato?.nome || 'Desconhecido'}
                    </div>
                  </TableCell>
                  <TableCell>{e.vaga?.titulo || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(e.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {e.tipo || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(e.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
