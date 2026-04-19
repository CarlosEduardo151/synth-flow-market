import { Brain, Eye, EyeOff, Zap, TrendingUp, Sparkles, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  provider: 'openai' | 'google' | 'novalink';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  onProviderChange: (provider: 'openai' | 'google' | 'novalink') => void;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
  onTemperatureChange: (temp: number) => void;
  onMaxTokensChange: (tokens: number) => void;
  onSave?: () => void;
  saving?: boolean;
}

export function BotEngineTab({
  provider,
  apiKey,
  model,
  temperature,
  maxTokens,
  onProviderChange,
  onApiKeyChange,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
  onSave,
  saving,
}: BotEngineTabProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="space-y-6">
      {onSave && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} size="sm" className="rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
      {/* Provider & Model */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Provedor & Modelo
          </CardTitle>
          
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provedor de IA</Label>
            <Select value={provider} onValueChange={(v) => onProviderChange(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novalink">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    NovaLink (Créditos inclusos)
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

          {/* API Key — hidden for NovaLink */}
          {provider === 'novalink' ? (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-primary font-medium">✨ Créditos NovaLink</p>
              <p className="text-xs text-muted-foreground mt-1">
                Você está usando os créditos fornecidos pela plataforma. Nenhuma chave de API é necessária.
              </p>
            </div>
          ) : (
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
              <p className="text-xs text-muted-foreground">
                {provider === 'openai'
                  ? 'Obtenha em platform.openai.com/api-keys'
                  : 'Obtenha em aistudio.google.com/apikey'}
              </p>
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
                {provider === 'novalink' ? (
                  <>
                    <SelectGroup>
                      <SelectLabel className="bg-muted/50">💬 Chat (Ultra-Rápido)</SelectLabel>
                      <SelectItem value="llama-3.3-70b-versatile">⭐ Nova 3.3 Flash (Recomendado)</SelectItem>
                      <SelectItem value="qwen-3-32b">Nova 2.0 Ultra</SelectItem>
                      <SelectItem value="meta-llama/llama-4-scout-17b-16e-instruct">Nova Scout 4.0</SelectItem>
                      <SelectItem value="meta-llama/llama-4-maverick-17b-128e-instruct">Nova Maverick 4.0</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="bg-muted/50">🛠️ Ferramentas (Precisão)</SelectLabel>
                      <SelectItem value="compound-beta">Nova Compound Beta</SelectItem>
                      <SelectItem value="compound-beta-mini">Nova Compound Mini</SelectItem>
                    </SelectGroup>
                  </>
                ) : provider === 'openai' ? (
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
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Parâmetros do Modelo</CardTitle>
          
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
    </div>
  );
}
