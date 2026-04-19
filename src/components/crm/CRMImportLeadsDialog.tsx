import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerProductId: string;
  onImported?: () => void;
}

const TARGET_FIELDS = [
  { key: "name", label: "Nome*" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefone" },
  { key: "company", label: "Empresa" },
  { key: "business_type", label: "Segmento" },
  { key: "status", label: "Status" },
  { key: "source", label: "Origem" },
  { key: "notes", label: "Observações" },
];

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";

  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function autoMap(header: string): string | null {
  const h = header.toLowerCase().trim();
  if (/(nome|name)/.test(h)) return "name";
  if (/(email|e-mail)/.test(h)) return "email";
  if (/(telefone|phone|celular|whatsapp)/.test(h)) return "phone";
  if (/(empresa|company|organiza)/.test(h)) return "company";
  if (/(segment|tipo|categoria|business)/.test(h)) return "business_type";
  if (/(status|situa)/.test(h)) return "status";
  if (/(origem|source|canal)/.test(h)) return "source";
  if (/(observ|notes|nota|coment)/.test(h)) return "notes";
  return null;
}

export function CRMImportLeadsDialog({ open, onOpenChange, customerProductId, onImported }: Props) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
  };

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const { headers, rows } = parseCSV(text);
      if (headers.length === 0) {
        toast.error("CSV vazio ou inválido");
        return;
      }
      if (rows.length > 5000) {
        toast.error("Máximo 5.000 linhas por importação");
        return;
      }
      setHeaders(headers);
      setRows(rows);
      const auto: Record<string, string> = {};
      headers.forEach((h) => {
        const m = autoMap(h);
        if (m) auto[m] = h;
      });
      setMapping(auto);
      setStep("map");
    };
    reader.readAsText(file, "utf-8");
  };

  const previewData = useMemo(() => {
    if (!mapping.name) return [];
    return rows.slice(0, 5).map((row) => {
      const obj: Record<string, string> = {};
      for (const [target, sourceHeader] of Object.entries(mapping)) {
        if (!sourceHeader) continue;
        const idx = headers.indexOf(sourceHeader);
        if (idx >= 0) obj[target] = row[idx] || "";
      }
      return obj;
    });
  }, [rows, mapping, headers]);

  const handleImport = async () => {
    if (!mapping.name) {
      toast.error("Mapeie pelo menos o campo Nome");
      return;
    }
    setImporting(true);
    let inserted = 0;
    let failed = 0;

    const batch: any[] = [];
    for (const row of rows) {
      const record: any = { customer_product_id: customerProductId };
      for (const [target, sourceHeader] of Object.entries(mapping)) {
        if (!sourceHeader) continue;
        const idx = headers.indexOf(sourceHeader);
        if (idx < 0) continue;
        const value = (row[idx] || "").trim();
        if (value) record[target] = value;
      }
      if (!record.name) {
        failed++;
        continue;
      }
      if (!record.status) record.status = "lead";
      batch.push(record);
    }

    // Insere em chunks de 200
    for (let i = 0; i < batch.length; i += 200) {
      const chunk = batch.slice(i, i + 200);
      const { error, count } = await (supabase as any)
        .from("crm_customers")
        .insert(chunk, { count: "exact" });
      if (error) {
        console.error(error);
        failed += chunk.length;
      } else {
        inserted += count || chunk.length;
      }
    }

    setResult({ inserted, failed });
    setStep("done");
    setImporting(false);
    onImported?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> Importar Leads em Massa
          </DialogTitle>
          <DialogDescription>
            Carregue um CSV (separador , ou ;), mapeie as colunas e revise antes de importar.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="border-2 border-dashed rounded-lg p-10 text-center space-y-3">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Selecione um arquivo CSV (máx 5MB / 5.000 linhas)
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block mx-auto text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Cabeçalhos sugeridos: nome, email, telefone, empresa, segmento, status, origem, observações
            </p>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              {rows.length} linhas detectadas. Mapeie as colunas do CSV para os campos do CRM:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {TARGET_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Select
                    value={mapping[field.key] || "__none__"}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [field.key]: v === "__none__" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="— ignorar —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— ignorar —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {previewData.length > 0 && (
              <div className="border rounded-md p-3 bg-muted/30">
                <p className="text-xs font-medium mb-2">Pré-visualização (primeiras 5 linhas)</p>
                <div className="space-y-1 text-xs">
                  {previewData.map((p, i) => (
                    <div key={i} className="flex flex-wrap gap-1">
                      {Object.entries(p).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-[10px]">
                          {k}: {String(v).slice(0, 30)}
                        </Badge>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === "done" && result && (
          <div className="text-center py-6 space-y-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
            <p className="font-medium">Importação concluída</p>
            <p className="text-sm text-muted-foreground">
              {result.inserted} leads importados • {result.failed} falharam
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={importing || !mapping.name}>
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Importar {rows.length} leads
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
