import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, BarChart3, Camera, Users, Settings } from "lucide-react";
import { MicroBizDashboard } from "@/components/micro-biz/MicroBizDashboard";
import { MicroBizVision } from "@/components/micro-biz/MicroBizVision";
import { MicroBizCRM } from "@/components/micro-biz/MicroBizCRM";
import { MicroBizConfig } from "@/components/micro-biz/MicroBizConfig";

export default function MicroBusinessSystem() {
  const { user } = useAuth();

  const { data: customerProduct } = useQuery({
    queryKey: ["micro-biz-cp", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_products")
        .select("id")
        .eq("user_id", user!.id)
        .eq("product_slug", "micro-business-suite")
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const cpId = customerProduct?.id || "";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          NovaLink Micro-Business Suite
        </h1>
        <p className="text-muted-foreground text-sm">
          Automação de vendas, CRM invisível e marketing "One-Click" para micro-empresas.
        </p>
      </div>

      {!cpId ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Você precisa ter o produto ativo para acessar este sistema.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" /> Painel</TabsTrigger>
            <TabsTrigger value="vision"><Camera className="h-4 w-4 mr-1" /> Vision</TabsTrigger>
            <TabsTrigger value="crm"><Users className="h-4 w-4 mr-1" /> CRM</TabsTrigger>
            <TabsTrigger value="config"><Settings className="h-4 w-4 mr-1" /> Config</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><MicroBizDashboard customerProductId={cpId} /></TabsContent>
          <TabsContent value="vision"><MicroBizVision customerProductId={cpId} /></TabsContent>
          <TabsContent value="crm"><MicroBizCRM customerProductId={cpId} /></TabsContent>
          <TabsContent value="config"><MicroBizConfig customerProductId={cpId} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
