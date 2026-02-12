import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Users, Star, Phone, Mail, Eye, Trash2, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Candidato {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  avaliacao: number | null;
  notas: string | null;
  status: string | null;
  etapa: string | null;
  vaga_id: string | null;
  linkedin: string | null;
  curriculo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
  vaga?: { titulo: string };
}

interface Vaga {
  id: string;
  titulo: string;
}

interface RHCandidatosTabProps {
  userId: string;
}

export function RHCandidatosTab({ userId }: RHCandidatosTabProps) {
  const { toast } = useToast();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidato, setSelectedCandidato] = useState<Candidato | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterVaga, setFilterVaga] = useState<string>('all');
  const [filterEtapa, setFilterEtapa] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [candidatosRes, vagasRes] = await Promise.all([
        supabase.from('rh_candidatos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('rh_vagas').select('id, titulo').eq('user_id', userId)
      ]);

      if (candidatosRes.error) throw candidatosRes.error;
      if (vagasRes.error) throw vagasRes.error;

      const vagasMap = new Map(vagasRes.data?.map(v => [v.id, v.titulo]) || []);
      const candidatosWithVaga = (candidatosRes.data || []).map(c => ({
        ...c,
        vaga: c.vaga_id ? { titulo: vagasMap.get(c.vaga_id) || 'Sem vaga' } : undefined
      }));

      setCandidatos(candidatosWithVaga);
      setVagas(vagasRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEtapa = async (id: string, etapa: string) => {
    try {
      const { error } = await supabase.from('rh_candidatos').update({ etapa }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Etapa atualizada!' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este candidato?')) return;
    try {
      const { error } = await supabase.from('rh_candidatos').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Candidato excluído!' });
      setDetailsOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleAssignVaga = async (candidatoId: string, vagaId: string | null) => {
    try {
      const { error } = await supabase.from('rh_candidatos').update({ vaga_id: vagaId }).eq('id', candidatoId);
      if (error) throw error;
      toast({ title: 'Vaga atribuída!' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const getEtapaBadge = (etapa: string | null) => {
    const colors: Record<string, string> = {
      triagem: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      entrevista: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      teste: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      oferta: 'bg-green-500/10 text-green-500 border-green-500/20',
      contratado: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      rejeitado: 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return <Badge variant="outline" className={colors[etapa || ''] || ''}>{etapa || 'N/A'}</Badge>;
  };

  const getAvaliacaoStars = (avaliacao: number | null) => {
    if (!avaliacao) return <span className="text-muted-foreground text-sm">N/A</span>;
    return (
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="font-medium">{avaliacao.toFixed(1)}</span>
      </div>
    );
  };

  const filteredCandidatos = candidatos.filter(c => {
    if (filterVaga !== 'all' && c.vaga_id !== filterVaga) return false;
    if (filterEtapa !== 'all' && c.etapa !== filterEtapa) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pipeline de Candidatos
              </CardTitle>
              <CardDescription>Candidatos recebidos e triados</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterVaga} onValueChange={setFilterVaga}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Vaga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as vagas</SelectItem>
                  {vagas.map(v => <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterEtapa} onValueChange={setFilterEtapa}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas etapas</SelectItem>
                  <SelectItem value="triagem">Triagem</SelectItem>
                  <SelectItem value="entrevista">Entrevista</SelectItem>
                  <SelectItem value="teste">Teste</SelectItem>
                  <SelectItem value="oferta">Oferta</SelectItem>
                  <SelectItem value="contratado">Contratado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCandidatos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum candidato encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Recebido em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidatos.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedCandidato(c); setDetailsOpen(true); }}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{getAvaliacaoStars(c.avaliacao)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={c.vaga_id || ''} onValueChange={(v) => handleAssignVaga(c.id, v || null)}>
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sem vaga</SelectItem>
                          {vagas.map(v => <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={c.etapa || 'triagem'} onValueChange={(v) => handleUpdateEtapa(c.id, v)}>
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="triagem">Triagem</SelectItem>
                          <SelectItem value="entrevista">Entrevista</SelectItem>
                          <SelectItem value="teste">Teste</SelectItem>
                          <SelectItem value="oferta">Oferta</SelectItem>
                          <SelectItem value="contratado">Contratado</SelectItem>
                          <SelectItem value="rejeitado">Rejeitado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.created_at && format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedCandidato(c); setDetailsOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Candidato</DialogTitle>
            <DialogDescription>Informações completas</DialogDescription>
          </DialogHeader>
          {selectedCandidato && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Nome</Label>
                    <p className="font-medium text-lg">{selectedCandidato.nome}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Avaliação</Label>
                    {getAvaliacaoStars(selectedCandidato.avaliacao)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Telefone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p>{selectedCandidato.telefone || 'Não informado'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">E-mail</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p>{selectedCandidato.email || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                {selectedCandidato.notas && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Notas</Label>
                    <div className="mt-1 p-4 bg-muted rounded-lg">
                      <p className="whitespace-pre-wrap text-sm">{selectedCandidato.notas}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Etapa</Label>
                    <div className="mt-1">{getEtapaBadge(selectedCandidato.etapa)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Recebido em</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p>{selectedCandidato.created_at && format(new Date(selectedCandidato.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => selectedCandidato && handleDelete(selectedCandidato.id)}>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
