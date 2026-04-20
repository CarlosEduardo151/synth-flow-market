import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Item { id?: string; description: string; quantity: number; unit_price: number; discount: number; total: number; }

interface Props {
  customerProductId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quoteId?: string | null;
  mode: "quote" | "receivable";
  onSaved?: () => void;
}

const fmtBRL = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayPlus = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function QuoteEditorDialog({ customerProductId, open, onOpenChange, quoteId, mode, onSaved }: Props) {
  const isQuote = mode === "quote";
  const table = isQuote ? "financial_quotes" : "financial_receivables";
  const itemTable = isQuote ? "financial_quote_items" : "financial_receivable_items";
  const fkey = isQuote ? "quote_id" : "receivable_id";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [header, setHeader] = useState<any>({
    client_name: "",
    client_email: "",
    client_phone: "",
    client_document: "",
    client_address: "",
    valid_until: todayPlus(15),
    due_date: todayPlus(15),
    discount: 0,
    tax: 0,
    notes: "",
    terms: isQuote
      ? "Validade do orçamento conforme indicado. Valores sujeitos a alteração após esta data."
      : "Pagamento via PIX, transferência ou boleto. Multa de 2% após o vencimento.",
  });
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0, discount: 0, total: 0 }]);

  useEffect(() => {
    if (!open) return;
    if (quoteId) loadExisting();
    else resetForm();
  }, [open, quoteId]);

  function resetForm() {
    setHeader({
      client_name: "", client_email: "", client_phone: "", client_document: "", client_address: "",
      valid_until: todayPlus(15), due_date: todayPlus(15),
      discount: 0, tax: 0, notes: "",
      terms: isQuote
        ? "Validade do orçamento conforme indicado. Valores sujeitos a alteração após esta data."
        : "Pagamento via PIX, transferência ou boleto. Multa de 2% após o vencimento.",
    });
    setItems([{ description: "", quantity: 1, unit_price: 0, discount: 0, total: 0 }]);
  }

  async function loadExisting() {
    setLoading(true);
    const { data: q } = await (supabase as any).from(table).select("*").eq("id", quoteId).maybeSingle();
    if (q) {
      setHeader({
        client_name: q.client_name || "",
        client_email: q.client_email || "",
        client_phone: q.client_phone || "",
        client_document: q.client_document || "",
        client_address: q.client_address || "",
        valid_until: q.valid_until || todayPlus(15),
        due_date: q.due_date || todayPlus(15),
        discount: Number(q.discount || 0),
        tax: Number(q.tax || 0),
        notes: q.notes || "",
        terms: q.terms || "",
      });
    }
    const { data: its } = await (supabase as any).from(itemTable).select("*").eq(fkey, quoteId).order("sort_order");
    setItems((its && its.length ? its : [{ description: "", quantity: 1, unit_price: 0, discount: 0, total: 0 }]).map((i: any) => ({
      id: i.id, description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price),
      discount: Number(i.discount || 0), total: Number(i.total || 0),
    })));
    setLoading(false);
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems(arr => arr.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      next.total = Math.max(next.quantity * next.unit_price - next.discount, 0);
      return next;
    }));
  }

  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const total = Math.max(subtotal - Number(header.discount || 0) + Number(header.tax || 0), 0);

  async function save() {
    if (!header.client_name.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    if (!items.some(i => i.description.trim())) { toast.error("Adicione ao menos um item"); return; }

    setSaving(true);
    try {
      let id = quoteId;
      const baseHeader: any = {
        customer_product_id: customerProductId,
        client_name: header.client_name,
        client_email: header.client_email || null,
        client_phone: header.client_phone || null,
        client_document: header.client_document || null,
        client_address: header.client_address || null,
        discount: Number(header.discount || 0),
        tax: Number(header.tax || 0),
        notes: header.notes || null,
        terms: header.terms || null,
      };
      if (isQuote) baseHeader.valid_until = header.valid_until || null;
      else baseHeader.due_date = header.due_date;

      if (!id) {
        const { data: numData } = await (supabase as any).rpc(isQuote ? "next_quote_number" : "next_invoice_number", { _cp_id: customerProductId });
        baseHeader[isQuote ? "quote_number" : "invoice_number"] = numData;
        const { data: created, error } = await (supabase as any).from(table).insert(baseHeader).select("id").single();
        if (error) throw error;
        id = created.id;
      } else {
        const { error } = await (supabase as any).from(table).update(baseHeader).eq("id", id);
        if (error) throw error;
        await (supabase as any).from(itemTable).delete().eq(fkey, id);
      }

      const itemsPayload = items
        .filter(i => i.description.trim())
        .map((i, idx) => ({
          [fkey]: id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount,
          total: i.total,
          sort_order: idx,
        }));
      if (itemsPayload.length) {
        const { error: itErr } = await (supabase as any).from(itemTable).insert(itemsPayload);
        if (itErr) throw itErr;
      }

      toast.success(quoteId ? "Atualizado" : "Criado com sucesso");
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {quoteId ? "Editar" : "Novo"} {isQuote ? "Orçamento" : "Fatura a Receber"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-5">
            <Card className="p-4 border-border/50">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Cliente</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2"><Label className="text-xs">Nome / Razão Social *</Label>
                  <Input value={header.client_name} onChange={e => setHeader({ ...header, client_name: e.target.value })} /></div>
                <div><Label className="text-xs">CNPJ / CPF</Label>
                  <Input value={header.client_document} onChange={e => setHeader({ ...header, client_document: e.target.value })} /></div>
                <div><Label className="text-xs">E-mail</Label>
                  <Input type="email" value={header.client_email} onChange={e => setHeader({ ...header, client_email: e.target.value })} /></div>
                <div><Label className="text-xs">Telefone</Label>
                  <Input value={header.client_phone} onChange={e => setHeader({ ...header, client_phone: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">{isQuote ? "Válido até" : "Vencimento"}</Label>
                  <Input type="date" value={isQuote ? header.valid_until : header.due_date}
                    onChange={e => setHeader({ ...header, [isQuote ? "valid_until" : "due_date"]: e.target.value })} />
                </div>
                <div className="md:col-span-2"><Label className="text-xs">Endereço</Label>
                  <Input value={header.client_address} onChange={e => setHeader({ ...header, client_address: e.target.value })} /></div>
              </div>
            </Card>

            <Card className="p-4 border-border/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Itens</p>
                <Button size="sm" variant="outline" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, discount: 0, total: 0 }])}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg bg-muted/30">
                    <div className="col-span-12 md:col-span-5">
                      <Label className="text-[10px] uppercase">Descrição</Label>
                      <Input value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} placeholder="Serviço ou produto" />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                      <Label className="text-[10px] uppercase">Qtd</Label>
                      <Input type="number" step="0.01" value={it.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-[10px] uppercase">Unitário</Label>
                      <Input type="number" step="0.01" value={it.unit_price} onChange={e => updateItem(idx, { unit_price: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                      <Label className="text-[10px] uppercase">Desc.</Label>
                      <Input type="number" step="0.01" value={it.discount} onChange={e => updateItem(idx, { discount: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-7 md:col-span-2 text-right">
                      <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                      <p className="font-bold text-sm">{fmtBRL(it.total)}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <Button size="icon" variant="ghost" className="text-rose-500 h-8 w-8" onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 border-border/50">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div><Label className="text-xs">Observações</Label>
                    <Textarea rows={3} value={header.notes} onChange={e => setHeader({ ...header, notes: e.target.value })} /></div>
                  <div><Label className="text-xs">Termos e condições</Label>
                    <Textarea rows={3} value={header.terms} onChange={e => setHeader({ ...header, terms: e.target.value })} /></div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Desconto geral</Label>
                      <Input type="number" step="0.01" value={header.discount} onChange={e => setHeader({ ...header, discount: e.target.value })} /></div>
                    <div><Label className="text-xs">Impostos</Label>
                      <Input type="number" step="0.01" value={header.tax} onChange={e => setHeader({ ...header, tax: e.target.value })} /></div>
                  </div>
                  <Separator />
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{fmtBRL(subtotal)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Desconto</span><span>- {fmtBRL(Number(header.discount || 0))}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Impostos</span><span>{fmtBRL(Number(header.tax || 0))}</span></div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{fmtBRL(total)}</span></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
