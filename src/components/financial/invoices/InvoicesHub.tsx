import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowDownToLine, ArrowUpFromLine, Receipt, Sparkles, AlertTriangle } from "lucide-react";
import { PayablesTab } from "./PayablesTab";
import { ReceivablesTab } from "./ReceivablesTab";
import { AgingTab } from "./AgingTab";

interface Props { customerProductId: string }

export function InvoicesHub({ customerProductId }: Props) {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-emerald-500/10 via-background to-amber-500/10 p-6">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 text-emerald-500 text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">Gestão Financeira</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-emerald-500" /> Faturas
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            Controle suas contas a pagar, cobre seus clientes e acompanhe o aging em um só lugar.
          </p>
        </div>
      </div>

      <Tabs defaultValue="receivables">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="receivables" className="gap-2"><ArrowDownToLine className="w-4 h-4" /> A Receber</TabsTrigger>
          <TabsTrigger value="payables" className="gap-2"><ArrowUpFromLine className="w-4 h-4" /> A Pagar</TabsTrigger>
          <TabsTrigger value="aging" className="gap-2"><AlertTriangle className="w-4 h-4" /> Aging</TabsTrigger>
        </TabsList>
        <TabsContent value="receivables" className="mt-5">
          <ReceivablesTab customerProductId={customerProductId} />
        </TabsContent>
        <TabsContent value="payables" className="mt-5">
          <PayablesTab customerProductId={customerProductId} />
        </TabsContent>
        <TabsContent value="aging" className="mt-5">
          <AgingTab customerProductId={customerProductId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
