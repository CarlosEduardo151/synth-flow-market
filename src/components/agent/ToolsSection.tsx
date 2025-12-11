import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import {
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  TestTube2,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface ToolsSectionProps {
  toolsEnabled: string[];
  aiCredentials: Record<string, string>;
  onToggleTool: (toolId: string) => void;
  onUpdateCredential: (credId: string, value: string) => void;
  onSyncToN8n: () => void;
  syncing: boolean;
  workflowId?: string | null;
}

// Credenciais
const CREDENTIALS = {
  serpapi_api_key: { name: 'SerpAPI Key', icon: '🔎', placeholder: 'Sua chave SerpAPI' },
  wolfram_alpha_app_id: { name: 'Wolfram Alpha App ID', icon: '🔢', placeholder: 'App ID' },
  gmail_credentials: { name: 'Gmail OAuth', icon: '📧', placeholder: 'JSON de credenciais OAuth' },
  google_sheets_credentials: { name: 'Google Sheets OAuth', icon: '📊', placeholder: 'JSON de credenciais OAuth' },
  google_calendar_credentials: { name: 'Google Calendar OAuth', icon: '📅', placeholder: 'JSON de credenciais OAuth' },
  notion_api_key: { name: 'Notion API Key', icon: '📝', placeholder: 'secret_...' },
  slack_bot_token: { name: 'Slack Bot Token', icon: '💬', placeholder: 'xoxb-...' },
  discord_bot_token: { name: 'Discord Bot Token', icon: '🎮', placeholder: 'Token do bot' },
  telegram_bot_token: { name: 'Telegram Bot Token', icon: '📱', placeholder: 'Token do @BotFather' },
  whatsapp_api_token: { name: 'WhatsApp Business API', icon: '📲', placeholder: 'Token da API' },
  airtable_api_key: { name: 'Airtable API Key', icon: '📋', placeholder: 'pat...' },
  github_token: { name: 'GitHub Token', icon: '🐙', placeholder: 'ghp_...' },
  hubspot_api_key: { name: 'HubSpot API Key', icon: '🧲', placeholder: 'pat-...' },
  stripe_api_key: { name: 'Stripe API Key', icon: '💳', placeholder: 'sk_live_... ou sk_test_...' },
  openweather_api_key: { name: 'OpenWeather API Key', icon: '🌤️', placeholder: 'Sua chave API' },
};

// Ferramentas e suas credenciais
const TOOLS: Record<string, { name: string; icon: string; description: string; credentialId?: string }> = {
  serpApiTool: { name: 'SerpAPI', icon: '🔎', description: 'Busca no Google', credentialId: 'serpapi_api_key' },
  wolframAlphaTool: { name: 'Wolfram Alpha', icon: '🔢', description: 'Cálculos científicos', credentialId: 'wolfram_alpha_app_id' },
  wikipediaTool: { name: 'Wikipedia', icon: '📚', description: 'Consulta Wikipedia' },
  gmailTool: { name: 'Gmail', icon: '📧', description: 'Enviar/ler emails', credentialId: 'gmail_credentials' },
  slackTool: { name: 'Slack', icon: '💬', description: 'Mensagens no Slack', credentialId: 'slack_bot_token' },
  discordTool: { name: 'Discord', icon: '🎮', description: 'Mensagens no Discord', credentialId: 'discord_bot_token' },
  telegramTool: { name: 'Telegram', icon: '📱', description: 'Bot Telegram', credentialId: 'telegram_bot_token' },
  whatsappTool: { name: 'WhatsApp', icon: '📲', description: 'Mensagens WhatsApp', credentialId: 'whatsapp_api_token' },
  googleSheetsTool: { name: 'Google Sheets', icon: '📊', description: 'Ler/escrever planilhas', credentialId: 'google_sheets_credentials' },
  airtableTool: { name: 'Airtable', icon: '📋', description: 'Bases de dados Airtable', credentialId: 'airtable_api_key' },
  notionTool: { name: 'Notion', icon: '📝', description: 'Páginas e databases', credentialId: 'notion_api_key' },
  githubTool: { name: 'GitHub', icon: '🐙', description: 'Integração GitHub', credentialId: 'github_token' },
  hubspotTool: { name: 'HubSpot', icon: '🧲', description: 'CRM e marketing', credentialId: 'hubspot_api_key' },
  stripeTool: { name: 'Stripe', icon: '💳', description: 'Pagamentos', credentialId: 'stripe_api_key' },
  calculatorTool: { name: 'Calculadora', icon: '🧮', description: 'Cálculos matemáticos' },
  httpRequestTool: { name: 'HTTP Request', icon: '🌐', description: 'Requisições HTTP' },
  codeTool: { name: 'Código', icon: '💻', description: 'Executar código JS' },
};

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
  const [openTools, setOpenTools] = useState<string[]>([]);
  const [testingCredential, setTestingCredential] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error'>>({});

  const toggleOpen = (toolId: string) => {
    setOpenTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId) 
        : [...prev, toolId]
    );
  };

  const testCredential = async (credId: string) => {
    const value = aiCredentials[credId];
    if (!value?.trim()) {
      toast({ title: "Preencha a credencial primeiro", variant: "destructive" });
      return;
    }

    setTestingCredential(credId);
    
    try {
      let success = false;
      
      if (credId === 'serpapi_api_key') {
        const res = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(value)}`);
        success = res.ok;
      } else if (credId === 'github_token') {
        const res = await fetch('https://api.github.com/user', { headers: { 'Authorization': `Bearer ${value}` } });
        success = res.ok;
      } else if (credId === 'notion_api_key') {
        const res = await fetch('https://api.notion.com/v1/users/me', { 
          headers: { 'Authorization': `Bearer ${value}`, 'Notion-Version': '2022-06-28' }
        });
        success = res.ok;
      } else {
        success = value.length >= 10;
      }

      setTestResults(prev => ({ ...prev, [credId]: success ? 'success' : 'error' }));
      toast({ 
        title: success ? "Credencial válida!" : "Credencial inválida",
        variant: success ? "default" : "destructive"
      });
    } catch {
      setTestResults(prev => ({ ...prev, [credId]: 'error' }));
      toast({ title: "Erro ao testar", variant: "destructive" });
    } finally {
      setTestingCredential(null);
    }
  };

  const handleEnableTool = (toolId: string) => {
    const tool = TOOLS[toolId];
    if (!tool) return;
    
    // Se não precisa de credencial, toggle direto
    if (!tool.credentialId) {
      onToggleTool(toolId);
      return;
    }
    
    // Se já está habilitado, desabilita
    if (toolsEnabled.includes(toolId)) {
      onToggleTool(toolId);
      return;
    }
    
    // Se precisa de credencial e não tem, abre o collapse
    const hasCredential = aiCredentials[tool.credentialId]?.trim();
    if (!hasCredential) {
      if (!openTools.includes(toolId)) {
        toggleOpen(toolId);
      }
      toast({ title: "Configure a credencial primeiro", description: "Preencha a credencial abaixo para habilitar." });
      return;
    }
    
    // Tem credencial, toggle
    onToggleTool(toolId);
  };

  const saveAndEnable = (toolId: string) => {
    const tool = TOOLS[toolId];
    if (!tool?.credentialId) return;
    
    const hasCredential = aiCredentials[tool.credentialId]?.trim();
    if (!hasCredential) {
      toast({ title: "Preencha a credencial", variant: "destructive" });
      return;
    }
    
    if (!toolsEnabled.includes(toolId)) {
      onToggleTool(toolId);
    }
    
    toggleOpen(toolId);
    toast({ title: "Ferramenta habilitada!", description: `${tool.name} foi configurada com sucesso.` });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ferramentas Disponíveis
          </CardTitle>
          <CardDescription>
            Configure as credenciais e habilite as ferramentas que o agente pode usar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(TOOLS).map(([toolId, tool]) => {
            const isEnabled = toolsEnabled.includes(toolId);
            const isOpen = openTools.includes(toolId);
            const credential = tool.credentialId ? CREDENTIALS[tool.credentialId as keyof typeof CREDENTIALS] : null;
            const hasCredential = tool.credentialId ? !!aiCredentials[tool.credentialId]?.trim() : true;
            const testResult = tool.credentialId ? testResults[tool.credentialId] : null;

            return (
              <Collapsible key={toolId} open={isOpen} onOpenChange={() => credential && toggleOpen(toolId)}>
                <div className={`border rounded-lg transition-colors ${isEnabled ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  {/* Header da ferramenta */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 flex-1">
                      {credential ? (
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-2 hover:text-primary transition-colors">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="text-xl">{tool.icon}</span>
                            <span className="font-medium">{tool.name}</span>
                          </button>
                        </CollapsibleTrigger>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-4" />
                          <span className="text-xl">{tool.icon}</span>
                          <span className="font-medium">{tool.name}</span>
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground hidden sm:inline">{tool.description}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {credential && (
                        hasCredential ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Configurado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/50 bg-yellow-500/10">
                            <Key className="h-3 w-3 mr-1" />
                            Requer API Key
                          </Badge>
                        )
                      )}
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => handleEnableTool(toolId)}
                      />
                    </div>
                  </div>

                  {/* Formulário de credencial */}
                  {credential && (
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t">
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-3">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <span>{credential.icon}</span>
                            {credential.name}
                          </Label>
                          
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              placeholder={credential.placeholder}
                              value={aiCredentials[tool.credentialId!] || ''}
                              onChange={(e) => onUpdateCredential(tool.credentialId!, e.target.value)}
                              className={`flex-1 ${testResult === 'success' ? 'border-green-500' : testResult === 'error' ? 'border-red-500' : ''}`}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testCredential(tool.credentialId!)}
                              disabled={testingCredential === tool.credentialId}
                            >
                              {testingCredential === tool.credentialId ? (
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

                          <Button size="sm" onClick={() => saveAndEnable(toolId)} className="w-full">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Salvar e Habilitar
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  )}
                </div>
              </Collapsible>
            );
          })}
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
