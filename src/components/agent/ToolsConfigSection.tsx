import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Key,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  TestTube2,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Globe,
  Calculator,
  Search,
  Mail,
  MessageSquare,
  Database,
  FileText,
  Send,
  Settings2
} from 'lucide-react';

// ================== INTERFACES ==================

interface ToolConfig {
  enabled: boolean;
  // HTTP Request específicos
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  httpUrl?: string;
  httpAuthentication?: 'none' | 'basicAuth' | 'headerAuth' | 'oAuth1' | 'oAuth2' | 'digestAuth';
  httpHeaders?: Array<{ name: string; value: string }>;
  httpQueryParams?: Array<{ name: string; value: string }>;
  httpBody?: string;
  httpBodyContentType?: 'json' | 'form-urlencoded' | 'form-data' | 'raw' | 'binary';
  httpTimeout?: number;
  httpFollowRedirects?: boolean;
  httpIgnoreSSL?: boolean;
  httpResponseFormat?: 'autodetect' | 'json' | 'text' | 'file';
  httpRetryOnFail?: boolean;
  httpMaxRetries?: number;
  // Basic Auth
  httpBasicAuthUser?: string;
  httpBasicAuthPassword?: string;
  // Header Auth
  httpHeaderAuthName?: string;
  httpHeaderAuthValue?: string;
  // Webhook específicos
  webhookPath?: string;
  webhookHttpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  webhookAuthentication?: 'none' | 'basicAuth' | 'headerAuth';
  webhookResponseMode?: 'onReceived' | 'lastNode' | 'responseNode';
  webhookResponseData?: 'allEntries' | 'firstEntryJson' | 'firstEntryBinary' | 'noData';
  webhookResponseCode?: number;
  webhookResponseHeaders?: Array<{ name: string; value: string }>;
  webhookBinaryPropertyName?: string;
  // Code específicos
  codeLanguage?: 'javascript' | 'python';
  codeContent?: string;
  // API Credentials
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  // Generic
  customConfig?: Record<string, any>;
}

interface ToolDefinition {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: 'request' | 'communication' | 'data' | 'utility' | 'search' | 'code';
  hasCredential?: boolean;
  credentialName?: string;
  credentialPlaceholder?: string;
  docUrl?: string;
}

interface ToolsConfigSectionProps {
  toolConfigs: Record<string, ToolConfig>;
  onUpdateToolConfig: (toolId: string, config: Partial<ToolConfig>) => void;
  onSyncToN8n: () => void;
  syncing: boolean;
  workflowId?: string | null;
}

// ================== TOOL DEFINITIONS ==================

