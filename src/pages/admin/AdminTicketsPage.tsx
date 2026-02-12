import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MessageSquare, Clock, CheckCircle, AlertTriangle, Paperclip, FileText, Image as ImageIcon, Download, Send, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  user_id: string;
  customer_name?: string;
  customer_email?: string;
}

interface TicketMessage {
  id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  user_id: string;
  attachment_url: string | null;
}

export default function AdminTicketsPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ticket.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ticket.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
  }, [user, loading, isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchTickets();
    }
  }, [isAdmin]);

  const fetchTickets = async () => {
    try {
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile data for each ticket
      const ticketsWithProfiles = await Promise.all(
        (ticketsData || []).map(async (ticket: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', ticket.user_id)
            .single();

          return {
            ...ticket,
            customer_name: profile?.full_name || 'Cliente não identificado',
            customer_email: ''
          };
        })
      );

      setTickets(ticketsWithProfiles as any);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os tickets.",
        variant: "destructive",
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTicketMessages((data || []).map((m: any) => ({
        ...m,
        is_admin_reply: m.is_internal || false,
        attachment_url: '',
      })) as any);
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
    }
  };

  const openTicketDialog = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await fetchTicketMessages(ticket.id);
    setIsDialogOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `admin/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const sendReply = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedTicket || !user) return;

    setUploadingFile(true);
    try {
      let attachmentUrl = null;
      
      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile);
        if (!attachmentUrl) {
          throw new Error('Failed to upload file');
        }
      }

      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          message: newMessage || '(arquivo anexado)',
          user_id: user.id,
          is_admin_reply: true,
          attachment_url: attachmentUrl
        });

      if (error) throw error;

      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' } as any)
          .eq('id', selectedTicket.id);
      }

      setNewMessage('');
      setSelectedFile(null);
      await fetchTicketMessages(selectedTicket.id);
      fetchTickets();

      toast({
        title: "Sucesso",
        description: "Resposta enviada com sucesso.",
      });
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a resposta.",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus } as any)
        .eq('id', ticketId);

      if (error) throw error;

      fetchTickets();
      toast({
        title: "Sucesso",
        description: "Status do ticket atualizado.",
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Aberto
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Em Andamento
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Fechado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge variant="secondary">Baixa</Badge>;
      case 'medium':
        return <Badge variant="outline">Média</Badge>;
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getFileIcon = (url: string) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    return isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </Button>
          <h1 className="text-3xl font-bold">Gerenciar Tickets</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Tickets de Suporte</CardTitle>
                <CardDescription>Gerencie todos os tickets dos clientes</CardDescription>
              </div>
              
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-[200px]"
                  />
                </div>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos ({tickets.length})</SelectItem>
                    <SelectItem value="open">Abertos</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="closed">Fechados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTickets ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Nenhum ticket encontrado com os filtros aplicados.' 
                    : 'Nenhum ticket encontrado.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.title}</TableCell>
                       <TableCell>
                         <div>
                           <div>{ticket.customer_name}</div>
                           <div className="text-sm text-muted-foreground">{ticket.customer_email}</div>
                         </div>
                       </TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                      <TableCell>
                        {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openTicketDialog(ticket)}
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[85vh]">
                              <DialogHeader className="border-b pb-4">
                                <div className="space-y-2">
                                  <DialogTitle className="text-xl">{selectedTicket?.title}</DialogTitle>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {selectedTicket && getStatusBadge(selectedTicket.status)}
                                    {selectedTicket && getPriorityBadge(selectedTicket.priority)}
                                    <Badge variant="secondary" className="text-xs">
                                      👤 {selectedTicket?.customer_name}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      Criado em {selectedTicket && new Date(selectedTicket.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                </div>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <Card className="bg-muted/50 border-none">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Descrição Inicial</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm whitespace-pre-wrap">{selectedTicket?.description}</p>
                                  </CardContent>
                                </Card>
                                
                                <div className="space-y-3">
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Conversas ({ticketMessages.length})
                                  </h4>
                                  
                                  <ScrollArea className="h-[300px] pr-4">
                                    <div className="space-y-3">
                                      {ticketMessages.length === 0 ? (
                                        <p className="text-center text-sm text-muted-foreground py-8">
                                          Nenhuma mensagem ainda. Seja o primeiro a responder!
                                        </p>
                                      ) : (
                                        ticketMessages.map((message) => (
                                          <div
                                            key={message.id}
                                            className={`flex ${message.is_admin_reply ? 'justify-end' : 'justify-start'}`}
                                          >
                                            <div
                                              className={`max-w-[80%] rounded-lg p-3 ${
                                                message.is_admin_reply
                                                  ? 'bg-primary/10 border border-primary/20'
                                                  : 'bg-muted border'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="secondary" className="text-xs">
                                                  {message.is_admin_reply ? '🛡️ Admin' : '👤 Cliente'}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  {new Date(message.created_at).toLocaleString('pt-BR')}
                                                </span>
                                              </div>
                                              
                                              <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                                              
                                              {message.attachment_url && (
                                                <div className="mt-2 pt-2 border-t">
                                                  <a
                                                    href={message.attachment_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                                  >
                                                    {getFileIcon(message.attachment_url)}
                                                    <span>Ver anexo</span>
                                                    <Download className="w-3 h-3" />
                                                  </a>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </ScrollArea>
                                </div>

                                <Card className="bg-muted/30 border-dashed">
                                  <CardContent className="pt-4 space-y-3">
                                    <Label className="text-sm font-medium">Responder como Admin</Label>
                                    <Textarea
                                      value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}
                                      placeholder="Digite sua resposta..."
                                      rows={3}
                                      className="resize-none"
                                    />
                                    
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-1">
                                        <Input
                                          type="file"
                                          id="admin-file-upload"
                                          className="hidden"
                                          onChange={handleFileSelect}
                                          accept="image/*,.pdf,.doc,.docx,.txt"
                                        />
                                        <Label
                                          htmlFor="admin-file-upload"
                                          className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground p-2 border rounded-md hover:bg-muted/50 transition-colors"
                                        >
                                          <Paperclip className="w-4 h-4" />
                                          <span className="truncate">
                                            {selectedFile ? selectedFile.name : 'Anexar arquivo (max 5MB)'}
                                          </span>
                                        </Label>
                                      </div>

                                      <Button 
                                        onClick={sendReply}
                                        disabled={uploadingFile || (!newMessage.trim() && !selectedFile)}
                                        className="shrink-0"
                                      >
                                        <Send className="w-4 h-4 mr-2" />
                                        {uploadingFile ? 'Enviando...' : 'Enviar'}
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {ticket.status !== 'closed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateTicketStatus(ticket.id, 'closed')}
                              className="text-green-600 hover:bg-green-50"
                            >
                              Fechar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}