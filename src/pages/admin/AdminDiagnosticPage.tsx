 import { useEffect, useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { 
   CheckCircle2, 
   XCircle, 
   Loader2, 
   Database, 
   User, 
   Globe, 
   Zap,
   RefreshCw,
   Activity
 } from 'lucide-react';
 import { Separator } from '@/components/ui/separator';
 
 interface DiagnosticResult {
   name: string;
   status: 'success' | 'error' | 'loading';
   message: string;
   details?: string;
 }
 
 export default function AdminDiagnosticPage() {
   const { user } = useAuth();
   const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
   const [isRunning, setIsRunning] = useState(false);
 
   const runDiagnostics = async () => {
     setIsRunning(true);
     const results: DiagnosticResult[] = [];
 
     // 1. Check Supabase URL Configuration
     try {
       const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
       results.push({
         name: 'URL do Supabase',
         status: supabaseUrl ? 'success' : 'error',
         message: supabaseUrl ? `Configurada: ${supabaseUrl}` : 'URL não configurada',
         details: supabaseUrl || 'Variável VITE_SUPABASE_URL não encontrada'
       });
     } catch (error) {
       results.push({
         name: 'URL do Supabase',
         status: 'error',
         message: 'Erro ao verificar URL',
         details: error instanceof Error ? error.message : 'Erro desconhecido'
       });
     }
 
     // 2. Check Authentication
     try {
       const { data: { session }, error } = await supabase.auth.getSession();
       if (error) throw error;
       
       results.push({
         name: 'Autenticação',
         status: session ? 'success' : 'error',
         message: session ? `Usuário autenticado: ${session.user.email}` : 'Nenhum usuário autenticado',
         details: session ? `User ID: ${session.user.id}` : 'Faça login para testar'
       });
     } catch (error) {
       results.push({
         name: 'Autenticação',
         status: 'error',
         message: 'Erro ao verificar autenticação',
         details: error instanceof Error ? error.message : 'Erro desconhecido'
       });
     }
 
     // 3. Database Ping Test
     try {
       const { data, error } = await supabase
         .from('profiles')
         .select('count')
         .limit(1);
       
       if (error) throw error;
       
       results.push({
         name: 'Conexão com Database',
         status: 'success',
         message: 'Database respondendo normalmente',
         details: 'Query executada com sucesso'
       });
     } catch (error) {
       results.push({
         name: 'Conexão com Database',
         status: 'error',
         message: 'Erro ao conectar com database',
         details: error instanceof Error ? error.message : 'Erro desconhecido'
       });
     }
 
     // 4. Check Customer Products Table
     try {
       const { data, error } = await (supabase as any)
         .from('customer_products')
         .select('count')
         .limit(1);
       
       if (error) throw error;
       
       results.push({
         name: 'Tabela de Produtos do Cliente',
         status: 'success',
         message: 'Tabela customer_products acessível',
         details: 'RLS funcionando corretamente'
       });
     } catch (error) {
       results.push({
         name: 'Tabela de Produtos do Cliente',
         status: 'error',
         message: 'Erro ao acessar customer_products',
         details: error instanceof Error ? error.message : 'Tabela pode não existir'
       });
     }
 
     // 5. Check Financial Agent Config
     try {
       const { data, error } = await (supabase as any)
         .from('financial_agent_config')
         .select('count')
         .limit(1);
       
       if (error) throw error;
       
       results.push({
         name: 'Agente Financeiro - Config',
         status: 'success',
         message: 'Configuração do Agente Financeiro acessível',
         details: 'Tabela financial_agent_config disponível'
       });
     } catch (error) {
       results.push({
         name: 'Agente Financeiro - Config',
         status: 'error',
         message: 'Erro ao acessar financial_agent_config',
         details: error instanceof Error ? error.message : 'Tabela pode não existir'
       });
     }
 
     // 6. Check CRM Config
     try {
       const { data, error } = await (supabase as any)
         .from('crm_config')
         .select('count')
         .limit(1);
       
       if (error) throw error;
       
       results.push({
         name: 'CRM - Config',
         status: 'success',
         message: 'Configuração do CRM acessível',
         details: 'Tabela crm_config disponível'
       });
     } catch (error) {
       results.push({
         name: 'CRM - Config',
         status: 'error',
         message: 'Erro ao acessar crm_config',
         details: error instanceof Error ? error.message : 'Tabela pode não existir'
       });
     }
 
     // 7. Check Sales Assistant Config
     try {
       const { data, error } = await (supabase as any)
         .from('sales_assistant_config')
         .select('count')
         .limit(1);
       
       if (error) throw error;
       
       results.push({
         name: 'Assistente de Vendas - Config',
         status: 'success',
         message: 'Configuração do Assistente de Vendas acessível',
         details: 'Tabela sales_assistant_config disponível'
       });
     } catch (error) {
       results.push({
         name: 'Assistente de Vendas - Config',
         status: 'error',
         message: 'Erro ao acessar sales_assistant_config',
         details: error instanceof Error ? error.message : 'Tabela pode não existir'
       });
     }
 
     // 8. Check Edge Functions
     try {
       const { data, error } = await supabase.functions.invoke('n8n-api', {
         method: 'GET',
         body: { test: true }
       });
       
       results.push({
         name: 'Edge Functions (n8n-api)',
         status: error ? 'error' : 'success',
         message: error ? 'Edge function não respondeu' : 'Edge function acessível',
         details: error ? 'Função pode não estar deployada' : 'Função n8n-api disponível'
       });
     } catch (error) {
       results.push({
         name: 'Edge Functions (n8n-api)',
         status: 'error',
         message: 'Erro ao testar edge function',
         details: error instanceof Error ? error.message : 'Erro desconhecido'
       });
     }
 
     setDiagnostics(results);
     setIsRunning(false);
   };
 
   useEffect(() => {
     runDiagnostics();
   }, []);
 
   const getStatusIcon = (status: DiagnosticResult['status']) => {
     switch (status) {
       case 'success':
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
       case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
       case 'loading':
         return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />;
     }
   };
 
   const getStatusBadge = (status: DiagnosticResult['status']) => {
     switch (status) {
       case 'success':
        return <Badge variant="default">OK</Badge>;
       case 'error':
         return <Badge variant="destructive">Erro</Badge>;
       case 'loading':
         return <Badge variant="secondary">Carregando...</Badge>;
     }
   };
 
   const successCount = diagnostics.filter(d => d.status === 'success').length;
   const errorCount = diagnostics.filter(d => d.status === 'error').length;
   const totalCount = diagnostics.length;
 
   return (
     <div className="container mx-auto py-8 px-4 max-w-6xl">
       {/* Header */}
       <div className="mb-8">
         <div className="flex items-center justify-between mb-2">
           <h1 className="text-3xl font-bold flex items-center gap-2">
             <Activity className="h-8 w-8 text-primary" />
             Diagnóstico do Sistema
           </h1>
           <Button 
             onClick={runDiagnostics} 
             disabled={isRunning}
             variant="outline"
             className="gap-2"
           >
             {isRunning ? (
               <Loader2 className="h-4 w-4 animate-spin" />
             ) : (
               <RefreshCw className="h-4 w-4" />
             )}
             Executar Novamente
           </Button>
         </div>
         <p className="text-muted-foreground">
           Verificação do status da conexão com Supabase e sistemas integrados
         </p>
       </div>
 
       {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
         <Card>
           <CardHeader className="pb-3">
             <CardTitle className="text-sm font-medium">Total de Testes</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{totalCount}</div>
           </CardContent>
         </Card>
         
         <Card>
           <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sucessos</CardTitle>
           </CardHeader>
           <CardContent>
            <div className="text-2xl font-bold text-primary">{successCount}</div>
           </CardContent>
         </Card>
         
         <Card>
           <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
           </CardHeader>
           <CardContent>
            <div className="text-2xl font-bold text-destructive">{errorCount}</div>
           </CardContent>
         </Card>
       </div>
 
       {/* Diagnostic Results */}
       <Card>
         <CardHeader>
           <CardTitle>Resultados dos Testes</CardTitle>
           <CardDescription>
             Status detalhado de cada componente do sistema
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           {diagnostics.length === 0 ? (
             <div className="flex items-center justify-center py-8 text-muted-foreground">
               <Loader2 className="h-6 w-6 animate-spin mr-2" />
               Executando diagnósticos...
             </div>
           ) : (
             diagnostics.map((diagnostic, index) => (
               <div key={index}>
                 <div className="flex items-start gap-3">
                   <div className="mt-0.5">{getStatusIcon(diagnostic.status)}</div>
                   <div className="flex-1 space-y-1">
                     <div className="flex items-center justify-between">
                       <h3 className="font-semibold">{diagnostic.name}</h3>
                       {getStatusBadge(diagnostic.status)}
                     </div>
                     <p className="text-sm text-muted-foreground">{diagnostic.message}</p>
                     {diagnostic.details && (
                       <p className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                         {diagnostic.details}
                       </p>
                     )}
                   </div>
                 </div>
                 {index < diagnostics.length - 1 && <Separator className="mt-4" />}
               </div>
             ))
           )}
         </CardContent>
       </Card>
 
       {/* Info Card */}
       <Card className="mt-6">
         <CardHeader>
           <CardTitle className="text-sm">Informações Adicionais</CardTitle>
         </CardHeader>
         <CardContent className="space-y-2 text-sm">
           <div className="flex items-center gap-2">
             <Globe className="h-4 w-4 text-muted-foreground" />
             <span className="font-medium">Ambiente:</span>
             <code className="text-xs bg-muted px-2 py-1 rounded">{import.meta.env.MODE}</code>
           </div>
           <div className="flex items-center gap-2">
             <User className="h-4 w-4 text-muted-foreground" />
             <span className="font-medium">Usuário atual:</span>
             <span className="text-muted-foreground">{user?.email || 'Não autenticado'}</span>
           </div>
           <div className="flex items-center gap-2">
             <Database className="h-4 w-4 text-muted-foreground" />
             <span className="font-medium">URL Supabase:</span>
             <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
               {import.meta.env.VITE_SUPABASE_URL || 'Não configurada'}
             </code>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }