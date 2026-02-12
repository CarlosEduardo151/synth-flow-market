import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useProductAccess } from '@/hooks/useProductAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function ProductReviewPage() {
  const { productSlug } = useParams<{ productSlug: string }>();
  const { user } = useAuth();
  const { hasAccess, loading: accessLoading } = useProductAccess(productSlug || '');
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para avaliar');
      return;
    }

    if (rating === 0) {
      toast.error('Por favor, selecione uma avaliação de 1 a 5 estrelas');
      return;
    }

    setIsSubmitting(true);

    try {
      const customerName = user.email?.split('@')[0] || 'Cliente';

      const { error } = await supabase
        .from('product_reviews')
        .insert({
          user_id: user.id,
          product_slug: productSlug,
          rating,
          review_text: reviewText.trim() || null,
          customer_name: customerName,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Você já avaliou este produto');
        } else {
          throw error;
        }
      } else {
        setSubmitted(true);
        toast.success('Avaliação enviada com sucesso! Obrigado pelo seu feedback.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                Você precisa ter adquirido este produto para avaliá-lo.
              </p>
              <Button asChild>
                <Link to="/meus-produtos">Ir para Meus Produtos</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">Obrigado pela sua avaliação!</h2>
              <p className="text-muted-foreground">
                Sua avaliação foi enviada e será analisada pela nossa equipe.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button asChild variant="outline">
                  <Link to="/meus-produtos">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Meus Produtos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/meus-produtos">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Meus Produtos
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Avaliar Produto
              </CardTitle>
              <CardDescription>
                Compartilhe sua experiência com este produto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">
                  Sua avaliação
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-10 w-10 ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {rating === 1 && 'Muito ruim'}
                    {rating === 2 && 'Ruim'}
                    {rating === 3 && 'Regular'}
                    {rating === 4 && 'Bom'}
                    {rating === 5 && 'Excelente'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Comentário (opcional)
                </label>
                <Textarea
                  placeholder="Conte-nos mais sobre sua experiência com o produto..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
