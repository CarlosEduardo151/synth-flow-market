import { useAuth, useAdminCheck } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Cpu } from "lucide-react";
import { NovaLinkEnginesList } from "@/components/admin/engines/NovaLinkEnginesList";

export default function AdminEnginesPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) { navigate("/auth"); return; }
    if (!adminLoading && !isAdmin) { navigate("/"); return; }
  }, [user, loading, isAdmin, adminLoading, navigate]);

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate("/admin")} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Motores da NovaLink</h1>
              <p className="text-sm text-muted-foreground">Gerencie todos os motores de automação dos clientes</p>
            </div>
          </div>
        </div>
        <NovaLinkEnginesList />
      </main>
      <Footer />
    </div>
  );
}
