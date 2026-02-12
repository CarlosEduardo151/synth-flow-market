import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface PendingAction {
  id: string;
  action_type: string;
  description: string;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  user_id: string;
  created_at: string | null;
}

export function CRMAIPendingActions() {
  const { user } = useAuth();
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchActions();
    }
  }, [user?.id]);

  const fetchActions = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("crm_ai_pending_actions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error("Error fetching pending actions:", error);
      toast.error("Erro ao carregar ações pendentes");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setProcessing(id);
    try {
      await supabase
        .from("crm_ai_pending_actions")
        .update({ status: newStatus })
        .eq("id", id);

      toast.success(newStatus === "completed" ? "Ação concluída!" : "Status atualizado");
      fetchActions();
    } catch (error) {
      console.error("Error updating action:", error);
      toast.error("Erro ao atualizar ação");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Concluído</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500">Alta</Badge>;
      case "medium":
        return <Badge className="bg-amber-500">Média</Badge>;
      case "low":
        return <Badge className="bg-green-500">Baixa</Badge>;
      default:
        return <Badge>{priority || "Normal"}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingActions = actions.filter((a) => a.status === "pending");
  const historyActions = actions.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Ações Pendentes
              </CardTitle>
              <CardDescription>
                Gerencie suas ações e tarefas pendentes
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchActions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>Nenhuma ação pendente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingActions.map((action) => (
                <div
                  key={action.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(action.priority)}
                        {getStatusBadge(action.status)}
                      </div>
                      <p className="font-medium">{action.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {action.created_at && format(new Date(action.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdateStatus(action.id, "completed")}
                      disabled={processing === action.id}
                      className="flex-1"
                    >
                      {processing === action.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Concluir
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(action.id, "cancelled")}
                      disabled={processing === action.id}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {historyActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historyActions.slice(0, 10).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(action.priority)}
                      {getStatusBadge(action.status)}
                    </div>
                    <p className="text-sm">{action.description}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {action.created_at && format(new Date(action.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
