import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeFinancialAction, ACTIONS_REQUIRING_APPROVAL } from "../_shared/financial-actions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Attachment = {
  type: "image";
  mime: string;
  data: string; // base64
  name?: string;
};

type ChatBody = {
  customerProductId: string;
  message: string;
  attachments?: Attachment[];
};

type Provider = "lovable" | "openai" | "gemini";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return json(401, { error: "Unauthorized" });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return json(401, { error: "Unauthorized" });

    const body = (await req.json().catch(() => null)) as ChatBody | null;
    if (!body?.customerProductId || !body?.message?.trim()) {
      return json(400, { error: "customerProductId e message são obrigatórios" });
    }

    // Verify product ownership and status
    const { data: customerProduct, error: cpErr } = await supabase
      .from("customer_products")
      .select("id, user_id, product_slug, is_active")
      .eq("id", body.customerProductId)
      .maybeSingle();

    if (cpErr || !customerProduct || customerProduct.user_id !== user.id || !customerProduct.is_active) {
      return json(403, { error: "Sem acesso ao produto" });
    }

    const productSlug = customerProduct.product_slug;
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    // Load user permissions (defaults: allow goal proposals; execution always requires approval)
    const { data: permRow } = await supabase
      .from("financial_agent_permissions")
      .select("permissions")
      .eq("customer_product_id", body.customerProductId)
      .eq("user_id", user.id)
      .maybeSingle();

    const permissions = (permRow?.permissions ?? {}) as Record<string, any>;

    // Load chat history (last 20)
    const { data: history } = await supabase
      .from("financial_agent_chat_messages")
      .select("role, content, attachments, created_at")
      .eq("customer_product_id", body.customerProductId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Persist user message
    await supabase.from("financial_agent_chat_messages").insert({
      user_id: user.id,
      customer_product_id: body.customerProductId,
      role: "user",
      content: body.message.trim(),
      attachments: attachments.length ? attachments : null,
    });

    // Choose provider/model for this product
    const assignment = await pickAssignment(supabase, productSlug);
    const provider = normalizeProvider(assignment?.provider);
    const model = assignment?.model ?? "google/gemini-3-flash-preview";

    const financeSnapshot = await buildFinanceSnapshot(supabase, body.customerProductId);
    const toolContext = buildToolContext(financeSnapshot);
    const deterministicReply = maybeRespondWithMetrics(body.message.trim(), financeSnapshot);
    const systemPrompt = buildSystemPrompt({
      productSlug,
      permissions,
      toolContext,
    });

    const aiResult = deterministicReply
      ? { reply: deterministicReply, actionProposal: null }
      : await generateAssistantReply({
          supabase,
          provider,
          model,
          systemPrompt,
          userText: body.message.trim(),
          userId: user.id,
          history: history || [],
          attachments,
        });

    let assistantContent = aiResult.reply;
    let actionRequest: any = null;
    let executedAction: any = null;

    if (aiResult.actionProposal) {
      const actionType = String(aiResult.actionProposal.action_type || "");
      const payload = aiResult.actionProposal.payload || {};
      const requiresApproval = ACTIONS_REQUIRING_APPROVAL.has(actionType);

      if (requiresApproval) {
        const { data: ar, error: arErr } = await supabase
          .from("financial_agent_action_requests")
          .insert({
            user_id: user.id,
            customer_product_id: body.customerProductId,
            action_type: actionType,
            payload,
            status: "pending",
          })
          .select("*")
          .single();
        if (!arErr) actionRequest = ar;
      } else {
        // Auto-execute (non-destructive operational action)
        try {
          const result = await executeFinancialAction(supabase, user.id, body.customerProductId, actionType, payload);
          executedAction = { action_type: actionType, payload, result };
          assistantContent = `${aiResult.reply}\n\n✅ Pronto, executado: ${actionType}.`;
          // Audit log as executed action_request
          await supabase.from("financial_agent_action_requests").insert({
            user_id: user.id,
            customer_product_id: body.customerProductId,
            action_type: actionType,
            payload,
            status: "executed",
            result: result ?? null,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erro desconhecido";
          assistantContent = `${aiResult.reply}\n\n❌ Não consegui executar (${actionType}): ${msg}`;
          await supabase.from("financial_agent_action_requests").insert({
            user_id: user.id,
            customer_product_id: body.customerProductId,
            action_type: actionType,
            payload,
            status: "failed",
            result: { error: msg },
          });
        }
      }
    }

    // Persist assistant message (with possible execution feedback)
    await supabase.from("financial_agent_chat_messages").insert({
      user_id: user.id,
      customer_product_id: body.customerProductId,
      role: "assistant",
      content: assistantContent,
      attachments: aiResult.replyAttachments ?? null,
    });

    return json(200, {
      reply: assistantContent,
      provider,
      model,
      actionRequest,
      executedAction,
    });
  } catch (e) {
    console.error("financial-agent-chat error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Erro desconhecido" });
  }
});

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pickAssignment(supabase: any, productSlug: string) {
  const { data } = await supabase
    .from("product_ai_assignments")
    .select("provider, model, is_active")
    .eq("product_slug", productSlug)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const provider = String(data.provider || "").toLowerCase();
  if (!provider) return null;
  return { provider, model: data.model };
}