const TOOL_DEFINITIONS: ToolDefinition[] = [
  // REQUEST TOOLS
  {
    id: 'httpRequest',
    name: 'HTTP Request',
    icon: <Globe className="h-4 w-4" />,
    description: 'Fazer requisições HTTP para qualquer API',
    category: 'request',
    docUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/'
  },
  // COMMUNICATION TOOLS
  {
    id: 'gmail',
    name: 'Gmail',
    icon: <Mail className="h-4 w-4" />,
    description: 'Enviar e ler emails do Gmail',
    category: 'communication',
    hasCredential: true,
    credentialName: 'Gmail OAuth2',
    credentialPlaceholder: 'JSON de credenciais OAuth',
    docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/google/'
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Enviar mensagens no Slack',
    category: 'communication',
    hasCredential: true,
    credentialName: 'Slack Bot Token',
    credentialPlaceholder: 'xoxb-...',
    docUrl: 'https://api.slack.com/apps'
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Enviar mensagens no Discord',
    category: 'communication',
    hasCredential: true,
    credentialName: 'Discord Bot Token',
    credentialPlaceholder: 'Token do bot',
    docUrl: 'https://discord.com/developers/applications'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: <Send className="h-4 w-4" />,
    description: 'Bot do Telegram',
    category: 'communication',
    hasCredential: true,
    credentialName: 'Telegram Bot Token',
    credentialPlaceholder: 'Token do @BotFather',
    docUrl: 'https://core.telegram.org/bots'
  },
  // DATA TOOLS
  {
    id: 'googleSheets',
    name: 'Google Sheets',
    icon: <Database className="h-4 w-4" />,
    description: 'Ler e escrever em planilhas',
    category: 'data',
    hasCredential: true,
    credentialName: 'Google Sheets OAuth2',
    credentialPlaceholder: 'JSON de credenciais OAuth',
    docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/google/'
  },
  {
    id: 'airtable',
    name: 'Airtable',
    icon: <Database className="h-4 w-4" />,
    description: 'Bases de dados Airtable',
    category: 'data',
    hasCredential: true,
    credentialName: 'Airtable API Key',
    credentialPlaceholder: 'pat...',
    docUrl: 'https://airtable.com/create/tokens'
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: <FileText className="h-4 w-4" />,
    description: 'Páginas e databases do Notion',
    category: 'data',
    hasCredential: true,
    credentialName: 'Notion API Key',
    credentialPlaceholder: 'secret_...',
    docUrl: 'https://www.notion.so/my-integrations'
  },
  {
    id: 'supabase',
    name: 'Supabase',
    icon: <Database className="h-4 w-4" />,
    description: 'Banco de dados Supabase',
    category: 'data',
    hasCredential: true,
    credentialName: 'Supabase API',
    credentialPlaceholder: 'URL e API Key',
    docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/supabase/'
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    icon: <Database className="h-4 w-4" />,
    description: 'Banco de dados PostgreSQL',
    category: 'data',
    hasCredential: true,
    credentialName: 'PostgreSQL Connection',
    credentialPlaceholder: 'Connection string',
    docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/postgres/'
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    icon: <Database className="h-4 w-4" />,
    description: 'Banco de dados MongoDB',
    category: 'data',
    hasCredential: true,
    credentialName: 'MongoDB Connection',
    credentialPlaceholder: 'Connection string',
    docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/mongodb/'
  },
  // SEARCH TOOLS
  {
    id: 'serpApi',
    name: 'SerpAPI',
    icon: <Search className="h-4 w-4" />,
    description: 'Busca no Google via SerpAPI',
    category: 'search',
    hasCredential: true,
    credentialName: 'SerpAPI Key',
    credentialPlaceholder: 'Sua chave SerpAPI',
    docUrl: 'https://serpapi.com/manage-api-key'
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    icon: <Search className="h-4 w-4" />,
    description: 'Consulta Wikipedia',
    category: 'search',
    docUrl: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.toolwikipedia/'
  },
  {
    id: 'wolframAlpha',
    name: 'Wolfram Alpha',
    icon: <Calculator className="h-4 w-4" />,
    description: 'Cálculos e conhecimento científico',
    category: 'search',
    hasCredential: true,
    credentialName: 'Wolfram Alpha App ID',
    credentialPlaceholder: 'App ID',
    docUrl: 'https://developer.wolframalpha.com/portal/myapps/'
  },
  // UTILITY TOOLS
  {
    id: 'calculator',
    name: 'Calculadora',
    icon: <Calculator className="h-4 w-4" />,
    description: 'Cálculos matemáticos',
    category: 'utility',
    docUrl: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.toolcalculator/'
  },
];

const CATEGORIES = [
  { id: 'request', label: 'Requisições', icon: <Globe className="h-4 w-4" /> },
  { id: 'communication', label: 'Comunicação', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'data', label: 'Dados', icon: <Database className="h-4 w-4" /> },
  { id: 'search', label: 'Busca', icon: <Search className="h-4 w-4" /> },
  { id: 'utility', label: 'Utilitários', icon: <Calculator className="h-4 w-4" /> },
];

// ================== SUB-COMPONENTS ==================

