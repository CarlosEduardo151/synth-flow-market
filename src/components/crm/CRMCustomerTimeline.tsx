import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Phone, Mail, Brain, Target, Clock, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  customerProductId: string;
  customerId: string;
  customerPhone?: string | null;
}

interface TimelineItem {
  id: string;
  kind: "interaction" | "message" | "opportunity" | "memory";
  date: string;
  title: string;
  description?: string;
  meta?: string;
  direction?: "in" | "out";
  data?: any;
}

const KIND_META: Record<TimelineItem["kind"], { label: string; icon: any; color: string }> = {
  interaction: { label: "Interação", icon: Phone, color: "text-blue-500" },
  message: { label: "WhatsApp", icon: MessageSquare, color: "text-emerald-500" },
  opportunity: { label: "Oportunidade", icon: Target, color: "text-purple-500" },
  memory: { label: "Memória IA", icon: Brain, color: "text-pink-500" },
};

export function CRMCustomerTimeline({ customerProductId, customerId, customerPhone }: Props) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimelineItem["kind"] | "all">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const promises: Promise<any>[] = [
        (supabase as any)
          .from("crm_interactions")
          .select("id,type,subject,description,created_at")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(200),
        (supabase as any)
          .from("crm_opportunities")
          .select("id,title,stage,value,probability,created_at,updated_at,notes,lost_reason")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(50),
      ];

      if (customerPhone) {
        promises.push(
          (supabase as any)
            .from("bot_conversation_logs")
            .select("id,direction,message_text,created_at")
            .eq("customer_product_id", customerProductId)
            .eq("phone", customerPhone)
            .order("created_at", { ascending: false })
            .limit(300),
        );
        promises.push(
          (supabase as any)
            .from("crm_client_memories")
            .select("id,client_phone,interaction_date,summary,topics,sentiment,raw_message_count")
            .eq("customer_product_id", customerProductId)
            .eq("client_phone", customerPhone)
            .order("interaction_date", { ascending: false })
            .limit(50),
        );
      }

      const results = await Promise.all(promises);
      if (cancelled) return;

      const out: TimelineItem[] = [];

      for (const i of results[0]?.data || []) {
        out.push({
          id: `int-${i.id}`,
          kind: "interaction",
          date: i.created_at,
          title: i.subject || i.type || "Interação",
          description: i.description,
          meta: i.type,
        });
      }

      for (const o of results[1]?.data || []) {
        out.push({
          id: `opp-${o.id}`,
          kind: "opportunity",
          date: o.updated_at || o.created_at,
          title: o.title,
          description: o.notes || o.lost_reason || undefined,
          meta: `${o.stage} • R$ ${Number(o.value || 0).toLocaleString("pt-BR")} • ${o.probability ?? 0}%`,
        });
      }

      if (results[2]) {
        for (const m of results[2].data || []) {
          out.push({
            id: `msg-${m.id}`,
            kind: "message",
            date: m.created_at,
            title: m.direction === "in" ? "Cliente" : "Bot/Atendente",
            description: m.message_text,
            direction: m.direction === "in" ? "in" : "out",
          });
        }
      }

      if (results[3]) {
        for (const mem of results[3].data || []) {
          out.push({
            id: `mem-${mem.id}`,
            kind: "memory",
            date: mem.interaction_date,
            title: "Resumo de conversa",
            description: mem.summary,
            meta: `${mem.raw_message_count || 0} msgs • ${mem.sentiment || "neutro"}${mem.topics?.length ? " • " + mem.topics.slice(0, 3).join(", ") : ""}`,
          });
        }
      }

      out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(out);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [customerProductId, customerId, customerPhone]);

  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);

  const counts = {
    all: items.length,
    interaction: items.filter((i) => i.kind === "interaction").length,
    message: items.filter((i) => i.kind === "message").length,
    opportunity: items.filter((i) => i.kind === "opportunity").length,
    memory: items.filter((i) => i.kind === "memory").length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-4 h-4" /> Histórico Unificado
        </CardTitle>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {(["all", "interaction", "message", "opportunity", "memory"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                filter === k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 hover:bg-muted text-muted-foreground"
              }`}
            >
              {k === "all" ? "Tudo" : KIND_META[k].label}
              <span className="ml-1 opacity-70">({counts[k]})</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum evento registrado{customerPhone ? "" : " (cliente sem telefone vinculado a mensagens)"}
          </p>
        ) : (
          <div className="relative pl-6 max-h-[600px] overflow-y-auto pr-2">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
            {filtered.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <div key={item.id} className="relative mb-4 last:mb-0">
                  <div className={`absolute -left-[18px] top-1 w-4 h-4 rounded-full bg-background border-2 ${meta.color.replace("text-", "border-")} flex items-center justify-center`}>
                    <Icon className={`w-2.5 h-2.5 ${meta.color}`} />
                  </div>
                  <div className="border rounded-md p-3 bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {meta.label}
                        </Badge>
                        {item.direction && (
                          item.direction === "in"
                            ? <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                            : <ArrowUpRight className="w-3 h-3 text-blue-500" />
                        )}
                        <p className="text-sm font-medium">{item.title}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.date), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {item.description}
                      </p>
                    )}
                    {item.meta && (
                      <p className="text-[10px] text-muted-foreground/80 mt-1">{item.meta}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