function buildSystemPrompt({
  productSlug,
  permissions: _permissions,
  toolContext,
}: {
  productSlug: string;
  permissions: Record<string, any>;
  toolContext?: string;
}) {
  return [
    `Você é o Agente Financeiro (CFO virtual) do produto "${productSlug}".`,
    "Responda em português (pt-BR), de forma direta, executiva e com números reais.",
    "Você pode receber imagens; descreva e use a imagem para ajudar o usuário.",
    "",
    "===== DADOS REAIS DO CLIENTE (use SEMPRE estes números nas respostas) =====",
    toolContext || "(sem dados disponíveis no momento)",
    "==========================================================================",
    "",
    "Quando o usuário pedir relatório, análise, KPIs, fluxo, projeção, faturas, vencimentos, gastos, top categorias, saldo, runway ou insights — use APENAS os dados acima. NÃO invente números.",
    "Para perguntas sobre saldo atual, priorize o campo 'Saldo atual real (histórico consolidado)'. Nunca responda 0,00 se houver saldo calculado no contexto.",
    "Se faltar dado, diga claramente o que falta e como cadastrar.",
    "",
    "===== AUTONOMIA / AÇÕES =====",
    "Você TEM AUTONOMIA para executar ações diretamente em nome do usuário em todas as áreas (transações, faturas, recebíveis, cotações, impostos DAS, calendário/recorrentes, metas).",
    "Execute imediatamente ações de criação, atualização e marcação (ex: 'adicione transação 250 receita', 'crie fatura', 'marque como pago'). NÃO peça confirmação antes — apenas faça.",
    "EXCEÇÃO — apenas as ações de DELETE (*_delete) entram em fluxo de aprovação automaticamente. Para tudo o mais, execute direto.",
    "Use o ID exato (id=...) que aparece no contexto acima para update/delete.",
    "",
    "Quando o usuário pedir uma ação, responda em UMA frase curta confirmando o que vai fazer e, no FINAL, em uma única linha, inclua:",
    "ACTION_PROPOSAL: <json minificado>",
    "Formato: {\"action_type\":\"...\",\"payload\":{...}}",
    "O sistema executa automaticamente. Você verá o resultado e pode informar ao usuário no próximo turno.",
    "",
    "Action types suportados (use exatamente esses nomes):",
    "TRANSAÇÕES:",
    "- transaction_create  payload: {type:'income'|'expense', amount:number, description?, date?:'YYYY-MM-DD', category?, payment_method?, tags?:string[]}",
    "- transaction_update  payload: {id, ...campos a atualizar}",
    "- transaction_delete  payload: {id}",
    "FATURAS / CONTAS A PAGAR:",
    "- invoice_create  payload: {title, amount, due_date:'YYYY-MM-DD', supplier?, category?, status?:'pending'|'paid'|'overdue', recurring?:bool, recurring_interval?:'weekly'|'monthly'|'quarterly'|'yearly', notes?}",
    "- invoice_update  payload: {id, ...campos}",
    "- invoice_delete  payload: {id}",
    "- invoice_mark_paid  payload: {id, paid_amount?, payment_method?}",
    "RECEBÍVEIS / FATURAS DE CLIENTES:",
    "- receivable_create  payload: {client_name, total, due_date:'YYYY-MM-DD', client_email?, client_phone?, client_document?, status?:'draft'|'sent'|'paid'|'overdue', notes?}",
    "- receivable_update  payload: {id, ...campos}",
    "- receivable_delete  payload: {id}",
    "- receivable_mark_paid  payload: {id, paid_amount?, payment_method?}",
    "COTAÇÕES / ORÇAMENTOS:",
    "- quote_create  payload: {client_name, total, client_email?, client_phone?, client_document?, valid_until?:'YYYY-MM-DD', notes?, terms?, items?:[{description,quantity,unit_price,discount?}]}",
    "- quote_update  payload: {id, ...campos}",
    "- quote_delete  payload: {id}",
    "- quote_mark_status  payload: {id, status:'draft'|'sent'|'approved'|'rejected'|'expired'}",
    "IMPOSTOS DAS / SIMPLES NACIONAL:",
    "- das_create  payload: {regime:'simples'|'mei', anexo?, competencia_month:1-12, competencia_year, revenue_month, revenue_12m?, aliquota_efetiva, total_amount, due_date:'YYYY-MM-DD', tax_breakdown?:object, notes?}",
    "- das_mark_paid  payload: {id, paid_at?:'YYYY-MM-DD'}",
    "- das_delete  payload: {id}",
    "EVENTOS DE CALENDÁRIO / RECORRENTES:",
    "- calendar_create  payload: {title, event_date:'YYYY-MM-DD', event_type:'income'|'expense'|'tax'|'reminder', amount?, category?, recurring?:bool, recurring_interval?:'weekly'|'monthly'|'quarterly'|'yearly', recurring_until?:'YYYY-MM-DD', description?}",
    "- calendar_update  payload: {id, ...campos}",
    "- calendar_delete  payload: {id}",
    "METAS:",
    "- goal_create  payload: {name, target_amount, current_amount?, deadline?:'YYYY-MM-DD'}",
    "- goal_update  payload: {id, ...campos}",
    "- goal_delete  payload: {id}",
    "",
    "REGRAS:",
    "- Só inclua ACTION_PROPOSAL quando o usuário pedir CLARAMENTE uma ação (criar, lançar, registrar, atualizar, marcar, apagar, mudar status etc.).",
    "- Nunca invente IDs. Se o usuário pedir editar/apagar e o ID não estiver no contexto acima, peça mais detalhes (descrição, valor, data) para identificar.",
    "- Se faltar campo obrigatório no que o usuário disse, pergunte antes de propor. Caso contrário, assuma defaults razoáveis (data = hoje, status = pending, etc.).",
    "- NÃO peça confirmação antes de executar; apenas faça e relate.",
  ].join("\n");
}

