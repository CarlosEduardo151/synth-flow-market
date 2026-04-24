// Sales Copilot — streaming chat with full CRM context (lead, history, pipeline, RAG memories)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_MODEL = Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

type Mode = 'chat' | 'next_action' | 'message' | 'summary';

function fmtMoney(n: number) {
  try { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }
  catch { return `R$ ${n}`; }
}

async function buildContext(customerProductId: string, opportunityId?: string | null) {
  const parts: string[] = [];

  // Run all queries in parallel — all scoped by customer_product_id (multi-tenant isolation)
  const [
    oppsRes,
    customersRes,
    leadsRes,
    interactionsRes,
    captureRes,
    memoriesRes,
    convosRes,
    prospectsRes,
    cadencesRes,
    alertsRes,
    healthRes,
    meetingsRes,
    cpRes,
  ] = await Promise.all([
    admin.from('crm_opportunities')
      .select('id,title,stage,value,probability,priority,expected_close_date,lost_reason,notes,customer_id,updated_at,created_at')
      .eq('customer_product_id', customerProductId)
      .order('updated_at', { ascending: false }).limit(200),
    admin.from('crm_customers')
      .select('id,name,email,phone,company,status,notes,last_contact_date,created_at')
      .eq('customer_product_id', customerProductId)
      .order('updated_at', { ascending: false }).limit(200),
    (admin as any).from('sa_trigger_events')
      .select('id,event_type,title,description,source,relevance_score,status,detected_at')
      .eq('customer_product_id', customerProductId)
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .order('detected_at', { ascending: false }).limit(100),
    admin.from('crm_interactions')
      .select('type,subject,description,created_at,customer_id')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false }).limit(80),
    admin.from('crm_capture_settings')
      .select('*').eq('customer_product_id', customerProductId).maybeSingle(),
    (admin as any).from('crm_client_memories')
      .select('client_name,client_phone,interaction_date,summary,topics,sentiment')
      .eq('customer_product_id', customerProductId)
      .order('interaction_date', { ascending: false }).limit(60),
    (admin as any).from('bot_conversation_logs')
      .select('phone,direction,message_text,created_at')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false }).limit(60),
    (admin as any).from('sa_prospects')
      .select('name,company,role,score,status,created_at')
      .eq('customer_product_id', customerProductId)
      .order('score', { ascending: false, nullsFirst: false }).limit(60),
    (admin as any).from('sa_cadence_enrollments')
      .select('id,status,current_step,enrolled_at')
      .eq('customer_product_id', customerProductId)
      .order('enrolled_at', { ascending: false }).limit(40),
    (admin as any).from('sa_antichurn_alerts')
      .select('customer_id,risk_level,reason,status,created_at')
      .eq('customer_product_id', customerProductId)
      .eq('status', 'active').limit(40),
    (admin as any).from('sa_deal_health_scores')
      .select('opportunity_id,score,risk_factors,calculated_at')
      .eq('customer_product_id', customerProductId)
      .order('calculated_at', { ascending: false }).limit(40),
    (admin as any).from('sa_meetings')
      .select('title,meeting_date,status,notes')
      .eq('customer_product_id', customerProductId)
      .order('meeting_date', { ascending: false }).limit(20),
    admin.from('customer_products')
      .select('product_title,product_slug,delivered_at')
      .eq('id', customerProductId).maybeSingle(),
  ]);

  const opps = oppsRes.data || [];
  const customers = customersRes.data || [];
  const leads = leadsRes.data || [];
  const interactions = interactionsRes.data || [];
  const capture: any = captureRes.data;
  const memories = memoriesRes.data || [];
  const convos = convosRes.data || [];
  const prospects = prospectsRes.data || [];
  const cadences = cadencesRes.data || [];
  const alerts = alertsRes.data || [];
  const healths = healthRes.data || [];
  const meetings = meetingsRes.data || [];
  const cp: any = cpRes.data;

  parts.push(`# Empresa / Conta
- Produto: ${cp?.product_title ?? 'CRM'} (${cp?.product_slug ?? 'crm-simples'})
- Ativo desde: ${cp?.delivered_at ?? '—'}
- ID interno (escopo): ${customerProductId}`);

  // Pipeline overview
  const open = opps.filter((o: any) => !['won', 'lost'].includes((o.stage || '').toLowerCase()));
  const won = opps.filter((o: any) => (o.stage || '').toLowerCase() === 'won');
  const lost = opps.filter((o: any) => (o.stage || '').toLowerCase() === 'lost');
  const totalForecast = open.reduce((s: number, o: any) => s + Number(o.value || 0) * (Number(o.probability || 0) / 100), 0);
  const totalOpenValue = open.reduce((s: number, o: any) => s + Number(o.value || 0), 0);
  const totalWonValue = won.reduce((s: number, o: any) => s + Number(o.value || 0), 0);

  const byStage: Record<string, { count: number; value: number }> = {};
  for (const o of open) {
    const k = o.stage || 'sem estágio';
    byStage[k] = byStage[k] || { count: 0, value: 0 };
    byStage[k].count += 1;
    byStage[k].value += Number(o.value || 0);
  }

  parts.push(`# Pipeline
- Oportunidades em aberto: ${open.length} (valor total ${fmtMoney(totalOpenValue)})
- Forecast ponderado: ${fmtMoney(totalForecast)}
- Ganhas: ${won.length} (${fmtMoney(totalWonValue)}) | Perdidas: ${lost.length}
- Distribuição por estágio:
${Object.entries(byStage).map(([k, v]) => `  • ${k}: ${v.count} deals · ${fmtMoney(v.value)}`).join('\n') || '  (vazio)'}
- Top 10 deals abertos:
${open.slice(0, 10).map((o: any) => `  • ${o.title} — ${fmtMoney(Number(o.value || 0))} — ${o.stage} — prob ${o.probability ?? 0}% — prio ${o.priority ?? '-'}`).join('\n') || '  (vazio)'}`);

  // Clientes
  if (customers.length) {
    parts.push(`# Clientes (${customers.length} cadastrados)
${customers.slice(0, 30).map((c: any) => `- ${c.name}${c.company ? ' (' + c.company + ')' : ''} — ${c.email ?? '—'} | ${c.phone ?? '—'} | status: ${c.status ?? '—'} | últ. contato: ${c.last_contact_date ?? '—'}`).join('\n')}`);
  }

  // Leads quentes (sa_trigger_events = capturados pelo CRM)
  if (leads.length) {
    const hot = leads.filter((l: any) => (l.relevance_score || 0) >= 70);
    parts.push(`# Leads capturados (${leads.length} no total, ${hot.length} quentes ≥70)
${leads.slice(0, 25).map((l: any) => `- [${l.relevance_score ?? 0}] ${l.title} — ${l.event_type} — fonte: ${l.source ?? '—'} — status: ${l.status} — ${new Date(l.detected_at).toLocaleDateString('pt-BR')}${l.description ? '\n   ' + String(l.description).slice(0, 200) : ''}`).join('\n')}`);
  }

  // Prospects
  if (prospects.length) {
    parts.push(`# Prospects (${prospects.length})
${prospects.slice(0, 20).map((p: any) => `- ${p.name}${p.company ? ' (' + p.company + ')' : ''}${p.role ? ' — ' + p.role : ''} | score: ${p.score ?? '-'} | status: ${p.status ?? '-'}`).join('\n')}`);
  }

  // Capture settings (configuração do CRM)
  if (capture) {
    parts.push(`# Configuração de captura
- Palavras-chave: ${(capture.keywords || []).join(', ') || '—'}
- Fontes ativas: ${(capture.sources || []).join(', ') || '—'}
- Captura automática: ${capture.auto_capture_enabled ? 'sim' : 'não'}`);
  }

  // Alertas anti-churn
  if (alerts.length) {
    parts.push(`# 🚨 Alertas anti-churn ativos (${alerts.length})
${alerts.map((a: any) => `- [${a.risk_level}] ${a.reason ?? '—'} — desde ${new Date(a.created_at).toLocaleDateString('pt-BR')}`).join('\n')}`);
  }

  // Health scores recentes
  if (healths.length) {
    parts.push(`# Health scores recentes
${healths.slice(0, 10).map((h: any) => `- Deal ${h.opportunity_id?.slice(0, 8)} — score ${h.score} — riscos: ${(h.risk_factors || []).join(', ') || '—'}`).join('\n')}`);
  }

  // Cadências
  if (cadences.length) {
    const active = cadences.filter((c: any) => c.status === 'active').length;
    parts.push(`# Cadências de follow-up
- ${active} contatos em cadência ativa de ${cadences.length} totais.`);
  }

  // Reuniões recentes
  if (meetings.length) {
    parts.push(`# Reuniões recentes
${meetings.slice(0, 10).map((m: any) => `- ${new Date(m.meeting_date).toLocaleDateString('pt-BR')} — ${m.title} — ${m.status}${m.notes ? '\n   ' + String(m.notes).slice(0, 150) : ''}`).join('\n')}`);
  }

  // Conversas WhatsApp recentes
  if (convos.length) {
    parts.push(`# Conversas WhatsApp (últimas ${Math.min(convos.length, 30)})
${convos.slice(0, 30).map((c: any) => `- [${new Date(c.created_at).toLocaleString('pt-BR')}] ${c.direction === 'inbound' ? '⬅' : '➡'} ${c.phone}: ${String(c.message_text || '').slice(0, 200)}`).join('\n')}`);
  }

  // Selected opportunity deep dive
  if (opportunityId) {
    const opp: any = opps.find((o: any) => o.id === opportunityId);
    if (opp) {
      const cust: any = opp.customer_id ? customers.find((c: any) => c.id === opp.customer_id) : null;

      const oppInteractions = interactions.filter((i: any) => i.customer_id === opp.customer_id).slice(0, 30);

      const oppMemories = cust?.name
        ? memories.filter((m: any) => m.client_name === cust.name).slice(0, 15)
        : [];

      parts.push(`# 🎯 Lead selecionado (foco)
- Título: ${opp.title}
- Cliente: ${cust?.name ?? '—'} (${cust?.company ?? 'sem empresa'})
- Email: ${cust?.email ?? '—'} | Telefone: ${cust?.phone ?? '—'}
- Estágio: ${opp.stage} | Prob: ${opp.probability ?? 0}% | Valor: ${fmtMoney(Number(opp.value || 0))}
- Prioridade: ${opp.priority ?? '—'} | Fechamento previsto: ${opp.expected_close_date ?? '—'}
- Último contato: ${cust?.last_contact_date ?? '—'}
- Notas do deal: ${opp.notes ?? '—'}
- Notas do cliente: ${cust?.notes ?? '—'}`);

      if (oppInteractions.length) {
        parts.push(`# Histórico de interações deste lead
${oppInteractions.map((i: any) => `- [${new Date(i.created_at).toLocaleDateString('pt-BR')}] ${i.type}${i.subject ? ' — ' + i.subject : ''}: ${i.description}`).join('\n')}`);
      }

      if (oppMemories.length) {
        parts.push(`# Memórias contextuais (RAG) deste cliente
${oppMemories.map((m: any) => `- [${new Date(m.interaction_date).toLocaleDateString('pt-BR')}] ${m.sentiment ? `(${m.sentiment}) ` : ''}${m.summary}${m.topics?.length ? ' — tópicos: ' + m.topics.join(', ') : ''}`).join('\n')}`);
      }
    }
  }

  return parts.join('\n\n');
}

