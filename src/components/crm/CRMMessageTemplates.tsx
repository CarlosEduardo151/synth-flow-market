import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare, Plus, Pencil, Trash2, Copy, FileText, Mail, Send,
  Loader2, Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  content: string;
  message_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  customerProductId: string;
}

const TYPE_INFO: Record<string, { label: string; icon: any; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600 bg-green-500/10 border-green-500/30' },
  email: { label: 'E-mail', icon: Mail, color: 'text-blue-600 bg-blue-500/10 border-blue-500/30' },
  sms: { label: 'SMS', icon: Send, color: 'text-purple-600 bg-purple-500/10 border-purple-500/30' },
  generic: { label: 'Genérico', icon: FileText, color: 'text-muted-foreground bg-muted border-border' },
};

const VARIABLES = [
  { key: '{{nome}}', desc: 'Nome do cliente' },
  { key: '{{empresa}}', desc: 'Empresa do cliente' },
  { key: '{{telefone}}', desc: 'Telefone' },
  { key: '{{email}}', desc: 'E-mail' },
  { key: '{{assunto}}', desc: 'Assunto/produto' },
  { key: '{{dias}}', desc: 'Dias desde o último contato' },
];

export function CRMMessageTemplates({ customerProductId }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    content: '',
    message_type: 'whatsapp',
    is_active: true,
  });

  const load = useCallback(async () => {
    if (!customerProductId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('crm_message_templates')
      .select('*')
      .eq('customer_product_id', customerProductId)
      .order('updated_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  }, [customerProductId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', content: '', message_type: 'whatsapp', is_active: true });
    setOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name,
      content: t.content,
      message_type: t.message_type || 'whatsapp',
      is_active: t.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast({ title: 'Preencha nome e conteúdo', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await (supabase as any)
          .from('crm_message_templates')
          .update({
            name: form.name,
            content: form.content,
            message_type: form.message_type,
            is_active: form.is_active,
          })
          .eq('id', editing.id);
        toast({ title: 'Template atualizado' });
      } else {
        await (supabase as any)
          .from('crm_message_templates')
          .insert({
            customer_product_id: customerProductId,
            name: form.name,
            content: form.content,
            message_type: form.message_type,
            is_active: form.is_active,
          });
        toast({ title: 'Template criado' });
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este template?')) return;
    await (supabase as any).from('crm_message_templates').delete().eq('id', id);
    toast({ title: 'Template removido' });
    load();
  };

  const duplicate = async (t: Template) => {
    await (supabase as any).from('crm_message_templates').insert({
      customer_product_id: customerProductId,
      name: `${t.name} (cópia)`,
      content: t.content,
      message_type: t.message_type,
      is_active: t.is_active,
    });
    toast({ title: 'Template duplicado' });
    load();
  };

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copiado!' });
  };

  const insertVariable = (variable: string) => {
    setForm(f => ({ ...f, content: f.content + variable }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Templates de Mensagem</h2>
            <p className="text-xs text-muted-foreground">
              Modelos prontos para WhatsApp, e-mail e SMS — usados em follow-ups e disparos manuais
            </p>
          </div>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Nenhum template ainda</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Crie modelos reutilizáveis com variáveis como <code className="bg-muted px-1 rounded">{'{{nome}}'}</code> e <code className="bg-muted px-1 rounded">{'{{empresa}}'}</code>.
            </p>
            <Button onClick={openNew} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Criar primeiro template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => {
            const info = TYPE_INFO[t.message_type || 'generic'] || TYPE_INFO.generic;
            const Icon = info.icon;
            return (
              <Card key={t.id} className={`hover:shadow-md transition-shadow ${!t.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center border ${info.color} shrink-0`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <p className="font-medium text-sm truncate">{t.name}</p>
                    </div>
                    {!t.is_active && (
                      <Badge variant="outline" className="text-[10px]">Inativo</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {t.content}
                  </p>
                  <div className="flex items-center gap-1 pt-1 border-t">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 flex-1" onClick={() => copyContent(t.content)}>
                      <Copy className="h-3 w-3" />
                      Copiar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => duplicate(t)} title="Duplicar">
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(t)} title="Editar">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => remove(t.id)} title="Excluir">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Boas-vindas após 1ª compra"
                />
              </div>
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select value={form.message_type} onValueChange={v => setForm({ ...form, message_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_INFO).map(([k, info]) => (
                      <SelectItem key={k} value={k}>{info.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo</Label>
                <span className="text-[11px] text-muted-foreground">
                  Use variáveis como {'{{nome}}'}
                </span>
              </div>
              <Textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={8}
                placeholder="Olá {{nome}}, vi que você se interessou pelo {{assunto}}. Posso te ajudar?"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                Variáveis disponíveis (clique para inserir)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    title={v.desc}
                    className="px-2 py-1 text-[11px] font-mono bg-muted hover:bg-primary/10 hover:text-primary rounded border transition-colors"
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label className="text-sm">Template ativo</Label>
                <p className="text-[11px] text-muted-foreground">Templates inativos não aparecem em listas de seleção</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={v => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Salvar alterações' : 'Criar template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
