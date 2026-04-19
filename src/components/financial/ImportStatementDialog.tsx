import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Upload, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  customerProductId: string;
  onImported?: () => void;
}

export function ImportStatementDialog({ customerProductId, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number; imported: number } | null>(null);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const content = await file.text();
      const ext = file.name.toLowerCase().split('.').pop();
      const format = ext === 'ofx' ? 'ofx' : 'csv';

      const { data, error } = await supabase.functions.invoke('financial-import-statement', {
        body: {
          customer_product_id: customerProductId,
          format,
          file_name: file.name,
          content,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha na importação');

      setResult({ total: data.total, imported: data.imported });
      toast({
        title: 'Importação concluída',
        description: `${data.imported} de ${data.total} transações importadas e categorizadas pela IA.`,
      });
      onImported?.();
    } catch (e: any) {
      toast({ title: 'Erro na importação', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFile(null); setResult(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" /> Importar OFX/CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Extrato Bancário</DialogTitle>
          <DialogDescription>
            Envie um arquivo OFX (Open Financial Exchange) ou CSV exportado do seu banco. A IA classificará automaticamente as transações por categoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 border-dashed border-2 bg-muted/20">
            <Label htmlFor="statement-file" className="flex flex-col items-center gap-2 cursor-pointer text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm font-medium">{file ? file.name : 'Selecione um arquivo .ofx ou .csv'}</span>
              <span className="text-xs text-muted-foreground">Formatos suportados: OFX, CSV (Itaú, Bradesco, Nubank, etc.)</span>
              <Input
                id="statement-file"
                type="file"
                accept=".ofx,.csv,text/csv,application/x-ofx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Label>
          </Card>

          {result && (
            <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{result.imported} de {result.total} transações importadas com sucesso</span>
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</> : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
