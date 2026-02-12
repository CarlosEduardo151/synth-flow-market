import { useMemo, useState } from "react";
import { Bot, Pencil, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { BotInstanceRow } from "@/hooks/useBotInstances";

type Props = {
  instances: BotInstanceRow[];
  activeInstanceId: string | null;
  loading?: boolean;
  /** Por padrão, usuários NÃO podem criar novas instâncias manualmente (somente via nova compra). */
  allowCreate?: boolean;
  onRefresh: () => void;
  onSetActive: (id: string) => Promise<void> | void;
  onCreate?: (name: string) => Promise<void> | void;
  onRename: (id: string, name: string) => Promise<void> | void;
};

export function BotInstancePicker({
  instances,
  activeInstanceId,
  loading,
  allowCreate = false,
  onRefresh,
  onSetActive,
  onCreate,
  onRename,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameName, setRenameName] = useState("");

  const active = useMemo(
    () => instances.find((i) => i.id === activeInstanceId) ?? instances.find((i) => i.is_active) ?? instances[0] ?? null,
    [instances, activeInstanceId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Seu bot (da sua compra)
        </CardTitle>
        <CardDescription>
          Aqui você escolhe qual bot desta compra está ativo. Novos bots aparecem automaticamente quando você comprar outro bot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Bot</Label>
            <Select value={active?.id ?? ""} onValueChange={(v) => onSetActive(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um bot..." />
              </SelectTrigger>
              <SelectContent>
                {instances.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>

             {allowCreate && onCreate ? (
               <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                 <DialogTrigger asChild>
                   <Button variant="outline" className="gap-2">
                     <Plus className="h-4 w-4" />
                     Novo bot
                   </Button>
                 </DialogTrigger>
                 <DialogContent>
                   <DialogHeader>
                     <DialogTitle>Criar nova instância</DialogTitle>
                   </DialogHeader>
                   <div className="space-y-2">
                     <Label>Nome</Label>
                     <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`Bot ${instances.length + 1}`} />
                   </div>
                   <DialogFooter>
                     <Button
                       onClick={async () => {
                         await onCreate(newName);
                         setNewName("");
                         setCreateOpen(false);
                       }}
                     >
                       Criar
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>
             ) : null}

            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!active} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Renomear
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Renomear instância</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Label>Novo nome</Label>
                  <Input
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder={active?.name ?? ""}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRenameName("");
                      setRenameOpen(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!active) return;
                      await onRename(active.id, renameName);
                      setRenameName("");
                      setRenameOpen(false);
                    }}
                  >
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
