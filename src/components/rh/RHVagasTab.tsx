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
import { Plus, Pencil, Trash2, Users, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Vaga {
  id: string;
  titulo: string;
  descricao: string | null;
  requisitos: string | null;
  salario_min: number | null;
  salario_max: number | null;
  tipo_contrato: string | null;
  local: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
  candidatos_count?: number;
}

interface RHVagasTabProps {
  userId: string;
}

export function RHVagasTab({ userId }: RHVagasTabProps) {
  const { toast } = useToast();
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVaga, setEditingVaga] = useState<Vaga | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    requisitos: '',
    salario_min: '',
    salario_max: '',
    tipo_contrato: 'CLT',
    local: '',
    status: 'ativa'
  });

  useEffect(() => {
    loadVagas();
  }, [userId]);

  const loadVagas = async () => {
    try {
      const { data, error } = await supabase
        .from('rh_vagas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const vagasWithCount = await Promise.all((data || []).map(async (vaga) => {
        const { count } = await supabase
          .from('rh_candidatos')
          .select('*', { count: 'exact', head: true })
          .eq('vaga_id', vaga.id);
        return { ...vaga, candidatos_count: count || 0 };
      }));

      setVagas(vagasWithCount);
    } catch (error) {
      console.error('Error loading vagas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim()) {
      toast({ title: 'Erro', description: 'Título é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      const vagaData = {
        user_id: userId,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        requisitos: formData.requisitos || null,
        salario_min: formData.salario_min ? parseFloat(formData.salario_min) : null,
        salario_max: formData.salario_max ? parseFloat(formData.salario_max) : null,
        tipo_contrato: formData.tipo_contrato,
        local: formData.local || null,
        status: formData.status
      };

      if (editingVaga) {
        const { error } = await supabase
          .from('rh_vagas')
          .update(vagaData)
          .eq('id', editingVaga.id);
        if (error) throw error;
        toast({ title: 'Vaga atualizada!' });
      } else {
        const { error } = await supabase
          .from('rh_vagas')
          .insert(vagaData);
        if (error) throw error;
        toast({ title: 'Vaga criada!' });
      }

      setDialogOpen(false);
      resetForm();
      loadVagas();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (vaga: Vaga) => {
    setEditingVaga(vaga);
    setFormData({
      titulo: vaga.titulo,
      descricao: vaga.descricao || '',
      requisitos: vaga.requisitos || '',
      salario_min: vaga.salario_min?.toString() || '',
      salario_max: vaga.salario_max?.toString() || '',
      tipo_contrato: vaga.tipo_contrato || 'CLT',
      local: vaga.local || '',
      status: vaga.status || 'ativa'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta vaga?')) return;

    try {
      const { error } = await supabase.from('rh_vagas').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Vaga excluída!' });
      loadVagas();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingVaga(null);
    setFormData({
      titulo: '',
      descricao: '',
      requisitos: '',
      salario_min: '',
      salario_max: '',
      tipo_contrato: 'CLT',
      local: '',
      status: 'ativa'
    });
  };

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ativa: 'default',
      pausada: 'secondary',
      encerrada: 'destructive'
    };
    return <Badge variant={variants[status || ''] || 'outline'}>{status || 'N/A'}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Vagas Abertas
          </CardTitle>
          <CardDescription>Gerencie suas vagas de emprego</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nova Vaga</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVaga ? 'Editar Vaga' : 'Nova Vaga'}</DialogTitle>
              <DialogDescription>Preencha os detalhes da vaga</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="titulo">Título da Vaga *</Label>
                <Input id="titulo" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ex: Desenvolvedor Full Stack" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descreva as responsabilidades..." rows={3} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="requisitos">Requisitos</Label>
                <Textarea id="requisitos" value={formData.requisitos} onChange={(e) => setFormData({ ...formData, requisitos: e.target.value })} placeholder="Liste os requisitos..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="salario_min">Salário Mínimo</Label>
                  <Input id="salario_min" type="number" value={formData.salario_min} onChange={(e) => setFormData({ ...formData, salario_min: e.target.value })} placeholder="R$ 0,00" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="salario_max">Salário Máximo</Label>
                  <Input id="salario_max" type="number" value={formData.salario_max} onChange={(e) => setFormData({ ...formData, salario_max: e.target.value })} placeholder="R$ 0,00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo de Contrato</Label>
                  <Select value={formData.tipo_contrato} onValueChange={(value) => setFormData({ ...formData, tipo_contrato: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="Estágio">Estágio</SelectItem>
                      <SelectItem value="Freelancer">Freelancer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="encerrada">Encerrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="local">Local de Trabalho</Label>
                <Input id="local" value={formData.local} onChange={(e) => setFormData({ ...formData, local: e.target.value })} placeholder="Ex: São Paulo, SP" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editingVaga ? 'Salvar' : 'Criar Vaga'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {vagas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma vaga cadastrada</p>
            <p className="text-sm">Clique em "Nova Vaga" para começar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Candidatos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vagas.map((vaga) => (
                <TableRow key={vaga.id}>
                  <TableCell className="font-medium">{vaga.titulo}</TableCell>
                  <TableCell>{vaga.tipo_contrato || '-'}</TableCell>
                  <TableCell>{vaga.local || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {vaga.candidatos_count || 0}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(vaga.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {vaga.created_at && format(new Date(vaga.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(vaga)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(vaga.id)}>
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
