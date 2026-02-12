import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface CustomerReview {
  id: string;
  customer_name: string;
  review_text: string;
  rating: number;
  customer_photo_url?: string;
}

export const CustomerReviews = () => {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await (supabase
          .from('customer_reviews')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false }) as any);

        if (error) throw error;
        setReviews(data || []);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  useEffect(() => {
    if (reviews.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === reviews.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Auto-advance every 5 seconds

    return () => clearInterval(interval);
  }, [reviews.length]);

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? reviews.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === reviews.length - 1 ? 0 : currentIndex + 1);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
              <div className="h-32 bg-gray-200 rounded max-w-2xl mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  const currentReview = reviews[currentIndex];

  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Avaliações dos Clientes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Veja o que nossos clientes estão dizendo sobre nossos produtos e serviços
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="relative">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mb-6">
                  <Avatar className="h-16 w-16 mx-auto mb-4">
                    <AvatarImage 
                      src={currentReview.customer_photo_url} 
                      alt={currentReview.customer_name} 
                    />
                    <AvatarFallback className="text-lg">
                      {currentReview.customer_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {currentReview.customer_name}
                  </h3>
                  <div className="flex justify-center mb-4">
                    {renderStars(currentReview.rating)}
                  </div>
                </div>

                <blockquote className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  "{currentReview.review_text}"
                </blockquote>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPrevious}
                  className="rounded-full"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Dots Indicator */}
                <div className="flex space-x-2">
                  {reviews.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentIndex 
                          ? 'bg-primary' 
                          : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNext}
                  className="rounded-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};