import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Loader2 } from "lucide-react";

interface WhatsAppConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productSlug: string;
  productTitle: string;
}

export function WhatsAppConnectDialog({ 
  open, 
  onOpenChange, 
  productSlug, 
  productTitle 
}: WhatsAppConnectDialogProps) {
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!instanceId || !token || !phoneNumber) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-zapi-message', {
        body: {
          instanceId,
          token,
          phoneNumber,
          productSlug,
          productTitle,
        },
      });

      if (error) throw error;

      toast({
        title: "✅ Conectado com sucesso!",
        description: "Mensagem enviada via WhatsApp. Em breve entraremos em contato.",
      });

      onOpenChange(false);
      setInstanceId("");
      setToken("");
      setPhoneNumber("");
    } catch (error) {
      console.error('Error connecting to WhatsApp:', error);
      toast({
        title: "Erro ao conectar",
        description: "Não foi possível enviar a mensagem. Verifique suas credenciais Z-API.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Configure sua integração Z-API para receber mensagens sobre{" "}
            <strong>{productTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="instanceId">ID da Instância</Label>
            <Input
              id="instanceId"
              placeholder="Ex: 3C12345678"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="Seu token Z-API"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Número do WhatsApp</Label>
            <Input
              id="phoneNumber"
              placeholder="Ex: 5511999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Digite apenas números com DDI e DDD (Ex: 5511999999999)
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                Conectar
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
          <strong>ℹ️ Como obter suas credenciais Z-API:</strong>
          <ol className="mt-2 ml-4 list-decimal space-y-1">
            <li>Acesse <a href="https://z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">z-api.io</a></li>
            <li>Crie uma conta ou faça login</li>
            <li>Crie uma instância do WhatsApp</li>
            <li>Copie o ID da instância e o Token</li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
