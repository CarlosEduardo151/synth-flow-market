import { useState } from 'react';
import { Copy, Check, Code, Globe, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface BotWebEmbedTabProps {
  customerProductId: string;
  businessName: string;
}

export function BotWebEmbedTab({ customerProductId, businessName }: BotWebEmbedTabProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [position, setPosition] = useState<'right' | 'left'>('right');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

  const shortId = customerProductId.split('-')[0];

  const embedScript = `<!-- NovaLink Agente IA - Chat Widget [${shortId}] -->
<script>
  (function() {
    var w = window, d = document;
    var ns = "__NL_" + "${shortId}";
    w[ns] = {
      productId: "${customerProductId}",
      endpoint: "${supabaseUrl}/functions/v1/bot-proxy",
      name: "${businessName}",
      color: "${primaryColor}",
      position: "${position}"
    };
    var s = d.createElement("script");
    s.src = "${supabaseUrl}/functions/v1/bot-proxy/widget.js?id=${shortId}";
    s.async = true;
    s.dataset.nlId = "${shortId}";
    d.head.appendChild(s);
  })();
</script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedScript);
      setCopied(true);
      toast({ title: 'Copiado!', description: 'Snippet copiado para a área de transferência.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Integração Web</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cole o código abaixo no seu site para ativar o chat do Agente IA.
        </p>
      </div>

      {/* Customization */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Personalização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Cor principal</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Posição do widget</label>
              <div className="flex gap-2">
                <Button
                  variant={position === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPosition('right')}
                  className="flex-1"
                >
                  Direita
                </Button>
                <Button
                  variant={position === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPosition('left')}
                  className="flex-1"
                >
                  Esquerda
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              Como instalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Badge variant="secondary" className="h-5 w-5 shrink-0 flex items-center justify-center text-[10px] p-0 rounded-full">1</Badge>
                <span>Copie o código abaixo</span>
              </li>
              <li className="flex gap-2">
                <Badge variant="secondary" className="h-5 w-5 shrink-0 flex items-center justify-center text-[10px] p-0 rounded-full">2</Badge>
                <span>Cole antes do <code className="text-xs bg-muted px-1 rounded">&lt;/body&gt;</code> do seu site</span>
              </li>
              <li className="flex gap-2">
                <Badge variant="secondary" className="h-5 w-5 shrink-0 flex items-center justify-center text-[10px] p-0 rounded-full">3</Badge>
                <span>O widget de chat aparecerá automaticamente</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Code Snippet */}
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Code className="w-4 h-4 text-muted-foreground" />
              Código de integração
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted/50 border border-border/50 rounded-xl p-4 overflow-x-auto text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap break-all">
            {embedScript}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