type FinanceSnapshot = {
  today: string;
  monthIncome: number;
  monthExpense: number;
  monthResult: number;
  currentBalance: number;
  snapshotDate: string | null;
  snapshotBalance: number | null;
  runwayMonths: number | null;
  burnRateMonthly: number | null;
  netMarginPct: number | null;
  avgTicket: number | null;
  topCategories: Array<[string, number]>;
  openPayables: any[];
  overduePayablesCount: number;
  openReceivables: any[];
  overdueReceivablesCount: number;
  forecast: any | null;
  insights: any[];
  goals: any[];
  recentTransactions: any[];
  transactionCount: number;
  quotes: any[];
  dasGuides: any[];
  calendarEvents: any[];
};

const formatCurrencyBRL = (value: number) =>
  `R$ ${Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

async function fetchTransactionsForSnapshot(supabase: any, customerProductId: string) {
  const pageSize = 1000;
  const rows: any[] = [];

  for (let from = 0; from < 5000; from += pageSize) {
    const { data, error } = await supabase
      .from("financial_agent_transactions")
      .select("id, type, amount, description, date, category, tags")
      .eq("customer_product_id", customerProductId)
      .order("date", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows;
}

async function buildFinanceSnapshot(supabase: any, customerProductId: string): Promise<FinanceSnapshot> {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [tx, { data: invs }, { data: recv }, { data: kpi }, { data: insights }, { data: goals }, { data: forecast }, { data: quotes }, { data: das }, { data: calEvents }] = await Promise.all([
    fetchTransactionsForSnapshot(supabase, customerProductId),
    supabase.from("financial_agent_invoices").select("id, title, amount, due_date, status, supplier, category, recurring, recurring_interval").eq("customer_product_id", customerProductId).order("due_date", { ascending: true }).limit(50),
    supabase.from("financial_receivables").select("id, invoice_number, client_name, total, due_date, status, paid_amount").eq("customer_product_id", customerProductId).order("due_date", { ascending: true }).limit(50),
    supabase.from("financial_kpi_snapshots").select("*").eq("customer_product_id", customerProductId).order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("financial_insights").select("title, description, severity, impact_brl, status").eq("customer_product_id", customerProductId).eq("status", "open").order("detected_at", { ascending: false }).limit(8),
    supabase.from("financial_agent_goals").select("id, name, target_amount, current_amount, deadline, status").eq("customer_product_id", customerProductId).limit(20),
    supabase.from("financial_forecasts").select("horizon_days, projected_income, projected_expense, projected_balance, confidence, generated_at").eq("customer_product_id", customerProductId).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("financial_quotes").select("id, quote_number, client_name, total, status, valid_until").eq("customer_product_id", customerProductId).order("created_at", { ascending: false }).limit(20),
    supabase.from("financial_das_guides").select("id, regime, anexo, competencia_month, competencia_year, total_amount, due_date, payment_status").eq("customer_product_id", customerProductId).order("due_date", { ascending: false }).limit(12),
    supabase.from("financial_calendar_events").select("id, title, amount, event_type, event_date, status, recurring, recurring_interval, category").eq("customer_product_id", customerProductId).order("event_date", { ascending: true }).limit(40),
  ]);

  const txArr = (tx || []) as any[];
  const monthTx = txArr.filter((item) => String(item.date || "").startsWith(ym));
  const monthIncome = monthTx
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthExpense = monthTx
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const currentBalance = txArr.reduce((sum, item) => {
    const amount = Number(item.amount || 0);
    return item.type === "income" ? sum + amount : sum - amount;
  }, 0);

  const categoryMap = new Map<string, number>();
  monthTx
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      const category = String(item.category || "Outros").trim();
      categoryMap.set(category, (categoryMap.get(category) || 0) + Number(item.amount || 0));
    });

  const topCategories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const openPayables = ((invs || []) as any[]).filter((item) => ["pending", "overdue"].includes(item.status));
  const overduePayablesCount = openPayables.filter((item) => String(item.due_date || "") < todayKey).length;
  const openReceivables = ((recv || []) as any[]).filter((item) => ["sent", "overdue", "partial"].includes(item.status));
  const overdueReceivablesCount = openReceivables.filter((item) => String(item.due_date || "") < todayKey).length;

  return {
    today: todayKey,
    monthIncome,
    monthExpense,
    monthResult: monthIncome - monthExpense,
    currentBalance,
    snapshotDate: kpi?.snapshot_date ?? null,
    snapshotBalance: kpi?.cash_balance != null ? Number(kpi.cash_balance) : null,
    runwayMonths: kpi?.runway_months != null ? Number(kpi.runway_months) : null,
    burnRateMonthly: kpi?.burn_rate_monthly != null ? Number(kpi.burn_rate_monthly) : null,
    netMarginPct: kpi?.net_margin_pct != null ? Number(kpi.net_margin_pct) : null,
    avgTicket: kpi?.avg_ticket != null ? Number(kpi.avg_ticket) : null,
    topCategories,
    openPayables,
    overduePayablesCount,
    openReceivables,
    overdueReceivablesCount,
    forecast: forecast || null,
    insights: (insights || []) as any[],
    goals: (goals || []) as any[],
    recentTransactions: txArr.slice(0, 10),
    transactionCount: txArr.length,
    quotes: (quotes || []) as any[],
    dasGuides: (das || []) as any[],
    calendarEvents: (calEvents || []) as any[],
  };
}

function buildToolContext(snapshot: FinanceSnapshot): string {
  try {
    const lines: string[] = [];
    lines.push(`Data de hoje: ${snapshot.today}`);
    lines.push("");
    lines.push("[Números principais]");
    lines.push(`- Saldo atual real (histórico consolidado): ${formatCurrencyBRL(snapshot.currentBalance)}`);
    lines.push(`- Receita do mês: ${formatCurrencyBRL(snapshot.monthIncome)}`);
    lines.push(`- Despesa do mês: ${formatCurrencyBRL(snapshot.monthExpense)}`);
    lines.push(`- Resultado do mês: ${formatCurrencyBRL(snapshot.monthResult)}`);
    if (snapshot.snapshotDate && snapshot.snapshotBalance != null) {
      lines.push(`- Saldo (snapshot ${snapshot.snapshotDate}): ${formatCurrencyBRL(snapshot.snapshotBalance)}`);
    }
    if (snapshot.runwayMonths != null) lines.push(`- Runway: ${snapshot.runwayMonths.toFixed(1)} meses`);
    if (snapshot.burnRateMonthly != null) lines.push(`- Burn rate mensal: ${formatCurrencyBRL(snapshot.burnRateMonthly)}`);
    if (snapshot.netMarginPct != null) lines.push(`- Margem líquida: ${snapshot.netMarginPct.toFixed(1)}%`);
    if (snapshot.avgTicket != null) lines.push(`- Ticket médio: ${formatCurrencyBRL(snapshot.avgTicket)}`);

    lines.push("");
    lines.push("[Top categorias de despesa - mês]");
    if (snapshot.topCategories.length === 0) lines.push("- (sem categorias)");
    snapshot.topCategories.forEach(([category, value]) => lines.push(`- ${category}: ${formatCurrencyBRL(value)}`));

    lines.push("");
    lines.push(`[Contas a pagar / Faturas] em aberto: ${snapshot.openPayables.length} | vencidas: ${snapshot.overduePayablesCount}`);
    snapshot.openPayables.slice(0, 10).forEach((item: any) => {
      lines.push(`- id=${item.id} | ${item.title} | ${item.supplier || "-"} | ${formatCurrencyBRL(Number(item.amount || 0))} | venc ${item.due_date} | ${item.status}${item.recurring ? ` | recorrente ${item.recurring_interval || ""}` : ""}`);
    });

    lines.push("");
    lines.push(`[Contas a receber] em aberto: ${snapshot.openReceivables.length} | vencidas: ${snapshot.overdueReceivablesCount}`);
    snapshot.openReceivables.slice(0, 10).forEach((item: any) => {
      lines.push(`- id=${item.id} | ${item.invoice_number || "-"} | ${item.client_name || "-"} | ${formatCurrencyBRL(Number(item.total || 0))} | venc ${item.due_date} | ${item.status}`);
    });

    if (snapshot.quotes?.length) {
      lines.push("");
      lines.push("[Cotações / Orçamentos recentes]");
      snapshot.quotes.slice(0, 10).forEach((q: any) => {
        lines.push(`- id=${q.id} | ${q.quote_number} | ${q.client_name} | ${formatCurrencyBRL(Number(q.total || 0))} | ${q.status}${q.valid_until ? ` | val. ${q.valid_until}` : ""}`);
      });
    }

    if (snapshot.dasGuides?.length) {
      lines.push("");
      lines.push("[Impostos DAS / Simples Nacional]");
      snapshot.dasGuides.slice(0, 8).forEach((d: any) => {
        lines.push(`- id=${d.id} | ${d.regime}${d.anexo ? ` ${d.anexo}` : ""} | ${String(d.competencia_month).padStart(2,"0")}/${d.competencia_year} | ${formatCurrencyBRL(Number(d.total_amount || 0))} | venc ${d.due_date} | ${d.payment_status}`);
      });
    }

    if (snapshot.calendarEvents?.length) {
      lines.push("");
      lines.push("[Calendário / Eventos recorrentes]");
      snapshot.calendarEvents.slice(0, 12).forEach((c: any) => {
        lines.push(`- id=${c.id} | ${c.event_date} | ${c.event_type} | ${c.title} | ${formatCurrencyBRL(Number(c.amount || 0))} | ${c.status}${c.recurring ? ` | recorrente ${c.recurring_interval || ""}` : ""}`);
      });
    }

    if (snapshot.forecast) {
      lines.push("");
      lines.push(`[Previsão ${snapshot.forecast.horizon_days}d] receita ${formatCurrencyBRL(Number(snapshot.forecast.projected_income || 0))} | despesa ${formatCurrencyBRL(Number(snapshot.forecast.projected_expense || 0))} | saldo proj. ${formatCurrencyBRL(Number(snapshot.forecast.projected_balance || 0))} | confiança ${Math.round(Number(snapshot.forecast.confidence || 0) * 100)}%`);
    }

    if (snapshot.insights.length) {
      lines.push("");
      lines.push("[Insights ativos]");
      snapshot.insights.forEach((item: any) => {
        lines.push(`- [${item.severity}] ${item.title}${item.impact_brl ? ` (impacto ${formatCurrencyBRL(Number(item.impact_brl))})` : ""} — ${item.description}`);
      });
    }

    if (snapshot.goals.length) {
      lines.push("");
      lines.push("[Metas]");
      snapshot.goals.forEach((goal: any) => {
        const pct = goal.target_amount > 0 ? (Number(goal.current_amount || 0) / Number(goal.target_amount) * 100).toFixed(0) : "0";
        lines.push(`- id=${goal.id} | ${goal.name}: ${formatCurrencyBRL(Number(goal.current_amount || 0))}/${formatCurrencyBRL(Number(goal.target_amount || 0))} (${pct}%) ${goal.deadline ? `até ${goal.deadline}` : ""} [${goal.status || "active"}]`);
      });
    }

    lines.push("");
    lines.push("[Últimas transações]");
    snapshot.recentTransactions.forEach((item: any) => {
      lines.push(`- id=${item.id} | ${item.date} | ${item.type === "income" ? "+" : "-"}${formatCurrencyBRL(Number(item.amount || 0))} | ${item.category || "-"} | ${item.description || ""}`);
    });

    return lines.join("\n");
  } catch (e) {
    console.error("buildToolContext error", e);
    return "(erro ao carregar contexto financeiro)";
  }
}

function maybeRespondWithMetrics(userText: string, snapshot: FinanceSnapshot): string | null {
  if (!snapshot.transactionCount) return null;

  const text = normalizeText(userText);
  const asksForComplexAnalysis = /(analise|analise detalhada|relatorio|resumo executivo|previs|projec|insight|cenario|comparativo|tendencia|tendência)/.test(text);
  if (asksForComplexAnalysis) return null;

  const asksBalance = /(saldo|caixa atual|saldo atual|quanto eu tenho|quanto tenho em caixa|quanto tenho hoje)/.test(text);
  const asksMonthIncome = /(receita|faturei|faturamento|entrada|entrou|ganhei)/.test(text) && /(mes|este mes|esse mes|mes atual)/.test(text);
  const asksMonthExpense = /(despesa|gastei|gasto|saida|saidas|saída|saídas)/.test(text) && /(mes|este mes|esse mes|mes atual)/.test(text);
  const asksMonthResult = /(resultado|lucro|prejuizo|prejuízo|saldo do mes|saldo do mês)/.test(text) && /(mes|este mes|esse mes|mes atual)/.test(text);

  if (!asksBalance && !asksMonthIncome && !asksMonthExpense && !asksMonthResult) {
    return null;
  }

  const replies: string[] = [];

  if (asksBalance) {
    replies.push(`Seu saldo atual consolidado é ${formatCurrencyBRL(snapshot.currentBalance)}.`);
  }
  if (asksMonthIncome) {
    replies.push(`A receita deste mês está em ${formatCurrencyBRL(snapshot.monthIncome)}.`);
  }
  if (asksMonthExpense) {
    replies.push(`A despesa deste mês está em ${formatCurrencyBRL(snapshot.monthExpense)}.`);
  }
  if (asksMonthResult) {
    replies.push(`O resultado do mês está em ${formatCurrencyBRL(snapshot.monthResult)}.`);
  }

  if (replies.length > 0) {
    replies.push(`Base de cálculo: registros financeiros consolidados até ${snapshot.today}.`);
    return replies.join(" ");
  }

  return null;
}

async function getProviderKey(supabase: any, provider: "openai" | "gemini") {
  const { data } = await supabase
    .from("api_credentials")
    .select("api_key, is_active")
    .eq("provider", provider)
    .maybeSingle();
  if (!data?.is_active || !data?.api_key) return null;
  return data.api_key as string;
}

function extractActionProposal(text: string): { reply: string; proposal: any | null } {
  const marker = "ACTION_PROPOSAL:";
  const idx = text.lastIndexOf(marker);
  if (idx === -1) return { reply: text.trim(), proposal: null };
  const before = text.slice(0, idx).trim();
  const jsonPart = text.slice(idx + marker.length).trim();
  try {
    const proposal = JSON.parse(jsonPart);
    if (!proposal?.action_type || !proposal?.payload) return { reply: text.trim(), proposal: null };
    return { reply: before || "Ok.", proposal };
  } catch {
    return { reply: text.trim(), proposal: null };
  }
}

async function generateAssistantReply({
  supabase,
  provider,
  model,
  systemPrompt,
  userText,
  userId: _userId,
  history,
  attachments,
}: {
  supabase: any;
  provider: Provider;
  model: string;
  systemPrompt: string;
  userText: string;
  userId: string;
  history: Array<any>;
  attachments: Attachment[];
}): Promise<{ reply: string; actionProposal: any | null; replyAttachments?: any }> {
  // Build messages (keep it simple: system + compact history + latest user)
  const histMsgs = (history || []).slice(-12).map((m) => ({
    role: m.role,
    content: m.content,
    attachments: m.attachments,
  }));

  if (provider === "openai") {
    const key = await getProviderKey(supabase, "openai");
    if (!key) {
      return { reply: "IA não configurada (OpenAI sem chave ativa). Peça ao administrador para configurar.", actionProposal: null };
    }

    const openAiMessages: any[] = [{ role: "system", content: systemPrompt }];

    for (const m of histMsgs) {
      if (m.role === "user") openAiMessages.push({ role: "user", content: m.content });
      else if (m.role === "assistant") openAiMessages.push({ role: "assistant", content: m.content });
    }

    // Attach images to last user message when present
    if (attachments.length) {
      const contentParts: any[] = [{ type: "text", text: userText }];
      for (const img of attachments) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:${img.mime};base64,${img.data}` },
        });
      }
      openAiMessages.push({ role: "user", content: contentParts });
    } else {
      openAiMessages.push({ role: "user", content: userText });
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: openAiMessages,
        temperature: 0.6,
        max_tokens: 1200,
      }),
    });

    const t = await resp.text();
    if (!resp.ok) {
      console.error("OpenAI error:", resp.status, t);
      return { reply: "Falha ao consultar a IA (OpenAI).", actionProposal: null };
    }
    const parsed = JSON.parse(t);
    const content = parsed?.choices?.[0]?.message?.content as string | undefined;
    const { reply, proposal } = extractActionProposal(content || "");
    return { reply: reply || "", actionProposal: proposal };
  }

  if (provider === "gemini") {
    const key = await getProviderKey(supabase, "gemini");
    if (!key) {
      return { reply: "IA não configurada (Gemini sem chave ativa). Peça ao administrador para configurar.", actionProposal: null };
    }

    // Gemini GenerateContent (multimodal)
    const contents: any[] = [];
    // We only include a compact text history for Gemini to keep payload small
    const compactHistory = histMsgs
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
      .join("\n");

    const parts: any[] = [];
    parts.push({ text: systemPrompt + "\n\n" + (compactHistory ? `HISTÓRICO:\n${compactHistory}\n\n` : "") + `MENSAGEM ATUAL:\n${userText}` });
    for (const img of attachments) {
      parts.push({
        inlineData: { mimeType: img.mime, data: img.data },
      });
    }
    contents.push({ role: "user", parts });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 1200 },
      }),
    });

    const t = await resp.text();
    if (!resp.ok) {
      console.error("Gemini error:", resp.status, t);
      return { reply: "Falha ao consultar a IA (Gemini).", actionProposal: null };
    }
    const parsed = JSON.parse(t);
    const content = parsed?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") as string | undefined;
    const { reply, proposal } = extractActionProposal(content || "");
    return { reply: reply || "", actionProposal: proposal };
  }

  // Lovable AI fallback (fast, no external keys)
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { reply: "IA não configurada.", actionProposal: null };
  }

  const messages: any[] = [{ role: "system", content: systemPrompt }];
  for (const m of histMsgs) {
    if (m.role === "user" || m.role === "assistant") messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: "user", content: userText });

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "google/gemini-3-flash-preview",
      messages,
      temperature: 0.6,
      max_tokens: 1200,
    }),
  });

  const t = await resp.text();
  if (!resp.ok) {
    console.error("Lovable AI error:", resp.status, t);
    return { reply: "Falha ao consultar a IA.", actionProposal: null };
  }
  const parsed = JSON.parse(t);
  const content = parsed?.choices?.[0]?.message?.content as string | undefined;
  const { reply, proposal } = extractActionProposal(content || "");
  return { reply: reply || "", actionProposal: proposal };
}

function normalizeProvider(provider: unknown): Provider {
  const p = String(provider || "").toLowerCase();
  if (p === "openai" || p === "gemini" || p === "lovable") return p;
  return "lovable";
}
