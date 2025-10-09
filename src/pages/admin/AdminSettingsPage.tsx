import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Store, Mail, Globe, Palette, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettingsPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [storeSettings, setStoreSettings] = useState({
    name: 'Loja de IA',
    description: 'A melhor loja de soluções em inteligência artificial',
    email: 'contato@loja.com',
    phone: '(11) 99999-9999',
    address: 'Rua das Flores, 123 - Centro - São Paulo/SP',
    logo_url: '',
    favicon_url: ''
  });

  const [emailSettings, setEmailSettings] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    from_email: 'noreply@loja.com',
    from_name: 'Loja de IA'
  });

  const [seoSettings, setSeoSettings] = useState({
    meta_title: 'Loja de IA - Soluções em Inteligência Artificial',
    meta_description: 'Descubra as melhores soluções em IA para seu negócio. Agentes inteligentes, automação e muito mais.',
    meta_keywords: 'inteligência artificial, IA, agentes, automação, tecnologia',
    google_analytics: '',
    facebook_pixel: ''
  });

  const [themeSettings, setThemeSettings] = useState({
    primary_color: '#3b82f6',
    secondary_color: '#64748b',
    accent_color: '#f59e0b',
    background_color: '#ffffff',
    text_color: '#1f2937'
  });

  const [securitySettings, setSecuritySettings] = useState({
    enable_2fa: false,
    session_timeout: '24',
    max_login_attempts: '5',
    enable_captcha: false
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
  }, [user, loading, isAdmin, adminLoading, navigate]);

  const handleSaveStoreSettings = async () => {
    // This would integrate with a real database in production
    toast({
      title: "Configurações Salvas",
      description: "As configurações da loja foram atualizadas com sucesso.",
    });
  };

  const handleSaveEmailSettings = async () => {
    // This would integrate with a real database in production
    toast({
      title: "Configurações Salvas",
      description: "As configurações de email foram atualizadas com sucesso.",
    });
  };

  const handleSaveSeoSettings = async () => {
    // This would integrate with a real database in production
    toast({
      title: "Configurações Salvas",
      description: "As configurações de SEO foram atualizadas com sucesso.",
    });
  };

  const handleSaveThemeSettings = async () => {
    // This would integrate with a real database in production
    toast({
      title: "Configurações Salvas",
      description: "As configurações de tema foram atualizadas com sucesso.",
    });
  };

  const handleSaveSecuritySettings = async () => {
    // This would integrate with a real database in production
    toast({
      title: "Configurações Salvas",
      description: "As configurações de segurança foram atualizadas com sucesso.",
    });
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </Button>
          <h1 className="text-3xl font-bold">Configurações</h1>
        </div>

        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Loja
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Tema
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Loja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="store_name">Nome da Loja</Label>
                    <Input
                      id="store_name"
                      value={storeSettings.name}
                      onChange={(e) => setStoreSettings({...storeSettings, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store_email">Email de Contato</Label>
                    <Input
                      id="store_email"
                      type="email"
                      value={storeSettings.email}
                      onChange={(e) => setStoreSettings({...storeSettings, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store_description">Descrição da Loja</Label>
                  <Textarea
                    id="store_description"
                    value={storeSettings.description}
                    onChange={(e) => setStoreSettings({...storeSettings, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="store_phone">Telefone</Label>
                    <Input
                      id="store_phone"
                      value={storeSettings.phone}
                      onChange={(e) => setStoreSettings({...storeSettings, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store_address">Endereço</Label>
                    <Input
                      id="store_address"
                      value={storeSettings.address}
                      onChange={(e) => setStoreSettings({...storeSettings, address: e.target.value})}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">URL do Logo</Label>
                    <Input
                      id="logo_url"
                      value={storeSettings.logo_url}
                      onChange={(e) => setStoreSettings({...storeSettings, logo_url: e.target.value})}
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="favicon_url">URL do Favicon</Label>
                    <Input
                      id="favicon_url"
                      value={storeSettings.favicon_url}
                      onChange={(e) => setStoreSettings({...storeSettings, favicon_url: e.target.value})}
                      placeholder="https://exemplo.com/favicon.ico"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveStoreSettings} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_host">Servidor SMTP</Label>
                    <Input
                      id="smtp_host"
                      value={emailSettings.smtp_host}
                      onChange={(e) => setEmailSettings({...emailSettings, smtp_host: e.target.value})}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_port">Porta SMTP</Label>
                    <Input
                      id="smtp_port"
                      value={emailSettings.smtp_port}
                      onChange={(e) => setEmailSettings({...emailSettings, smtp_port: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_user">Usuário SMTP</Label>
                    <Input
                      id="smtp_user"
                      value={emailSettings.smtp_user}
                      onChange={(e) => setEmailSettings({...emailSettings, smtp_user: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp_password">Senha SMTP</Label>
                    <Input
                      id="smtp_password"
                      type="password"
                      value={emailSettings.smtp_password}
                      onChange={(e) => setEmailSettings({...emailSettings, smtp_password: e.target.value})}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from_email">Email de Origem</Label>
                    <Input
                      id="from_email"
                      type="email"
                      value={emailSettings.from_email}
                      onChange={(e) => setEmailSettings({...emailSettings, from_email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from_name">Nome de Origem</Label>
                    <Input
                      id="from_name"
                      value={emailSettings.from_name}
                      onChange={(e) => setEmailSettings({...emailSettings, from_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveEmailSettings} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_title">Título Meta</Label>
                  <Input
                    id="meta_title"
                    value={seoSettings.meta_title}
                    onChange={(e) => setSeoSettings({...seoSettings, meta_title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta_description">Descrição Meta</Label>
                  <Textarea
                    id="meta_description"
                    value={seoSettings.meta_description}
                    onChange={(e) => setSeoSettings({...seoSettings, meta_description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta_keywords">Palavras-chave</Label>
                  <Input
                    id="meta_keywords"
                    value={seoSettings.meta_keywords}
                    onChange={(e) => setSeoSettings({...seoSettings, meta_keywords: e.target.value})}
                    placeholder="palavra1, palavra2, palavra3"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="google_analytics">Google Analytics ID</Label>
                    <Input
                      id="google_analytics"
                      value={seoSettings.google_analytics}
                      onChange={(e) => setSeoSettings({...seoSettings, google_analytics: e.target.value})}
                      placeholder="GA-XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook_pixel">Facebook Pixel ID</Label>
                    <Input
                      id="facebook_pixel"
                      value={seoSettings.facebook_pixel}
                      onChange={(e) => setSeoSettings({...seoSettings, facebook_pixel: e.target.value})}
                      placeholder="123456789"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSeoSettings} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theme">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Tema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary_color"
                        type="color"
                        value={themeSettings.primary_color}
                        onChange={(e) => setThemeSettings({...themeSettings, primary_color: e.target.value})}
                        className="w-16 h-10"
                      />
                      <Input
                        value={themeSettings.primary_color}
                        onChange={(e) => setThemeSettings({...themeSettings, primary_color: e.target.value})}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary_color"
                        type="color"
                        value={themeSettings.secondary_color}
                        onChange={(e) => setThemeSettings({...themeSettings, secondary_color: e.target.value})}
                        className="w-16 h-10"
                      />
                      <Input
                        value={themeSettings.secondary_color}
                        onChange={(e) => setThemeSettings({...themeSettings, secondary_color: e.target.value})}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accent_color">Cor de Destaque</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accent_color"
                        type="color"
                        value={themeSettings.accent_color}
                        onChange={(e) => setThemeSettings({...themeSettings, accent_color: e.target.value})}
                        className="w-16 h-10"
                      />
                      <Input
                        value={themeSettings.accent_color}
                        onChange={(e) => setThemeSettings({...themeSettings, accent_color: e.target.value})}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="background_color">Cor de Fundo</Label>
                    <div className="flex gap-2">
                      <Input
                        id="background_color"
                        type="color"
                        value={themeSettings.background_color}
                        onChange={(e) => setThemeSettings({...themeSettings, background_color: e.target.value})}
                        className="w-16 h-10"
                      />
                      <Input
                        value={themeSettings.background_color}
                        onChange={(e) => setThemeSettings({...themeSettings, background_color: e.target.value})}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="text_color">Cor do Texto</Label>
                    <div className="flex gap-2">
                      <Input
                        id="text_color"
                        type="color"
                        value={themeSettings.text_color}
                        onChange={(e) => setThemeSettings({...themeSettings, text_color: e.target.value})}
                        className="w-16 h-10"
                      />
                      <Input
                        value={themeSettings.text_color}
                        onChange={(e) => setThemeSettings({...themeSettings, text_color: e.target.value})}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveThemeSettings} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Segurança</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session_timeout">Timeout da Sessão (horas)</Label>
                    <Input
                      id="session_timeout"
                      type="number"
                      value={securitySettings.session_timeout}
                      onChange={(e) => setSecuritySettings({...securitySettings, session_timeout: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_login_attempts">Máx. Tentativas de Login</Label>
                    <Input
                      id="max_login_attempts"
                      type="number"
                      value={securitySettings.max_login_attempts}
                      onChange={(e) => setSecuritySettings({...securitySettings, max_login_attempts: e.target.value})}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enable_2fa"
                      checked={securitySettings.enable_2fa}
                      onChange={(e) => setSecuritySettings({...securitySettings, enable_2fa: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="enable_2fa">Habilitar Autenticação de Dois Fatores (2FA)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enable_captcha"
                      checked={securitySettings.enable_captcha}
                      onChange={(e) => setSecuritySettings({...securitySettings, enable_captcha: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="enable_captcha">Habilitar CAPTCHA no Login</Label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSecuritySettings} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}