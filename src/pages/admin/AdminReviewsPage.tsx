import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Edit, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Review {
  id: string;
  customer_name: string;
  customer_photo_url: string;
  review_text: string;
  rating: number;
  is_featured: boolean;
  display_order: number;
  created_at: string;
}

export default function AdminReviewsPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_photo_url: '',
    review_text: '',
    rating: '5',
    is_featured: true,
    display_order: '0'
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
      fetchReviews();
    }
  }, [isAdmin]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_reviews')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as avaliações.",
        variant: "destructive",
      });
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleOpenDialog = (review?: Review) => {
    if (review) {
      setEditingReview(review);
      setFormData({
        customer_name: review.customer_name,
        customer_photo_url: review.customer_photo_url || '',
        review_text: review.review_text,
        rating: review.rating.toString(),
        is_featured: review.is_featured,
        display_order: review.display_order.toString()
      });
    } else {
      setEditingReview(null);
      setFormData({
        customer_name: '',
        customer_photo_url: '',
        review_text: '',
        rating: '5',
        is_featured: true,
        display_order: '0'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const reviewData = {
        customer_name: formData.customer_name,
        customer_photo_url: formData.customer_photo_url || null,
        review_text: formData.review_text,
        rating: parseInt(formData.rating),
        is_featured: formData.is_featured,
        display_order: parseInt(formData.display_order)
      };

      if (editingReview) {
        const { error } = await supabase
          .from('customer_reviews')
          .update(reviewData)
          .eq('id', editingReview.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customer_reviews')
          .insert(reviewData);

        if (error) throw error;
      }

      await fetchReviews();
      setIsDialogOpen(false);

      toast({
        title: "Sucesso",
        description: `Avaliação ${editingReview ? 'atualizada' : 'criada'} com sucesso.`,
      });
    } catch (error) {
      console.error('Error saving review:', error);
      toast({
        title: "Erro",
        description: `Não foi possível ${editingReview ? 'atualizar' : 'criar'} a avaliação.`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return;
    
    try {
      const { error } = await supabase
        .from('customer_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      await fetchReviews();
      toast({
        title: "Sucesso",
        description: "Avaliação excluída com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a avaliação.",
        variant: "destructive",
      });
    }
  };

  const toggleFeatured = async (reviewId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('customer_reviews')
        .update({ is_featured: !isFeatured })
        .eq('id', reviewId);

      if (error) throw error;

      await fetchReviews();
      toast({
        title: "Sucesso",
        description: `Avaliação ${!isFeatured ? 'destacada' : 'removida do destaque'} com sucesso.`,
      });
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da avaliação.",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Painel
            </Button>
            <h1 className="text-3xl font-bold">Gerenciar Avaliações</h1>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nova Avaliação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingReview ? 'Editar Avaliação' : 'Nova Avaliação'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Nome do Cliente</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_photo_url">URL da Foto do Cliente</Label>
                  <Input
                    id="customer_photo_url"
                    value={formData.customer_photo_url}
                    onChange={(e) => setFormData({...formData, customer_photo_url: e.target.value})}
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review_text">Texto da Avaliação</Label>
                  <Textarea
                    id="review_text"
                    value={formData.review_text}
                    onChange={(e) => setFormData({...formData, review_text: e.target.value})}
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rating">Avaliação (1-5)</Label>
                    <Select value={formData.rating} onValueChange={(value) => setFormData({...formData, rating: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Estrela</SelectItem>
                        <SelectItem value="2">2 Estrelas</SelectItem>
                        <SelectItem value="3">3 Estrelas</SelectItem>
                        <SelectItem value="4">4 Estrelas</SelectItem>
                        <SelectItem value="5">5 Estrelas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_order">Ordem de Exibição</Label>
                    <Input
                      id="display_order"
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({...formData, display_order: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_featured">Destacar esta avaliação</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingReview ? 'Atualizar' : 'Criar'} Avaliação
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Avaliações dos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReviews ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhuma avaliação encontrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Texto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {review.customer_photo_url ? (
                            <img 
                              src={review.customer_photo_url} 
                              alt={review.customer_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              {review.customer_name[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{review.customer_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{review.review_text}</p>
                      </TableCell>
                      <TableCell>
                        {review.is_featured ? (
                          <Badge variant="default">Destaque</Badge>
                        ) : (
                          <Badge variant="secondary">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell>{review.display_order}</TableCell>
                      <TableCell>
                        {new Date(review.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(review)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleFeatured(review.id, review.is_featured)}
                            className={review.is_featured ? "text-yellow-600 hover:bg-yellow-50" : "text-gray-600 hover:bg-gray-50"}
                          >
                            {review.is_featured ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(review.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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