import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth, useAdminCheck } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getProduct } from "@/products";
import { packages } from "@/components/home/PackagesSection";
import { CreditCard, Users, CalendarClock } from "lucide-react";

type SubscriptionRow = {
  id: string;
  user_id: string;
  product_slug: string;
  product_title: string | null;
  acquisition_type?: string | null;
  monthly_rental_price: number | null;
  rental_start_date: string | null;
  rental_end_date: string | null;
  access_expires_at: string | null;
  created_at: string | null;
  is_active: boolean | null;
};

type EnrichedSubscriptionRow = SubscriptionRow & {
  monthlyPriceCents: number;
  planLabel: string;
};

function formatBRLFromCents(valueInCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export default function AdminSubscriptionsReportPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EnrichedSubscriptionRow[]>([]);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const load = async () => {
      setLoading(true);
      try {
        // Assinaturas: todos os produtos/planos ativos.
        // - Produtos: preço mensal vem do catálogo (Product.price)
        // - Planos (pacotes): preço mensal é do pacote (mensal) OU equivalente mensal (semestral/6)
        // - Se existir monthly_rental_price no registro, ele tem prioridade.
        const { data, error } = await supabase
          .from("customer_products")
          .select(
            "id,user_id,product_slug,product_title,acquisition_type,monthly_rental_price,rental_start_date,rental_end_date,access_expires_at,created_at,is_active"
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const enriched: EnrichedSubscriptionRow[] = (data || []).map((r: any) => {
          const slug = String(r.product_slug || "");
          const title = String(r.product_title || "");

          // 1) Preferência: preço mensal salvo no registro
          if (r.monthly_rental_price != null) {
            return {
              ...(r as SubscriptionRow),
              monthlyPriceCents: Number(r.monthly_rental_price),
              planLabel: "mensal",
            };
          }

          // 2) Planos/pacotes (slug: pacote-*)
          if (slug.startsWith("pacote-")) {
            const pkgId = slug.replace(/^pacote-/, "");
            const pkg = packages.find((p) => p.id === pkgId);
            const isSemiannual = /semestral/i.test(title);
            const monthly = pkg
              ? isSemiannual
                ? Math.round(pkg.semiannualPrice / 6)
                : pkg.monthlyPrice
              : 0;

            return {
              ...(r as SubscriptionRow),
              monthlyPriceCents: monthly,
              planLabel: isSemiannual ? "semestral" : "mensal",
            };
          }

          // 3) Produtos individuais
          const product = getProduct(slug);
          return {
            ...(r as SubscriptionRow),
            monthlyPriceCents: product?.price ?? 0,
            planLabel: "mensal",
          };
        });

        setRows(enriched);
      } catch (e) {
        console.error("Erro ao carregar relatório de assinaturas:", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, isAdmin]);

  const now = useMemo(() => new Date(), []);
  const in7Days = useMemo(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), []);

  const summary = useMemo(() => {
    const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;
    const mrrCents = rows.reduce((acc, r) => acc + (r.monthlyPriceCents || 0), 0);

    const expiringSoon = rows.filter((r) => {
      const raw = r.rental_end_date || r.access_expires_at;
      if (!raw) return false;
      const d = new Date(raw);
      return d >= now && d <= in7Days;
    }).length;

    return {
      activeSubscriptions: rows.length,
      uniqueUsers,
      mrrCents,
      expiringSoon,
    };
  }, [rows, now, in7Days]);

  if (authLoading || adminLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Relatório de Assinaturas</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral das assinaturas ativas e receita mensal recorrente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Assinaturas ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : summary.activeSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Assinantes únicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : summary.uniqueUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                MRR estimado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : formatBRLFromCents(summary.mrrCents)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Somatório do valor mensal (produtos + planos)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Vencendo (7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : summary.expiringSoon}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assinaturas ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Preço mensal</TableHead>
                    <TableHead>Fim / Expira</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        Nenhuma assinatura ativa encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const end = r.rental_end_date || r.access_expires_at;
                      const endDate = end ? new Date(end) : null;
                      const isSoon = endDate ? endDate >= now && endDate <= in7Days : false;

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.product_title || r.product_slug}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.user_id.slice(0, 8)}…
                          </TableCell>
                          <TableCell>
                            {r.monthlyPriceCents > 0 ? (
                              <span>
                                {formatBRLFromCents(r.monthlyPriceCents)}
                                <span className="text-xs text-muted-foreground ml-2">({r.planLabel})</span>
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {endDate ? endDate.toLocaleDateString("pt-BR") : "-"}
                            {isSoon ? (
                              <Badge variant="secondary" className="ml-2">
                                vencendo
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">ativa</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
