import { Bot, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BotTelegramTabProps {
  customerProductId: string;
}

export function BotTelegramTab({ customerProductId }: BotTelegramTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          Telegram
          <Badge variant="secondary" className="text-[10px]">Em breve</Badge>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte seu Agente IA ao Telegram para atender clientes nessa plataforma.
        </p>
      </div>

      <Card className="border border-border/50">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Integração Telegram</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Em breve você poderá conectar seu bot ao Telegram usando o BotFather.
            O mesmo motor de IA, personalidade e base de conhecimento serão compartilhados.
          </p>
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Criar bot no BotFather
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
