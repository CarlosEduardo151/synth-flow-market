import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LoyaltyRewardsProps {
  customerProductId: string;
}

export function LoyaltyRewards({ customerProductId }: LoyaltyRewardsProps) {
  const [rewards, setRewards] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_cost: '',
    quantity_available: '',
    image_url: '',
    is_active: true
  });

  useEffect(() => {
    fetchRewards();
  }, [customerProductId]);

  const fetchRewards = async () => {
    const { data, error } = await (supabase
      .from('loyalty_rewards' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .order('points_cost', { ascending: true }) as any);

    if (error) {
      toast({ title: "Erro", description: "Erro ao buscar recompensas", variant: "destructive" });
      return;
    }

    setRewards(data || []);
  };

  const handleOpenDialog = (reward?: any) => {
    if (reward) {
      setEditingReward(reward);
      setFormData({
        name: reward.name,
        description: reward.description || '',
        points_cost: reward.points_cost.toString(),
        quantity_available: reward.quantity_available?.toString() || '',
        image_url: reward.image_url || '',
        is_active: reward.is_active
      });
    } else {
      setEditingReward(null);
      setFormData({
        name: '',
        description: '',
        points_cost: '',
        quantity_available: '',
        image_url: '',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSave = {
      customer_product_id: customerProductId,
      name: formData.name,
      description: formData.description,
      points_cost: parseInt(formData.points_cost),
      quantity_available: formData.quantity_available ? parseInt(formData.quantity_available) : null,
      image_url: formData.image_url || null,
      is_active: formData.is_active
    };

    if (editingReward) {
      const { error } = await (supabase
        .from('loyalty_rewards' as any)
        .update(dataToSave)
        .eq('id', editingReward.id) as any);

      if (error) {
        toast({ title: "Erro", description: "Erro ao atualizar recompensa", variant: "destructive" });
        return;
      }

      toast({ title: "Sucesso", description: "Recompensa atualizada com sucesso!" });
    } else {
      const { error } = await (supabase
        .from('loyalty_rewards' as any)
        .insert(dataToSave) as any);

      if (error) {
        toast({ title: "Erro", description: "Erro ao criar recompensa", variant: "destructive" });
        return;
      }

      toast({ title: "Sucesso", description: "Recompensa criada com sucesso!" });
    }

    setIsDialogOpen(false);
    fetchRewards();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta recompensa?')) return;

    const { error } = await (supabase
      .from('loyalty_rewards' as any)
      .delete()
      .eq('id', id) as any);

    if (error) {
      toast({ title: "Erro", description: "Erro ao excluir recompensa", variant: "destructive" });
      return;
    }

    toast({ title: "Sucesso", description: "Recompensa excluída com sucesso!" });
    fetchRewards();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />
          Catálogo de Recompensas
        </h2>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Recompensa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Recompensa</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="points_cost">Valor em Pontos</Label>
                  <Input
                    id="points_cost"
                    type="number"
                    value={formData.points_cost}
                    onChange={(e) => setFormData({ ...formData, points_cost: e.target.value })}
                    required
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity_available">Quantidade Disponível</Label>
                  <Input
                    id="quantity_available"
                    type="number"
                    value={formData.quantity_available}
                    onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                    placeholder="Ilimitado se vazio"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="image_url">URL da Imagem</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Recompensa Ativa</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingReward ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rewards.length > 0 ? (
          rewards.map((reward) => (
            <div key={reward.id} className="border rounded-lg p-4 space-y-3">
              {reward.image_url && (
                <img
                  src={reward.image_url}
                  alt={reward.name}
                  className="w-full h-40 object-cover rounded-lg"
                />
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{reward.name}</h3>
                  <Badge variant={reward.is_active ? "default" : "secondary"}>
                    {reward.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{reward.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">{reward.points_cost} pontos</span>
                  {reward.quantity_available !== null && (
                    <span className="text-sm text-muted-foreground">
                      {reward.quantity_available} disponíveis
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Resgatado {reward.total_redeemed} vezes
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDialog(reward)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(reward.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-12">
            <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma recompensa cadastrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
