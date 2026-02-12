import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

const supabase = supabaseClient as any;
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProductReviewFormProps {
  productSlug: string;
  onReviewSubmitted?: () => void;
}

export const ProductReviewForm = ({ productSlug, onReviewSubmitted }: ProductReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para enviar uma avaliação");
      return;
    }

    if (rating === 0) {
      toast.error("Por favor, selecione uma nota de 1 a 5 estrelas");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase.from("product_reviews").insert({
        user_id: user.id,
        product_slug: productSlug,
        rating,
        review_text: reviewText,
        customer_name: profile?.full_name || user.email?.split("@")[0] || "Cliente",
      });

      if (error) throw error;

      toast.success("Avaliação enviada! Será publicada após aprovação.");
      setRating(0);
      setReviewText("");
      onReviewSubmitted?.();
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      toast.error("Erro ao enviar avaliação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Deixe sua Avaliação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-2">Sua nota:</span>
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
                className={`h-8 w-8 transition-colors ${
                  star <= (hoverRating || rating)
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm font-medium text-foreground">
              {rating}/5
            </span>
          )}
        </div>

        <Textarea
          placeholder="Conte sua experiência com este produto... (opcional)"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
          className="resize-none"
        />

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          className="w-full"
        >
          {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Sua avaliação será revisada antes de ser publicada
        </p>
      </CardContent>
    </Card>
  );
};
