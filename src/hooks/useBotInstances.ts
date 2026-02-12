import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BotInstanceRow = {
  id: string;
  customer_product_id: string;
  name: string;
  workflow_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function useBotInstances(customerProductId: string | null) {
  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<BotInstanceRow[]>([]);

  const active = useMemo(
    () => instances.find((i) => i.is_active) ?? instances[0] ?? null,
    [instances],
  );

  const refresh = useCallback(async () => {
    if (!customerProductId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("bot_instances")
        .select("id, customer_product_id, name, workflow_id, is_active, created_at, updated_at")
        .eq("customer_product_id", customerProductId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setInstances((data || []) as BotInstanceRow[]);
    } finally {
      setLoading(false);
    }
  }, [customerProductId]);

  const ensureDefault = useCallback(async () => {
    if (!customerProductId) return null;
    // evita roundtrip extra se já temos instâncias
    if (instances.length) return instances[0];

    setLoading(true);
    try {
      const { data: created, error } = await (supabase as any)
        .from("bot_instances")
        .insert({
          customer_product_id: customerProductId,
          name: "Bot 1",
          is_active: true,
        })
        .select("id, customer_product_id, name, workflow_id, is_active, created_at, updated_at")
        .single();

      if (error) throw error;
      await refresh();
      return (created || null) as BotInstanceRow | null;
    } finally {
      setLoading(false);
    }
  }, [customerProductId, instances.length, refresh]);

  const createInstance = useCallback(
    async (name: string) => {
      if (!customerProductId) throw new Error("missing_customer_product_id");
      const safeName = (name || "").trim() || `Bot ${instances.length + 1}`;

      const { data, error } = await (supabase as any)
        .from("bot_instances")
        .insert({
          customer_product_id: customerProductId,
          name: safeName,
          is_active: instances.length === 0,
        })
        .select("id, customer_product_id, name, workflow_id, is_active, created_at, updated_at")
        .single();

      if (error) throw error;
      await refresh();
      return (data || null) as BotInstanceRow | null;
    },
    [customerProductId, instances.length, refresh],
  );

  const renameInstance = useCallback(
    async (id: string, name: string) => {
      const safeName = (name || "").trim();
      if (!safeName) return;

      const { error } = await (supabase as any)
        .from("bot_instances")
        .update({ name: safeName })
        .eq("id", id);

      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const setWorkflow = useCallback(
    async (id: string, workflowId: string | null) => {
      const { error } = await (supabase as any)
        .from("bot_instances")
        .update({ workflow_id: workflowId })
        .eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const setActiveInstance = useCallback(
    async (id: string) => {
      if (!customerProductId) return;

      // garante 1 ativo (simplificado: desativa todos e ativa o escolhido)
      const { error: offErr } = await (supabase as any)
        .from("bot_instances")
        .update({ is_active: false })
        .eq("customer_product_id", customerProductId);
      if (offErr) throw offErr;

      const { error: onErr } = await (supabase as any)
        .from("bot_instances")
        .update({ is_active: true })
        .eq("id", id);
      if (onErr) throw onErr;

      await refresh();
    },
    [customerProductId, refresh],
  );

  useEffect(() => {
    if (!customerProductId) return;
    refresh();
  }, [customerProductId, refresh]);

  return {
    loading,
    instances,
    active,
    refresh,
    ensureDefault,
    createInstance,
    renameInstance,
    setWorkflow,
    setActiveInstance,
  };
}
