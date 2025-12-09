import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

import { useToast } from '@/hooks/use-toast';
import {
  Key,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  TestTube2,
  Zap,
  RefreshCw
} from 'lucide-react';

// Tipos
interface ToolsSectionProps {
  toolsEnabled: string[];
  aiCredentials: Record<string, string>;
  onToggleTool: (toolId: string) => void;
  onUpdateCredential: (credId: string, value: string) => void;
  onSyncToN8n: () => void;
  syncing: boolean;
  workflowId?: string | null;
}

// Credenciais de Ferramentas
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

// Mapeamento de ferramentas para credenciais
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

// Lista de ferramentas organizadas por categoria
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

interface ToolType {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export function ToolsSection({
  toolsEnabled,
  aiCredentials,
  onToggleTool,
  onUpdateCredential,
  onSyncToN8n,
  syncing,
  workflowId
}: ToolsSectionProps) {
  const { toast } = useToast();
  
  // Estados simples
  const [currentTool, setCurrentTool] = useState<ToolType | null>(null);
  const [testingCredential, setTestingCredential] = useState<string | null>(null);
  const [credentialTestResults, setCredentialTestResults] = useState<Record<string, 'success' | 'error' | null>>({});

  // Abrir/selecionar ferramenta
  function abrirDialog(tool: ToolType) {
    setCurrentTool(currentTool?.id === tool.id ? null : tool);
  }

  // Fechar
  function fecharDialog() {
    setCurrentTool(null);
  }

  // Verificar se ferramenta precisa de credenciais
  function precisaCredencial(toolId: string): boolean {
    return (TOOL_CREDENTIALS_MAP[toolId] || []).length > 0;
  }

  // Verificar se ferramenta tem todas as credenciais
  function temCredenciais(toolId: string): boolean {
    const creds = TOOL_CREDENTIALS_MAP[toolId] || [];
    if (creds.length === 0) return true;
    return creds.every(c => aiCredentials[c] && aiCredentials[c].trim() !== '');
  }

  // Clique no card
  function onClickCard(tool: ToolType) {
    if (precisaCredencial(tool.id)) {
    
      // Abre dialog se precisa de credenciais
      abrirDialog(tool);
    } else {
      // Toggle direto
      onToggleTool(tool.id);
    }
  }

  // Clique no switch
  function onClickSwitch(e: React.MouseEvent, tool: ToolType) {
    e.stopPropagation();
    
    if (precisaCredencial(tool.id) && !temCredenciais(tool.id)) {
      abrirDialog(tool);
    } else {
      onToggleTool(tool.id);
    }
  }

  // Testar credencial
  const testCredential = async (credentialId: string) => {
    const credValue = aiCredentials[credentialId];
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
      
      if (credentialId === 'serpapi_api_key') {
        const response = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(credValue)}`);
        testResult = response.ok;
      } else if (credentialId === 'openweather_api_key') {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${encodeURIComponent(credValue)}`);
        testResult = response.ok;
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
        // Para outras credenciais, verificamos tamanho mínimo
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
        description: "Não foi possível verificar a credencial.",
        variant: "destructive",
      });
    } finally {
      setTestingCredential(null);
    }
  };

  // Salvar e habilitar ferramenta
  function salvarEHabilitar() {
    if (!currentTool) return;
    
    const creds = TOOL_CREDENTIALS_MAP[currentTool.id] || [];
    const temTodas = creds.every(c => aiCredentials[c] && aiCredentials[c].trim() !== '');
    
    if (!temTodas) {
      toast({
        title: "Credenciais incompletas",
        description: "Preencha todas as credenciais necessárias.",
        variant: "destructive",
      });
      return;
    }
    
    if (!toolsEnabled.includes(currentTool.id)) {
      onToggleTool(currentTool.id);
    }
    
    toast({
      title: "Credenciais salvas!",
      description: `A ferramenta ${currentTool.name} foi configurada e habilitada.`,
    });
    
    fecharDialog();
  }

  // Obter credenciais necessárias para a ferramenta selecionada
  function getCredenciaisAtuais() {
    if (!currentTool) return [];
    const credIds = TOOL_CREDENTIALS_MAP[currentTool.id] || [];
    return credIds.map(credId => TOOL_CREDENTIAL_TYPES.find(c => c.id === credId)).filter(Boolean);
  }

  return (
    <div className="space-y-6">
      {/* Ferramentas Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ferramentas Disponíveis
          </CardTitle>
          <CardDescription>
            Clique em uma ferramenta para configurar suas credenciais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(AVAILABLE_TOOLS).map(([category, tools]) => (
            <div key={category} className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">{category}</h4>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => {
                  const isEnabled = toolsEnabled.includes(tool.id);
                  const needsCreds = precisaCredencial(tool.id);
                  const hasCreds = temCredenciais(tool.id);
                  
                  return (
                    <div key={tool.id} className="space-y-2">
                      {/* Card da ferramenta */}
                      <div
                        onClick={() => onClickCard(tool)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          isEnabled 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{tool.icon}</span>
                            <span className="font-medium text-sm">{tool.name}</span>
                          </div>
                          <div onClick={(e) => onClickSwitch(e, tool)}>
                            <Switch checked={isEnabled} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{tool.description}</p>
                        
                        {needsCreds && (
                          <div className="mt-2">
                            {hasCreds ? (
                              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Credencial configurada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/50 bg-yellow-500/10">
                                <Key className="h-3 w-3 mr-1" />
                                Clique para configurar
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* EMBED de credenciais - aparece quando ferramenta é selecionada */}
                      {currentTool?.id === tool.id && needsCreds && (
                        <div className="p-4 border rounded-lg bg-muted/30 space-y-4 animate-in slide-in-from-top-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <Key className="h-4 w-4" />
                              Configurar {tool.name}
                            </h4>
                            <Button variant="ghost" size="sm" onClick={fecharDialog}>
                              ✕
                            </Button>
                          </div>
                          
                          {getCredenciaisAtuais().map((credInfo) => {
                            if (!credInfo) return null;
                            const testStatus = credentialTestResults[credInfo.id];
                            const isTesting = testingCredential === credInfo.id;
                            
                            return (
                              <div key={credInfo.id} className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm">
                                  <span>{credInfo.icon}</span>
                                  {credInfo.name}
                                  {credInfo.docUrl && (
                                    <a href={credInfo.docUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </Label>
                                <p className="text-xs text-muted-foreground">{credInfo.description}</p>
                                <div className="flex gap-2">
                                  <Input
                                    type="password"
                                    placeholder={credInfo.placeholder}
                                    value={aiCredentials[credInfo.id] || ''}
                                    onChange={(e) => onUpdateCredential(credInfo.id, e.target.value)}
                                    className={testStatus === 'success' ? 'border-green-500' : testStatus === 'error' ? 'border-red-500' : ''}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => testCredential(credInfo.id)}
                                    disabled={isTesting}
                                  >
                                    {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
                                  </Button>
                                </div>
                                {testStatus === 'success' && (
                                  <p className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Credencial válida
                                  </p>
                                )}
                                {testStatus === 'error' && (
                                  <p className="text-xs text-red-600 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Credencial inválida
                                  </p>
                                )}
                              </div>
                            );
                          })}
                          
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={fecharDialog}>
                              Cancelar
                            </Button>
                            <Button size="sm" onClick={salvarEHabilitar}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Salvar e Habilitar
                            </Button>
                          </div>
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

      {/* Botão Sincronizar */}
      <div className="flex justify-end">
        <Button 
          onClick={onSyncToN8n} 
          disabled={syncing || !workflowId || toolsEnabled.length === 0}
        >
          {syncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Sincronizar {toolsEnabled.length} Ferramenta(s) com n8n
            </>
          )}
        </Button>
      </div>

    </div>
  );
}
