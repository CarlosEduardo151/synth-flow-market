import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  customer_name: string | null;
  created_at: string;
}

interface ProductReviewsListProps {
  productSlug: string;
  refreshTrigger?: number;
}

export const ProductReviewsList = ({ productSlug, refreshTrigger }: ProductReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("product_reviews")
          .select("id, rating, review_text, customer_name, created_at")
          .eq("product_slug", productSlug)
          .eq("is_approved", true)
          .order("is_featured", { ascending: false })
          .order("rating", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        setReviews(data || []);

        if (data && data.length > 0) {
          const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
          setAverageRating(Math.round(avg * 10) / 10);
        }
      } catch (error) {
        console.error("Erro ao buscar avaliações:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [productSlug, refreshTrigger]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-500 text-yellow-500"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Nenhuma avaliação ainda. Seja o primeiro a avaliar!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Avaliações dos Clientes
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{averageRating}</span>
            <div className="flex flex-col items-start">
              {renderStars(Math.round(averageRating))}
              <span className="text-xs text-muted-foreground">
                {reviews.length} avaliação{reviews.length !== 1 ? "ões" : ""}
              </span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="p-4 rounded-lg bg-muted/30 border border-border/30 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {(review.customer_name || "C")[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {review.customer_name || "Cliente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(review.created_at), "d 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
              {renderStars(review.rating)}
            </div>
            
            {review.review_text && (
              <div className="flex gap-2 pt-2">
                <Quote className="h-4 w-4 text-primary/50 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground italic">
                  {review.review_text}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
