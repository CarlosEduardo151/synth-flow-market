import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Globe, Upload, FileText, Trash2, RefreshCw,
  Plus, Link2, AlertCircle, CheckCircle2, Loader2, Search,
  FileSpreadsheet, File
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;

interface KnowledgeEntry {
  id: string;
  entry_type: string;
  title: string;
  content: string | null;
  source_url: string | null;
  file_name: string | null;
  file_size_bytes: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface BotKnowledgeTabProps {
  customerProductId: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <FileText className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  document: <File className="h-4 w-4" />,
  spreadsheet: <FileSpreadsheet className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  website: 'Website',
  document: 'Documento',
  spreadsheet: 'Planilha',
};

const STATUS_BADGES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  ready: { label: 'Ativo', className: 'text-green-500 border-green-500/30 bg-green-500/10', icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: { label: 'Processando', className: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  error: { label: 'Erro', className: 'text-red-500 border-red-500/30 bg-red-500/10', icon: <AlertCircle className="h-3 w-3" /> },
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function BotKnowledgeTab({ customerProductId }: BotKnowledgeTabProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTab, setAddTab] = useState('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteTitle, setWebsiteTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const { data, error } = await sb
        .from('bot_knowledge_base')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (e) {
      console.error('fetch knowledge error:', e);
    } finally {
      setLoading(false);
    }
  }, [customerProductId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAddText = async () => {
    if (!textTitle.trim() || !textContent.trim()) {
      toast({ title: 'Preencha título e conteúdo', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await sb.functions.invoke('bot-knowledge-process', {
        body: {
          action: 'save_text',
          customer_product_id: customerProductId,
          title: textTitle.trim(),
          content: textContent.trim(),
        },
      });
      if (error) throw error;
      toast({ title: 'Conhecimento adicionado!' });
      setTextTitle('');
      setTextContent('');
      setAddDialogOpen(false);
      fetchEntries();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast({ title: 'Informe a URL do site', variant: 'destructive' });
      return;
    }
    let url = websiteUrl.trim();
    if (!url.startsWith('http')) url = `https://${url}`;

    setSubmitting(true);
    try {
      const { data, error } = await sb.functions.invoke('bot-knowledge-process', {
        body: {
          action: 'scrape_website',
          customer_product_id: customerProductId,
          url,
          title: websiteTitle.trim() || undefined,
        },
      });
      if (error) throw error;
      toast({ title: 'Site processado!', description: `${data?.content_length || 0} caracteres extraídos.` });
      setWebsiteUrl('');
      setWebsiteTitle('');
      setAddDialogOpen(false);
      fetchEntries();
    } catch (e: any) {
      toast({ title: 'Erro ao processar site', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 10MB', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const filePath = `${user.id}/${customerProductId}/${file.name}`;

      // Upload to storage
      const { error: uploadErr } = await sb.storage
        .from('bot_knowledge')
        .upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      // Determine entry type
      const mime = file.type;
      let entryType = 'document';
      if (mime.includes('spreadsheet') || mime.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        entryType = 'spreadsheet';
      }

      // Create DB entry
      const { data: entry, error: dbErr } = await sb
        .from('bot_knowledge_base')
        .insert({
          customer_product_id: customerProductId,
          entry_type: entryType,
          title: file.name,
          file_name: file.name,
          file_mime_type: mime,
          file_size_bytes: file.size,
          status: 'processing',
        })
        .select('id')
        .single();
      if (dbErr) throw dbErr;

      // Process the file content
      await sb.functions.invoke('bot-knowledge-process', {
        body: {
          action: 'process_file',
          customer_product_id: customerProductId,
          knowledge_id: entry.id,
        },
      });

      toast({ title: 'Arquivo enviado!', description: `${file.name} está sendo processado.` });
      setAddDialogOpen(false);
      fetchEntries();
    } catch (e: any) {
      toast({ title: 'Erro ao enviar arquivo', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (entry: KnowledgeEntry) => {
    try {
      await sb.functions.invoke('bot-knowledge-process', {
        body: {
          action: 'delete',
          customer_product_id: customerProductId,
          knowledge_id: entry.id,
        },
      });
      toast({ title: 'Removido!' });
      fetchEntries();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const totalKnowledge = entries.filter(e => e.status === 'ready').length;
  const totalChars = entries.reduce((s, e) => s + (e.content?.length || 0), 0);
  const totalSize = entries.reduce((s, e) => s + (e.file_size_bytes || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{totalKnowledge}</p>
              <p className="text-xs text-muted-foreground">Entradas ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <FileText className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{totalChars.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">Caracteres de conhecimento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Upload className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{formatBytes(totalSize)}</p>
              <p className="text-xs text-muted-foreground">Armazenamento usado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Base de Conhecimento
          </h3>
          <p className="text-sm text-muted-foreground">Ensine a IA sobre seu negócio com documentos, textos e websites</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchEntries} className="rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Adicionar Conhecimento
                </DialogTitle>
              </DialogHeader>

              <Tabs value={addTab} onValueChange={setAddTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="text" className="flex-1 gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Texto
                  </TabsTrigger>
                  <TabsTrigger value="website" className="flex-1 gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Website
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex-1 gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    Arquivo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      placeholder="Ex: Informações sobre produtos"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conteúdo</Label>
                    <Textarea
                      placeholder="Cole aqui as informações sobre seu negócio, produtos, serviços, FAQ, políticas..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={8}
                    />
                    <p className="text-xs text-muted-foreground">{textContent.length.toLocaleString()} caracteres</p>
                  </div>
                  <Button onClick={handleAddText} disabled={submitting} className="w-full rounded-xl">
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Salvar Conhecimento
                  </Button>
                </TabsContent>

                <TabsContent value="website" className="space-y-4 mt-4">
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <p className="text-sm flex items-center gap-2">
                      <Search className="h-4 w-4 text-blue-500" />
                      A IA vai "passear" pelo site e aprender sobre seu negócio
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Site</Label>
                    <Input
                      type="url"
                      placeholder="https://www.meusite.com.br"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome (opcional)</Label>
                    <Input
                      placeholder="Ex: Site Principal"
                      value={websiteTitle}
                      onChange={(e) => setWebsiteTitle(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleScrapeWebsite} disabled={submitting} className="w-full rounded-xl">
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                    Escanear Website
                  </Button>
                </TabsContent>

                <TabsContent value="file" className="space-y-4 mt-4">
                  <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                    <p className="text-sm text-muted-foreground">
                      Envie documentos de texto (.txt, .csv, .json), planilhas (.xlsx, .xls) ou PDFs
                    </p>
                  </div>
                  <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium">Clique para selecionar um arquivo</p>
                    <p className="text-xs text-muted-foreground mt-1">Máximo 10MB • TXT, CSV, JSON, XLSX, XLS, PDF</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".txt,.csv,.json,.xml,.xlsx,.xls,.pdf,.doc,.docx,.md"
                    onChange={handleFileUpload}
                  />
                  {submitting && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando e processando...
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Knowledge entries list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h4 className="text-lg font-semibold mb-2">Nenhum conhecimento adicionado</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Ensine a IA sobre seu negócio adicionando textos, documentos ou o site da sua empresa.
              Quanto mais informação, melhor ela atenderá seus clientes!
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Conhecimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const statusBadge = STATUS_BADGES[entry.status] || STATUS_BADGES.error;
            return (
              <Card key={entry.id} className="border-border/50 hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-muted/50 flex-shrink-0 mt-0.5">
                        {TYPE_ICONS[entry.entry_type] || <File className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm truncate">{entry.title}</h4>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {TYPE_LABELS[entry.entry_type] || entry.entry_type}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${statusBadge.className}`}>
                            {statusBadge.icon}
                            {statusBadge.label}
                          </Badge>
                        </div>

                        {entry.source_url && (
                          <a href={entry.source_url} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                            <Link2 className="h-3 w-3" />
                            {entry.source_url}
                          </a>
                        )}

                        {entry.error_message && (
                          <p className="text-xs text-red-500 mt-1">{entry.error_message}</p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {entry.content && (
                            <span>{entry.content.length.toLocaleString()} caracteres</span>
                          )}
                          {entry.file_size_bytes > 0 && (
                            <span>{formatBytes(entry.file_size_bytes)}</span>
                          )}
                          <span>{new Date(entry.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>

                        {entry.content && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                            {entry.content.slice(0, 200)}...
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={() => handleDelete(entry)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
