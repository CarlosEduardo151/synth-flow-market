import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Bot, Brain, Plug, Activity, Plus, Trash2, Eye, EyeOff, 
  Power, RefreshCw, Wifi, WifiOff, Shield, Database,
  ExternalLink, CheckCircle2, XCircle, Loader2, Play, Square, List, ServerCog, Send,
  ChevronDown, ChevronRight, Key, TestTube2, BarChart3
} from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToolsConfigSection } from '@/components/agent/ToolsConfigSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ActionInstruction {
  id: string;
  instruction: string;
  type: 'do' | 'dont';
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status: string;
}

interface TokenUsageStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  executionCount: number;
  byExecution: Array<{
    executionId: string;
    tokens: number;
    promptTokens: number;
    completionTokens: number;
    date: string;
  }>;
}

type CommunicationTone = 'profissional' | 'amigavel' | 'tecnico' | 'entusiasmado' | 'empatico' | 'direto';

interface AgentConfig {
  isActive: boolean;
  n8nWorkflowId: string;
  provider: 'openai' | 'google' | 'starai';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindowSize: number;
  retentionPolicy: '7days' | '30days' | '90days' | 'unlimited';
  sessionKeyId: string;
  communicationTone: CommunicationTone;
  systemPrompt: string;
  actionInstructions: ActionInstruction[];
  enableWebSearch: boolean;
  enabledTools: string[];
}

const COMMUNICATION_TONES: Record<CommunicationTone, { emoji: string; label: string; desc: string; color: string; instruction: string }> = {
  profissional: {
    emoji: '👔',
    label: 'Profissional',
    desc: 'Formal e corporativo',
    color: 'from-slate-500 to-slate-600',
    instruction: 'Use linguagem corporativa e formal. Trate por "senhor(a)" quando apropriado. Seja objetivo e mantenha distância profissional.'
  },
  amigavel: {
    emoji: '😊',
    label: 'Amigável',
    desc: 'Casual e acolhedor',
    color: 'from-amber-500 to-orange-500',
    instruction: 'Use linguagem casual mas respeitosa. Emojis são bem-vindos com moderação. Trate por "você" e seja caloroso.'
  },
  tecnico: {
    emoji: '🔬',
    label: 'Técnico',
    desc: 'Preciso e detalhado',
    color: 'from-blue-500 to-indigo-500',
    instruction: 'Use terminologia técnica precisa. Explique conceitos quando necessário. Seja detalhista nas explicações.'
  },
  entusiasmado: {
    emoji: '🎉',
    label: 'Entusiasmado',
    desc: 'Energético e motivador',
    color: 'from-pink-500 to-rose-500',
    instruction: 'Demonstre energia positiva! Celebre conquistas do usuário. Use exclamações com moderação. Mantenha otimismo.'
  },
  empatico: {
    emoji: '💚',
    label: 'Empático',
    desc: 'Compreensivo e atencioso',
    color: 'from-emerald-500 to-teal-500',
    instruction: 'Demonstre compreensão genuína. Valide sentimentos do usuário. Seja paciente e acolhedor.'
  },
  direto: {
    emoji: '🎯',
    label: 'Direto',
    desc: 'Objetivo e conciso',
    color: 'from-violet-500 to-purple-500',
    instruction: 'Vá direto ao ponto. Evite rodeios. Respostas concisas. Foque no essencial.'
  },
};

interface AgentMetrics {
  totalMessages: number;
  errorRate: number;
  lastActivity: string | null;
}

// Modelos OpenAI organizados por categoria
type OpenAIModelCategory = 'flagship' | 'mini' | 'reasoning' | 'audio' | 'image' | 'search' | 'codex' | 'legacy';

interface OpenAIModel {
  value: string;
  label: string;
  description: string;
  category: OpenAIModelCategory;
}

