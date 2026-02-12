import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowRight, ArrowLeft, HelpCircle, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

export interface TutorialStep {
  title: string;
  description: string;
  content: React.ReactNode;
  tips?: string[];
  example?: string;
}

interface ProductTutorialProps {
  productSlug: string;
  productTitle: string;
  steps: TutorialStep[];
  onComplete: () => void;
}

export const ProductTutorial = ({
  productSlug,
  productTitle,
  steps,
  onComplete,
}: ProductTutorialProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkTutorialCompletion();
  }, [productSlug]);

  const checkTutorialCompletion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tutorial_completions")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_slug", productSlug)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Tutorial não foi concluído, mostrar automaticamente
        setIsOpen(true);
        setHasCompleted(false);
      } else {
        setHasCompleted(true);
      }
    } catch (error) {
      console.error("Erro ao verificar tutorial:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await (supabase
        .from("tutorial_completions")
        .insert({
          user_id: user.id,
          product_slug: productSlug,
          step_id: 'completed'
        } as any) as any);

      if (error) throw error;

      setHasCompleted(true);
      setIsOpen(false);
      
      toast({
        title: "🎉 Tutorial concluído!",
        description: "Você está pronto para usar o sistema.",
      });

      onComplete();
    } catch (error) {
      console.error("Erro ao completar tutorial:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o progresso do tutorial.",
        variant: "destructive",
      });
    }
  };

  const handleRestart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("tutorial_completions")
        .delete()
        .eq("user_id", user.id)
        .eq("product_slug", productSlug);

      if (error) throw error;

      setHasCompleted(false);
      setCurrentStep(0);
      setIsOpen(true);
    } catch (error) {
      console.error("Erro ao reiniciar tutorial:", error);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];

  if (isLoading) return null;

  return (
    <>
      {/* Botão flutuante para reabrir o tutorial */}
      {hasCompleted && !isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 rounded-full shadow-lg z-50 h-14 w-14 p-0"
          size="icon"
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  Guia Rápido — {productTitle}
                </DialogTitle>
                <p className="text-muted-foreground mt-1">
                  Etapa {currentStep + 1} de {steps.length}
                </p>
              </div>
              {hasCompleted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Barra de progresso */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
          </div>

          {/* Conteúdo da etapa atual */}
          <div className="space-y-6 py-4">
            <div>
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {currentStep + 1}
                </span>
                {currentStepData.title}
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                {currentStepData.description}
              </p>
            </div>

            {/* Conteúdo principal */}
            <Card className="p-6 bg-muted/30">
              {currentStepData.content}
            </Card>

            {/* Exemplo, se houver */}
            {currentStepData.example && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  💡 Exemplo prático:
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {currentStepData.example}
                </p>
              </div>
            )}

            {/* Dicas, se houver */}
            {currentStepData.tips && currentStepData.tips.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  ✨ Dicas importantes:
                </p>
                <ul className="space-y-1">
                  {currentStepData.tips.map((tip, index) => (
                    <li
                      key={index}
                      className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2"
                    >
                      <Check className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Botões de navegação */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            <div className="flex gap-2">
              {currentStep === steps.length - 1 ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRestart}
                    className="gap-2"
                  >
                    Rever tutorial
                  </Button>
                  <Button onClick={handleComplete} className="gap-2">
                    <Check className="h-4 w-4" />
                    Concluir e aplicar
                  </Button>
                </>
              ) : (
                <Button onClick={nextStep} className="gap-2">
                  Entendi, pode seguir
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
