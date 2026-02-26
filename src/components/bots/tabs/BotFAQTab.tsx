import { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle, Plus, Trash2, RefreshCw, Loader2, Search,
  GripVertical, ToggleLeft, ToggleRight, Pencil, Check, X,
  Tag, BarChart3, Sparkles, MessageSquareQuote, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;

interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  is_active: boolean;
  hit_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface BotFAQTabProps {
  customerProductId: string;
}

const DEFAULT_CATEGORIES = ['geral', 'produtos', 'preços', 'horários', 'pagamentos', 'suporte', 'entregas', 'trocas'];

const CATEGORY_COLORS: Record<string, string> = {
  geral: 'bg-muted text-muted-foreground',
  produtos: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  preços: 'bg-green-500/10 text-green-500 border-green-500/20',
  horários: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  pagamentos: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  suporte: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  entregas: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  trocas: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
};

export function BotFAQTab({ customerProductId }: BotFAQTabProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<FAQEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formCategory, setFormCategory] = useState('geral');

  const fetchEntries = useCallback(async () => {
    try {
      const { data, error } = await sb
        .from('bot_faq')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEntries(data || []);
    } catch (e) {
      console.error('fetch FAQ error:', e);
    } finally {
      setLoading(false);
    }
  }, [customerProductId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const resetForm = () => {
    setFormQuestion('');
    setFormAnswer('');
    setFormKeywords('');
    setFormCategory('geral');
    setEditingId(null);
  };

  const openEditDialog = (entry: FAQEntry) => {
    setFormQuestion(entry.question);
    setFormAnswer(entry.answer);
    setFormKeywords(entry.keywords.join(', '));
    setFormCategory(entry.category);
    setEditingId(entry.id);
    setAddDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formQuestion.trim() || !formAnswer.trim()) {
      toast({ title: 'Preencha pergunta e resposta', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const keywords = formKeywords
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(Boolean);

      const payload = {
        customer_product_id: customerProductId,
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        keywords,
        category: formCategory,
      };

      if (editingId) {
        const { error } = await sb.from('bot_faq').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'FAQ atualizada!' });
      } else {
        const { error } = await sb.from('bot_faq').insert(payload);
        if (error) throw error;
        toast({ title: 'FAQ adicionada!' });
      }

      resetForm();
      setAddDialogOpen(false);
      fetchEntries();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (entry: FAQEntry) => {
    try {
      await sb.from('bot_faq').update({ is_active: !entry.is_active }).eq('id', entry.id);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: !e.is_active } : e));
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await sb.from('bot_faq').delete().eq('id', id);
      toast({ title: 'FAQ removida!' });
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  // Stats
  const totalActive = entries.filter(e => e.is_active).length;
  const totalHits = entries.reduce((s, e) => s + e.hit_count, 0);
  const categories = [...new Set(entries.map(e => e.category))];

  // Filter
  const filtered = entries.filter(e => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.question.toLowerCase().includes(q) ||
        e.answer.toLowerCase().includes(q) ||
        e.keywords.some(k => k.includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{totalActive}</p>
              <p className="text-xs text-muted-foreground">FAQs ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10">
              <BarChart3 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{totalHits.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">Respostas automáticas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{categories.length}</p>
              <p className="text-xs text-muted-foreground">Categorias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">FAQ Automático — Economia de Tokens</p>
              <p className="text-xs text-muted-foreground mt-1">
                Quando um cliente faz uma pergunta que bate com uma FAQ, o bot responde instantaneamente <strong>sem consumir tokens da IA</strong>.
                Use palavras-chave para melhorar o reconhecimento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Perguntas Frequentes
          </h3>
          <p className="text-sm text-muted-foreground">Respostas automáticas que não consomem tokens</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchEntries} className="rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Nova FAQ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {editingId ? 'Editar FAQ' : 'Nova FAQ'}
                </DialogTitle>
                <DialogDescription>
                  {editingId ? 'Atualize a pergunta e resposta automática.' : 'Cadastre uma pergunta e resposta automática.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Pergunta do cliente</Label>
                  <Input
                    placeholder="Ex: Qual o horário de funcionamento?"
                    value={formQuestion}
                    onChange={e => setFormQuestion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Resposta automática</Label>
                  <Textarea
                    placeholder="Ex: Nosso horário é de segunda a sexta, das 9h às 18h. Aos sábados das 9h às 13h."
                    value={formAnswer}
                    onChange={e => setFormAnswer(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">{formAnswer.length} caracteres</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Palavras-chave
                    </Label>
                    <Input
                      placeholder="horário, aberto, funciona"
                      value={formKeywords}
                      onChange={e => setFormKeywords(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">Separadas por vírgula</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }} className="rounded-xl">
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={submitting} className="rounded-xl">
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  {editingId ? 'Atualizar' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + Filter */}
      {entries.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pergunta, resposta ou palavra-chave..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {DEFAULT_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* FAQ List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <MessageSquareQuote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h4 className="text-lg font-semibold mb-2">Nenhuma FAQ cadastrada</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Cadastre perguntas frequentes para o bot responder automaticamente sem consumir tokens da IA.
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira FAQ
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-8 text-center">
            <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma FAQ encontrada com esse filtro.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const catColor = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.geral;
            return (
              <Card
                key={entry.id}
                className={`border-border/50 transition-all duration-200 ${!entry.is_active ? 'opacity-50' : 'hover:border-border'}`}
              >
                <CardContent className="p-0">
                  {/* Header row */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className="flex-shrink-0 text-muted-foreground/30">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{entry.question}</p>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 capitalize ${catColor}`}>
                          {entry.category}
                        </Badge>
                        {entry.hit_count > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                            {entry.hit_count}× usada
                          </Badge>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{entry.answer}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch
                        checked={entry.is_active}
                        onCheckedChange={() => handleToggle(entry)}
                        onClick={e => e.stopPropagation()}
                      />
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-border/30 mt-0">
                      <div className="pt-3 space-y-3">
                        <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Resposta:</p>
                          <p className="text-sm whitespace-pre-wrap">{entry.answer}</p>
                        </div>

                        {entry.keywords.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {entry.keywords.map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <p className="text-[10px] text-muted-foreground">
                            Criada em {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                            {entry.hit_count > 0 && ` • ${entry.hit_count} respostas automáticas`}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 text-xs rounded-lg"
                              onClick={() => openEditDialog(entry)}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 text-xs rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(entry.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
