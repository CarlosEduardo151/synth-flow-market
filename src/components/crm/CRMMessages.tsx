import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MessageTemplate {
  id: string;
  name: string;
  message_type: string;
  content: string;
  is_active: boolean;
}

interface CRMMessagesProps {
  customerProductId: string;
}

export const CRMMessages = ({ customerProductId }: CRMMessagesProps) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [customerProductId]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await (supabase
        .from('crm_message_templates' as any)
        .select('*')
        .eq('customer_product_id', customerProductId)
        .order('created_at', { ascending: false }) as any);

      if (!error && data) {
        setTemplates(data as MessageTemplate[]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const templateData = {
      customer_product_id: customerProductId,
      name: formData.get('name') as string,
      message_type: formData.get('message_type') as string,
      content: formData.get('content') as string,
      is_active: true
    };

    let error;
    if (editingTemplate) {
      ({ error } = await (supabase
        .from('crm_message_templates' as any)
        .update(templateData)
        .eq('id', editingTemplate.id) as any));
    } else {
      ({ error } = await (supabase
        .from('crm_message_templates' as any)
        .insert(templateData) as any));
    }

    if (!error) {
      toast({ title: editingTemplate ? "Template atualizado!" : "Template criado!" });
      setIsAddingTemplate(false);
      setEditingTemplate(null);
      loadTemplates();
    } else {
      toast({ title: "Erro ao salvar template", variant: "destructive" });
    }
  };

  const handleToggleActive = async (template: MessageTemplate) => {
    const { error } = await (supabase
      .from('crm_message_templates' as any)
      .update({ is_active: !template.is_active })
      .eq('id', template.id) as any);

    if (!error) {
      toast({ title: template.is_active ? "Template desativado" : "Template ativado" });
      loadTemplates();
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    const { error } = await (supabase
      .from('crm_message_templates' as any)
      .delete()
      .eq('id', templateId) as any);

    if (!error) {
      toast({ title: "Template excluído com sucesso!" });
      loadTemplates();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mensagens e Lembretes</h2>
          <p className="text-sm text-muted-foreground">Configure mensagens automáticas para seus clientes</p>
        </div>
        <Dialog open={isAddingTemplate || !!editingTemplate} onOpenChange={(open) => {
          setIsAddingTemplate(open);
          if (!open) setEditingTemplate(null);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddingTemplate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSaveTemplate}>
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Editar Template' : 'Novo Template de Mensagem'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingTemplate?.name}
                    placeholder="Ex: Mensagem de Follow-up"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message_type">Tipo de Mensagem</Label>
                  <Select name="message_type" defaultValue={editingTemplate?.message_type || 'whatsapp'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Conteúdo da Mensagem *</Label>
                  <Textarea
                    id="content"
                    name="content"
                    defaultValue={editingTemplate?.content}
                    rows={6}
                    placeholder="Olá {cliente}, tudo bem? ..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variáveis dinâmicas: <code className="bg-muted px-1 rounded">{'{cliente}'}</code>, 
                    <code className="bg-muted px-1 rounded ml-1">{'{empresa}'}</code>, 
                    <code className="bg-muted px-1 rounded ml-1">{'{telefone}'}</code>
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingTemplate ? 'Atualizar' : 'Criar'} Template
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {template.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <Badge variant="outline" className="text-xs">
                      {template.message_type}
                    </Badge>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={template.is_active}
                    onCheckedChange={() => handleToggleActive(template)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {template.content}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingTemplate(template)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteTemplate(template.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum template criado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie templates de mensagens para automatizar sua comunicação com clientes
            </p>
            <Button onClick={() => setIsAddingTemplate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};