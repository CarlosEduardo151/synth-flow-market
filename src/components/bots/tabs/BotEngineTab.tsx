import { Brain, Eye, EyeOff, Loader2, Send, Sparkles, Wallet, Gift, Plus, ArrowRight, CreditCard, BarChart3, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

type OpenAIModelCategory = 'flagship' | 'mini' | 'reasoning';

interface OpenAIModel {
  value: string;
  label: string;
  description: string;
  category: OpenAIModelCategory;
}

const OPENAI_MODELS: OpenAIModel[] = [
  { value: 'gpt-5.1', label: 'GPT-5.1', description: 'Modelo mais recente', category: 'flagship' },
  { value: 'gpt-5', label: 'GPT-5', description: 'Modelo flagship', category: 'flagship' },
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Multimodal rápido', category: 'flagship' },
  { value: 'gpt-4', label: 'GPT-4', description: 'GPT-4 original', category: 'flagship' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Versão rápida', category: 'mini' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Versão rápida', category: 'mini' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Econômico', category: 'mini' },
  { value: 'o4-mini', label: 'O4 Mini', description: 'Raciocínio rápido', category: 'reasoning' },
  { value: 'o3', label: 'O3', description: 'Raciocínio poderoso', category: 'reasoning' },
  { value: 'o1', label: 'O1', description: 'Raciocínio original', category: 'reasoning' },
];

const OPENAI_CATEGORY_LABELS: Record<OpenAIModelCategory, string> = {
  flagship: '⭐ Flagship',
  mini: '⚡ Mini (Rápidos)',
  reasoning: '🧠 Reasoning',
};

type GoogleModelCategory = 'chat' | 'image';

interface GoogleModel {
  value: string;
  label: string;
  description: string;
  category: GoogleModelCategory;
}

const GOOGLE_MODELS: GoogleModel[] = [
  { value: 'models/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Versão estável', category: 'chat' },
  { value: 'models/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Multimodal rápido', category: 'chat' },
  { value: 'models/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', description: 'Versão leve', category: 'chat' },
  { value: 'models/gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Rápido', category: 'chat' },
  { value: 'models/gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', description: 'Geração de imagem', category: 'image' },
];

const GOOGLE_CATEGORY_LABELS: Record<GoogleModelCategory, string> = {
  chat: '💬 Chat',
  image: '🖼️ Imagem',
};

interface BotEngineTabProps {
  provider: 'openai' | 'google' | 'starai';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  workflowId: string;
  staraiCredits: { balanceBRL: number; freeBalanceBRL: number; depositedBRL: number };
  loadingCredits: boolean;
  depositAmount: number;
  processingDeposit: boolean;
  syncingLlm: boolean;
  onProviderChange: (provider: 'openai' | 'google' | 'starai') => void;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
  onTemperatureChange: (temp: number) => void;
  onMaxTokensChange: (tokens: number) => void;
  onDepositAmountChange: (amount: number) => void;
  onDeposit: () => void;
  onSyncLlm: () => void;
}

export function BotEngineTab({
  provider,
  apiKey,
  model,
  temperature,
  maxTokens,
  workflowId,
  staraiCredits,
  loadingCredits,
  depositAmount,
  processingDeposit,
  syncingLlm,
  onProviderChange,
  onApiKeyChange,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
  onDepositAmountChange,
  onDeposit,
  onSyncLlm,
}: BotEngineTabProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Provider & Model */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Provedor & Modelo
          </CardTitle>
          <CardDescription>Escolha a IA que vai alimentar seu bot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provedor de IA</Label>
            <Select value={provider} onValueChange={(v) => onProviderChange(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starai">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    StarAI (Recomendado)
                  </span>
                </SelectItem>
                <SelectItem value="openai">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    OpenAI
                  </span>
                </SelectItem>
                <SelectItem value="google">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Google Gemini
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* StarAI Credits */}
          {provider === 'starai' && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-amber-500 font-medium">
                  <Wallet className="h-4 w-4" />
                  Créditos StarAI
                </Label>
                {loadingCredits && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              {!loadingCredits && (
                <>
                  <div className="text-center py-2">
                    <p className="text-3xl font-bold text-amber-500">
                      R$ {staraiCredits.balanceBRL.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Saldo disponível</p>
                  </div>

                  {staraiCredits.balanceBRL === 0 && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm font-medium text-green-500 flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        🎁 R$ 75,00 de bônus de boas-vindas!
                      </p>
                    </div>
                  )}

                  {/* Deposit */}
                  <div className="space-y-2 pt-2 border-t border-amber-500/10">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <Input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => onDepositAmountChange(Number(e.target.value))}
                          min={10}
                          step={10}
                          className="pl-10"
                          disabled={processingDeposit}
                        />
                      </div>
                      <Button
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={onDeposit}
                        disabled={processingDeposit || depositAmount < 10}
                      >
                        {processingDeposit ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex gap-1.5">
                      {[25, 50, 100, 200].map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => onDepositAmountChange(amt)}
                        >
                          R${amt}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* API Key for non-starai */}
          {provider !== 'starai' && (
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={provider === 'openai' ? 'sk-...' : 'AIza...'}
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select value={model} onValueChange={onModelChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {(provider === 'openai' || provider === 'starai') ? (
                  (['flagship', 'mini', 'reasoning'] as OpenAIModelCategory[]).map((category) => {
                    const models = OPENAI_MODELS.filter(m => m.category === category);
                    if (!models.length) return null;
                    return (
                      <SelectGroup key={category}>
                        <SelectLabel className="bg-muted/50">{OPENAI_CATEGORY_LABELS[category]}</SelectLabel>
                        {models.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })
                ) : (
                  (['chat', 'image'] as GoogleModelCategory[]).map((category) => {
                    const models = GOOGLE_MODELS.filter(m => m.category === category);
                    if (!models.length) return null;
                    return (
                      <SelectGroup key={category}>
                        <SelectLabel className="bg-muted/50">{GOOGLE_CATEGORY_LABELS[category]}</SelectLabel>
                        {models.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={onSyncLlm}
            disabled={syncingLlm || !workflowId || (provider !== 'starai' && !apiKey)}
            className="w-full"
            variant="outline"
          >
            {syncingLlm ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Sincronizar
          </Button>
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Parâmetros do Modelo</CardTitle>
          <CardDescription>Ajuste fino do comportamento da IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Temperatura (Criatividade)</Label>
              <span className="text-sm font-mono bg-muted px-2.5 py-1 rounded-lg">
                {temperature.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[temperature]}
              onValueChange={([v]) => onTemperatureChange(v)}
              min={0}
              max={1}
              step={0.05}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Preciso (0.0)</span>
              <span>Criativo (1.0)</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => onMaxTokensChange(parseInt(e.target.value) || 0)}
              min={100}
              max={128000}
            />
            <p className="text-xs text-muted-foreground">Limite máximo de resposta do modelo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
