import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Bot, 
  Brain, 
  Database, 
  Key, 
  Save, 
  RefreshCw, 
  Sparkles,
  MessageSquare,
  Settings2,
  Zap,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  TestTube2
} from 'lucide-react';

interface AIAgentConfigProps {
  customerProductId: string;
  workflowId?: string | null;
}

interface AIConfig {
  aiModel: string;
  systemPrompt: string;
  personality: string;
  actionInstructions: string;
  memoryType: string;
  memoryConnectionString: string;
  memorySessionId: string;
  temperature: number;
  maxTokens: number;
  toolsEnabled: string[];
  aiCredentials: Record<string, string>;
}

// Categorias de modelos
type ModelCategory = 'chat' | 'image' | 'video' | 'tts' | 'special';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  category: ModelCategory;
}

const AI_MODELS: AIModel[] = [
  // ===================== CHAT MODELS =====================
  // OpenAI Models
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Mais inteligente, multimodal', category: 'chat' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Rápido e econômico', category: 'chat' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Contexto grande', category: 'chat' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Mais barato', category: 'chat' },
  // Anthropic Models
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Equilibrado', category: 'chat' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Mais capaz', category: 'chat' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Mais rápido', category: 'chat' },
  // Google Gemini Chat Models
  { id: 'models/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', description: 'Versão estável lançado em 17 de junho de 2025', category: 'chat' },
  { id: 'models/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', description: 'Multimodal de médio porte, até 1M tokens (abril 2025)', category: 'chat' },
  { id: 'models/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'Google', description: 'Versão estável lançado em julho de 2025', category: 'chat' },
  { id: 'models/gemini-2.5-flash-lite-preview-09-2025', name: 'Gemini 2.5 Flash-Lite Preview', provider: 'Google', description: 'Versão prévia (25 de setembro de 2025)', category: 'chat' },
  { id: 'models/gemini-2.5-computer-use-preview-10-2025', name: 'Gemini 2.5 Computer Use', provider: 'Google', description: 'Prévia de Uso de Computador', category: 'chat' },
  { id: 'models/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Modelo multimodal rápido e versátil', category: 'chat' },
  { id: 'models/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash 001', provider: 'Google', description: 'Versão estável lançado em janeiro de 2025', category: 'chat' },
  { id: 'models/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental', provider: 'Google', description: 'Versão experimental', category: 'chat' },
  { id: 'models/gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'Google', description: 'Versão leve do 2.0 Flash', category: 'chat' },
  { id: 'models/gemini-2.0-flash-lite-001', name: 'Gemini 2.0 Flash Lite 001', provider: 'Google', description: 'Versão estável lançado em julho de 2025', category: 'chat' },
  { id: 'models/gemini-2.0-flash-lite-preview', name: 'Gemini 2.0 Flash Lite Preview', provider: 'Google', description: 'Versão prévia (5 de fevereiro de 2025)', category: 'chat' },
  { id: 'models/gemini-2.0-pro-exp', name: 'Gemini 2.0 Pro Experimental', provider: 'Google', description: 'Versão experimental (25 de março de 2025)', category: 'chat' },
  { id: 'models/gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro Exp 02-05', provider: 'Google', description: 'Versão experimental (25 de março de 2025)', category: 'chat' },
  { id: 'models/gemini-pro-latest', name: 'Gemini Pro Latest', provider: 'Google', description: 'Último lançamento do Gemini Pro', category: 'chat' },
  { id: 'models/gemini-flash-latest', name: 'Gemini Flash Latest', provider: 'Google', description: 'Último lançamento do Gemini Flash', category: 'chat' },
  { id: 'models/gemini-flash-lite-latest', name: 'Gemini Flash Lite Latest', provider: 'Google', description: 'Último lançamento do Gemini Flash-Lite', category: 'chat' },
  { id: 'models/gemini-exp-1206', name: 'Gemini Exp 1206', provider: 'Google', description: 'Versão experimental (25 de março de 2025)', category: 'chat' },
  // Google Gemma Models
  { id: 'models/gemma-3-12b-it', name: 'Gemma 3 12B IT', provider: 'Google', description: 'Modelo Gemma 3 com 12B parâmetros', category: 'chat' },
  { id: 'models/gemma-3-27b-it', name: 'Gemma 3 27B IT', provider: 'Google', description: 'Modelo Gemma 3 com 27B parâmetros', category: 'chat' },
  { id: 'models/gemma-3n-e2b-it', name: 'Gemma 3N E2B IT', provider: 'Google', description: 'Modelo Gemma 3N E2B', category: 'chat' },
  { id: 'models/gemma-3n-e4b-it', name: 'Gemma 3N E4B IT', provider: 'Google', description: 'Modelo Gemma 3N E4B', category: 'chat' },
  // Modelo AQA
  { id: 'models/aqa', name: 'AQA', provider: 'Google', description: 'Respostas fundamentadas em pesquisa para maior precisão', category: 'chat' },

  // ===================== IMAGE MODELS =====================
  { id: 'models/gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', provider: 'Google', description: 'Versão estável lançado em julho de 2025', category: 'image' },
  { id: 'models/gemini-2.5-flash-image-preview', name: 'Gemini 2.5 Flash Image Preview', provider: 'Google', description: 'Prévia de Imagem do Gemini 2.5 Flash', category: 'image' },
  { id: 'models/gemini-2.0-flash-exp-image-generation', name: 'Gemini 2.0 Flash Image Gen', provider: 'Google', description: 'Geração de Imagem Experimental', category: 'image' },
  { id: 'models/gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image Preview', provider: 'Google', description: 'Prévia de Imagem do Gemini 3 Pro', category: 'image' },
  // Vertex AI - Imagen Models
  { id: 'vertex/imagen-4.0-fast-generate-001', name: 'Imagen 4.0 Fast', provider: 'Vertex AI', description: 'Modelo Imagen 4.0 rápido servido pelo Vertex', category: 'image' },
  { id: 'vertex/imagen-4.0-generate-001', name: 'Imagen 4.0', provider: 'Vertex AI', description: 'Modelo Imagen 4.0 servido pelo Vertex', category: 'image' },
  { id: 'vertex/imagen-4.0-ultra-generate-preview-06-06', name: 'Imagen 4.0 Ultra', provider: 'Vertex AI', description: 'Modelo Imagen 4.0 ultra servido pelo Vertex', category: 'image' },
  { id: 'vertex/nano-banana-pro-preview', name: 'Nano Banana Pro Preview', provider: 'Vertex AI', description: 'Prévia de Imagem do Gemini 3 Pro', category: 'image' },

  // ===================== VIDEO MODELS =====================
  { id: 'models/veo-2.0-generate-001', name: 'Veo 2.0', provider: 'Google', description: 'Modelo Veo 2.0 para geração de vídeo', category: 'video' },
  { id: 'models/veo-3.0-fast-generate-001', name: 'Veo 3 Fast', provider: 'Google', description: 'Veo 3 rápido para geração de vídeo', category: 'video' },
  { id: 'models/veo-3.0-generate-001', name: 'Veo 3', provider: 'Google', description: 'Veo 3 para geração de vídeo', category: 'video' },
  { id: 'models/veo-3.1-generate-001', name: 'Veo 3.1', provider: 'Google', description: 'Veo 3.1 para geração de vídeo', category: 'video' },

  // ===================== TTS MODELS =====================
  { id: 'models/gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS', provider: 'Google', description: 'Prévia Text-to-Speech Set 2025', category: 'tts' },
  { id: 'models/gemini-3-pro-preview-tts', name: 'Gemini 3 Pro TTS Preview', provider: 'Google', description: 'Prévia Text-to-Speech do Gemini 3 Pro', category: 'tts' },

  // ===================== SPECIAL MODELS =====================
  { id: 'models/gemini-robotics-er-1.5-preview', name: 'Gemini Robotics ER 1.5', provider: 'Google', description: 'Prévia ER 1.5 de Robótica', category: 'special' },
];

const CATEGORY_LABELS: Record<ModelCategory, string> = {
  chat: '💬 Chat / Conversação',
  image: '🖼️ Geração de Imagem',
  video: '🎬 Geração de Vídeo',
  tts: '🔊 Text-to-Speech (TTS)',
  special: '🤖 Especiais',
};

// Credenciais de Modelos de IA
const AI_CREDENTIAL_TYPES = [
  { id: 'openai_api_key', name: 'OpenAI API Key', icon: '🤖', placeholder: 'sk-...', docUrl: 'https://platform.openai.com/api-keys' },
  { id: 'anthropic_api_key', name: 'Anthropic API Key', icon: '🧠', placeholder: 'sk-ant-...', docUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'google_api_key', name: 'Google AI API Key', icon: '🔍', placeholder: 'AIza...', docUrl: 'https://aistudio.google.com/app/apikey' },
];

// Credenciais de Ferramentas (Tools)
const TOOL_CREDENTIAL_TYPES = [
  { id: 'serpapi_api_key', name: 'SerpAPI Key', icon: '🔎', placeholder: 'Sua chave SerpAPI', docUrl: 'https://serpapi.com/manage-api-key', description: 'Para buscas no Google, Bing, etc.' },
  { id: 'serper_api_key', name: 'Serper API Key', icon: '🌐', placeholder: 'Sua chave Serper', docUrl: 'https://serper.dev/api-key', description: 'API de busca Google (alternativa)' },
  { id: 'gmail_credentials', name: 'Gmail OAuth', icon: '📧', placeholder: 'JSON de credenciais OAuth', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/google/', description: 'Para enviar/ler emails' },
  { id: 'google_sheets_credentials', name: 'Google Sheets OAuth', icon: '📊', placeholder: 'JSON de credenciais OAuth', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/google/', description: 'Para ler/escrever planilhas' },
  { id: 'google_calendar_credentials', name: 'Google Calendar OAuth', icon: '📅', placeholder: 'JSON de credenciais OAuth', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/google/', description: 'Para gerenciar eventos' },
  { id: 'notion_api_key', name: 'Notion API Key', icon: '📝', placeholder: 'secret_...', docUrl: 'https://www.notion.so/my-integrations', description: 'Para acessar páginas e databases' },
  { id: 'slack_bot_token', name: 'Slack Bot Token', icon: '💬', placeholder: 'xoxb-...', docUrl: 'https://api.slack.com/apps', description: 'Para enviar mensagens no Slack' },
  { id: 'discord_bot_token', name: 'Discord Bot Token', icon: '🎮', placeholder: 'Token do bot', docUrl: 'https://discord.com/developers/applications', description: 'Para integração com Discord' },
  { id: 'telegram_bot_token', name: 'Telegram Bot Token', icon: '📱', placeholder: 'Token do @BotFather', docUrl: 'https://core.telegram.org/bots#how-do-i-create-a-bot', description: 'Para bots no Telegram' },
  { id: 'whatsapp_api_token', name: 'WhatsApp Business API', icon: '📲', placeholder: 'Token da API', docUrl: 'https://developers.facebook.com/docs/whatsapp', description: 'Para mensagens no WhatsApp' },
  { id: 'airtable_api_key', name: 'Airtable API Key', icon: '📋', placeholder: 'pat...', docUrl: 'https://airtable.com/create/tokens', description: 'Para acessar bases Airtable' },
  { id: 'github_token', name: 'GitHub Token', icon: '🐙', placeholder: 'ghp_...', docUrl: 'https://github.com/settings/tokens', description: 'Para integração com GitHub' },
  { id: 'jira_api_token', name: 'Jira API Token', icon: '🎯', placeholder: 'Token Atlassian', docUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens', description: 'Para gerenciar issues' },
  { id: 'trello_api_key', name: 'Trello API Key', icon: '📌', placeholder: 'Chave API Trello', docUrl: 'https://trello.com/app-key', description: 'Para gerenciar boards' },
  { id: 'hubspot_api_key', name: 'HubSpot API Key', icon: '🧲', placeholder: 'pat-...', docUrl: 'https://knowledge.hubspot.com/integrations/how-do-i-get-my-hubspot-api-key', description: 'CRM e marketing' },
  { id: 'salesforce_credentials', name: 'Salesforce OAuth', icon: '☁️', placeholder: 'JSON de credenciais', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/salesforce/', description: 'Para integração com Salesforce' },
  { id: 'zendesk_api_token', name: 'Zendesk API Token', icon: '🎫', placeholder: 'Token da API', docUrl: 'https://support.zendesk.com/hc/en-us/articles/4408889192858', description: 'Para tickets de suporte' },
  { id: 'stripe_api_key', name: 'Stripe API Key', icon: '💳', placeholder: 'sk_live_... ou sk_test_...', docUrl: 'https://dashboard.stripe.com/apikeys', description: 'Para pagamentos' },
  { id: 'twilio_credentials', name: 'Twilio Credentials', icon: '📞', placeholder: 'Account SID:Auth Token', docUrl: 'https://www.twilio.com/console', description: 'Para SMS e ligações' },
  { id: 'openweather_api_key', name: 'OpenWeather API Key', icon: '🌤️', placeholder: 'Sua chave API', docUrl: 'https://openweathermap.org/api', description: 'Para dados meteorológicos' },
  { id: 'wolfram_alpha_app_id', name: 'Wolfram Alpha App ID', icon: '🔢', placeholder: 'App ID', docUrl: 'https://developer.wolframalpha.com/portal/myapps/', description: 'Para cálculos e dados' },
  { id: 'youtube_api_key', name: 'YouTube API Key', icon: '▶️', placeholder: 'AIza...', docUrl: 'https://console.cloud.google.com/apis/credentials', description: 'Para dados do YouTube' },
];

// Mapeamento de ferramentas para credenciais necessárias
const TOOL_CREDENTIALS_MAP: Record<string, string[]> = {
  serpApiTool: ['serpapi_api_key'],
  wolframAlphaTool: ['wolfram_alpha_app_id'],
  gmailTool: ['gmail_credentials'],
  googleSheetsTool: ['google_sheets_credentials'],
  googleCalendarTool: ['google_calendar_credentials'],
  notionTool: ['notion_api_key'],
  slackTool: ['slack_bot_token'],
  discordTool: ['discord_bot_token'],
  telegramTool: ['telegram_bot_token'],
  whatsappTool: ['whatsapp_api_token'],
  airtableTool: ['airtable_api_key'],
  githubTool: ['github_token'],
  jiraTool: ['jira_api_token'],
  trelloTool: ['trello_api_key'],
  hubspotTool: ['hubspot_api_key'],
  salesforceTool: ['salesforce_credentials'],
  zendeskTool: ['zendesk_api_token'],
  stripeTool: ['stripe_api_key'],
  twilioTool: ['twilio_credentials'],
  openWeatherTool: ['openweather_api_key'],
  youtubeTool: ['youtube_api_key'],
};

// Lista de ferramentas disponíveis organizadas por categoria
const AVAILABLE_TOOLS = {
  'Busca & Pesquisa': [
    { id: 'serpApiTool', name: 'SerpAPI', icon: '🔎', description: 'Busca no Google, Bing, etc.' },
    { id: 'wolframAlphaTool', name: 'Wolfram Alpha', icon: '🔢', description: 'Cálculos e dados científicos' },
    { id: 'wikipediaTool', name: 'Wikipedia', icon: '📚', description: 'Consulta Wikipedia' },
  ],
  'Email & Comunicação': [
    { id: 'gmailTool', name: 'Gmail', icon: '📧', description: 'Enviar/ler emails' },
    { id: 'slackTool', name: 'Slack', icon: '💬', description: 'Mensagens no Slack' },
    { id: 'discordTool', name: 'Discord', icon: '🎮', description: 'Mensagens no Discord' },
    { id: 'telegramTool', name: 'Telegram', icon: '📱', description: 'Bot Telegram' },
    { id: 'whatsappTool', name: 'WhatsApp', icon: '📲', description: 'Mensagens WhatsApp' },
  ],
  'Planilhas & Dados': [
    { id: 'googleSheetsTool', name: 'Google Sheets', icon: '📊', description: 'Ler/escrever planilhas' },
    { id: 'airtableTool', name: 'Airtable', icon: '📋', description: 'Bases de dados Airtable' },
    { id: 'notionTool', name: 'Notion', icon: '📝', description: 'Páginas e databases' },
  ],
  'Banco de Dados': [
    { id: 'postgresTool', name: 'PostgreSQL', icon: '🐘', description: 'Consultas SQL' },
    { id: 'supabaseTool', name: 'Supabase', icon: '⚡', description: 'Backend Supabase' },
    { id: 'mongoDbTool', name: 'MongoDB', icon: '🍃', description: 'NoSQL MongoDB' },
  ],
  'Utilidades': [
    { id: 'calculatorTool', name: 'Calculadora', icon: '🧮', description: 'Cálculos matemáticos' },
    { id: 'httpRequestTool', name: 'HTTP Request', icon: '🌐', description: 'Requisições HTTP' },
    { id: 'codeTool', name: 'Código', icon: '💻', description: 'Executar código JS' },
  ],
  'CRM & Produtividade': [
    { id: 'hubspotTool', name: 'HubSpot', icon: '🧲', description: 'CRM e marketing' },
    { id: 'salesforceTool', name: 'Salesforce', icon: '☁️', description: 'CRM Salesforce' },
    { id: 'jiraTool', name: 'Jira', icon: '🎯', description: 'Gerenciar issues' },
    { id: 'trelloTool', name: 'Trello', icon: '📌', description: 'Gerenciar boards' },
  ],
};

export function AIAgentConfig({ customerProductId, workflowId }: AIAgentConfigProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingCredentials, setSyncingCredentials] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);
  const [credentialDialogTool, setCredentialDialogTool] = useState<{id: string; name: string; icon: string} | null>(null);
  const [testingCredential, setTestingCredential] = useState<string | null>(null);
  const [credentialTestResults, setCredentialTestResults] = useState<Record<string, 'success' | 'error' | null>>({});
  
  const [config, setConfig] = useState<AIConfig>({
    aiModel: 'gpt-4o-mini',
    systemPrompt: '',
    personality: '',
    actionInstructions: '',
    memoryType: 'postgresql',
    memoryConnectionString: '',
    memorySessionId: '',
    temperature: 0.7,
    maxTokens: 2048,
    toolsEnabled: [],
    aiCredentials: {},
  });

  const [workflowNodes, setWorkflowNodes] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
    if (workflowId) {
      fetchWorkflowNodes();
    }
  }, [customerProductId, workflowId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_control_config')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          aiModel: (data as any).ai_model || 'gpt-4o-mini',
          systemPrompt: (data as any).system_prompt || '',
          personality: (data as any).personality || '',
          actionInstructions: (data as any).action_instructions || '',
          memoryType: (data as any).memory_type || 'postgresql',
          memoryConnectionString: (data as any).memory_connection_string || '',
          memorySessionId: (data as any).memory_session_id || `session_${customerProductId}`,
          temperature: (data as any).temperature || 0.7,
          maxTokens: (data as any).max_tokens || 2048,
          toolsEnabled: (data as any).tools_enabled || [],
          aiCredentials: (data as any).ai_credentials || {},
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowNodes = async () => {
    if (!workflowId) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('n8n-sync-config', {
        body: {
          action: 'get_workflow_nodes',
          workflowId,
        },
      });

      if (error) throw error;
      setWorkflowNodes(data);
    } catch (error) {
      console.error('Error fetching workflow nodes:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const configData = {
        customer_product_id: customerProductId,
        ai_model: config.aiModel,
        system_prompt: config.systemPrompt,
        personality: config.personality,
        action_instructions: config.actionInstructions,
        memory_type: config.memoryType,
        memory_connection_string: config.memoryConnectionString,
        memory_session_id: config.memorySessionId || `session_${customerProductId}`,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        tools_enabled: config.toolsEnabled,
        ai_credentials: config.aiCredentials,
      };

      const { error } = await supabase
        .from('ai_control_config')
        .upsert(configData as any, { onConflict: 'customer_product_id' });

      if (error) throw error;

      toast({
        title: "Configuração salva!",
        description: "As configurações foram salvas localmente.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToN8n = async () => {
    if (!workflowId) {
      toast({
        title: "Workflow não configurado",
        description: "Este produto ainda não tem um workflow n8n provisionado.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    setLastSyncStatus(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('n8n-sync-config', {
        body: {
          action: 'sync_config',
          customerProductId,
          workflowId,
          config: {
            aiModel: config.aiModel,
            systemPrompt: config.systemPrompt,
            personality: config.personality,
            actionInstructions: config.actionInstructions,
            memoryType: config.memoryType,
            memoryConnectionString: config.memoryConnectionString,
            memorySessionId: config.memorySessionId,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            toolsEnabled: config.toolsEnabled,
            aiCredentials: config.aiCredentials,
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        setLastSyncStatus('success');
        toast({
          title: "Sincronizado com sucesso!",
          description: `Workflow "${data.workflowName}" atualizado. ${data.updatedNodes?.join(', ') || ''}`,
        });
        fetchWorkflowNodes();
      } else {
        throw new Error(data.error || 'Erro na sincronização');
      }
    } catch (error: any) {
      setLastSyncStatus('error');
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const updateCredential = (type: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      aiCredentials: {
        ...prev.aiCredentials,
        [type]: value,
      },
    }));
  };

  const toggleTool = (toolId: string) => {
    setConfig(prev => ({
      ...prev,
      toolsEnabled: prev.toolsEnabled.includes(toolId)
        ? prev.toolsEnabled.filter(t => t !== toolId)
        : [...prev.toolsEnabled, toolId],
    }));
  };

  // Testar credencial
  const testCredential = async (credentialId: string) => {
    const credValue = config.aiCredentials[credentialId];
    if (!credValue || credValue.trim() === '') {
      toast({
        title: "Credencial vazia",
        description: "Preencha a credencial antes de testar.",
        variant: "destructive",
      });
      return;
    }

    setTestingCredential(credentialId);
    setCredentialTestResults(prev => ({ ...prev, [credentialId]: null }));

    try {
      let testResult = false;
      
      // Testar baseado no tipo de credencial
      if (credentialId === 'serpapi_api_key') {
        const response = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(credValue)}`);
        testResult = response.ok;
      } else if (credentialId === 'openweather_api_key') {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${encodeURIComponent(credValue)}`);
        testResult = response.ok;
      } else if (credentialId === 'openai_api_key') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${credValue}` }
        });
        testResult = response.ok;
      } else if (credentialId === 'anthropic_api_key') {
        // Anthropic não tem endpoint de teste simples, verificamos formato
        testResult = credValue.startsWith('sk-ant-');
      } else if (credentialId === 'google_api_key') {
        testResult = credValue.startsWith('AIza') && credValue.length > 30;
      } else if (credentialId === 'github_token') {
        const response = await fetch('https://api.github.com/user', {
          headers: { 'Authorization': `Bearer ${credValue}` }
        });
        testResult = response.ok;
      } else if (credentialId === 'stripe_api_key') {
        testResult = (credValue.startsWith('sk_live_') || credValue.startsWith('sk_test_')) && credValue.length > 20;
      } else if (credentialId === 'notion_api_key') {
        const response = await fetch('https://api.notion.com/v1/users/me', {
          headers: { 
            'Authorization': `Bearer ${credValue}`,
            'Notion-Version': '2022-06-28'
          }
        });
        testResult = response.ok;
      } else {
        // Para outras credenciais, verificamos se não está vazia e tem tamanho mínimo
        testResult = credValue.length >= 10;
      }

      setCredentialTestResults(prev => ({ 
        ...prev, 
        [credentialId]: testResult ? 'success' : 'error' 
      }));
      
      toast({
        title: testResult ? "Credencial válida!" : "Credencial inválida",
        description: testResult 
          ? "A credencial foi verificada com sucesso." 
          : "Verifique se a credencial está correta.",
        variant: testResult ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Erro ao testar credencial:', error);
      setCredentialTestResults(prev => ({ ...prev, [credentialId]: 'error' }));
      toast({
        title: "Erro ao testar",
        description: "Não foi possível verificar a credencial. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setTestingCredential(null);
    }
  };

  // Obter credenciais necessárias para ferramentas habilitadas
  const getRequiredCredentialsForEnabledTools = () => {
    const requiredCredIds = new Set<string>();
    for (const toolId of config.toolsEnabled) {
      const creds = TOOL_CREDENTIALS_MAP[toolId];
      if (creds) {
        creds.forEach(c => requiredCredIds.add(c));
      }
    }
    return TOOL_CREDENTIAL_TYPES.filter(c => requiredCredIds.has(c.id));
  };

  // Sincronizar credenciais com n8n
  const handleSyncCredentialsToN8n = async () => {
    if (!workflowId) {
      toast({
        title: "Workflow não configurado",
        description: "Configure o workflow primeiro.",
        variant: "destructive",
      });
      return;
    }

    setSyncingCredentials(true);
    try {
      // Filtrar apenas credenciais que têm valor
      const credentialsToSync = Object.entries(config.aiCredentials)
        .filter(([_, value]) => value && value.trim() !== '')
        .map(([key, value]) => ({ key, value }));

      if (credentialsToSync.length === 0) {
        toast({
          title: "Nenhuma credencial para sincronizar",
          description: "Preencha as credenciais das ferramentas primeiro.",
          variant: "destructive",
        });
        return;
      }

      // Sincronizar cada credencial com n8n
      let successCount = 0;
      let errorCount = 0;

      for (const cred of credentialsToSync) {
        try {
          // Mapear o tipo de credencial para o tipo n8n
          const n8nCredType = mapCredentialToN8nType(cred.key);
          if (!n8nCredType) continue;

          const { data, error } = await supabase.functions.invoke('n8n-api', {
            body: {
              action: 'create_credential',
              credentialName: cred.key,
              credentialType: n8nCredType,
              credentialData: { apiKey: cred.value },
            },
          });

          if (error) throw error;
          if (data.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          console.error(`Erro ao sincronizar ${cred.key}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Credenciais sincronizadas!",
          description: `${successCount} credencial(is) sincronizada(s) com n8n.`,
        });
      }
      if (errorCount > 0) {
        toast({
          title: "Algumas credenciais falharam",
          description: `${errorCount} erro(s). Verifique o console para detalhes.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar credenciais",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncingCredentials(false);
    }
  };

  // Mapear tipo de credencial local para tipo n8n
  const mapCredentialToN8nType = (localType: string): string | null => {
    const mapping: Record<string, string> = {
      serpapi_api_key: 'serpApiApi',
      openai_api_key: 'openAiApi',
      anthropic_api_key: 'anthropicApi',
      google_api_key: 'googleAi',
      gmail_credentials: 'googleOAuth2Api',
      google_sheets_credentials: 'googleOAuth2Api',
      notion_api_key: 'notionApi',
      slack_bot_token: 'slackApi',
      discord_bot_token: 'discordApi',
      telegram_bot_token: 'telegramApi',
      airtable_api_key: 'airtableApi',
      github_token: 'githubApi',
      stripe_api_key: 'stripeApi',
      wolfram_alpha_app_id: 'wolframAlphaApi',
    };
    return mapping[localType] || null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Configuração do Agente IA</CardTitle>
                <CardDescription>Configure seu agente e sincronize com n8n</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastSyncStatus === 'success' && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Sincronizado
                </Badge>
              )}
              {lastSyncStatus === 'error' && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Erro
                </Badge>
              )}
              {workflowId && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={`https://n8n.starai.com.br/workflow/${workflowId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Abrir n8n
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="model" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="model" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Modelo
          </TabsTrigger>
          <TabsTrigger value="prompt" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Prompt
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Ferramentas
          </TabsTrigger>
          <TabsTrigger value="memory" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Memória
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Credenciais
          </TabsTrigger>
        </TabsList>

        {/* MODEL TAB */}
        <TabsContent value="model">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Modelo de IA
              </CardTitle>
              <CardDescription>
                Escolha o modelo que alimentará seu agente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Modelo</Label>
                <Select value={config.aiModel} onValueChange={(v) => setConfig(prev => ({ ...prev, aiModel: v }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-[400px]">
                    {(['chat', 'image', 'video', 'tts', 'special'] as ModelCategory[]).map((category) => {
                      const modelsInCategory = AI_MODELS.filter(m => m.category === category);
                      if (modelsInCategory.length === 0) return null;
                      return (
                        <SelectGroup key={category}>
                          <SelectLabel className="bg-muted/50 text-muted-foreground">
                            {CATEGORY_LABELS[category]}
                          </SelectLabel>
                          {modelsInCategory.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{model.name}</span>
                                <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {AI_MODELS.find(m => m.id === config.aiModel)?.description}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Temperatura: {config.temperature}</Label>
                  <Badge variant="outline">{config.temperature < 0.3 ? 'Preciso' : config.temperature > 0.7 ? 'Criativo' : 'Equilibrado'}</Badge>
                </div>
                <Slider
                  value={[config.temperature]}
                  onValueChange={([v]) => setConfig(prev => ({ ...prev, temperature: v }))}
                  min={0}
                  max={1}
                  step={0.1}
                />
                <p className="text-sm text-muted-foreground">
                  Controla a aleatoriedade das respostas (0 = determinístico, 1 = criativo)
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="maxTokens">Máximo de Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2048 }))}
                  min={100}
                  max={128000}
                />
                <p className="text-sm text-muted-foreground">
                  Limite de tokens por resposta (mais tokens = respostas mais longas)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROMPT TAB */}
        <TabsContent value="prompt">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                System Prompt & Personalidade
              </CardTitle>
              <CardDescription>
                Defina como seu agente deve se comportar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="systemPrompt">System Prompt Principal</Label>
                <Textarea
                  id="systemPrompt"
                  value={config.systemPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  placeholder="Você é um assistente especializado em..."
                  rows={6}
                />
                <p className="text-sm text-muted-foreground">
                  Instruções base que definem o comportamento do agente
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label htmlFor="personality">Personalidade</Label>
                <Textarea
                  id="personality"
                  value={config.personality}
                  onChange={(e) => setConfig(prev => ({ ...prev, personality: e.target.value }))}
                  placeholder="Amigável, profissional, usa emojis ocasionalmente..."
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Características de personalidade e tom de voz
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="actionInstructions">Instruções de Ação</Label>
                <Textarea
                  id="actionInstructions"
                  value={config.actionInstructions}
                  onChange={(e) => setConfig(prev => ({ ...prev, actionInstructions: e.target.value }))}
                  placeholder="1. Sempre cumprimente o cliente&#10;2. Pergunte como pode ajudar&#10;3. Ofereça soluções específicas..."
                  rows={5}
                />
                <p className="text-sm text-muted-foreground">
                  Passo a passo de como o agente deve agir em interações
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TOOLS TAB */}
        <TabsContent value="tools">
          <div className="space-y-6">
            {/* Available Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Ferramentas Disponíveis
                </CardTitle>
                <CardDescription>
                  Selecione as ferramentas que seu agente poderá usar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(AVAILABLE_TOOLS).map(([category, tools]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">{category}</h4>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {tools.map((tool) => {
                        const isEnabled = config.toolsEnabled.includes(tool.id);
                        const requiredCreds = TOOL_CREDENTIALS_MAP[tool.id] || [];
                        const needsCredentials = requiredCreds.length > 0;
                        const hasRequiredCreds = needsCredentials ? requiredCreds.every(c => config.aiCredentials[c]) : true;
                        
                        const handleToolClick = () => {
                          if (needsCredentials) {
                            setCredentialDialogTool(tool);
                          } else {
                            toggleTool(tool.id);
                          }
                        };
                        
                        return (
                          <div
                            key={tool.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              isEnabled 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={handleToolClick}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{tool.icon}</span>
                                <span className="font-medium text-sm">{tool.name}</span>
                              </div>
                              <Switch 
                                checked={isEnabled} 
                                onCheckedChange={() => {
                                  // Se já tem credenciais ou não precisa, toggle direto
                                  if (!needsCredentials || hasRequiredCreds) {
                                    toggleTool(tool.id);
                                  } else {
                                    setCredentialDialogTool(tool);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">{tool.description}</p>
                            {needsCredentials && (
                              <div className="mt-2">
                                {hasRequiredCreds ? (
                                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Credencial configurada
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/50 bg-yellow-500/10">
                                    <Key className="h-3 w-3 mr-1" />
                                    Requer credencial
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Required Credentials for Enabled Tools */}
            {config.toolsEnabled.length > 0 && getRequiredCredentialsForEnabledTools().length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Credenciais das Ferramentas Habilitadas
                      </CardTitle>
                      <CardDescription>
                        Configure as API keys necessárias para as ferramentas selecionadas
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSyncCredentialsToN8n}
                      disabled={syncingCredentials || !workflowId}
                    >
                      {syncingCredentials ? (
                        <>
                          <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-3 w-3" />
                          Sincronizar com n8n
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {getRequiredCredentialsForEnabledTools().map((cred) => (
                      <div key={cred.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`tool-${cred.id}`} className="flex items-center gap-2 text-base">
                            <span className="text-lg">{cred.icon}</span>
                            {cred.name}
                          </Label>
                          <a 
                            href={cred.docUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Doc
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground">{cred.description}</p>
                        <Input
                          id={`tool-${cred.id}`}
                          type="password"
                          value={config.aiCredentials[cred.id] || ''}
                          onChange={(e) => updateCredential(cred.id, e.target.value)}
                          placeholder={cred.placeholder}
                          className="bg-background"
                        />
                        {config.aiCredentials[cred.id] && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Configurado
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border border-green-500/30 bg-green-500/10 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-600">Sincronização Automática</p>
                        <p className="text-sm text-muted-foreground">
                          Clique em "Sincronizar com n8n" para enviar as credenciais configuradas 
                          diretamente para o n8n, sem precisar configurar manualmente.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sync Tools Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSyncToN8n} 
                disabled={syncing || !workflowId || config.toolsEnabled.length === 0}
              >
                {syncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando Ferramentas...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Sincronizar {config.toolsEnabled.length} Ferramenta(s) com n8n
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="memory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configuração de Memória
              </CardTitle>
              <CardDescription>
                Configure a memória persistente do agente (PostgreSQL)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="font-medium">Memória PostgreSQL</span>
                  <Badge variant="secondary">Recomendado</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cada cliente tem sua própria sessão de memória isolada
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="memoryConnectionString">String de Conexão PostgreSQL</Label>
                <Input
                  id="memoryConnectionString"
                  type="password"
                  value={config.memoryConnectionString}
                  onChange={(e) => setConfig(prev => ({ ...prev, memoryConnectionString: e.target.value }))}
                  placeholder="postgresql://user:password@host:5432/database"
                />
                <p className="text-sm text-muted-foreground">
                  Conexão com seu banco PostgreSQL (sua máquina, não Supabase)
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="memorySessionId">ID da Sessão</Label>
                <Input
                  id="memorySessionId"
                  value={config.memorySessionId}
                  onChange={(e) => setConfig(prev => ({ ...prev, memorySessionId: e.target.value }))}
                  placeholder={`session_${customerProductId}`}
                />
                <p className="text-sm text-muted-foreground">
                  Identificador único para isolar a memória deste cliente
                </p>
              </div>

              <div className="p-4 border border-yellow-500/30 bg-yellow-500/10 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-600">Importante</p>
                    <p className="text-sm text-muted-foreground">
                      A conexão com o PostgreSQL deve ser configurada nas credenciais do n8n para funcionar. 
                      Aqui você configura o Session ID para garantir memórias separadas.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CREDENTIALS TAB */}
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Credenciais de Modelos de IA
                  </CardTitle>
                  <CardDescription>
                    API keys dos provedores de modelos de IA (OpenAI, Anthropic, Google)
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSyncCredentialsToN8n}
                  disabled={syncingCredentials || !workflowId}
                >
                  {syncingCredentials ? (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Sincronizar com n8n
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {AI_CREDENTIAL_TYPES.map((cred) => (
                <div key={cred.id} className="p-4 border rounded-lg space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={cred.id} className="flex items-center gap-2">
                      <span>{cred.icon}</span>
                      {cred.name}
                    </Label>
                    <a 
                      href={cred.docUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Obter chave
                    </a>
                  </div>
                  <Input
                    id={cred.id}
                    type="password"
                    value={config.aiCredentials[cred.id] || ''}
                    onChange={(e) => updateCredential(cred.id, e.target.value)}
                    placeholder={cred.placeholder}
                    className="bg-background"
                  />
                  {config.aiCredentials[cred.id] && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  )}
                </div>
              ))}

              <div className="p-4 border border-green-500/30 bg-green-500/10 rounded-lg mt-6">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-600">Sincronização Automática</p>
                    <p className="text-sm text-muted-foreground">
                      As credenciais de IA são sincronizadas automaticamente com o n8n quando você clica em "Sincronizar com n8n".
                      Isso configura os modelos no workflow sem necessidade de configuração manual.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg">
                <div className="flex items-start gap-2">
                  <Settings2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-600">Credenciais de Ferramentas</p>
                    <p className="text-sm text-muted-foreground">
                      As credenciais de ferramentas (SerpAPI, Gmail, etc.) agora estão na aba "Ferramentas".
                      Basta habilitar uma ferramenta e a seção de credenciais aparecerá automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workflow Status */}
      {workflowNodes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nós Detectados no Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {workflowNodes.nodes?.aiAgent && (
                <Badge variant="default">
                  <Bot className="h-3 w-3 mr-1" />
                  AI Agent: {workflowNodes.nodes.aiAgent.name}
                </Badge>
              )}
              {workflowNodes.nodes?.chatModel && (
                <Badge variant="secondary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Model: {workflowNodes.nodes.chatModel.name}
                </Badge>
              )}
              {workflowNodes.nodes?.memory && (
                <Badge variant="outline">
                  <Database className="h-3 w-3 mr-1" />
                  Memory: {workflowNodes.nodes.memory.name}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleSaveConfig} disabled={saving} variant="outline" className="flex-1">
          {saving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Localmente
            </>
          )}
        </Button>
        
        <Button onClick={handleSyncToN8n} disabled={syncing || !workflowId} className="flex-1">
          {syncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Sincronizar com n8n
            </>
          )}
        </Button>
      </div>

      {/* Dialog de Credenciais da Ferramenta */}
      <Dialog open={!!credentialDialogTool} onOpenChange={(open) => !open && setCredentialDialogTool(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{credentialDialogTool?.icon}</span>
              Configurar {credentialDialogTool?.name}
            </DialogTitle>
            <DialogDescription>
              Insira as credenciais necessárias para usar esta ferramenta
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {credentialDialogTool && (() => {
              const requiredCredIds = TOOL_CREDENTIALS_MAP[credentialDialogTool.id] || [];
              
              if (requiredCredIds.length === 0) {
                return (
                  <div className="text-center py-4 text-muted-foreground">
                    Esta ferramenta não requer credenciais adicionais.
                  </div>
                );
              }
              
              return requiredCredIds.map((credId) => {
                const credInfo = TOOL_CREDENTIAL_TYPES.find(c => c.id === credId);
                if (!credInfo) return null;
              
                const testStatus = credentialTestResults[credId];
                const isTesting = testingCredential === credId;
                
                return (
                  <div key={credId} className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`dialog-${credId}`} className="flex items-center gap-2 font-medium">
                        <span className="text-lg">{credInfo.icon}</span>
                        {credInfo.name}
                      </Label>
                      <a 
                        href={credInfo.docUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Obter chave
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">{credInfo.description}</p>
                    <div className="flex gap-2">
                      <Input
                        id={`dialog-${credId}`}
                        type="password"
                        value={config.aiCredentials[credId] || ''}
                        onChange={(e) => {
                          updateCredential(credId, e.target.value);
                          setCredentialTestResults(prev => ({ ...prev, [credId]: null }));
                        }}
                        placeholder={credInfo.placeholder}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testCredential(credId)}
                        disabled={isTesting || !config.aiCredentials[credId]}
                        className="shrink-0"
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <TestTube2 className="h-4 w-4 mr-1" />
                            Testar
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.aiCredentials[credId] && (
                        <Badge 
                          variant={testStatus === 'success' ? 'default' : testStatus === 'error' ? 'destructive' : 'secondary'} 
                          className="text-xs"
                        >
                          {testStatus === 'success' ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verificado
                            </>
                          ) : testStatus === 'error' ? (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Inválido
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Configurado
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setCredentialDialogTool(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                const toolId = credentialDialogTool?.id;
                if (toolId) {
                  const requiredCreds = TOOL_CREDENTIALS_MAP[toolId] || [];
                  const hasAllCreds = requiredCreds.every(c => config.aiCredentials[c]);
                  
                  if (hasAllCreds) {
                    // Habilita a ferramenta automaticamente
                    if (!config.toolsEnabled.includes(toolId)) {
                      toggleTool(toolId);
                    }
                    toast({
                      title: "Credenciais salvas!",
                      description: `A ferramenta ${credentialDialogTool?.name} foi configurada e habilitada.`,
                    });
                  } else {
                    toast({
                      title: "Credenciais incompletas",
                      description: "Preencha todas as credenciais necessárias.",
                      variant: "destructive",
                    });
                    return;
                  }
                }
                setCredentialDialogTool(null);
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Salvar e Habilitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
