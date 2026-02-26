import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Truck, Wrench, Shield, DollarSign, Plus, Search, Star,
  MapPin, Phone, FileText, CheckCircle2, Clock, AlertTriangle,
  Car, Building2, TrendingUp, Eye, QrCode, Zap, Users, BarChart3
} from 'lucide-react';

type UserRole = 'select' | 'frota' | 'oficina';

const GestaoFrotasOficinasSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('select');
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) {
    navigate('/auth');
    return null;
  }

  // ─── Role Selection Screen ───
  if (role === 'select') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="max-w-3xl w-full space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Bem-vindo à NovaLink</h1>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Selecione seu perfil para acessar o painel correto
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Frota Card */}
              <button
                onClick={() => setRole('frota')}
                className="group relative p-8 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 text-left"
              >
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary">Gestor</Badge>
                </div>
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <Truck className="w-7 h-7 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Operador de Frota</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Cadastre seus veículos, solicite serviços, aprove orçamentos auditados pela IA e acompanhe tudo em tempo real.
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Car className="w-4 h-4 text-blue-500" /> Cadastro de veículos</li>
                    <li className="flex items-center gap-2"><Search className="w-4 h-4 text-blue-500" /> Buscar oficinas próximas</li>
                    <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /> IA anti-fraude nos orçamentos</li>
                    <li className="flex items-center gap-2"><QrCode className="w-4 h-4 text-blue-500" /> Acompanhar via QR Code</li>
                  </ul>
                </div>
              </button>

              {/* Oficina Card */}
              <button
                onClick={() => setRole('oficina')}
                className="group relative p-8 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 text-left"
              >
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary">Parceiro</Badge>
                </div>
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Wrench className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Operador de Oficina</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Receba solicitações de frotas, envie orçamentos, execute serviços e receba pagamento em D+1.
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-500" /> Cadastro da oficina</li>
                    <li className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500" /> Receber solicitações</li>
                    <li className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /> Pagamento em D+1</li>
                    <li className="flex items-center gap-2"><Star className="w-4 h-4 text-emerald-500" /> Avaliações e ranking</li>
                  </ul>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Você pode trocar de perfil a qualquer momento clicando no botão no topo do painel.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ─── Frota Dashboard ───
  if (role === 'frota') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
        <div className="space-y-6 p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Painel da Frota</h1>
                <p className="text-sm text-muted-foreground">Gerencie veículos e serviços</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setRole('select')}>
              Trocar Perfil
            </Button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Veículos', value: '0', icon: Car, color: 'text-blue-500' },
              { label: 'Serviços Ativos', value: '0', icon: Wrench, color: 'text-amber-500' },
              { label: 'Economia c/ IA', value: 'R$ 0', icon: TrendingUp, color: 'text-emerald-500' },
              { label: 'Gasto Mensal', value: 'R$ 0', icon: DollarSign, color: 'text-primary' },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="dashboard">Visão Geral</TabsTrigger>
              <TabsTrigger value="veiculos">Veículos</TabsTrigger>
              <TabsTrigger value="servicos">Serviços</TabsTrigger>
              <TabsTrigger value="oficinas">Oficinas</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Alertas da IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Nenhum alerta no momento. A IA monitora seus orçamentos automaticamente.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Manutenções Preventivas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Cadastre seus veículos para receber sugestões de manutenção preventiva.</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Veículos Tab */}
            <TabsContent value="veiculos" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Meus Veículos</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Veículo</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cadastrar Veículo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Input placeholder="Placa (ex: ABC-1D23)" />
                      <Input placeholder="Modelo (ex: Scania R450)" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Ano" type="number" />
                        <Input placeholder="KM Atual" type="number" />
                      </div>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Tipo de veículo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="caminhao">Caminhão</SelectItem>
                          <SelectItem value="carreta">Carreta</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                          <SelectItem value="carro">Carro</SelectItem>
                          <SelectItem value="onibus">Ônibus</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Chassi (opcional)" />
                      <Button className="w-full">Cadastrar Veículo</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Card>
                <CardContent className="p-8 text-center">
                  <Car className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum veículo cadastrado ainda.</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Veículo" para começar.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Serviços Tab */}
            <TabsContent value="servicos" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Solicitações de Serviço</h2>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Solicitar Serviço</Button>
              </div>
              <Card>
                <CardContent className="p-8 text-center">
                  <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma solicitação de serviço.</p>
                  <p className="text-xs text-muted-foreground mt-1">Cadastre veículos primeiro para solicitar serviços.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Oficinas Tab */}
            <TabsContent value="oficinas" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Oficinas Disponíveis</h2>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar oficina..." className="pl-9" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'ThermoCar', specialty: 'Ar-condicionado e Refrigeração', rating: 4.8, location: 'Imperatriz - MA' },
                  { name: 'EngeMec', specialty: 'Mecânica Geral e Diesel', rating: 4.6, location: 'Imperatriz - MA' },
                  { name: 'Oskauto', specialty: 'Elétrica e Injeção Eletrônica', rating: 4.7, location: 'Imperatriz - MA' },
                ].map((oficina) => (
                  <Card key={oficina.name} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Wrench className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-medium">{oficina.rating}</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{oficina.name}</h3>
                        <p className="text-xs text-muted-foreground">{oficina.specialty}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {oficina.location}
                      </div>
                      <Button size="sm" variant="outline" className="w-full">
                        <Eye className="w-4 h-4 mr-1" /> Ver Detalhes
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Financeiro Tab */}
            <TabsContent value="financeiro" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo Financeiro</CardTitle>
                  <CardDescription>Visão geral dos gastos com manutenção</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Nenhuma transação registrada ainda.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Oficina Dashboard ───
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Painel da Oficina</h1>
              <p className="text-sm text-muted-foreground">Gerencie serviços e recebimentos</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRole('select')}>
            Trocar Perfil
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Solicitações', value: '0', icon: FileText, color: 'text-blue-500' },
            { label: 'Em Andamento', value: '0', icon: Clock, color: 'text-amber-500' },
            { label: 'Concluídos', value: '0', icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'A Receber (D+1)', value: 'R$ 0', icon: DollarSign, color: 'text-primary' },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="solicitacoes">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
            <TabsTrigger value="minha-oficina">Minha Oficina</TabsTrigger>
            <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          </TabsList>

          {/* Solicitações */}
          <TabsContent value="solicitacoes" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma solicitação recebida.</p>
                <p className="text-xs text-muted-foreground mt-1">Quando frotas solicitarem serviços, aparecerão aqui.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Minha Oficina */}
          <TabsContent value="minha-oficina" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Dados da Oficina
                </CardTitle>
                <CardDescription>Configure as informações da sua oficina</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Nome da Oficina" />
                  <Input placeholder="CNPJ" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Telefone / WhatsApp" />
                  <Input placeholder="E-mail" />
                </div>
                <Input placeholder="Endereço completo" />
                <div className="grid md:grid-cols-2 gap-4">
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Especialidade principal" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mecanica-geral">Mecânica Geral</SelectItem>
                      <SelectItem value="diesel">Motor Diesel</SelectItem>
                      <SelectItem value="eletrica">Elétrica Automotiva</SelectItem>
                      <SelectItem value="ar-condicionado">Ar-condicionado</SelectItem>
                      <SelectItem value="funilaria">Funilaria e Pintura</SelectItem>
                      <SelectItem value="suspensao">Suspensão e Freios</SelectItem>
                      <SelectItem value="injecao">Injeção Eletrônica</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Porte da oficina" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pequena">Pequena (1-3 elevadores)</SelectItem>
                      <SelectItem value="media">Média (4-8 elevadores)</SelectItem>
                      <SelectItem value="grande">Grande (9+ elevadores)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Descrição da oficina (serviços oferecidos, diferenciais...)" rows={3} />
                <div>
                  <h4 className="text-sm font-medium mb-2">Dados Bancários (para recebimento D+1)</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Input placeholder="Banco" />
                    <Input placeholder="Agência" />
                    <Input placeholder="Conta" />
                  </div>
                  <Input placeholder="Chave PIX (opcional)" className="mt-3" />
                </div>
                <Button className="w-full">Salvar Dados da Oficina</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orçamentos */}
          <TabsContent value="orcamentos" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-8 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum orçamento enviado.</p>
                <p className="text-xs text-muted-foreground mt-1">Responda solicitações de frotas para criar orçamentos.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financeiro */}
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
                  <p className="text-2xl font-bold text-emerald-500">R$ 0,00</p>
                  <p className="text-xs text-muted-foreground">85% dos serviços</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Comissão NovaLink</p>
                  <p className="text-2xl font-bold text-primary">R$ 0,00</p>
                  <p className="text-xs text-muted-foreground">15% retidos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Próximo Pagamento</p>
                  <p className="text-2xl font-bold text-foreground">—</p>
                  <p className="text-xs text-muted-foreground">D+1 após conclusão</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </main>
      <Footer />
    </div>
  );
};

export default GestaoFrotasOficinasSystem;
