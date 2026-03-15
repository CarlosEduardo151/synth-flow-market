import { useState } from 'react';
import { Copy, Check, Code, Globe, ExternalLink, Palette, MessageSquare, Settings2, Braces } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface BotWebEmbedTabProps {
  customerProductId: string;
  businessName: string;
}

export function BotWebEmbedTab({ customerProductId, businessName }: BotWebEmbedTabProps) {
  const { toast } = useToast();
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Appearance
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [headerBg, setHeaderBg] = useState('#1e293b');
  const [headerText, setHeaderText] = useState('#ffffff');
  const [userBubbleColor, setUserBubbleColor] = useState('#3b82f6');
  const [botBubbleColor, setBotBubbleColor] = useState('#f1f5f9');
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [borderRadius, setBorderRadius] = useState('16');
  const [widgetSize, setWidgetSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Behavior
  const [position, setPosition] = useState<'right' | 'left'>('right');
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoOpenDelay, setAutoOpenDelay] = useState('5');
  const [showBranding, setShowBranding] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [persistChat, setPersistChat] = useState(true);

  // Content
  const [widgetTitle, setWidgetTitle] = useState(businessName || 'Agente IA');
  const [welcomeMessage, setWelcomeMessage] = useState('Olá! Como posso ajudar você hoje?');
  const [placeholder, setPlaceholder] = useState('Digite sua mensagem...');
  const [offlineMessage, setOfflineMessage] = useState('No momento estamos offline. Deixe sua mensagem!');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [buttonIcon, setButtonIcon] = useState<'chat' | 'headset' | 'robot'>('chat');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const shortId = customerProductId.split('-')[0];

  const widgetSizeMap = { small: '360', medium: '400', large: '460' };
  const iconMap = { chat: '💬', headset: '🎧', robot: '🤖' };

  // ── Full customized snippet ──
  const fullScript = `<!-- NovaLink Agente IA - Widget [${shortId}] -->
<script>
  (function() {
    var w = window, d = document;
    var ns = "__NL_${shortId}";
    w[ns] = {
      productId: "${customerProductId}",
      endpoint: "${supabaseUrl}/functions/v1/bot-proxy",
      // Aparência
      name: "${widgetTitle}",
      color: "${primaryColor}",
      headerBg: "${headerBg}",
      headerText: "${headerText}",
      userBubble: "${userBubbleColor}",
      botBubble: "${botBubbleColor}",
      font: "${fontFamily}",
      radius: ${borderRadius},
      width: ${widgetSizeMap[widgetSize]},
      icon: "${iconMap[buttonIcon]}",
      avatar: "${avatarUrl}",
      // Comportamento
      position: "${position}",
      autoOpen: ${autoOpen},
      autoOpenDelay: ${autoOpen ? autoOpenDelay : 0},
      sound: ${soundEnabled},
      persist: ${persistChat},
      branding: ${showBranding},
      // Conteúdo
      welcome: "${welcomeMessage.replace(/"/g, '\\"')}",
      placeholder: "${placeholder.replace(/"/g, '\\"')}",
      offline: "${offlineMessage.replace(/"/g, '\\"')}"
    };
    var s = d.createElement("script");
    s.src = "${supabaseUrl}/functions/v1/bot-proxy/widget.js?id=${shortId}";
    s.async = true;
    s.dataset.nlId = "${shortId}";
    d.head.appendChild(s);
  })();
</script>`;

  // ── Raw / minimal snippet ──
  const rawScript = `<!-- NovaLink Agente IA - API Script [${shortId}] -->
<script>
  (function() {
    window.__NL_${shortId} = {
      productId: "${customerProductId}",
      endpoint: "${supabaseUrl}/functions/v1/bot-proxy"
    };

    /**
     * Enviar mensagem para o Agente IA:
     *
     * fetch(window.__NL_${shortId}.endpoint, {
     *   method: "POST",
     *   headers: { "Content-Type": "application/json" },
     *   body: JSON.stringify({
     *     customer_product_id: window.__NL_${shortId}.productId,
     *     message: "Sua mensagem aqui",
     *     source: "web"
     *   })
     * })
     * .then(r => r.json())
     * .then(data => console.log(data.reply));
     */
  })();
</script>`;

  const handleCopy = async (text: string, type: 'full' | 'raw') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'full') { setCopiedFull(true); setTimeout(() => setCopiedFull(false), 2000); }
      else { setCopiedRaw(true); setTimeout(() => setCopiedRaw(false), 2000); }
      toast({ title: 'Copiado!', description: 'Snippet copiado para a área de transferência.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Integração Web</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize e cole o código no seu site, ou use o script básico para criar sua própria interface.
        </p>
      </div>

      <Tabs defaultValue="full" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="full" className="gap-2">
            <Palette className="w-4 h-4" />
            Widget Personalizado
          </TabsTrigger>
          <TabsTrigger value="raw" className="gap-2">
            <Braces className="w-4 h-4" />
            Script Básico (API)
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════ */}
        {/* FULL WIDGET TAB                              */}
        {/* ════════════════════════════════════════════ */}
        <TabsContent value="full" className="space-y-5 mt-5">
          {/* Row 1 — Aparência + Conteúdo */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Aparência */}
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  Aparência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Cor principal" value={primaryColor} onChange={setPrimaryColor} />
                  <ColorField label="Fundo do cabeçalho" value={headerBg} onChange={setHeaderBg} />
                  <ColorField label="Texto do cabeçalho" value={headerText} onChange={setHeaderText} />
                  <ColorField label="Balão do usuário" value={userBubbleColor} onChange={setUserBubbleColor} />
                  <ColorField label="Balão do bot" value={botBubbleColor} onChange={setBotBubbleColor} />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Fonte</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                      <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                      <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                      <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                      <SelectItem value="system-ui, sans-serif">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Borda (px)</Label>
                    <Input type="number" min="0" max="30" value={borderRadius} onChange={e => setBorderRadius(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tamanho</Label>
                    <Select value={widgetSize} onValueChange={(v) => setWidgetSize(v as any)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Pequeno</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Ícone do botão</Label>
                  <div className="flex gap-2 mt-1.5">
                    {(['chat', 'headset', 'robot'] as const).map(icon => (
                      <Button
                        key={icon}
                        variant={buttonIcon === icon ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setButtonIcon(icon)}
                        className="flex-1 text-lg"
                      >
                        {iconMap[icon]}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conteúdo */}
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  Conteúdo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Título do widget</Label>
                  <Input value={widgetTitle} onChange={e => setWidgetTitle(e.target.value)} className="mt-1.5" placeholder="Agente IA" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Mensagem de boas-vindas</Label>
                  <Textarea value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} className="mt-1.5 min-h-[60px]" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Placeholder do input</Label>
                  <Input value={placeholder} onChange={e => setPlaceholder(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Mensagem offline</Label>
                  <Textarea value={offlineMessage} onChange={e => setOfflineMessage(e.target.value)} className="mt-1.5 min-h-[60px]" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">URL do avatar (opcional)</Label>
                  <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="mt-1.5" placeholder="https://..." />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2 — Comportamento + Como instalar */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  Comportamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Posição do widget</Label>
                  <div className="flex gap-2">
                    <Button variant={position === 'right' ? 'default' : 'outline'} size="sm" onClick={() => setPosition('right')} className="flex-1">Direita</Button>
                    <Button variant={position === 'left' ? 'default' : 'outline'} size="sm" onClick={() => setPosition('left')} className="flex-1">Esquerda</Button>
                  </div>
                </div>

                <ToggleRow label="Abrir automaticamente" checked={autoOpen} onChange={setAutoOpen} />
                {autoOpen && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Delay (segundos)</Label>
                    <Input type="number" min="0" max="60" value={autoOpenDelay} onChange={e => setAutoOpenDelay(e.target.value)} className="mt-1.5" />
                  </div>
                )}
                <ToggleRow label="Som de notificação" checked={soundEnabled} onChange={setSoundEnabled} />
                <ToggleRow label="Manter histórico do chat" checked={persistChat} onChange={setPersistChat} />
                <ToggleRow label="Mostrar marca NovaLink" checked={showBranding} onChange={setShowBranding} />
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
                    <span>Personalize as opções ao lado</span>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="secondary" className="h-5 w-5 shrink-0 flex items-center justify-center text-[10px] p-0 rounded-full">2</Badge>
                    <span>Copie o código gerado abaixo</span>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="secondary" className="h-5 w-5 shrink-0 flex items-center justify-center text-[10px] p-0 rounded-full">3</Badge>
                    <span>Cole antes do <code className="text-xs bg-muted px-1 rounded">&lt;/body&gt;</code> do seu site</span>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="secondary" className="h-5 w-5 shrink-0 flex items-center justify-center text-[10px] p-0 rounded-full">4</Badge>
                    <span>O widget aparecerá automaticamente</span>
                  </li>
                </ol>
                <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground">
                    <strong>ID único:</strong>{' '}
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{shortId}</code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cada produto gera um namespace exclusivo para evitar conflitos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Code Snippet */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code className="w-4 h-4 text-muted-foreground" />
                  Código de integração personalizado
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => handleCopy(fullScript, 'full')} className="gap-1.5">
                  {copiedFull ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedFull ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 border border-border/50 rounded-xl p-4 overflow-x-auto text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap break-all">
                {fullScript}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════ */}
        {/* RAW / API TAB                                */}
        {/* ════════════════════════════════════════════ */}
        <TabsContent value="raw" className="space-y-5 mt-5">
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Braces className="w-4 h-4 text-muted-foreground" />
                O que é o Script Básico?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O script básico fornece apenas a <strong>conexão com a API</strong> do seu Agente IA, sem nenhum widget visual.
                Use quando quiser construir sua própria interface de chat ou integrar a IA em um sistema existente.
              </p>
              <div className="mt-4 grid sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                  <p className="text-lg mb-1">🔌</p>
                  <p className="text-xs font-medium text-foreground">Conexão direta</p>
                  <p className="text-xs text-muted-foreground">Endpoint + ID do produto</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                  <p className="text-lg mb-1">🎨</p>
                  <p className="text-xs font-medium text-foreground">Interface livre</p>
                  <p className="text-xs text-muted-foreground">Crie o visual que quiser</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center">
                  <p className="text-lg mb-1">⚡</p>
                  <p className="text-xs font-medium text-foreground">Leve e rápido</p>
                  <p className="text-xs text-muted-foreground">Sem CSS ou UI embutida</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code className="w-4 h-4 text-muted-foreground" />
                  Script básico (somente API)
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => handleCopy(rawScript, 'raw')} className="gap-1.5">
                  {copiedRaw ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedRaw ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 border border-border/50 rounded-xl p-4 overflow-x-auto text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap break-all">
                {rawScript}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Helpers ── */

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2 mt-1.5">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-8 rounded-md border border-border cursor-pointer shrink-0" />
        <Input value={value} onChange={e => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm text-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
