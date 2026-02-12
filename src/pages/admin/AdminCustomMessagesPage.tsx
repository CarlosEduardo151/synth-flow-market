import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

interface EmailBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'button' | 'image';
  content: string;
  color?: string;
  backgroundColor?: string;
  buttonUrl?: string;
  imageUrl?: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
}

export default function AdminCustomMessagesPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [fromName, setFromName] = useState('NovaLink');
  const [fromEmail, setFromEmail] = useState('noreply@starai.com.br');

  // Recipients
  const [recipientMode, setRecipientMode] = useState<'all' | 'select'>('all');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

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
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      // OBS: A tabela `profiles` pode estar vazia dependendo do seu fluxo de cadastro.
      // Para garantir que o envio funcione “pela base de usuários”, buscamos do Auth
      // (somente admin) via Edge Function.
      const { data, error } = await supabase.functions.invoke('admin-list-users');
      if (error) throw error;

      const list = (data?.users || []) as Array<{ user_id: string; email: string | null; full_name: string | null }>;
      setUsers(
        list
          .filter((u) => !!u.email)
          .map((u) => ({
            user_id: u.user_id,
            full_name: u.full_name || '',
            email: u.email || '',
          }))
      );
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoadingUsers(false);
    }
  };

  const addBlock = (type: EmailBlock['type']) => {
    const newBlock: EmailBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      color: type === 'button' ? '#4F46E5' : '#000000',
      backgroundColor: 'transparent',
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, field: keyof EmailBlock, value: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error('Assunto obrigatório');
      return;
    }
    if (blocks.length === 0) {
      toast.error('Adicione pelo menos um bloco');
      return;
    }

    if (recipientMode === 'all' && users.length === 0) {
      toast.error('Nenhum usuário carregado para enviar. Verifique se existem perfis com e-mail.');
      return;
    }

    if (recipientMode === 'select' && selectedUserIds.length === 0) {
      toast.error('Selecione ao menos 1 usuário');
      return;
    }

    try {
      setSending(true);

      const recipientEmails =
        recipientMode === 'all'
          ? users.map((u) => u.email).filter(Boolean)
          : users
              .filter((u) => selectedUserIds.includes(u.user_id))
              .map((u) => u.email)
              .filter(Boolean);

      const payload = {
        subject,
        blocks,
        recipientEmails,
        fromName,
        fromEmail,
      };

      const { data: result, error } = await supabase.functions.invoke('admin-send-custom-email', {
        body: payload,
      });

      if (error) throw error;

      toast.success(`Mensagem enviada para ${result.sentTo} destinatário(s)!`);
      setSubject('');
      setBlocks([]);
      setSelectedUserIds([]);
    } catch (err: any) {
      console.error('Error sending:', err);
      toast.error(err.message || 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  const buildPreviewHtml = () => {
    let html = '<div style="font-family:Arial,sans-serif; max-width:600px; margin:20px auto; background:#fff; padding:20px;">';
    blocks.forEach((block) => {
      const color = block.color || '#000';
      const bgColor = block.backgroundColor || 'transparent';
      if (block.type === 'heading') {
        html += `<h2 style="color:${color}; background-color:${bgColor}; padding:10px;">${block.content || '(Título vazio)'}</h2>`;
      } else if (block.type === 'paragraph') {
        html += `<p style="color:${color}; background-color:${bgColor}; padding:10px;">${block.content || '(Parágrafo vazio)'}</p>`;
      } else if (block.type === 'button') {
        html += `<div style="text-align:center; margin:15px 0;"><a href="${block.buttonUrl || '#'}" style="display:inline-block; padding:12px 24px; color:#fff; background-color:${color}; text-decoration:none; border-radius:5px;">${block.content || '(Texto botão)'}</a></div>`;
      } else if (block.type === 'image') {
        html += `<div style="text-align:center; margin:15px 0;"><img src="${block.imageUrl || 'https://via.placeholder.com/400x200'}" alt="${block.content}" style="max-width:100%; height:auto;" /></div>`;
      }
    });
    html += '</div>';
    return html;
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/admin')} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Mensagens Personalizadas</h1>
            <p className="text-muted-foreground">Crie e envie emails com cores, botões e imagens</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Compor Mensagem</CardTitle>
              <CardDescription>Monte sua mensagem com blocos personalizados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subject">Assunto</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Digite o assunto do e-mail" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fromName">Nome do remetente</Label>
                  <Input
                    id="fromName"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Ex: NovaLink"
                  />
                </div>
                <div>
                  <Label htmlFor="fromEmail">E-mail do remetente</Label>
                  <Input
                    id="fromEmail"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="Ex: noreply@seudominio.com.br"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Precisa ser um e-mail do domínio verificado no Resend (ex: @seudominio.com.br).
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => addBlock('heading')}>
                  <Plus className="w-4 h-4 mr-1" />
                  Título
                </Button>
                <Button size="sm" variant="outline" onClick={() => addBlock('paragraph')}>
                  <Plus className="w-4 h-4 mr-1" />
                  Parágrafo
                </Button>
                <Button size="sm" variant="outline" onClick={() => addBlock('button')}>
                  <Plus className="w-4 h-4 mr-1" />
                  Botão
                </Button>
                <Button size="sm" variant="outline" onClick={() => addBlock('image')}>
                  <Plus className="w-4 h-4 mr-1" />
                  Imagem
                </Button>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {blocks.map((block) => (
                  <Card key={block.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs uppercase font-semibold">{block.type}</Label>
                          <Button size="icon" variant="ghost" onClick={() => deleteBlock(block.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>

                        {(block.type === 'heading' || block.type === 'paragraph') && (
                          <Textarea
                            placeholder="Conteúdo"
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, 'content', e.target.value)}
                          />
                        )}

                        {block.type === 'button' && (
                          <>
                            <Input placeholder="Texto do botão" value={block.content} onChange={(e) => updateBlock(block.id, 'content', e.target.value)} />
                            <Input placeholder="URL do botão (ex: https://...)" value={block.buttonUrl || ''} onChange={(e) => updateBlock(block.id, 'buttonUrl', e.target.value)} />
                          </>
                        )}

                        {block.type === 'image' && (
                          <>
                            <Input placeholder="Alt text (descrição)" value={block.content} onChange={(e) => updateBlock(block.id, 'content', e.target.value)} />
                            <Input placeholder="URL da imagem (ex: https://...)" value={block.imageUrl || ''} onChange={(e) => updateBlock(block.id, 'imageUrl', e.target.value)} />
                          </>
                        )}

                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Cor do texto/botão</Label>
                            <Input type="color" value={block.color || '#000000'} onChange={(e) => updateBlock(block.id, 'color', e.target.value)} />
                          </div>
                          {(block.type === 'heading' || block.type === 'paragraph') && (
                            <div className="flex-1">
                              <Label className="text-xs">Fundo</Label>
                              <Input type="color" value={block.backgroundColor || 'transparent'} onChange={(e) => updateBlock(block.id, 'backgroundColor', e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Destinatários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Tabs value={recipientMode} onValueChange={(v) => setRecipientMode(v as any)}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="select">Selecionar</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="text-sm text-muted-foreground">
                    Será enviado para <strong>{users.length} usuário(s)</strong> cadastrado(s).
                  </TabsContent>
                  <TabsContent value="select" className="space-y-2 max-h-60 overflow-y-auto">
                    {loadingUsers ? (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : (
                      users.map((u) => (
                        <div key={u.user_id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedUserIds.includes(u.user_id)}
                            onCheckedChange={(checked) =>
                              setSelectedUserIds(
                                checked ? [...selectedUserIds, u.user_id] : selectedUserIds.filter((id) => id !== u.user_id)
                              )
                            }
                          />
                          <span className="text-sm">{u.full_name || u.email}</span>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="w-4 h-4 mr-2" />
                  {showPreview ? 'Ocultar' : 'Pré-visualizar'}
                </Button>
                <Button className="w-full" onClick={handleSend} disabled={sending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Enviando...' : 'Enviar Agora'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {showPreview && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Pré-visualização (HTML)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded p-4 bg-muted" dangerouslySetInnerHTML={{ __html: buildPreviewHtml() }} />
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}