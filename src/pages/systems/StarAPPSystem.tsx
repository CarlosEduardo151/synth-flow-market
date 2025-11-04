import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Hotel, Users, MenuSquare, CreditCard, BarChart3, NfcIcon, UserPlus, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Hotel {
  id: string;
  name: string;
  admin_email: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface Staff {
  id: string;
  hotel_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
}

interface NFCBracelet {
  id: string;
  hotel_id: string;
  nfc_id: string;
  guest_name: string;
  guest_cpf: string;
  room_number: string | null;
  is_active: boolean;
  check_in_date: string;
}

const StarAPPSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [bracelets, setBracelets] = useState<NFCBracelet[]>([]);
  
  // Dialog states
  const [showHotelDialog, setShowHotelDialog] = useState(false);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [showBraceletDialog, setShowBraceletDialog] = useState(false);

  // Form states
  const [hotelForm, setHotelForm] = useState({
    name: '',
    admin_email: '',
    address: '',
    phone: ''
  });

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    role: 'garcom'
  });

  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    category: 'comida',
    price: ''
  });

  const [braceletForm, setBraceletForm] = useState({
    nfc_id: '',
    guest_name: '',
    guest_cpf: '',
    room_number: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadUserData();
  }, [user, navigate]);

  const loadUserData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setUserEmail(profile.email);
        setIsAdmin(profile.email === 'staraiofc@gmail.com' || profile.email === 'caduxim0@gmail.com');
      }

      await loadHotels();
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHotels = async () => {
    const { data, error } = await supabase
      .from('starapp_hotels')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os hotéis",
        variant: "destructive"
      });
      return;
    }

    setHotels(data || []);
    if (data && data.length > 0 && !selectedHotel) {
      setSelectedHotel(data[0].id);
    }
  };

  const loadStaff = async (hotelId: string) => {
    const { data, error } = await supabase
      .from('starapp_staff')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('name');

    if (!error) setStaff(data || []);
  };

  const loadMenu = async (hotelId: string) => {
    const { data, error } = await supabase
      .from('starapp_menu_items')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('category, name');

    if (!error) setMenuItems(data || []);
  };

  const loadBracelets = async (hotelId: string) => {
    const { data, error } = await supabase
      .from('starapp_nfc_bracelets')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('is_active', true)
      .order('guest_name');

    if (!error) setBracelets(data || []);
  };

  useEffect(() => {
    if (selectedHotel) {
      loadStaff(selectedHotel);
      loadMenu(selectedHotel);
      loadBracelets(selectedHotel);
    }
  }, [selectedHotel]);

  const handleCreateHotel = async () => {
    if (!hotelForm.name || !hotelForm.admin_email) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('starapp_hotels')
      .insert([hotelForm]);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o hotel",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Hotel cadastrado com sucesso!"
    });

    setShowHotelDialog(false);
    setHotelForm({ name: '', admin_email: '', address: '', phone: '' });
    loadHotels();
  };

  const handleCreateStaff = async () => {
    if (!staffForm.name || !staffForm.email || !selectedHotel) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('starapp_staff')
      .insert([{ ...staffForm, hotel_id: selectedHotel }]);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o funcionário",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Funcionário adicionado com sucesso!"
    });

    setShowStaffDialog(false);
    setStaffForm({ name: '', email: '', role: 'garcom' });
    loadStaff(selectedHotel);
  };

  const handleCreateMenuItem = async () => {
    if (!menuForm.name || !menuForm.price || !selectedHotel) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('starapp_menu_items')
      .insert([{
        ...menuForm,
        price: parseFloat(menuForm.price),
        hotel_id: selectedHotel
      }]);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o item",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Item adicionado ao cardápio!"
    });

    setShowMenuDialog(false);
    setMenuForm({ name: '', description: '', category: 'comida', price: '' });
    loadMenu(selectedHotel);
  };

  const handleCreateBracelet = async () => {
    if (!braceletForm.nfc_id || !braceletForm.guest_name || !braceletForm.guest_cpf || !selectedHotel) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('starapp_nfc_bracelets')
      .insert([{ ...braceletForm, hotel_id: selectedHotel }]);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar a pulseira",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Pulseira NFC cadastrada com sucesso!"
    });

    setShowBraceletDialog(false);
    setBraceletForm({ nfc_id: '', guest_name: '', guest_cpf: '', room_number: '' });
    loadBracelets(selectedHotel);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando StarAPP...</p>
        </div>
      </div>
    );
  }

  const currentHotel = hotels.find(h => h.id === selectedHotel);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <NfcIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">
              StarAPP {currentHotel && `- ${currentHotel.name}`}
            </h1>
          </div>
          <p className="text-muted-foreground">
            Sistema inteligente de gestão com tecnologia NFC
          </p>
        </div>

        {isAdmin && (
          <div className="mb-6 flex gap-4">
            <Button onClick={() => setShowHotelDialog(true)} className="gap-2">
              <Hotel className="h-4 w-4" />
              Novo Hotel
            </Button>
          </div>
        )}

        {hotels.length > 1 && (
          <div className="mb-6">
            <Label>Selecionar Hotel</Label>
            <Select value={selectedHotel || ''} onValueChange={setSelectedHotel}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Escolha um hotel" />
              </SelectTrigger>
              <SelectContent>
                {hotels.map(hotel => (
                  <SelectItem key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedHotel && (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="staff">Equipe</TabsTrigger>
              <TabsTrigger value="menu">Cardápio</TabsTrigger>
              <TabsTrigger value="bracelets">Pulseiras NFC</TabsTrigger>
              <TabsTrigger value="orders">Pedidos</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{staff.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Itens no Cardápio</CardTitle>
                    <MenuSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{menuItems.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Hóspedes Ativos</CardTitle>
                    <NfcIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{bracelets.length}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="staff">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Equipe do Hotel</CardTitle>
                      <CardDescription>Gerenciar funcionários e garçons</CardDescription>
                    </div>
                    <Button onClick={() => setShowStaffDialog(true)} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Adicionar Funcionário
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map(member => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell className="capitalize">{member.role}</TableCell>
                          <TableCell>
                            <Badge variant={member.is_active ? "default" : "secondary"}>
                              {member.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {staff.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum funcionário cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="menu">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Cardápio Digital</CardTitle>
                      <CardDescription>Gerenciar comidas, bebidas e outros itens</CardDescription>
                    </div>
                    <Button onClick={() => setShowMenuDialog(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {menuItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="capitalize">{item.category}</TableCell>
                          <TableCell>R$ {item.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={item.is_available ? "default" : "secondary"}>
                              {item.is_available ? 'Disponível' : 'Indisponível'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {menuItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum item cadastrado no cardápio
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bracelets">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Pulseiras NFC</CardTitle>
                      <CardDescription>Cadastrar e gerenciar pulseiras de hóspedes</CardDescription>
                    </div>
                    <Button onClick={() => setShowBraceletDialog(true)} className="gap-2">
                      <NfcIcon className="h-4 w-4" />
                      Cadastrar Pulseira
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hóspede</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Quarto</TableHead>
                        <TableHead>Check-in</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bracelets.map(bracelet => (
                        <TableRow key={bracelet.id}>
                          <TableCell className="font-medium">{bracelet.guest_name}</TableCell>
                          <TableCell>{bracelet.guest_cpf}</TableCell>
                          <TableCell>{bracelet.room_number || '-'}</TableCell>
                          <TableCell>
                            {new Date(bracelet.check_in_date).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                      {bracelets.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhuma pulseira NFC ativa
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Pedidos em Tempo Real</CardTitle>
                  <CardDescription>Acompanhar pedidos dos hóspedes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Sistema de pedidos em desenvolvimento</p>
                    <p className="text-sm mt-2">Em breve você poderá gerenciar todos os pedidos aqui</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {hotels.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Hotel className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum hotel cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  {isAdmin 
                    ? 'Comece cadastrando o primeiro hotel do sistema'
                    : 'Entre em contato com o administrador para ter acesso ao sistema'}
                </p>
                {isAdmin && (
                  <Button onClick={() => setShowHotelDialog(true)}>
                    Cadastrar Primeiro Hotel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

      {/* Dialog Novo Hotel */}
      <Dialog open={showHotelDialog} onOpenChange={setShowHotelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Hotel</DialogTitle>
            <DialogDescription>
              Adicione um novo hotel ao sistema StarAPP
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Hotel *</Label>
              <Input
                id="name"
                value={hotelForm.name}
                onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                placeholder="Ex: Paradise Hotel"
              />
            </div>
            <div>
              <Label htmlFor="admin_email">E-mail do Administrador *</Label>
              <Input
                id="admin_email"
                type="email"
                value={hotelForm.admin_email}
                onChange={(e) => setHotelForm({ ...hotelForm, admin_email: e.target.value })}
                placeholder="admin@hotel.com"
              />
            </div>
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={hotelForm.address}
                onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                placeholder="Rua, número, cidade"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={hotelForm.phone}
                onChange={(e) => setHotelForm({ ...hotelForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHotelDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateHotel}>Cadastrar Hotel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo Funcionário */}
      <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Funcionário</DialogTitle>
            <DialogDescription>
              Cadastre um novo membro da equipe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="staff_name">Nome Completo *</Label>
              <Input
                id="staff_name"
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                placeholder="Nome do funcionário"
              />
            </div>
            <div>
              <Label htmlFor="staff_email">E-mail *</Label>
              <Input
                id="staff_email"
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="staff_role">Cargo *</Label>
              <Select value={staffForm.role} onValueChange={(val) => setStaffForm({ ...staffForm, role: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="garcom">Garçom</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="cozinha">Cozinha</SelectItem>
                  <SelectItem value="atendimento">Atendimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStaffDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateStaff}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo Item do Cardápio */}
      <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item ao Cardápio</DialogTitle>
            <DialogDescription>
              Cadastre um novo item (comida, bebida, sobremesa, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="item_name">Nome do Item *</Label>
              <Input
                id="item_name"
                value={menuForm.name}
                onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                placeholder="Ex: Frango Grelhado"
              />
            </div>
            <div>
              <Label htmlFor="item_category">Categoria *</Label>
              <Select value={menuForm.category} onValueChange={(val) => setMenuForm({ ...menuForm, category: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comida">Comida</SelectItem>
                  <SelectItem value="bebida">Bebida</SelectItem>
                  <SelectItem value="sobremesa">Sobremesa</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="item_description">Descrição</Label>
              <Textarea
                id="item_description"
                value={menuForm.description}
                onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                placeholder="Descrição do item"
              />
            </div>
            <div>
              <Label htmlFor="item_price">Preço (R$) *</Label>
              <Input
                id="item_price"
                type="number"
                step="0.01"
                value={menuForm.price}
                onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMenuDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateMenuItem}>Adicionar Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Pulseira NFC */}
      <Dialog open={showBraceletDialog} onOpenChange={setShowBraceletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Pulseira NFC</DialogTitle>
            <DialogDescription>
              Registre uma nova pulseira para check-in do hóspede
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nfc_id">ID da Pulseira NFC *</Label>
              <Input
                id="nfc_id"
                value={braceletForm.nfc_id}
                onChange={(e) => setBraceletForm({ ...braceletForm, nfc_id: e.target.value })}
                placeholder="ID único da pulseira"
              />
            </div>
            <div>
              <Label htmlFor="guest_name">Nome do Hóspede *</Label>
              <Input
                id="guest_name"
                value={braceletForm.guest_name}
                onChange={(e) => setBraceletForm({ ...braceletForm, guest_name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="guest_cpf">CPF do Hóspede *</Label>
              <Input
                id="guest_cpf"
                value={braceletForm.guest_cpf}
                onChange={(e) => setBraceletForm({ ...braceletForm, guest_cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label htmlFor="room_number">Número do Quarto</Label>
              <Input
                id="room_number"
                value={braceletForm.room_number}
                onChange={(e) => setBraceletForm({ ...braceletForm, room_number: e.target.value })}
                placeholder="Ex: 101"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBraceletDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBracelet}>Cadastrar Pulseira</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StarAPPSystem;