function systemPromptFor(mode: Mode): string {
  const base = `Você é o **Copiloto IA de Vendas** da NovaLink CRM. Você é direto, estratégico e prático — pensa como um head de vendas brasileiro experiente. Sempre responda em pt-BR. Use markdown (headings, bullets, **negrito**) para legibilidade. Seja específico: cite números, estágios, datas e nomes do contexto fornecido. Nunca invente dados que não estejam no contexto.`;

  if (mode === 'next_action') {
    return `${base}

Sua tarefa: analisar o lead e devolver **a próxima melhor ação** em formato:
### 🎯 Próxima ação
[uma frase clara]

### Por quê
- [3 razões baseadas no contexto: estágio, sinais, histórico]

### Como executar agora
1. [passo 1]
2. [passo 2]
3. [passo 3]

### Risco se não agir em 48h
[1-2 linhas]`;
  }
  if (mode === 'message') {
    return `${base}

Sua tarefa: gerar **uma mensagem pronta** (WhatsApp ou e-mail) personalizada para o lead. Tom natural, brasileiro, sem clichês. Máximo 6 linhas. Comece com o nome do contato. Termine com uma pergunta ou CTA claro. Devolva no formato:
### 💬 Mensagem sugerida
\`\`\`
[mensagem aqui — pronta para copiar]
\`\`\`

### Por que essa abordagem
[2-3 bullets]`;
  }
  if (mode === 'summary') {
    return `${base}

Sua tarefa: resumir o lead em formato executivo:
### 📋 Resumo do lead
**Status:** [uma linha]

### Principais pontos
- [bullet 1]
- [bullet 2]
- [bullet 3]

### Dores identificadas
- [...]

### Objeções já levantadas
- [...]

### Próximo passo recomendado
[uma frase]`;
  }
  return `${base}

Quando o usuário fizer uma pergunta ampla sobre o pipeline (ex: "quem está mais perto de fechar?"), use os dados do contexto para responder com nomes e números reais. Se faltar informação, diga claramente o que falta.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;

    const { customer_product_id, opportunity_id, messages = [], mode = 'chat' } = await req.json();
    if (!customer_product_id) {
      return new Response(JSON.stringify({ error: 'customer_product_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // verify ownership
    const { data: cp } = await admin.from('customer_products').select('user_id').eq('id', customer_product_id).maybeSingle();
    if (!cp || cp.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const context = await buildContext(customer_product_id, opportunity_id);
    const systemContent = `${systemPromptFor(mode as Mode)}

---
DADOS DISPONÍVEIS DO CRM (use APENAS isso como fonte de verdade):

${context}`;

    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY não configurada' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        stream: true,
        temperature: 0.6,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemContent },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de uso da Groq atingido. Tente novamente em alguns instantes.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const t = await aiResp.text();
      console.error('Groq API error', aiResp.status, t);
      return new Response(JSON.stringify({ error: `Erro Groq (${aiResp.status})` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('sa-copilot-chat error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