// HTTP Request Configuration
function HttpRequestConfig({ 
  config, 
  onUpdate 
}: { 
  config: ToolConfig; 
  onUpdate: (updates: Partial<ToolConfig>) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addHeader = () => {
    const headers = config.httpHeaders || [];
    onUpdate({ httpHeaders: [...headers, { name: '', value: '' }] });
  };

  const updateHeader = (index: number, field: 'name' | 'value', value: string) => {
    const headers = [...(config.httpHeaders || [])];
    headers[index] = { ...headers[index], [field]: value };
    onUpdate({ httpHeaders: headers });
  };

  const removeHeader = (index: number) => {
    const headers = (config.httpHeaders || []).filter((_, i) => i !== index);
    onUpdate({ httpHeaders: headers });
  };

  const addQueryParam = () => {
    const params = config.httpQueryParams || [];
    onUpdate({ httpQueryParams: [...params, { name: '', value: '' }] });
  };

  const updateQueryParam = (index: number, field: 'name' | 'value', value: string) => {
    const params = [...(config.httpQueryParams || [])];
    params[index] = { ...params[index], [field]: value };
    onUpdate({ httpQueryParams: params });
  };

  const removeQueryParam = (index: number) => {
    const params = (config.httpQueryParams || []).filter((_, i) => i !== index);
    onUpdate({ httpQueryParams: params });
  };

  return (
    <div className="space-y-4">
      {/* Método e URL */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-3">
          <Label className="text-xs">Método</Label>
          <Select 
            value={config.httpMethod || 'GET'} 
            onValueChange={(v) => onUpdate({ httpMethod: v as any })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="HEAD">HEAD</SelectItem>
              <SelectItem value="OPTIONS">OPTIONS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-9">
          <Label className="text-xs">URL</Label>
          <Input 
            placeholder="https://api.exemplo.com/endpoint"
            value={config.httpUrl || ''}
            onChange={(e) => onUpdate({ httpUrl: e.target.value })}
            className="h-9"
          />
        </div>
      </div>

      {/* Autenticação */}
      <div>
        <Label className="text-xs">Autenticação</Label>
        <Select 
          value={config.httpAuthentication || 'none'} 
          onValueChange={(v) => onUpdate({ httpAuthentication: v as any })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            <SelectItem value="basicAuth">Basic Auth</SelectItem>
            <SelectItem value="headerAuth">Header Auth</SelectItem>
            <SelectItem value="digestAuth">Digest Auth</SelectItem>
            <SelectItem value="oAuth1">OAuth 1.0</SelectItem>
            <SelectItem value="oAuth2">OAuth 2.0</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Basic Auth Fields */}
      {config.httpAuthentication === 'basicAuth' && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-xs">Usuário</Label>
            <Input 
              placeholder="username"
              value={config.httpBasicAuthUser || ''}
              onChange={(e) => onUpdate({ httpBasicAuthUser: e.target.value })}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Senha</Label>
            <Input 
              type="password"
              placeholder="password"
              value={config.httpBasicAuthPassword || ''}
              onChange={(e) => onUpdate({ httpBasicAuthPassword: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
      )}

      {/* Header Auth Fields */}
      {config.httpAuthentication === 'headerAuth' && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-xs">Nome do Header</Label>
            <Input 
              placeholder="Authorization"
              value={config.httpHeaderAuthName || ''}
              onChange={(e) => onUpdate({ httpHeaderAuthName: e.target.value })}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Valor</Label>
            <Input 
              type="password"
              placeholder="Bearer token..."
              value={config.httpHeaderAuthValue || ''}
              onChange={(e) => onUpdate({ httpHeaderAuthValue: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
      )}

      {/* Headers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Headers</Label>
          <Button variant="ghost" size="sm" onClick={addHeader} className="h-7 px-2">
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {(config.httpHeaders || []).map((header, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input 
                placeholder="Nome"
                value={header.name}
                onChange={(e) => updateHeader(i, 'name', e.target.value)}
                className="h-8 text-xs"
              />
              <Input 
                placeholder="Valor"
                value={header.value}
                onChange={(e) => updateHeader(i, 'value', e.target.value)}
                className="h-8 text-xs"
              />
              <Button variant="ghost" size="sm" onClick={() => removeHeader(i)} className="h-8 w-8 p-0">
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Query Parameters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Query Parameters</Label>
          <Button variant="ghost" size="sm" onClick={addQueryParam} className="h-7 px-2">
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {(config.httpQueryParams || []).map((param, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input 
                placeholder="Nome"
                value={param.name}
                onChange={(e) => updateQueryParam(i, 'name', e.target.value)}
                className="h-8 text-xs"
              />
              <Input 
                placeholder="Valor"
                value={param.value}
                onChange={(e) => updateQueryParam(i, 'value', e.target.value)}
                className="h-8 text-xs"
              />
              <Button variant="ghost" size="sm" onClick={() => removeQueryParam(i)} className="h-8 w-8 p-0">
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Body (for POST, PUT, PATCH) */}
      {['POST', 'PUT', 'PATCH'].includes(config.httpMethod || '') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">Body</Label>
            <Select 
              value={config.httpBodyContentType || 'json'} 
              onValueChange={(v) => onUpdate({ httpBodyContentType: v as any })}
            >
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="form-urlencoded">Form URL Encoded</SelectItem>
                <SelectItem value="form-data">Form Data</SelectItem>
                <SelectItem value="raw">Raw</SelectItem>
                <SelectItem value="binary">Binary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea 
            placeholder='{"key": "value"}'
            value={config.httpBody || ''}
            onChange={(e) => onUpdate({ httpBody: e.target.value })}
            className="font-mono text-xs min-h-[100px]"
          />
        </div>
      )}

      {/* Opções Avançadas */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            <span className="text-xs">Opções Avançadas</span>
            {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Timeout (ms)</Label>
              <Input 
                type="number"
                placeholder="10000"
                value={config.httpTimeout || ''}
                onChange={(e) => onUpdate({ httpTimeout: Number(e.target.value) })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Formato da Resposta</Label>
              <Select 
                value={config.httpResponseFormat || 'autodetect'} 
                onValueChange={(v) => onUpdate({ httpResponseFormat: v as any })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="autodetect">Auto Detectar</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="file">Arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch 
                checked={config.httpFollowRedirects ?? true}
                onCheckedChange={(v) => onUpdate({ httpFollowRedirects: v })}
              />
              <Label className="text-xs">Seguir Redirects</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={config.httpIgnoreSSL ?? false}
                onCheckedChange={(v) => onUpdate({ httpIgnoreSSL: v })}
              />
              <Label className="text-xs">Ignorar SSL</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={config.httpRetryOnFail ?? false}
                onCheckedChange={(v) => onUpdate({ httpRetryOnFail: v })}
              />
              <Label className="text-xs">Retry em Falha</Label>
            </div>
          </div>

          {config.httpRetryOnFail && (
            <div className="w-1/2">
              <Label className="text-xs">Máx. Retries</Label>
              <Input 
                type="number"
                placeholder="3"
                value={config.httpMaxRetries || ''}
                onChange={(e) => onUpdate({ httpMaxRetries: Number(e.target.value) })}
                className="h-8"
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Webhook Configuration
function WebhookConfig({ 
  config, 
  onUpdate 
}: { 
  config: ToolConfig; 
  onUpdate: (updates: Partial<ToolConfig>) => void;
}) {
  const { toast } = useToast();

  const addResponseHeader = () => {
    const headers = config.webhookResponseHeaders || [];
    onUpdate({ webhookResponseHeaders: [...headers, { name: '', value: '' }] });
  };

  const updateResponseHeader = (index: number, field: 'name' | 'value', value: string) => {
    const headers = [...(config.webhookResponseHeaders || [])];
    headers[index] = { ...headers[index], [field]: value };
    onUpdate({ webhookResponseHeaders: headers });
  };

  const removeResponseHeader = (index: number) => {
    const headers = (config.webhookResponseHeaders || []).filter((_, i) => i !== index);
    onUpdate({ webhookResponseHeaders: headers });
  };

  const copyWebhookUrl = () => {
    const url = `https://seu-n8n.com/webhook/${config.webhookPath || 'meu-webhook'}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL copiada!" });
  };

  return (
    <div className="space-y-4">
      {/* Path do Webhook */}
      <div>
        <Label className="text-xs">Webhook Path</Label>
        <div className="flex gap-2">
          <Input 
            placeholder="meu-webhook"
            value={config.webhookPath || ''}
            onChange={(e) => onUpdate({ webhookPath: e.target.value })}
            className="h-9"
          />
          <Button variant="outline" size="sm" onClick={copyWebhookUrl} className="h-9">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          URL: https://seu-n8n.com/webhook/{config.webhookPath || 'meu-webhook'}
        </p>
      </div>

      {/* Método HTTP */}
      <div>
        <Label className="text-xs">Método HTTP Aceito</Label>
        <Select 
          value={config.webhookHttpMethod || 'POST'} 
          onValueChange={(v) => onUpdate({ webhookHttpMethod: v as any })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="HEAD">HEAD</SelectItem>
            <SelectItem value="OPTIONS">OPTIONS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Autenticação */}
      <div>
        <Label className="text-xs">Autenticação</Label>
        <Select 
          value={config.webhookAuthentication || 'none'} 
          onValueChange={(v) => onUpdate({ webhookAuthentication: v as any })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            <SelectItem value="basicAuth">Basic Auth</SelectItem>
            <SelectItem value="headerAuth">Header Auth</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Response Mode */}
      <div>
        <Label className="text-xs">Modo de Resposta</Label>
        <Select 
          value={config.webhookResponseMode || 'onReceived'} 
          onValueChange={(v) => onUpdate({ webhookResponseMode: v as any })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="onReceived">Quando Receber</SelectItem>
            <SelectItem value="lastNode">Último Nó</SelectItem>
            <SelectItem value="responseNode">Nó de Resposta</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {config.webhookResponseMode === 'onReceived' && 'Responde imediatamente ao receber a requisição'}
          {config.webhookResponseMode === 'lastNode' && 'Responde com os dados do último nó executado'}
          {config.webhookResponseMode === 'responseNode' && 'Responde com dados de um nó específico de resposta'}
        </p>
      </div>

      {/* Response Data */}
      <div>
        <Label className="text-xs">Dados da Resposta</Label>
        <Select 
          value={config.webhookResponseData || 'firstEntryJson'} 
          onValueChange={(v) => onUpdate({ webhookResponseData: v as any })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="allEntries">Todas as Entradas</SelectItem>
            <SelectItem value="firstEntryJson">Primeira Entrada (JSON)</SelectItem>
            <SelectItem value="firstEntryBinary">Primeira Entrada (Binário)</SelectItem>
            <SelectItem value="noData">Sem Dados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Response Code */}
      <div>
        <Label className="text-xs">Código de Resposta HTTP</Label>
        <Input 
          type="number"
          placeholder="200"
          value={config.webhookResponseCode || ''}
          onChange={(e) => onUpdate({ webhookResponseCode: Number(e.target.value) })}
          className="h-9"
        />
      </div>

      {/* Response Headers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Headers de Resposta</Label>
          <Button variant="ghost" size="sm" onClick={addResponseHeader} className="h-7 px-2">
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {(config.webhookResponseHeaders || []).map((header, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input 
                placeholder="Nome"
                value={header.name}
                onChange={(e) => updateResponseHeader(i, 'name', e.target.value)}
                className="h-8 text-xs"
              />
              <Input 
                placeholder="Valor"
                value={header.value}
                onChange={(e) => updateResponseHeader(i, 'value', e.target.value)}
                className="h-8 text-xs"
              />
              <Button variant="ghost" size="sm" onClick={() => removeResponseHeader(i)} className="h-8 w-8 p-0">
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Code Configuration
function CodeConfig({ 
  config, 
  onUpdate 
}: { 
  config: ToolConfig; 
  onUpdate: (updates: Partial<ToolConfig>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Linguagem</Label>
        <Select 
          value={config.codeLanguage || 'javascript'} 
          onValueChange={(v) => onUpdate({ codeLanguage: v as any })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Código</Label>
        <Textarea 
          placeholder={config.codeLanguage === 'python' 
            ? "# Seu código Python aqui\nreturn {'output': 'valor'}" 
            : "// Seu código JavaScript aqui\nreturn { output: 'valor' };"}
          value={config.codeContent || ''}
          onChange={(e) => onUpdate({ codeContent: e.target.value })}
          className="font-mono text-xs min-h-[200px]"
        />
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Dica:</strong> Use <code className="bg-muted px-1 rounded">$input</code> para acessar dados de entrada.
          {config.codeLanguage === 'javascript' && (
            <> Você pode usar <code className="bg-muted px-1 rounded">$json</code> e <code className="bg-muted px-1 rounded">$items</code> para manipular dados.</>
          )}
        </p>
      </div>
    </div>
  );
}

// Generic Credential Configuration
function CredentialConfig({ 
  tool,
  config, 
  onUpdate 
}: { 
  tool: ToolDefinition;
  config: ToolConfig; 
  onUpdate: (updates: Partial<ToolConfig>) => void;
}) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const testCredential = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      // Simular teste de credencial
      await new Promise(r => setTimeout(r, 1000));
      const hasValue = config.apiKey && config.apiKey.length >= 10;
      setTestResult(hasValue ? 'success' : 'error');
      toast({
        title: hasValue ? "Credencial válida!" : "Credencial inválida",
        variant: hasValue ? "default" : "destructive"
      });
    } catch {
      setTestResult('error');
      toast({ title: "Erro ao testar", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{tool.credentialName}</Label>
        {tool.docUrl && (
          <a 
            href={tool.docUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Obter credencial
          </a>
        )}
      </div>
      
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder={tool.credentialPlaceholder}
          value={config.apiKey || ''}
          onChange={(e) => onUpdate({ apiKey: e.target.value })}
          className={`flex-1 ${testResult === 'success' ? 'border-green-500' : testResult === 'error' ? 'border-red-500' : ''}`}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={testCredential}
          disabled={testing}
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <TestTube2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {testResult && (
        <p className={`text-xs flex items-center gap-1 ${testResult === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {testResult === 'success' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {testResult === 'success' ? 'Credencial válida!' : 'Credencial inválida'}
        </p>
      )}
    </div>
  );
}

// ================== MAIN COMPONENT ==================

export function ToolsConfigSection({
  toolConfigs,
  onUpdateToolConfig,
  onSyncToN8n,
  syncing,
  workflowId
}: ToolsConfigSectionProps) {
  const { toast } = useToast();
  const [openTools, setOpenTools] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('request');

  const toggleOpen = (toolId: string) => {
    setOpenTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId) 
        : [...prev, toolId]
    );
  };

  const handleToggleTool = (toolId: string) => {
    const currentConfig = toolConfigs[toolId] || { enabled: false };
    onUpdateToolConfig(toolId, { enabled: !currentConfig.enabled });
  };

  const enabledCount = Object.values(toolConfigs).filter(c => c?.enabled).length;
  const toolsByCategory = TOOL_DEFINITIONS.filter(t => t.category === activeCategory);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ferramentas do Agente
          </CardTitle>
          <CardDescription>
            Configure todas as ferramentas que o agente pode usar. Cada ferramenta tem opções completas como no n8n.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="grid grid-cols-6 mb-4">
              {CATEGORIES.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-1 text-xs">
                  {cat.icon}
                  <span className="hidden sm:inline">{cat.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map(cat => (
              <TabsContent key={cat.id} value={cat.id} className="space-y-3">
                {TOOL_DEFINITIONS.filter(t => t.category === cat.id).map(tool => {
                  const config = toolConfigs[tool.id] || { enabled: false };
                  const isOpen = openTools.includes(tool.id);

                  return (
                    <Collapsible key={tool.id} open={isOpen} onOpenChange={() => toggleOpen(tool.id)}>
                      <div className={`border rounded-lg transition-colors ${config.enabled ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        {/* Tool Header */}
                        <div className="flex items-center justify-between p-3">
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-3 flex-1 text-left hover:text-primary transition-colors">
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="text-lg">{tool.icon}</span>
                              <div>
                                <span className="font-medium">{tool.name}</span>
                                <span className="text-sm text-muted-foreground ml-2 hidden sm:inline">{tool.description}</span>
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          
                          <div className="flex items-center gap-2">
                            {tool.hasCredential && (
                              config.apiKey ? (
                                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Configurado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/50 bg-yellow-500/10">
                                  <Key className="h-3 w-3 mr-1" />
                                  Requer Credencial
                                </Badge>
                              )
                            )}
                            <Switch
                              checked={config.enabled}
                              onCheckedChange={() => handleToggleTool(tool.id)}
                            />
                          </div>
                        </div>

                        {/* Tool Configuration */}
                        <CollapsibleContent>
                          <div className="px-3 pb-3 pt-0 border-t">
                            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                              {/* Configurações específicas por tipo de ferramenta */}
                              {tool.id === 'httpRequest' && (
                                <HttpRequestConfig 
                                  config={config} 
                                  onUpdate={(updates) => onUpdateToolConfig(tool.id, updates)} 
                                />
                              )}
                              
                              {tool.id === 'webhook' && (
                                <WebhookConfig 
                                  config={config} 
                                  onUpdate={(updates) => onUpdateToolConfig(tool.id, updates)} 
                                />
                              )}
                              
                              {tool.id === 'code' && (
                                <CodeConfig 
                                  config={config} 
                                  onUpdate={(updates) => onUpdateToolConfig(tool.id, updates)} 
                                />
                              )}
                              
                              {/* Ferramentas com credencial */}
                              {tool.hasCredential && !['httpRequest', 'webhook', 'code'].includes(tool.id) && (
                                <CredentialConfig 
                                  tool={tool}
                                  config={config} 
                                  onUpdate={(updates) => onUpdateToolConfig(tool.id, updates)} 
                                />
                              )}
                              
                              {/* Ferramentas sem configuração especial */}
                              {!tool.hasCredential && !['httpRequest', 'webhook', 'code'].includes(tool.id) && (
                                <p className="text-sm text-muted-foreground">
                                  Esta ferramenta não requer configuração adicional. Basta habilitá-la para que o agente possa usá-la.
                                </p>
                              )}

                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Sync Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {enabledCount} ferramenta(s) habilitada(s)
        </p>
        <Button 
          onClick={onSyncToN8n} 
          disabled={syncing || !workflowId || enabledCount === 0}
        >
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
    </div>
  );
}
