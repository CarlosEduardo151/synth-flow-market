import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Wrench, Search, CheckCircle, XCircle, Clock, Eye, MapPin, Phone, Mail,
  DollarSign, FileText, Building2, ShieldCheck, AlertTriangle, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Workshop {
  id: string;
  cnpj: string;
  nome_fantasia: string | null;
  razao_social: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  categorias: string[] | null;
  valor_hora_tecnica: number | null;
  banco_nome: string | null;
  banco_agencia: string | null;
  banco_conta: string | null;
  banco_tipo_conta: string | null;
  banco_titular: string | null;
  banco_cpf_cnpj: string | null;
  pix_chave: string | null;
  alvara_url: string | null;
  fachada_url: string | null;
  status: string;
  observacoes_admin: string | null;
  aprovado_em: string | null;
  aprovado_por: string | null;
  created_at: string;
  user_id: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
  aprovado: { label: 'Aprovada', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle },
  rejeitado: { label: 'Rejeitada', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: XCircle },
  suspenso: { label: 'Suspensa', color: 'bg-slate-500/10 text-slate-600 border-slate-500/30', icon: AlertTriangle },
};

const AdminWorkshopReviewPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate('/auth');
      else if (!isAdmin) navigate('/');
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const fetchWorkshops = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fleet_partner_workshops')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWorkshops((data as Workshop[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar oficinas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchWorkshops();
  }, [isAdmin]);

  const handleAction = async (action: 'aprovado' | 'rejeitado' | 'suspenso') => {
    if (!selectedWorkshop || !user) return;
    setActionLoading(true);
    try {
      const updates: Record<string, unknown> = {
        status: action,
        observacoes_admin: adminNotes || null,
      };
      if (action === 'aprovado') {
        updates.aprovado_em = new Date().toISOString();
        updates.aprovado_por = user.id;
      }
      const { error } = await supabase
        .from('fleet_partner_workshops')
        .update(updates)
        .eq('id', selectedWorkshop.id);
      if (error) throw error;
      toast.success(`Oficina ${action === 'aprovado' ? 'aprovada' : action === 'rejeitado' ? 'rejeitada' : 'suspensa'} com sucesso`);
      setDetailOpen(false);
      fetchWorkshops();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = (w: Workshop) => {
    setSelectedWorkshop(w);
    setAdminNotes(w.observacoes_admin || '');
    setDetailOpen(true);
  };

  const filtered = workshops.filter(w => {
    const matchStatus = filterStatus === 'all' || w.status === filterStatus;
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      (w.nome_fantasia || '').toLowerCase().includes(term) ||
      (w.razao_social || '').toLowerCase().includes(term) ||
      w.cnpj.includes(term) ||
      (w.cidade || '').toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const counts = {
    total: workshops.length,
    pendente: workshops.filter(w => w.status === 'pendente').length,
    aprovado: workshops.filter(w => w.status === 'aprovado').length,
    rejeitado: workshops.filter(w => w.status === 'rejeitado').length,
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Análise de Oficinas Parceiras</h1>
            </div>
            <p className="text-muted-foreground ml-12">Revise, aprove ou rejeite os cadastros de oficinas.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchWorkshops} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: counts.total, icon: Building2, color: 'text-foreground' },
            { label: 'Pendentes', value: counts.pendente, icon: Clock, color: 'text-amber-600' },
            { label: 'Aprovadas', value: counts.aprovado, icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Rejeitadas', value: counts.rejeitado, icon: XCircle, color: 'text-red-600' },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovado">Aprovadas</SelectItem>
                <SelectItem value="rejeitado">Rejeitadas</SelectItem>
                <SelectItem value="suspenso">Suspensas</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Cadastros recebidos</CardTitle>
            <CardDescription>{filtered.length} oficina(s) encontrada(s)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Wrench className="h-10 w-10 mb-3 opacity-40" />
                <p>Nenhuma oficina encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Oficina</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Categorias</TableHead>
                      <TableHead>Hora Técnica</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((w) => {
                      const sc = statusConfig[w.status] || statusConfig.pendente;
                      const StatusIcon = sc.icon;
                      return (
                        <TableRow key={w.id} className="group">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{w.nome_fantasia || '—'}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{w.razao_social}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{w.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {w.cidade || '—'}/{w.estado || '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(w.categorias || []).slice(0, 2).map(c => (
                                <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0">{c}</Badge>
                              ))}
                              {(w.categorias || []).length > 2 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{(w.categorias || []).length - 2}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-foreground">R$ {(w.valor_hora_tecnica || 0).toFixed(2)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${sc.color} gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(w.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => openDetail(w)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Analisar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedWorkshop && (() => {
              const w = selectedWorkshop;
              const sc = statusConfig[w.status] || statusConfig.pendente;
              const StatusIcon = sc.icon;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-primary" />
                      {w.nome_fantasia || w.razao_social || 'Oficina'}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      <Badge variant="outline" className={`${sc.color} gap-1`}>
                        <StatusIcon className="h-3 w-3" />
                        {sc.label}
                      </Badge>
                      <span>Cadastrado em {format(new Date(w.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 mt-4">
                    {/* Dados Corporativos */}
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" /> Dados Corporativos
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Razão Social:</span> <span className="font-medium">{w.razao_social || '—'}</span></div>
                        <div><span className="text-muted-foreground">Nome Fantasia:</span> <span className="font-medium">{w.nome_fantasia || '—'}</span></div>
                        <div><span className="text-muted-foreground">CNPJ:</span> <span className="font-mono font-medium">{w.cnpj}</span></div>
                        <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> <span className="font-medium">{w.telefone || '—'}</span></div>
                        <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> <span className="font-medium">{w.email || '—'}</span></div>
                        <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /> <span className="font-medium">{w.endereco || '—'}, {w.cidade}/{w.estado} - {w.cep}</span></div>
                      </div>
                    </section>

                    {/* Serviços */}
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-primary" /> Serviços & Categorias
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(w.categorias || []).map(c => (
                          <Badge key={c} variant="secondary">{c}</Badge>
                        ))}
                        {(!w.categorias || w.categorias.length === 0) && <span className="text-sm text-muted-foreground">Nenhuma categoria informada</span>}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span>Hora Técnica: <strong className="text-foreground">R$ {(w.valor_hora_tecnica || 0).toFixed(2)}</strong></span>
                      </div>
                    </section>

                    {/* Dados Bancários */}
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" /> Dados Bancários (Repasse 85%)
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-lg p-3">
                        <div><span className="text-muted-foreground">Banco:</span> <span className="font-medium">{w.banco_nome || '—'}</span></div>
                        <div><span className="text-muted-foreground">Agência:</span> <span className="font-medium">{w.banco_agencia || '—'}</span></div>
                        <div><span className="text-muted-foreground">Conta ({w.banco_tipo_conta || '—'}):</span> <span className="font-medium">{w.banco_conta || '—'}</span></div>
                        <div><span className="text-muted-foreground">Titular:</span> <span className="font-medium">{w.banco_titular || '—'}</span></div>
                        <div><span className="text-muted-foreground">CPF/CNPJ:</span> <span className="font-mono font-medium">{w.banco_cpf_cnpj || '—'}</span></div>
                        <div><span className="text-muted-foreground">PIX:</span> <span className="font-medium">{w.pix_chave || '—'}</span></div>
                      </div>
                    </section>

                    {/* Documentos */}
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" /> Documentos Enviados
                      </h3>
                      <div className="flex gap-4">
                        {w.alvara_url ? (
                          <a href={w.alvara_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <ShieldCheck className="h-4 w-4" /> Ver Alvará
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Alvará não enviado</span>
                        )}
                        {w.fachada_url ? (
                          <a href={w.fachada_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <Eye className="h-4 w-4" /> Ver Fachada
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Fachada não enviada</span>
                        )}
                      </div>
                    </section>

                    {/* Observações Admin */}
                    <section>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Observações da Equipe</h3>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Escreva observações internas sobre esta oficina..."
                        rows={3}
                      />
                    </section>
                  </div>

                  <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
                    {w.status !== 'rejeitado' && (
                      <Button variant="destructive" onClick={() => handleAction('rejeitado')} disabled={actionLoading}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    )}
                    {w.status !== 'suspenso' && w.status === 'aprovado' && (
                      <Button variant="outline" onClick={() => handleAction('suspenso')} disabled={actionLoading}>
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Suspender
                      </Button>
                    )}
                    {w.status !== 'aprovado' && (
                      <Button onClick={() => handleAction('aprovado')} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprovar Oficina
                      </Button>
                    )}
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default AdminWorkshopReviewPage;
