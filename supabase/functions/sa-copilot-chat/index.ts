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
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

type Mode = 'chat' | 'next_action' | 'message' | 'summary';

function fmtMoney(n: number) {
  try { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }
  catch { return `R$ ${n}`; }
}

async function buildContext(customerProductId: string, opportunityId?: string | null) {
  const parts: string[] = [];

  // Pipeline overview
  const { data: opps } = await admin.from('crm_opportunities')
    .select('id,title,stage,value,probability,priority,expected_close_date,lost_reason,notes,customer_id,updated_at')
    .eq('customer_product_id', customerProductId)
    .order('updated_at', { ascending: false }).limit(200);

  const all = opps || [];
  const open = all.filter(o => !['won', 'lost'].includes((o.stage || '').toLowerCase()));
  const totalForecast = open.reduce((s, o) => s + Number(o.value || 0) * (Number(o.probability || 0) / 100), 0);

  parts.push(`# Pipeline geral
- Oportunidades em aberto: ${open.length}
- Forecast ponderado: ${fmtMoney(totalForecast)}
- Top 5 deals abertos:
${open.slice(0, 5).map(o => `  • ${o.title} — ${fmtMoney(Number(o.value || 0))} — estágio: ${o.stage} — prob: ${o.probability ?? 0}%`).join('\n') || '  (vazio)'}`);

  // Selected opportunity deep dive
  if (opportunityId) {
    const opp = all.find(o => o.id === opportunityId);
    if (opp) {
      const { data: cust } = opp.customer_id
        ? await admin.from('crm_customers').select('name,email,phone,company,notes,status,last_contact_date').eq('id', opp.customer_id).maybeSingle()
        : { data: null } as any;

      const { data: interactions } = await admin.from('crm_interactions')
        .select('type,subject,description,created_at')
        .eq('customer_product_id', customerProductId)
        .eq('customer_id', opp.customer_id ?? '00000000-0000-0000-0000-000000000000')
        .order('created_at', { ascending: false }).limit(20);

      const { data: memories } = cust?.name ? await admin.from('crm_client_memories')
        .select('summary,topics,sentiment,interaction_date')
        .eq('customer_product_id', customerProductId)
        .eq('client_name', cust.name)
        .order('interaction_date', { ascending: false }).limit(10) : { data: null } as any;

      parts.push(`# Lead selecionado
- Título: ${opp.title}
- Cliente: ${cust?.name ?? '—'} (${cust?.company ?? 'sem empresa'})
- Email: ${cust?.email ?? '—'} | Telefone: ${cust?.phone ?? '—'}
- Estágio: ${opp.stage} | Prob: ${opp.probability ?? 0}% | Valor: ${fmtMoney(Number(opp.value || 0))}
- Prioridade: ${opp.priority ?? '—'} | Fechamento previsto: ${opp.expected_close_date ?? '—'}
- Último contato: ${cust?.last_contact_date ?? '—'}
- Notas do deal: ${opp.notes ?? '—'}
- Notas do cliente: ${cust?.notes ?? '—'}`);

      if (interactions?.length) {
        parts.push(`# Histórico de interações (mais recentes primeiro)
${interactions.map(i => `- [${new Date(i.created_at).toLocaleDateString('pt-BR')}] ${i.type}${i.subject ? ' — ' + i.subject : ''}: ${i.description}`).join('\n')}`);
      }

      if (memories?.length) {
        parts.push(`# Memórias contextuais (RAG)
${memories.map((m: any) => `- [${new Date(m.interaction_date).toLocaleDateString('pt-BR')}] ${m.sentiment ? `(${m.sentiment}) ` : ''}${m.summary}${m.topics?.length ? ' — tópicos: ' + m.topics.join(', ') : ''}`).join('\n')}`);
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

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        stream: true,
        messages: [
          { role: 'system', content: systemContent },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de uso atingido. Tente novamente em alguns instantes.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos esgotados. Adicione créditos no workspace do Lovable.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const t = await aiResp.text();
      console.error('AI gateway error', aiResp.status, t);
      return new Response(JSON.stringify({ error: 'Erro no gateway de IA' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('sa-copilot-chat error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
