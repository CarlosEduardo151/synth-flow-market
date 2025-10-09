import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Key, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Credential {
  id: string;
  credential_type: string;
  credential_name: string;
  credential_value: string | null;
  n8n_doc_url: string | null;
  is_system_generated: boolean;
  is_active: boolean;
}

interface RequiredCredential {
  id: string;
  credential_type: string;
  credential_name: string;
  description: string | null;
  n8n_doc_url: string | null;
  is_required: boolean;
}

interface ProductCredentialsProps {
  customerProductId: string;
  productSlug: string;
  isRental: boolean;
}

export function ProductCredentials({ customerProductId, productSlug, isRental }: ProductCredentialsProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [requiredCredentials, setRequiredCredentials] = useState<RequiredCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCredentials();
    fetchRequiredCredentials();
  }, [customerProductId, productSlug]);

  const fetchCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('product_credentials')
        .select('*')
        .eq('customer_product_id', customerProductId);

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  };

  const fetchRequiredCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('product_required_credentials')
        .select('*')
        .eq('product_slug', productSlug);

      if (error) throw error;
      setRequiredCredentials(data || []);
    } catch (error) {
      console.error('Error fetching required credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredential = async (credentialId: string, value: string) => {
    setSaving(credentialId);
    try {
      const { error } = await supabase
        .from('product_credentials')
        .update({ credential_value: value })
        .eq('id', credentialId);

      if (error) throw error;

      toast({
        title: "Credencial salva!",
        description: "A credencial foi atualizada com sucesso.",
      });

      fetchCredentials();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isRental && credentials.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          <CardTitle>Credenciais do Produto</CardTitle>
        </div>
        <CardDescription>
          {isRental 
            ? "Configure as credenciais necessárias para usar este produto"
            : "Visualize as credenciais geradas automaticamente"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {requiredCredentials.map((required) => {
          const credential = credentials.find(c => c.credential_type === required.credential_type);
          
          return (
            <div key={required.id} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="text-base font-semibold">
                      {required.credential_name}
                    </Label>
                    {required.is_required && (
                      <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                    )}
                  </div>
                  {required.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {required.description}
                    </p>
                  )}
                </div>
                {required.n8n_doc_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={required.n8n_doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-xs">Documentação</span>
                    </a>
                  </Button>
                )}
              </div>

              {credential ? (
                <div className="space-y-2">
                  {credential.is_system_generated && !isRental ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <AlertCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-300">
                        Credencial gerada automaticamente
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        defaultValue={credential.credential_value || ''}
                        placeholder={`Digite ${required.credential_name.toLowerCase()}`}
                        id={`credential-${credential.id}`}
                      />
                      <Button
                        onClick={() => {
                          const input = document.getElementById(`credential-${credential.id}`) as HTMLInputElement;
                          handleSaveCredential(credential.id, input.value);
                        }}
                        disabled={saving === credential.id}
                        size="sm"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving === credential.id ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    Credencial ainda não configurada
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {requiredCredentials.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma credencial necessária para este produto</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
