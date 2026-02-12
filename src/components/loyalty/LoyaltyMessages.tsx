import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LoyaltyMessagesProps {
  customerProductId: string;
}

export function LoyaltyMessages({ customerProductId }: LoyaltyMessagesProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    template: '',
    trigger_type: 'custom',
    is_active: true
  });

  const variables = [
    { name: '{cliente}', description: 'Nome do cliente' },
    { name: '{pontos}', description: 'Quantidade de pontos' },
    { name: '{recompensa}', description: 'Nome da recompensa' },
    { name: '{data}', description: 'Data atual' }
  ];

  useEffect(() => {
    fetchTemplates();
  }, [customerProductId]);

  const fetchTemplates = async () => {
    const { data, error } = await (supabase
      .from('loyalty_message_templates' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false }) as any);

    if (error) {
      toast({ title: "Erro", description: "Erro ao buscar templates", variant: "destructive" });
      return;
    }

    setTemplates(data || []);
  };

  const handleOpenDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        template: template.template,
        trigger_type: template.trigger_type,
        is_active: template.is_active
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        template: '',
        trigger_type: 'custom',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSave = {
      customer_product_id: customerProductId,
      ...formData
    };

    if (editingTemplate) {
      const { error } = await (supabase
        .from('loyalty_message_templates' as any)
        .update(dataToSave)
        .eq('id', editingTemplate.id) as any);

      if (error) {
        toast({ title: "Erro", description: "Erro ao atualizar template", variant: "destructive" });
        return;
      }

      toast({ title: "Sucesso", description: "Template atualizado com sucesso!" });
    } else {
      const { error } = await (supabase
        .from('loyalty_message_templates' as any)
        .insert(dataToSave) as any);

      if (error) {
        toast({ title: "Erro", description: "Erro ao criar template", variant: "destructive" });
        return;
      }

      toast({ title: "Sucesso", description: "Template criado com sucesso!" });
    }

    setIsDialogOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    const { error } = await (supabase
      .from('loyalty_message_templates' as any)
      .delete()
      .eq('id', id) as any);

    if (error) {
      toast({ title: "Erro", description: "Erro ao excluir template", variant: "destructive" });
      return;
    }

    toast({ title: "Sucesso", description: "Template excluído com sucesso!" });
    fetchTemplates();
  };

  const getTriggerLabel = (type: string) => {
    const labels: any = {
      points_added: 'Pontos Adicionados',
      reward_redeemed: 'Recompensa Resgatada',
      welcome: 'Boas-vindas',
      custom: 'Personalizado'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Mensagens Automáticas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure mensagens automáticas enviadas via WhatsApp
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Template</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="trigger_type">Gatilho</Label>
                <Select 
                  value={formData.trigger_type} 
                  onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points_added">Pontos Adicionados</SelectItem>
                    <SelectItem value="reward_redeemed">Recompensa Resgatada</SelectItem>
                    <SelectItem value="welcome">Boas-vindas</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="template">Mensagem</Label>
                <Textarea
                  id="template"
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  rows={6}
                  required
                  placeholder="Digite sua mensagem usando variáveis dinâmicas..."
                />
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-semibold mb-2">Variáveis disponíveis:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {variables.map(v => (
                      <div key={v.name}>
                        <code className="bg-background px-2 py-1 rounded">{v.name}</code>
                        <span className="text-muted-foreground ml-2">{v.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Template Ativo</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTemplate ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.length > 0 ? (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Gatilho: {getTriggerLabel(template.trigger_type)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-sans">{template.template}</pre>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center text-muted-foreground py-12">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum template de mensagem cadastrado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