const OPENAI_MODELS: OpenAIModel[] = [
  // Flagship - Modelos principais
  { value: 'gpt-5.1', label: 'GPT-5.1', description: 'Modelo mais recente e poderoso', category: 'flagship' },
  { value: 'gpt-5.1-2025-11-13', label: 'GPT-5.1 (Nov 2025)', description: 'Versão datada do GPT-5.1', category: 'flagship' },
  { value: 'gpt-5.1-chat-latest', label: 'GPT-5.1 Chat Latest', description: 'Última versão de chat do GPT-5.1', category: 'flagship' },
  { value: 'gpt-5', label: 'GPT-5', description: 'Modelo flagship anterior', category: 'flagship' },
  { value: 'gpt-5-2025-08-07', label: 'GPT-5 (Ago 2025)', description: 'Versão datada do GPT-5', category: 'flagship' },
  { value: 'gpt-5-chat-latest', label: 'GPT-5 Chat Latest', description: 'Última versão de chat do GPT-5', category: 'flagship' },
  { value: 'gpt-5-pro', label: 'GPT-5 Pro', description: 'Versão Pro do GPT-5', category: 'flagship' },
  { value: 'gpt-5-pro-2025-10-08', label: 'GPT-5 Pro (Out 2025)', description: 'Versão datada do GPT-5 Pro', category: 'flagship' },
  { value: 'gpt-4.1', label: 'GPT-4.1', description: 'Modelo GPT-4.1 estável', category: 'flagship' },
  { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1 (Abr 2025)', description: 'Versão datada do GPT-4.1', category: 'flagship' },
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Modelo multimodal rápido', category: 'flagship' },
  { value: 'gpt-4o-2024-05-13', label: 'GPT-4o (Mai 2024)', description: 'Versão datada do GPT-4o', category: 'flagship' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Modelo GPT-4 original', category: 'flagship' },
  { value: 'gpt-4-0613', label: 'GPT-4 (Jun 2023)', description: 'Versão datada do GPT-4', category: 'flagship' },
  { value: 'gpt-4-turbo-2024-04-09', label: 'GPT-4 Turbo (Abr 2024)', description: 'GPT-4 Turbo com visão', category: 'flagship' },
  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo Preview', description: 'Prévia do GPT-4 Turbo', category: 'flagship' },
  { value: 'gpt-4-1106-preview', label: 'GPT-4 1106 Preview', description: 'Prévia de novembro 2023', category: 'flagship' },
  { value: 'gpt-4-0125-preview', label: 'GPT-4 0125 Preview', description: 'Prévia de janeiro 2024', category: 'flagship' },
  
  // Mini - Modelos rápidos e econômicos
  { value: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Versão rápida do GPT-5', category: 'mini' },
  { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini (Ago 2025)', description: 'Versão datada do GPT-5 Mini', category: 'mini' },
  { value: 'gpt-5-nano', label: 'GPT-5 Nano', description: 'Versão ultra-rápida do GPT-5', category: 'mini' },
  { value: 'gpt-5-nano-2025-08-07', label: 'GPT-5 Nano (Ago 2025)', description: 'Versão datada do GPT-5 Nano', category: 'mini' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Versão rápida do GPT-4.1', category: 'mini' },
  { value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini (Abr 2025)', description: 'Versão datada do GPT-4.1 Mini', category: 'mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', description: 'Versão ultra-rápida do GPT-4.1', category: 'mini' },
  { value: 'gpt-4.1-nano-2025-04-14', label: 'GPT-4.1 Nano (Abr 2025)', description: 'Versão datada do GPT-4.1 Nano', category: 'mini' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Versão rápida do GPT-4o', category: 'mini' },
  { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4o Mini (Jul 2024)', description: 'Versão datada do GPT-4o Mini', category: 'mini' },
  { value: 'gpt-3.5-turbo-0125', label: 'GPT-3.5 Turbo 0125', description: 'GPT-3.5 de janeiro 2025', category: 'mini' },
  { value: 'gpt-3.5-turbo-1106', label: 'GPT-3.5 Turbo 1106', description: 'GPT-3.5 de novembro 2023', category: 'mini' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K', description: 'GPT-3.5 com contexto expandido', category: 'mini' },
  
  // Reasoning - Modelos de raciocínio
  { value: 'o4-mini', label: 'O4 Mini', description: 'Modelo de raciocínio rápido', category: 'reasoning' },
  { value: 'o4-mini-2025-04-16', label: 'O4 Mini (Abr 2025)', description: 'Versão datada do O4 Mini', category: 'reasoning' },
  { value: 'o3', label: 'O3', description: 'Modelo de raciocínio poderoso', category: 'reasoning' },
  { value: 'o3-2025-04-16', label: 'O3 (Abr 2025)', description: 'Versão datada do O3', category: 'reasoning' },
  { value: 'o3-mini', label: 'O3 Mini', description: 'Versão rápida do O3', category: 'reasoning' },
  { value: 'o3-mini-2025-01-31', label: 'O3 Mini (Jan 2025)', description: 'Versão datada do O3 Mini', category: 'reasoning' },
  { value: 'o1', label: 'O1', description: 'Modelo de raciocínio original', category: 'reasoning' },
  { value: 'o1-2024-12-17', label: 'O1 (Dez 2024)', description: 'Versão datada do O1', category: 'reasoning' },
  { value: 'o1-pro', label: 'O1 Pro', description: 'Versão Pro do O1', category: 'reasoning' },
  { value: 'o1-pro-2025-03-19', label: 'O1 Pro (Mar 2025)', description: 'Versão datada do O1 Pro', category: 'reasoning' },
  
  // Audio - Modelos de áudio
  { value: 'gpt-audio', label: 'GPT Audio', description: 'Modelo de áudio principal', category: 'audio' },
  { value: 'gpt-audio-2025-08-28', label: 'GPT Audio (Ago 2025)', description: 'Versão datada do GPT Audio', category: 'audio' },
  { value: 'gpt-audio-mini', label: 'GPT Audio Mini', description: 'Modelo de áudio rápido', category: 'audio' },
  { value: 'gpt-audio-mini-2025-10-06', label: 'GPT Audio Mini (Out 2025)', description: 'Versão datada do GPT Audio Mini', category: 'audio' },
  { value: 'gpt-4o-audio-preview', label: 'GPT-4o Audio Preview', description: 'Prévia de áudio do GPT-4o', category: 'audio' },
  { value: 'gpt-4o-audio-preview-2024-12-17', label: 'GPT-4o Audio (Dez 2024)', description: 'Versão datada do GPT-4o Audio', category: 'audio' },
  { value: 'gpt-4o-mini-audio-preview', label: 'GPT-4o Mini Audio', description: 'Prévia de áudio do GPT-4o Mini', category: 'audio' },
  { value: 'gpt-4o-mini-audio-preview-2024-12-17', label: 'GPT-4o Mini Audio (Dez 2024)', description: 'Versão datada', category: 'audio' },
  { value: 'gpt-4o-transcribe', label: 'GPT-4o Transcribe', description: 'Transcrição de áudio', category: 'audio' },
  { value: 'gpt-4o-transcribe-diarize', label: 'GPT-4o Transcribe Diarize', description: 'Transcrição com identificação de falantes', category: 'audio' },
  
  // Image - Modelos de imagem
  { value: 'gpt-image', label: 'GPT Image', description: 'Modelo de geração de imagem', category: 'image' },
  { value: 'gpt-image-1-mini', label: 'GPT Image Mini', description: 'Modelo de imagem rápido', category: 'image' },
  
  // Search - Modelos de busca
  { value: 'gpt-5-search-api', label: 'GPT-5 Search API', description: 'GPT-5 com busca web', category: 'search' },
  { value: 'gpt-5-search-api-2025-10-14', label: 'GPT-5 Search (Out 2025)', description: 'Versão datada do GPT-5 Search', category: 'search' },
  { value: 'gpt-4o-mini-search-preview', label: 'GPT-4o Mini Search', description: 'GPT-4o Mini com busca', category: 'search' },
  { value: 'gpt-4o-mini-search-preview-2025-03-11', label: 'GPT-4o Mini Search (Mar 2025)', description: 'Versão datada', category: 'search' },
  
  // Codex - Modelos de código
  { value: 'gpt-5-codex', label: 'GPT-5 Codex', description: 'GPT-5 otimizado para código', category: 'codex' },
  { value: 'gpt-5.1-codex', label: 'GPT-5.1 Codex', description: 'GPT-5.1 otimizado para código', category: 'codex' },
  { value: 'gpt-5.1-codex-max', label: 'GPT-5.1 Codex Max', description: 'Versão máxima para código', category: 'codex' },
  { value: 'gpt-5.1-codex-mini', label: 'GPT-5.1 Codex Mini', description: 'Versão rápida para código', category: 'codex' },
];

const OPENAI_CATEGORY_LABELS: Record<OpenAIModelCategory, string> = {
  flagship: '⭐ Flagship (Principais)',
  mini: '⚡ Mini / Nano (Rápidos)',
  reasoning: '🧠 Reasoning (Raciocínio)',
  audio: '🎵 Audio',
  image: '🖼️ Image',
  search: '🔍 Search',
  codex: '💻 Codex (Código)',
  legacy: '📦 Legacy',
};

// Modelos Google organizados por categoria
type GoogleModelCategory = 'chat' | 'image' | 'video' | 'tts' | 'special';

interface GoogleModel {
  value: string;
  label: string;
  description: string;
  category: GoogleModelCategory;
}

const GOOGLE_MODELS: GoogleModel[] = [
  // Chat / Conversação - Gemini 2.5
  { value: 'models/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Versão estável lançado em 17 de junho de 2025', category: 'chat' },
  { value: 'models/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Multimodal de médio porte, até 1M tokens (abril 2025)', category: 'chat' },
  { value: 'models/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', description: 'Versão estável lançado em julho de 2025', category: 'chat' },
  { value: 'models/gemini-2.5-flash-lite-preview-09-2025', label: 'Gemini 2.5 Flash-Lite Preview', description: 'Versão prévia (25 de setembro de 2025)', category: 'chat' },
  { value: 'models/gemini-2.5-computer-use-preview-10-2025', label: 'Gemini 2.5 Computer Use', description: 'Prévia de Uso de Computador', category: 'chat' },
  // Chat / Conversação - Gemini 2.0
  { value: 'models/gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Modelo multimodal rápido e versátil', category: 'chat' },
  { value: 'models/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash 001', description: 'Versão estável lançado em janeiro de 2025', category: 'chat' },
  { value: 'models/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Experimental', description: 'Versão experimental', category: 'chat' },
  { value: 'models/gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', description: 'Versão leve do 2.0 Flash', category: 'chat' },
  { value: 'models/gemini-2.0-flash-lite-001', label: 'Gemini 2.0 Flash Lite 001', description: 'Versão estável lançado em julho de 2025', category: 'chat' },
  { value: 'models/gemini-2.0-flash-lite-preview', label: 'Gemini 2.0 Flash Lite Preview', description: 'Versão prévia (5 de fevereiro de 2025)', category: 'chat' },
  { value: 'models/gemini-2.0-pro-exp', label: 'Gemini 2.0 Pro Experimental', description: 'Versão experimental (25 de março de 2025)', category: 'chat' },
  { value: 'models/gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro Exp 02-05', description: 'Versão experimental (25 de março de 2025)', category: 'chat' },
  // Chat / Conversação - Latest
  { value: 'models/gemini-pro-latest', label: 'Gemini Pro Latest', description: 'Último lançamento do Gemini Pro', category: 'chat' },
  { value: 'models/gemini-flash-latest', label: 'Gemini Flash Latest', description: 'Último lançamento do Gemini Flash', category: 'chat' },
  { value: 'models/gemini-flash-lite-latest', label: 'Gemini Flash Lite Latest', description: 'Último lançamento do Gemini Flash-Lite', category: 'chat' },
  { value: 'models/gemini-exp-1206', label: 'Gemini Exp 1206', description: 'Versão experimental (25 de março de 2025)', category: 'chat' },
  // Gemma Models
  { value: 'models/gemma-3-12b-it', label: 'Gemma 3 12B IT', description: 'Modelo Gemma 3 com 12B parâmetros', category: 'chat' },
  { value: 'models/gemma-3-27b-it', label: 'Gemma 3 27B IT', description: 'Modelo Gemma 3 com 27B parâmetros', category: 'chat' },
  { value: 'models/gemma-3n-e2b-it', label: 'Gemma 3N E2B IT', description: 'Modelo Gemma 3N E2B', category: 'chat' },
  { value: 'models/gemma-3n-e4b-it', label: 'Gemma 3N E4B IT', description: 'Modelo Gemma 3N E4B', category: 'chat' },
  // AQA
  { value: 'models/aqa', label: 'AQA', description: 'Respostas fundamentadas em pesquisa para maior precisão', category: 'chat' },
  // Geração de Imagem
  { value: 'models/gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', description: 'Versão estável lançado em julho de 2025', category: 'image' },
  { value: 'models/gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash Image Preview', description: 'Prévia de Imagem do Gemini 2.5 Flash', category: 'image' },
  { value: 'models/gemini-2.0-flash-exp-image-generation', label: 'Gemini 2.0 Flash Image Gen', description: 'Geração de Imagem Experimental', category: 'image' },
  { value: 'models/gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image Preview', description: 'Prévia de Imagem do Gemini 3 Pro', category: 'image' },
  { value: 'vertex/imagen-4.0-fast-generate-001', label: 'Imagen 4.0 Fast', description: 'Modelo Imagen 4.0 rápido servido pelo Vertex', category: 'image' },
  { value: 'vertex/imagen-4.0-generate-001', label: 'Imagen 4.0', description: 'Modelo Imagen 4.0 servido pelo Vertex', category: 'image' },
  { value: 'vertex/imagen-4.0-ultra-generate-preview-06-06', label: 'Imagen 4.0 Ultra', description: 'Modelo Imagen 4.0 ultra servido pelo Vertex', category: 'image' },
  { value: 'vertex/nano-banana-pro-preview', label: 'Nano Banana Pro Preview', description: 'Prévia de Imagem do Gemini 3 Pro', category: 'image' },
  // Geração de Vídeo
  { value: 'models/veo-2.0-generate-001', label: 'Veo 2.0', description: 'Modelo Veo 2.0 para geração de vídeo', category: 'video' },
  { value: 'models/veo-3.0-fast-generate-001', label: 'Veo 3 Fast', description: 'Veo 3 rápido para geração de vídeo', category: 'video' },
  { value: 'models/veo-3.0-generate-001', label: 'Veo 3', description: 'Veo 3 para geração de vídeo', category: 'video' },
  { value: 'models/veo-3.1-generate-001', label: 'Veo 3.1', description: 'Veo 3.1 para geração de vídeo', category: 'video' },
  // Text-to-Speech
  { value: 'models/gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS', description: 'Prévia Text-to-Speech Set 2025', category: 'tts' },
  { value: 'models/gemini-3-pro-preview-tts', label: 'Gemini 3 Pro TTS Preview', description: 'Prévia Text-to-Speech do Gemini 3 Pro', category: 'tts' },
  // Especiais
  { value: 'models/gemini-robotics-er-1.5-preview', label: 'Gemini Robotics ER 1.5', description: 'Prévia ER 1.5 de Robótica', category: 'special' },
];

const GOOGLE_CATEGORY_LABELS: Record<GoogleModelCategory, string> = {
  chat: '💬 Chat / Conversação',
  image: '🖼️ Geração de Imagem',
  video: '🎬 Geração de Vídeo',
  tts: '🔊 Text-to-Speech (TTS)',
  special: '🤖 Especiais',
};

const RETENTION_OPTIONS = [
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
  { value: '90days', label: '90 dias' },
  { value: 'unlimited', label: 'Ilimitado' },
];

const AdminAgentConfigPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'loading' | 'unknown'>('unknown');
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [syncingLlm, setSyncingLlm] = useState(false);
  
  const [n8nConnected, setN8nConnected] = useState<boolean | null>(null);
  const [n8nTesting, setN8nTesting] = useState(false);
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [syncingTools, setSyncingTools] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8nWorkflow | null>(null);
  const [syncingMemory, setSyncingMemory] = useState(false);
  const [tokenStats, setTokenStats] = useState<TokenUsageStats>({
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    executionCount: 0,
    byExecution: [],
  });
  const [loadingTokenStats, setLoadingTokenStats] = useState(false);
  
  // Estado para créditos StarAI
  const [staraiCredits, setStaraiCredits] = useState({
    balanceBRL: 0,
    freeBalanceBRL: 0,
    depositedBRL: 0,
  });
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [processingDeposit, setProcessingDeposit] = useState(false);
  
  const [metrics, setMetrics] = useState<AgentMetrics>({
    totalMessages: 0,
    errorRate: 0,
    lastActivity: null,
  });
  
  const [config, setConfig] = useState<AgentConfig>({
    isActive: false,
    n8nWorkflowId: '',
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    contextWindowSize: 10,
    retentionPolicy: '30days',
    sessionKeyId: '{{ $json.session_id }}',
    communicationTone: 'amigavel',
    systemPrompt: `Você é o assistente virtual da [NOME DA EMPRESA].

SOBRE NÓS:
- Somos especializados em [SEU PRODUTO/SERVIÇO]
- Atendemos de segunda a sexta, das 9h às 18h
- WhatsApp: (00) 00000-0000

COMO AJUDAR:
- Tire dúvidas sobre nossos produtos
- Ajude com agendamentos
- Encaminhe para um atendente humano quando necessário`,
    actionInstructions: [
      { id: '1', instruction: 'Sempre cumprimente o cliente pelo nome', type: 'do' },
      { id: '2', instruction: 'Nunca invente informações sobre preços', type: 'dont' },
    ],
    enableWebSearch: false,
    enabledTools: ['httpRequestTool', 'calculatorTool'],
  });

  const [newInstruction, setNewInstruction] = useState('');
  const [newInstructionType, setNewInstructionType] = useState<'do' | 'dont'>('do');
const [syncingPrompt, setSyncingPrompt] = useState(false);
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // Removido: estados de seleção de workflow separados (agora usa config.n8nWorkflowId)
  
  // Estados para credenciais de ferramentas
  const [toolCredentials, setToolCredentials] = useState<Record<string, string>>({});
  const [openToolCredentials, setOpenToolCredentials] = useState<string[]>([]);
  const [testingCredential, setTestingCredential] = useState<string | null>(null);
  const [credentialTestResults, setCredentialTestResults] = useState<Record<string, 'success' | 'error'>>({});
  
  // Estado para configurações completas das ferramentas
  const [toolConfigs, setToolConfigs] = useState<Record<string, any>>({
    httpRequest: { enabled: true, httpMethod: 'GET', httpFollowRedirects: true },
    webhook: { enabled: false, webhookHttpMethod: 'POST', webhookResponseMode: 'onReceived', webhookResponseCode: 200 },
    code: { enabled: false, codeLanguage: 'javascript' },
    calculator: { enabled: true },
  });
  
  // Handler para atualizar configurações das ferramentas
  const updateToolConfig = (toolId: string, updates: Partial<any>) => {
    setToolConfigs(prev => ({
      ...prev,
      [toolId]: { ...prev[toolId], ...updates }
    }));
  };

  // Mapa de credenciais por ferramenta
  const TOOL_CREDENTIALS: Record<string, { name: string; placeholder: string; docUrl: string }> = {
    serpApiTool: { name: 'SerpAPI Key', placeholder: 'Sua chave SerpAPI', docUrl: 'https://serpapi.com/manage-api-key' },
    wolframAlphaTool: { name: 'Wolfram Alpha App ID', placeholder: 'App ID do Wolfram', docUrl: 'https://developer.wolframalpha.com/portal/myapps/' },
    gmailTool: { name: 'Gmail OAuth JSON', placeholder: 'JSON de credenciais OAuth', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/google/' },
    outlookTool: { name: 'Microsoft OAuth', placeholder: 'JSON de credenciais OAuth', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/microsoft/' },
    sendGridTool: { name: 'SendGrid API Key', placeholder: 'SG.xxxxxxxxxx', docUrl: 'https://app.sendgrid.com/settings/api_keys' },
    slackTool: { name: 'Slack Bot Token', placeholder: 'xoxb-...', docUrl: 'https://api.slack.com/apps' },
    telegramTool: { name: 'Telegram Bot Token', placeholder: 'Token do @BotFather', docUrl: 'https://core.telegram.org/bots#how-do-i-create-a-bot' },
    discordTool: { name: 'Discord Webhook URL', placeholder: 'https://discord.com/api/webhooks/...', docUrl: 'https://discord.com/developers/applications' },
    whatsappTool: { name: 'WhatsApp Business API', placeholder: 'Token da API', docUrl: 'https://developers.facebook.com/docs/whatsapp' },
    googleSheetsTool: { name: 'Google Sheets OAuth', placeholder: 'JSON de credenciais OAuth', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/google/' },
    excelTool: { name: 'Microsoft OAuth', placeholder: 'JSON de credenciais OAuth', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/microsoft/' },
    airtableTool: { name: 'Airtable API Key', placeholder: 'pat...', docUrl: 'https://airtable.com/create/tokens' },
    notionTool: { name: 'Notion API Key', placeholder: 'secret_...', docUrl: 'https://www.notion.so/my-integrations' },
    postgresTool: { name: 'PostgreSQL Connection', placeholder: 'postgresql://user:pass@host:5432/db', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/postgres/' },
    mysqlTool: { name: 'MySQL Connection', placeholder: 'mysql://user:pass@host:3306/db', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/mysql/' },
    mongoDbTool: { name: 'MongoDB Connection', placeholder: 'mongodb://user:pass@host:27017/db', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/mongodb/' },
    redisTool: { name: 'Redis Connection', placeholder: 'redis://host:6379', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/redis/' },
    supabaseTool: { name: 'Supabase API Key', placeholder: 'eyJ...', docUrl: 'https://supabase.com/docs/guides/api' },
    googleDriveTool: { name: 'Google Drive OAuth', placeholder: 'JSON de credenciais OAuth', docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/google/' },
    dropboxTool: { name: 'Dropbox Access Token', placeholder: 'sl.xxxxxxxxxx', docUrl: 'https://www.dropbox.com/developers/apps' },
    s3Tool: { name: 'AWS Credentials', placeholder: 'Access Key ID', docUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html' },
  };

  const toggleToolCredentialOpen = (toolId: string) => {
    setOpenToolCredentials(prev => 
      prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId]
    );
  };

  const updateToolCredential = (toolId: string, value: string) => {
    setToolCredentials(prev => ({ ...prev, [toolId]: value }));
  };

  const testToolCredential = async (toolId: string) => {
    const value = toolCredentials[toolId];
    if (!value?.trim()) {
      toast({ title: "Preencha a credencial primeiro", variant: "destructive" });
      return;
    }
    
    setTestingCredential(toolId);
    try {
      let success = false;
      
      if (toolId === 'serpApiTool') {
        const res = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(value)}`);
        success = res.ok;
      } else if (toolId === 'notionTool') {
        const res = await fetch('https://api.notion.com/v1/users/me', { 
          headers: { 'Authorization': `Bearer ${value}`, 'Notion-Version': '2022-06-28' }
        });
        success = res.ok;
      } else {
        // Validação básica para outras credenciais
        success = value.length >= 10;
      }

      setCredentialTestResults(prev => ({ ...prev, [toolId]: success ? 'success' : 'error' }));
      toast({ 
        title: success ? "Credencial válida!" : "Credencial inválida",
        variant: success ? "default" : "destructive"
      });
    } catch {
      setCredentialTestResults(prev => ({ ...prev, [toolId]: 'error' }));
      toast({ title: "Erro ao testar", variant: "destructive" });
    } finally {
      setTestingCredential(null);
    }
  };

  const availableModels = config.provider === 'openai' ? OPENAI_MODELS : GOOGLE_MODELS;

  // Carregar configuração do banco de dados
  const loadConfigFromDatabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar TODOS os customer_products do usuário
      const { data: allProducts } = await supabase
        .from('customer_products')
        .select('id, product_title, product_slug, n8n_workflow_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (allProducts && allProducts.length > 0) {
        const productId = allProducts[0].id;
        setCustomerProductId(productId);
        const customerProducts = allProducts; // Para compatibilidade com código abaixo

        // Carregar configuração existente
        const { data: configData } = await supabase
          .from('ai_control_config')
          .select('*')
          .eq('customer_product_id', productId)
          .maybeSingle();

        if (configData) {
          // Parsear action_instructions se existir
          let actionInstructions: ActionInstruction[] = [];
          
          if (configData.action_instructions) {
            try {
              const parsed = JSON.parse(configData.action_instructions);
              if (Array.isArray(parsed)) {
                actionInstructions = parsed;
              }
            } catch (e) {
              console.error('Error parsing action_instructions:', e);
            }
          }

          // Determinar provider baseado no modelo
          const provider = configData.ai_model?.includes('gpt') ? 'openai' : 'google';
          
          // Carregar tom de comunicação do campo personality
          const savedTone = (configData.personality as CommunicationTone) || 'amigavel';
          const validTone = Object.keys(COMMUNICATION_TONES).includes(savedTone) ? savedTone : 'amigavel';

          setConfig(prev => ({
            ...prev,
            isActive: configData.is_active || false,
            n8nWorkflowId: customerProducts[0].n8n_workflow_id || '',
            provider,
            model: configData.ai_model || (provider === 'openai' ? 'gpt-4o' : 'models/gemini-2.5-flash'),
            temperature: configData.temperature || 0.7,
            maxTokens: configData.max_tokens || 2048,
            communicationTone: validTone,
            systemPrompt: configData.system_prompt || '',
            actionInstructions,
            sessionKeyId: configData.memory_session_id || '{{ $json.session_id }}',
            enabledTools: (configData.tools_enabled as string[]) || ['httpRequestTool', 'calculatorTool'],
          }));

          // Carregar API key e credenciais das ferramentas
          if (configData.ai_credentials) {
            const credentials = configData.ai_credentials as Record<string, string>;
            const apiKey = credentials.openai_api_key || credentials.google_api_key || '';
            if (apiKey) {
              setConfig(prev => ({ ...prev, apiKey }));
            }
            
            // Carregar credenciais das ferramentas (excluindo as chaves de AI)
            const toolCreds: Record<string, string> = {};
            Object.entries(credentials).forEach(([key, value]) => {
              if (key !== 'openai_api_key' && key !== 'google_api_key' && value) {
                toolCreds[key] = value;
              }
            });
            if (Object.keys(toolCreds).length > 0) {
              setToolCredentials(toolCreds);
            }
          }
        }
      }
      setConfigLoaded(true);
    } catch (error) {
      console.error('Error loading config from database:', error);
      setConfigLoaded(true);
    }
  };

  // Salvar configuração no banco de dados
  const saveConfigToDatabase = async () => {
    if (!customerProductId) {
      // Criar um registro se não existir
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Verificar se já tem um customer_product
      const { data: customerProducts } = await supabase
        .from('customer_products')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!customerProducts || customerProducts.length === 0) {
        console.error('No customer_product found');
        return false;
      }

      setCustomerProductId(customerProducts[0].id);
    }

    const productId = customerProductId;
    if (!productId) return false;

    try {
      const configToSave = {
        customer_product_id: productId,
        is_active: config.isActive,
        ai_model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        system_prompt: config.systemPrompt,
        personality: config.communicationTone,
        action_instructions: JSON.stringify(config.actionInstructions),
        memory_session_id: config.sessionKeyId,
        n8n_webhook_url: config.n8nWorkflowId ? `workflow-${config.n8nWorkflowId}` : null,
        tools_enabled: config.enabledTools,
        ai_credentials: {
          [config.provider === 'openai' ? 'openai_api_key' : 'google_api_key']: config.apiKey,
          ...toolCredentials, // Incluir credenciais das ferramentas
        },
        updated_at: new Date().toISOString(),
      };

      // Upsert - inserir ou atualizar
      const { error } = await supabase
        .from('ai_control_config')
        .upsert(configToSave, { onConflict: 'customer_product_id' });

      if (error) {
        console.error('Error saving config:', error);
        return false;
      }

      // Também atualizar o n8n_workflow_id no customer_products
      if (config.n8nWorkflowId) {
        await supabase
          .from('customer_products')
          .update({ n8n_workflow_id: config.n8nWorkflowId })
          .eq('id', productId);
      }

      return true;
    } catch (error) {
      console.error('Error saving config to database:', error);
      return false;
    }
  };

  // Carregar configuração ao montar o componente
  useEffect(() => {
    loadConfigFromDatabase();
  }, []);

  const n8nApiCall = useCallback(async (action: string, params: any = {}) => {
    const { data, error } = await supabase.functions.invoke('n8n-api', {
      body: { action, ...params }
    });
    if (error) throw error;
    return data;
  }, []);

  const testN8nConnection = async () => {
    setN8nTesting(true);
    try {
      const result = await n8nApiCall('test_connection');
      setN8nConnected(result.success);
      
      if (result.success) {
        toast({
          title: "Conexão estabelecida!",
          description: `Conectado ao n8n em ${result.n8nUrl}`,
        });
        loadWorkflows();
      } else {
        toast({
          title: "Falha na conexão",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setN8nConnected(false);
      toast({
        title: "Erro de conexão",
        description: error.message || "Não foi possível conectar ao n8n",
        variant: "destructive",
      });
    } finally {
      setN8nTesting(false);
    }
  };

  const loadWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const result = await n8nApiCall('list_workflows', { limit: 100 });
      if (result.success) {
        setWorkflows(result.workflows);
      }
    } catch (error: any) {
      console.error('Error loading workflows:', error);
      toast({
        title: "Erro ao carregar workflows",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const loadExecutions = async (workflowId?: string) => {
    setLoadingExecutions(true);
    try {
      const result = await n8nApiCall('get_executions', { 
        workflowId: workflowId || config.n8nWorkflowId,
        limit: 20 
      });
      if (result.success) {
        setExecutions(result.executions);
        
        const successCount = result.executions.filter((e: N8nExecution) => e.status === 'success').length;
        const errorCount = result.executions.filter((e: N8nExecution) => e.status === 'error').length;
        const total = result.executions.length;
        
        setMetrics(prev => ({
          ...prev,
          totalMessages: total,
          errorRate: total > 0 ? (errorCount / total) * 100 : 0,
          lastActivity: result.executions[0]?.startedAt || null,
        }));
      }
    } catch (error: any) {
      console.error('Error loading executions:', error);
    } finally {
      setLoadingExecutions(false);
    }
  };

  const loadTokenUsage = async (workflowId?: string) => {
    const wfId = workflowId || config.n8nWorkflowId;
    if (!wfId) return;

    setLoadingTokenStats(true);
    try {
      // Primeiro busca as execuções
      const execResult = await n8nApiCall('get_executions', { 
        workflowId: wfId,
        limit: 50 
      });

      if (!execResult.success || !execResult.executions?.length) {
        setTokenStats({
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          executionCount: 0,
          byExecution: [],
        });
        return;
      }

      // Para cada execução com sucesso, busca os detalhes para extrair token usage
      const successfulExecs = execResult.executions.filter(
        (e: N8nExecution) => e.status === 'success'
      ).slice(0, 20); // Limita a 20 para não sobrecarregar

      const tokenData: TokenUsageStats['byExecution'] = [];
      let totalPrompt = 0;
      let totalCompletion = 0;

      // Busca detalhes de cada execução em paralelo (máximo 5 de cada vez)
      const batchSize = 5;
      for (let i = 0; i < successfulExecs.length; i += batchSize) {
        const batch = successfulExecs.slice(i, i + batchSize);
        const details = await Promise.all(
          batch.map((exec: N8nExecution) => 
            n8nApiCall('get_execution', { executionId: exec.id }).catch(() => null)
          )
        );

        details.forEach((detail, idx) => {
          if (!detail?.success || !detail.execution) return;
          
          const exec = batch[idx];
          const execution = detail.execution;
          
          // Extrair tokenUsage dos nós de IA (resultData.runData contém os outputs dos nós)
          let execPromptTokens = 0;
          let execCompletionTokens = 0;

          try {
            const runData = execution.data?.resultData?.runData;
            if (runData) {
              Object.values(runData).forEach((nodeRuns: any) => {
                if (Array.isArray(nodeRuns)) {
                  nodeRuns.forEach((run: any) => {
                    // Procura por tokenUsage em diferentes locais do output
                    const outputs = run.data?.main || [];
                    outputs.forEach((outputArray: any[]) => {
                      if (Array.isArray(outputArray)) {
                        outputArray.forEach((item: any) => {
                          const usage = item.json?.tokenUsage || 
                                       item.json?.usage ||
                                       item.json?.response?.usage ||
                                       item.json?.metadata?.tokenUsage;
                          if (usage) {
                            execPromptTokens += usage.promptTokens || usage.prompt_tokens || 0;
                            execCompletionTokens += usage.completionTokens || usage.completion_tokens || 0;
                          }
                        });
                      }
                    });
                  });
                }
              });
            }
          } catch (e) {
            console.warn('Error extracting token usage:', e);
          }

          if (execPromptTokens > 0 || execCompletionTokens > 0) {
            tokenData.push({
              executionId: exec.id,
              tokens: execPromptTokens + execCompletionTokens,
              promptTokens: execPromptTokens,
              completionTokens: execCompletionTokens,
              date: exec.startedAt,
            });
            totalPrompt += execPromptTokens;
            totalCompletion += execCompletionTokens;
          }
        });
      }

      setTokenStats({
        totalTokens: totalPrompt + totalCompletion,
        promptTokens: totalPrompt,
        completionTokens: totalCompletion,
        executionCount: tokenData.length,
        byExecution: tokenData.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      });

    } catch (error: any) {
      console.error('Error loading token usage:', error);
      toast({
        title: "Erro ao carregar uso de tokens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingTokenStats(false);
    }
  };

  const activateWorkflow = async (workflowId: string) => {
    setTogglingAgent(true);
    try {
      const result = await n8nApiCall('activate_workflow', { workflowId });
      
      if (result.success) {
        toast({
          title: "Workflow Ativado",
          description: `Workflow ${workflowId} está agora ativo.`,
        });
        setAgentStatus('online');
        setConfig(prev => ({ ...prev, isActive: true }));
        setWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, active: true } : w
        ));
      }
    } catch (error: any) {
      toast({
        title: "Erro ao ativar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTogglingAgent(false);
    }
  };

  const deactivateWorkflow = async (workflowId: string) => {
    setTogglingAgent(true);
    try {
      const result = await n8nApiCall('deactivate_workflow', { workflowId });
      
      if (result.success) {
        toast({
          title: "Workflow Desativado",
          description: `Workflow ${workflowId} foi desativado.`,
        });
        setAgentStatus('offline');
        setConfig(prev => ({ ...prev, isActive: false }));
        setWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, active: false } : w
        ));
      }
    } catch (error: any) {
      toast({
        title: "Erro ao desativar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTogglingAgent(false);
    }
  };

  const toggleWorkflowStatus = async () => {
    if (!config.n8nWorkflowId) {
      toast({
        title: "Selecione um workflow",
        description: "Escolha um workflow na lista antes de ativar/desativar.",
        variant: "destructive",
      });
      return;
    }
    
    if (config.isActive) {
      await deactivateWorkflow(config.n8nWorkflowId);
    } else {
      await activateWorkflow(config.n8nWorkflowId);
    }
  };

  useEffect(() => {
    testN8nConnection();
  }, []);

  useEffect(() => {
    if (config.n8nWorkflowId) {
      const workflow = workflows.find(w => w.id === config.n8nWorkflowId);
      if (workflow) {
        setSelectedWorkflow(workflow);
        setAgentStatus(workflow.active ? 'online' : 'offline');
        setConfig(prev => ({ ...prev, isActive: workflow.active }));
        loadExecutions(workflow.id);
      }
    }
  }, [config.n8nWorkflowId, workflows]);

  const handleProviderChange = (provider: 'openai' | 'google' | 'starai') => {
    // StarAI usa OpenAI por baixo, então mantém modelos OpenAI
    const defaultModel = provider === 'google' ? 'models/gemini-2.5-flash' : 'gpt-4o';
    setConfig(prev => ({
      ...prev,
      provider,
      model: defaultModel,
      // Limpa a API key se for StarAI (usaremos credencial gerenciada)
      apiKey: provider === 'starai' ? '' : prev.apiKey,
    }));
    
    // Carregar créditos StarAI se selecionado
    if (provider === 'starai') {
      loadStaraiCredits();
    }
  };

  // Funções StarAI Credits
  const loadStaraiCredits = async () => {
    setLoadingCredits(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Faça login",
          description: "Você precisa estar logado para usar StarAI.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/starai-credits/balance`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      
      if (result.success && result.data) {
        setStaraiCredits({
          balanceBRL: Number(result.data.balance_brl) || 0,
          freeBalanceBRL: Number(result.data.free_balance_brl) || 0,
          depositedBRL: Number(result.data.deposited_brl) || 0,
        });
      }
    } catch (error: any) {
      console.error('Error loading StarAI credits:', error);
    } finally {
      setLoadingCredits(false);
    }
  };

  const handleStaraiDeposit = async () => {
    if (depositAmount < 10) {
      toast({
        title: "Valor inválido",
        description: "O valor mínimo de depósito é R$ 10,00",
        variant: "destructive",
      });
      return;
    }

    setProcessingDeposit(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Faça login",
          description: "Você precisa estar logado para depositar.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/starai-credits/deposit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount_brl: depositAmount,
            success_url: `${window.location.origin}/admin/agent-config?payment=success`,
            failure_url: `${window.location.origin}/admin/agent-config?payment=failure`,
          }),
        }
      );

      const result = await response.json();
      
      if (result.success && result.data?.payment_link) {
        // Redirecionar para o Mercado Pago
        window.location.href = result.data.payment_link;
      } else {
        throw new Error(result.message || 'Erro ao criar pagamento');
      }
    } catch (error: any) {
      console.error('Error creating deposit:', error);
      toast({
        title: "Erro ao criar pagamento",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setProcessingDeposit(false);
    }
  };

  // Verificar parâmetros de URL para status de pagamento
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      toast({
        title: "Pagamento aprovado!",
        description: "Seus créditos StarAI foram adicionados à sua conta.",
      });
      // Limpar parâmetro da URL
      window.history.replaceState({}, '', window.location.pathname);
      // Recarregar créditos
      loadStaraiCredits();
    } else if (paymentStatus === 'failure') {
      toast({
        title: "Pagamento não aprovado",
        description: "O pagamento não foi concluído. Tente novamente.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'pending') {
      toast({
        title: "Pagamento pendente",
        description: "Aguardando confirmação do pagamento.",
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Carregar créditos ao montar se provider for StarAI
  useEffect(() => {
    if (config.provider === 'starai') {
      loadStaraiCredits();
    }
  }, []);

  const addInstruction = () => {
    if (!newInstruction.trim()) return;
    setConfig(prev => ({
      ...prev,
      actionInstructions: [
        ...prev.actionInstructions,
        { id: Date.now().toString(), instruction: newInstruction, type: newInstructionType }
      ]
    }));
    setNewInstruction('');
  };

  const removeInstruction = (id: string) => {
    setConfig(prev => ({
      ...prev,
      actionInstructions: prev.actionInstructions.filter(i => i.id !== id)
    }));
  };

  const syncToN8n = async (workflowId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('n8n-sync-config', {
        body: {
          action: 'sync_config',
          workflowId,
          config: {
            aiModel: config.model,
            systemPrompt: config.systemPrompt,
            personality: config.actionInstructions
              .filter(i => i.type === 'do')
              .map(i => i.instruction)
              .join('\n'),
            actionInstructions: config.actionInstructions
              .map(i => `${i.type === 'do' ? '✓' : '✗'} ${i.instruction}`)
              .join('\n'),
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            memorySessionId: config.sessionKeyId,
            aiCredentials: {
              [config.provider === 'openai' ? 'openai_api_key' : 'google_api_key']: config.apiKey,
            },
          },
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  };

  // Sincronizar apenas o System Prompt diretamente com n8n
  const syncSystemPromptToN8n = async () => {
    if (!config.n8nWorkflowId) {
      toast({
        title: "Workflow não selecionado",
        description: "Selecione um workflow na aba Status antes de sincronizar.",
        variant: "destructive",
      });
      return;
    }

    setSyncingPrompt(true);
    try {
      // Monta o prompt completo com instruções de ação
      const fullPrompt = `${config.systemPrompt}

=== INSTRUÇÕES DE AÇÃO ===
${config.actionInstructions.map(i => `${i.type === 'do' ? '✓ FAÇA:' : '✗ NUNCA FAÇA:'} ${i.instruction}`).join('\n')}`;

      const result = await n8nApiCall('update_system_prompt', {
        workflowId: config.n8nWorkflowId,
        newSystemMessage: fullPrompt,
      });

      if (result.success) {
        toast({
          title: "System Prompt sincronizado!",
          description: `Atualizado no workflow ${config.n8nWorkflowId}`,
        });
      } else {
        throw new Error(result.error || 'Falha ao sincronizar');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar",
        description: error.message || "Não foi possível sincronizar o System Prompt.",
        variant: "destructive",
      });
    } finally {
      setSyncingPrompt(false);
    }
  };

  // Sincronizar credenciais e modelo LLM com n8n
  const syncLlmConfigToN8n = async () => {
    if (!config.n8nWorkflowId) {
      toast({
        title: "Workflow não selecionado",
        description: "Selecione um workflow na aba Status antes de sincronizar.",
        variant: "destructive",
      });
      return;
    }

    // StarAI não precisa de API key do usuário
    if (config.provider !== 'starai' && !config.apiKey) {
      toast({
        title: "API Key não informada",
        description: "Insira a chave de API do provedor selecionado.",
        variant: "destructive",
      });
      return;
    }

    setSyncingLlm(true);
    try {
      // Para StarAI, usamos credencial gerenciada (sem apiKey do usuário)
      const payload = {
        workflowId: config.n8nWorkflowId,
        provider: config.provider === 'starai' ? 'openai' : config.provider, // StarAI usa OpenAI por baixo
        model: config.model,
        ...(config.provider === 'starai' 
          ? { credentialName: 'StarAI', useExistingCredential: true }
          : { apiKey: config.apiKey }
        ),
      };

      const result = await n8nApiCall('update_llm_config', payload);

      if (result.success) {
        toast({
          title: config.provider === 'starai' ? "StarAI ativado!" : "Motor IA sincronizado!",
          description: config.provider === 'starai' 
            ? `Usando credencial StarAI com modelo ${config.model}. R$ 75,00 de bônus disponíveis!`
            : `${result.provider}/${result.model} configurado no workflow. Credencial ID: ${result.credentialId}`,
        });
      } else {
        throw new Error(result.error || 'Falha ao sincronizar LLM');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar Motor IA",
        description: error.message || "Não foi possível sincronizar as credenciais.",
        variant: "destructive",
      });
    } finally {
      setSyncingLlm(false);
    }
  };

  // Sincronizar memória PostgreSQL com n8n
  const syncMemoryToN8n = async () => {
    if (!config.n8nWorkflowId) {
      toast({
        title: "Workflow não selecionado",
        description: "Selecione um workflow na aba Status antes de sincronizar.",
        variant: "destructive",
      });
      return;
    }

    setSyncingMemory(true);
    try {
      const result = await n8nApiCall('update_memory_config', {
        workflowId: config.n8nWorkflowId,
        sessionIdKey: config.sessionKeyId,
        contextWindowSize: config.contextWindowSize,
      });

      if (result.success) {
        toast({
          title: "Memória PostgreSQL sincronizada!",
          description: `Conectado ao PostgreSQL em ${result.postgresConfig?.host}. Credencial ID: ${result.credentialId}`,
        });
      } else {
        throw new Error(result.error || 'Falha ao sincronizar memória');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar memória",
        description: error.message || "Não foi possível configurar a memória PostgreSQL.",
        variant: "destructive",
      });
    } finally {
      setSyncingMemory(false);
    }
  };

  // Sincronizar ferramentas com o workflow n8n
  const syncToolsToN8n = async () => {
    if (!config.n8nWorkflowId) {
      toast({
        title: "Workflow não selecionado",
        description: "Selecione um workflow na aba Status antes de sincronizar.",
        variant: "destructive",
      });
      return;
    }

    // Extrair ferramentas habilitadas do toolConfigs
    const enabledTools = Object.entries(toolConfigs)
      .filter(([_, cfg]) => cfg?.enabled)
      .map(([toolId]) => toolId);

    if (enabledTools.length === 0) {
      toast({
        title: "Nenhuma ferramenta selecionada",
        description: "Selecione pelo menos uma ferramenta para sincronizar.",
        variant: "destructive",
      });
      return;
    }

    setSyncingTools(true);
    try {
      // Preparar configurações completas para envio
      const fullToolConfigs: Record<string, any> = {};
      enabledTools.forEach(toolId => {
        if (toolConfigs[toolId]) {
          fullToolConfigs[toolId] = toolConfigs[toolId];
        }
      });

      console.log('Sincronizando ferramentas:', enabledTools);
      console.log('Configurações:', fullToolConfigs);

      const result = await n8nApiCall('sync_tools', {
        workflowId: config.n8nWorkflowId,
        enabledTools,
        toolsConfig: fullToolConfigs,
      });

      if (result.success) {
        const summary = result.summary || {};
        const addedCount = summary.added?.length || 0;
        const updatedCount = summary.updated?.length || 0;
        const totalTools = summary.totalTools || enabledTools.length;
        
        toast({
          title: "Ferramentas sincronizadas!",
          description: `${totalTools} ferramenta(s) no workflow. Adicionadas: ${addedCount}, Atualizadas: ${updatedCount}`,
        });

        // Salvar configurações no banco após sync bem-sucedido
        await saveConfigToDatabase();
      } else {
        throw new Error(result.error || 'Falha ao sincronizar ferramentas');
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar ferramentas:', error);
      toast({
        title: "Erro ao sincronizar ferramentas",
        description: error.message || "Não foi possível sincronizar as ferramentas.",
        variant: "destructive",
      });
    } finally {
      setSyncingTools(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Salvar no banco de dados (persistência permanente)
      const dbSaved = await saveConfigToDatabase();
      
      if (!dbSaved) {
        toast({
          title: "Aviso",
          description: "Não foi possível salvar no banco de dados. As configurações serão perdidas ao sair.",
          variant: "destructive",
        });
      }

      if (config.n8nWorkflowId) {
        // Monta o prompt completo com instruções de ação
        const fullPrompt = `${config.systemPrompt}

=== INSTRUÇÕES DE AÇÃO ===
${config.actionInstructions.map(i => `${i.type === 'do' ? '✓ FAÇA:' : '✗ NUNCA FAÇA:'} ${i.instruction}`).join('\n')}`;

        // Sincronizar System Prompt diretamente via update_system_prompt
        const promptResult = await n8nApiCall('update_system_prompt', {
          workflowId: config.n8nWorkflowId,
          newSystemMessage: fullPrompt,
        });

        // Sincronizar credenciais e modelo LLM
        let llmResult = { success: true };
        // StarAI usa credencial gerenciada, não precisa de apiKey do usuário
        if (config.provider === 'starai' || (config.apiKey && config.apiKey !== '***ENCRYPTED***')) {
          const payload = {
            workflowId: config.n8nWorkflowId,
            provider: config.provider === 'starai' ? 'openai' : config.provider,
            model: config.model,
            ...(config.provider === 'starai' 
              ? { credentialName: 'StarAI', useExistingCredential: true }
              : { apiKey: config.apiKey }
            ),
          };
          llmResult = await n8nApiCall('update_llm_config', payload);
        }

        // Também sincroniza outras configurações via n8n-sync-config
        const syncResult = await syncToN8n(config.n8nWorkflowId);
        
        if (dbSaved && promptResult?.success && llmResult?.success && syncResult?.success) {
          const providerLabel = config.provider === 'starai' ? 'StarAI' : config.provider;
          toast({
            title: "Tudo salvo e sincronizado!",
            description: `Configurações salvas permanentemente. Motor IA: ${providerLabel}/${config.model}`,
          });
        } else if (dbSaved && promptResult?.success && llmResult?.success) {
          toast({
            title: "Salvo com sucesso!",
            description: "Configurações salvas no banco. Prompt e Motor IA sincronizados com n8n.",
          });
        } else if (dbSaved && promptResult?.success) {
          toast({
            title: "Parcialmente sincronizado",
            description: "Configurações salvas. Prompt atualizado, mas falha ao sincronizar Motor IA.",
            variant: "destructive",
          });
        } else if (dbSaved) {
          toast({
            title: "Salvo no banco de dados",
            description: "Configurações salvas, mas falha ao sincronizar com n8n.",
          });
        } else {
          toast({
            title: "Erro ao salvar",
            description: "Não foi possível salvar as configurações.",
            variant: "destructive",
          });
        }
      } else {
        if (dbSaved) {
          toast({
            title: "Configurações salvas!",
            description: "Salvo permanentemente. Selecione um workflow para sincronizar com n8n.",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Configuração do Agente IA</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Integrado com n8n</span>
                    {n8nConnected === true && (
                      <Badge variant="outline" className="text-green-500 border-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                    )}
                    {n8nConnected === false && (
                      <Badge variant="outline" className="text-red-500 border-red-500">
                        <XCircle className="h-3 w-3 mr-1" />
                        Desconectado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  agentStatus === 'online' ? 'bg-green-500 animate-pulse' : 
                  agentStatus === 'offline' ? 'bg-red-500' : 
                  agentStatus === 'loading' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-sm font-medium">
                  {agentStatus === 'online' ? 'Online' : 
                   agentStatus === 'offline' ? 'Offline' : 
                   agentStatus === 'loading' ? 'Processando...' : 'Desconhecido'}
                </span>
              </div>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar e Sincronizar'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="status" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="status" className="gap-2">
              <Power className="h-4 w-4" />
              <span className="hidden sm:inline">Status</span>
            </TabsTrigger>
            <TabsTrigger value="engine" className="gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Motor IA</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Memória</span>
            </TabsTrigger>
            <TabsTrigger value="personality" className="gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Personalidade</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Ferramentas</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Monitoramento</span>
            </TabsTrigger>
          </TabsList>

          {/* STATUS */}
          <TabsContent value="status" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ServerCog className="h-5 w-5 text-primary" />
                    Conexão com n8n
                  </CardTitle>
                  <CardDescription>
                    Status da integração com sua instância n8n
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    n8nConnected === true ? 'border-green-500 bg-green-500/10' :
                    n8nConnected === false ? 'border-red-500 bg-red-500/10' :
                    'border-border'
                  }`}>
                    <div className="flex items-center gap-3">
                      {n8nConnected === true ? (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      ) : n8nConnected === false ? (
                        <XCircle className="h-8 w-8 text-red-500" />
                      ) : (
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                      )}
                      <div>
                        <p className="font-semibold">
                          {n8nConnected === true ? 'Conectado' :
                           n8nConnected === false ? 'Desconectado' : 'Verificando...'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          https://n8n.starai.com.br
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={testN8nConnection}
                      disabled={n8nTesting}
                    >
                      {n8nTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {n8nConnected && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Workflows disponíveis:</span>
                      <Badge>{workflows.length}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5 text-primary" />
                    Selecionar Workflow
                  </CardTitle>
                  <CardDescription>
                    Escolha o workflow do agente no n8n
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select 
                      value={config.n8nWorkflowId} 
                      onValueChange={(v) => setConfig(prev => ({ ...prev, n8nWorkflowId: v }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um workflow..." />
                      </SelectTrigger>
                      <SelectContent>
                        {workflows.map(wf => (
                          <SelectItem key={wf.id} value={wf.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${wf.active ? 'bg-green-500' : 'bg-red-500'}`} />
                              {wf.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={loadWorkflows}
                      disabled={loadingWorkflows}
                    >
                      {loadingWorkflows ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {selectedWorkflow && (
                    <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{selectedWorkflow.name}</span>
                        <Badge variant={selectedWorkflow.active ? "default" : "secondary"}>
                          {selectedWorkflow.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>ID: {selectedWorkflow.id}</p>
                        <p>Atualizado: {new Date(selectedWorkflow.updatedAt).toLocaleString('pt-BR')}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => window.open(`https://n8n.starai.com.br/workflow/${selectedWorkflow.id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir no n8n
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Power className="h-5 w-5 text-primary" />
                    Controle do Agente
                  </CardTitle>
                  <CardDescription>
                    Ative ou desative o workflow selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-6 rounded-xl border-2 transition-colors duration-300" style={{
                    borderColor: config.isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    backgroundColor: config.isActive ? 'hsl(var(--primary) / 0.05)' : 'transparent'
                  }}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full transition-colors ${
                        config.isActive ? 'bg-green-500/20' : 'bg-muted'
                      }`}>
                        {config.isActive ? (
                          <Wifi className="h-6 w-6 text-green-500" />
                        ) : (
                          <WifiOff className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <Label className="text-lg font-semibold">Agente Ativo</Label>
                        <p className="text-sm text-muted-foreground">
                          {config.isActive ? 'O workflow está ativo no n8n' : 'O workflow está desativado'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={toggleWorkflowStatus}
                      disabled={togglingAgent || !config.n8nWorkflowId || !n8nConnected}
                      className="scale-125"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant={config.isActive ? "destructive" : "default"}
                      onClick={toggleWorkflowStatus}
                      disabled={togglingAgent || !config.n8nWorkflowId || !n8nConnected}
                    >
                      {togglingAgent ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : config.isActive ? (
                        <Square className="h-4 w-4 mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {config.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => loadExecutions()}
                      disabled={loadingExecutions || !config.n8nWorkflowId}
                    >
                      {loadingExecutions ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Atualizar Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* MOTOR IA */}
          <TabsContent value="engine" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Credenciais e Modelo
                  </CardTitle>
                  <CardDescription>
                    Configure o provedor de IA e suas credenciais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Provedor (Provider)</Label>
                    <Select value={config.provider} onValueChange={(v) => handleProviderChange(v as 'openai' | 'google' | 'starai')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starai">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-500">⭐</span>
                            StarAI (Recomendado)
                          </div>
                        </SelectItem>
                        <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                        <SelectItem value="google">Google (Gemini)</SelectItem>
                      </SelectContent>
                    </Select>
                    {config.provider === 'starai' && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⭐ Use nossa infraestrutura gerenciada sem precisar de API Key própria
                      </p>
                    )}
                  </div>

                  {/* Sistema de Créditos StarAI */}
                  {config.provider === 'starai' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/30">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <span className="text-xl">⭐</span> Créditos StarAI
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={loadStaraiCredits}
                              disabled={loadingCredits}
                              className="h-7 w-7"
                            >
                              <RefreshCw className={`h-4 w-4 ${loadingCredits ? 'animate-spin' : ''}`} />
                            </Button>
                            <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400">
                              Gerenciado
                            </Badge>
                          </div>
                        </div>
                        
                        {loadingCredits ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="text-center p-3 bg-background/50 rounded-lg">
                                <p className="text-2xl font-bold text-primary">
                                  R$ {staraiCredits.balanceBRL.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">Saldo Total</p>
                              </div>
                              <div className="text-center p-3 bg-background/50 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">
                                  R$ {staraiCredits.freeBalanceBRL.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">Bônus Grátis</p>
                              </div>
                            </div>

                            {staraiCredits.depositedBRL > 0 && (
                              <div className="text-center p-2 bg-background/30 rounded-lg mb-4">
                                <p className="text-sm text-muted-foreground">
                                  Total depositado: <span className="font-medium text-foreground">R$ {staraiCredits.depositedBRL.toFixed(2)}</span>
                                </p>
                              </div>
                            )}

                            {staraiCredits.balanceBRL === 0 && (
                              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 mb-4">
                                <p className="text-sm text-green-700 dark:text-green-400">
                                  🎁 <strong>R$ 75,00 por conta da casa!</strong>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Equivalente a $15 USD para você começar
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        <div className="space-y-2">
                          <Label>Adicionar Créditos (R$)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(Number(e.target.value))}
                              min={10}
                              step={10}
                              placeholder="50"
                              className="flex-1"
                              disabled={processingDeposit}
                            />
                            <Button 
                              variant="default"
                              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                              onClick={handleStaraiDeposit}
                              disabled={processingDeposit || depositAmount < 10}
                            >
                              {processingDeposit ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              {processingDeposit ? 'Processando...' : 'Depositar'}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Mínimo: R$ 10,00 • Pagamento via Mercado Pago
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg border text-sm">
                        <p className="font-medium mb-1">Como funciona:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• Você não precisa criar conta na OpenAI</li>
                          <li>• Usamos nossa credencial gerenciada (StarAI)</li>
                          <li>• Cobrança por uso real dos tokens</li>
                          <li>• Suporte a todos os modelos GPT</li>
                          <li>• Pagamento seguro via Mercado Pago</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>API Key (Chave Secreta)</Label>
                      <div className="relative">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          placeholder={config.provider === 'openai' ? 'sk-...' : 'AIza...'}
                          value={config.apiKey}
                          onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
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
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Armazenamento criptografado
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select value={config.model} onValueChange={(v) => setConfig(prev => ({ ...prev, model: v }))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover max-h-[400px]">
                        {(config.provider === 'openai' || config.provider === 'starai') ? (
                          // OpenAI Models - agrupado por categoria (StarAI também usa OpenAI)
                          (['flagship', 'mini', 'reasoning', 'audio', 'image', 'search', 'codex'] as OpenAIModelCategory[]).map((category) => {
                            const modelsInCategory = OPENAI_MODELS.filter(m => m.category === category);
                            if (modelsInCategory.length === 0) return null;
                            return (
                              <SelectGroup key={category}>
                                <SelectLabel className="bg-muted/50 text-muted-foreground">
                                  {OPENAI_CATEGORY_LABELS[category]}
                                </SelectLabel>
                                {modelsInCategory.map((model) => (
                                  <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            );
                          })
                        ) : (
                          // Google Models - agrupado por categoria
                          (['chat', 'image', 'video', 'tts', 'special'] as GoogleModelCategory[]).map((category) => {
                            const modelsInCategory = GOOGLE_MODELS.filter(m => m.category === category);
                            if (modelsInCategory.length === 0) return null;
                            return (
                              <SelectGroup key={category}>
                                <SelectLabel className="bg-muted/50 text-muted-foreground">
                                  {GOOGLE_CATEGORY_LABELS[category]}
                                </SelectLabel>
                                {modelsInCategory.map((model) => (
                                  <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {(config.provider === 'openai' || config.provider === 'starai')
                        ? OPENAI_MODELS.find(m => m.value === config.model)?.description
                        : GOOGLE_MODELS.find(m => m.value === config.model)?.description}
                    </p>
                  </div>

                  <Button 
                    onClick={syncLlmConfigToN8n} 
                    disabled={syncingLlm || !config.n8nWorkflowId || (config.provider !== 'starai' && !config.apiKey)}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {syncingLlm ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {syncingLlm ? 'Sincronizando...' : config.provider === 'starai' ? 'Ativar StarAI no n8n' : 'Salvar Credencial no n8n'}
                  </Button>
                  
                  {!config.n8nWorkflowId && (
                    <p className="text-xs text-amber-500">
                      Selecione um workflow na aba Status para sincronizar
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Parâmetros do Modelo</CardTitle>
                  <CardDescription>
                    Ajuste o comportamento da IA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Temperatura (Criatividade)</Label>
                      <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {config.temperature.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[config.temperature]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, temperature: v }))}
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
                    <Label>Max Tokens (Limite de Resposta)</Label>
                    <Input
                      type="number"
                      value={config.maxTokens}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 0 }))}
                      min={100}
                      max={128000}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* MEMÓRIA */}
          <TabsContent value="memory" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Memória PostgreSQL (VPS)
                  </CardTitle>
                  <CardDescription>
                    Memória persistente usando PostgreSQL externo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-700 dark:text-green-400">Memória PostgreSQL Ativa</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      A memória persistente está configurada e gerenciada automaticamente pelo sistema.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Janela de Contexto (Mensagens)</Label>
                    <Input
                      type="number"
                      value={config.contextWindowSize}
                      onChange={(e) => setConfig(prev => ({ ...prev, contextWindowSize: parseInt(e.target.value) || 10 }))}
                      min={1}
                      max={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Número de mensagens anteriores que o agente lembra
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Política de Retenção</Label>
                    <Select 
                      value={config.retentionPolicy} 
                      onValueChange={(v) => setConfig(prev => ({ ...prev, retentionPolicy: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RETENTION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={syncMemoryToN8n} 
                    disabled={syncingMemory || !config.n8nWorkflowId}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {syncingMemory ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {syncingMemory ? 'Configurando...' : 'Sincronizar Memória com n8n'}
                  </Button>

                  {!config.n8nWorkflowId && (
                    <p className="text-xs text-amber-500">
                      Selecione um workflow na aba Status para sincronizar
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Isolamento e Sessão</CardTitle>
                  <CardDescription>
                    Configure como identificar sessões únicas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Session Key ID</Label>
                    <Input
                      value={config.sessionKeyId}
                      onChange={(e) => setConfig(prev => ({ ...prev, sessionKeyId: e.target.value }))}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variável usada para identificar sessões únicas (ex: {`{{ $json.session_id }}`})
                    </p>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm font-medium mb-2">Tabela de Histórico</p>
                    <code className="text-xs bg-background px-2 py-1 rounded block">
                      n8n_chat_histories
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Esta tabela será criada automaticamente no PostgreSQL
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PERSONALIDADE */}
          <TabsContent value="personality" className="space-y-6">
            {/* Tom de Comunicação - Cards Visuais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Tom de Comunicação
                </CardTitle>
                <CardDescription>
                  Escolha como seu agente vai se comunicar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(Object.entries(COMMUNICATION_TONES) as [CommunicationTone, typeof COMMUNICATION_TONES[CommunicationTone]][]).map(([id, tone]) => (
                    <button
                      key={id}
                      onClick={() => setConfig(prev => ({ ...prev, communicationTone: id }))}
                      className={`relative overflow-hidden rounded-xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg border-2 ${
                        config.communicationTone === id 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${tone.color} opacity-10`} />
                      <div className="relative">
                        <span className="text-4xl mb-3 block">{tone.emoji}</span>
                        <h3 className="font-semibold text-lg">{tone.label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{tone.desc}</p>
                        {config.communicationTone === id && (
                          <Badge className="absolute top-0 right-0 bg-primary">Ativo</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Preview do tom selecionado */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Instrução que será enviada ao n8n:</p>
                  <p className="text-sm italic">{COMMUNICATION_TONES[config.communicationTone].instruction}</p>
                </div>
              </CardContent>
            </Card>

            {/* Instruções Específicas do Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Instruções Específicas
                </CardTitle>
                <CardDescription>
                  Adicione instruções personalizadas para o seu negócio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={config.systemPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  className="min-h-[150px] text-sm"
                  placeholder="Ex: Você é o assistente da loja XYZ. Nossos horários são de 9h às 18h. Nossos produtos principais são..."
                />
                <p className="text-xs text-muted-foreground">
                  Essas instruções serão combinadas com o tom de comunicação no prompt final do n8n.
                </p>
              </CardContent>
            </Card>

            {/* Regras do Agente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Regras do Agente
                </CardTitle>
                <CardDescription>
                  O que o agente deve ou não fazer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={newInstructionType} onValueChange={(v) => setNewInstructionType(v as 'do' | 'dont')}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="do">✅ Faça</SelectItem>
                      <SelectItem value="dont">❌ Não faça</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    placeholder="Ex: Sempre cumprimente o cliente"
                    onKeyPress={(e) => e.key === 'Enter' && addInstruction()}
                    className="flex-1"
                  />
                  <Button onClick={addInstruction} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {config.actionInstructions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma regra configurada
                    </p>
                  ) : (
                    config.actionInstructions.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          item.type === 'do' 
                            ? 'bg-green-500/10 border border-green-500/20' 
                            : 'bg-red-500/10 border border-red-500/20'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm">
                          {item.type === 'do' ? '✅' : '❌'} {item.instruction}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInstruction(item.id)}
                          className="h-7 w-7"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FERRAMENTAS */}
          <TabsContent value="tools" className="space-y-6">
            <ToolsConfigSection
              toolConfigs={toolConfigs}
              onUpdateToolConfig={updateToolConfig}
              onSyncToN8n={syncToolsToN8n}
              syncing={syncingTools}
              workflowId={config.n8nWorkflowId}
            />
          </TabsContent>

          {/* MONITORAMENTO */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      agentStatus === 'online' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      <div className={`w-6 h-6 rounded-full ${
                        agentStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {agentStatus === 'online' ? 'Online' : 'Offline'}
                      </p>
                      <p className="text-xs text-muted-foreground">n8n Workflow</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${metrics.errorRate < 5 ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.errorRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Últimas execuções</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Execuções</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{executions.length}</p>
                  <p className="text-xs text-muted-foreground">Registradas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Última Atividade</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">
                    {metrics.lastActivity 
                      ? new Date(metrics.lastActivity).toLocaleString('pt-BR')
                      : 'Nenhuma'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Histórico de Execuções</span>
                  <Button variant="outline" size="sm" onClick={() => loadExecutions()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {executions.map(exec => (
                      <div key={exec.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            exec.status === 'success' ? 'bg-green-500' :
                            exec.status === 'error' ? 'bg-red-500' :
                            exec.status === 'running' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                          }`} />
                          <div>
                            <p className="font-mono text-sm">#{exec.id}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(exec.startedAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          exec.status === 'success' ? 'default' :
                          exec.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {exec.status}
                        </Badge>
                      </div>
                    ))}
                    {executions.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        {loadingExecutions ? 'Carregando...' : 'Nenhuma execução encontrada'}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default AdminAgentConfigPage;
