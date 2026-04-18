// Sales Role-Play — Groq-powered lead simulator + scoring
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

const PERSONAS: Record<string, { label: string; brief: string }> = {
  cetico: {
    label: 'Cliente Cético',
    brief: 'Você é desconfiado, faz muitas perguntas, pede prova social e cases. Não acredita fácil em promessas. Use frases como "tenho minhas dúvidas", "já vi isso antes", "me prove". Seja firme mas não rude.',
  },
  preco: {
    label: 'Caçador de Preço',
    brief: 'Você é obcecado por desconto. Sempre compara com concorrente, ameaça sair se não baixar preço. Use "tá caro", "o concorrente X faz por metade", "me dá 30% de desconto". Resista a virar cliente sem desconto agressivo.',
  },
  tecnico: {
    label: 'Comprador Técnico',
    brief: 'Você é CTO/engenheiro. Foca em arquitetura, segurança, integrações, SLA, latência. Faz perguntas técnicas profundas. Não se importa com marketing — quer specs reais. Pergunte sobre stack, uptime, GDPR/LGPD.',
  },
  pressa: {
    label: 'Decisor com Pressa',
    brief: 'Você é executivo super ocupado. Quer pitch de 30 segundos. Interrompe se for longo. Use "vai direto ao ponto", "tenho 2 minutos", "resume". Perde paciência rápido com explicações compridas.',
  },
  indeciso: {
    label: 'Eternamente Indeciso',
    brief: 'Você adia decisão sempre. "Vou pensar", "preciso falar com a equipe", "me manda por e-mail". Cria objeções vagas. Nunca diz não, mas também não fecha. Frustrante.',
  },
};

function leadSystemPrompt(personaId: string, scenario: string): string {
  const p = PERSONAS[personaId] || PERSONAS.cetico;
  return `Você está fazendo um role-play de vendas. Seu papel: ATUAR COMO O LEAD (cliente potencial), não como vendedor.

# Sua persona: ${p.label}
${p.brief}

# Cenário
${scenario}

# Regras
- Responda SEMPRE em pt-BR, em primeira pessoa, como se fosse o cliente.
- Mantenha respostas curtas e realistas (2-5 frases). Como em uma conversa real de WhatsApp ou call.
- NUNCA quebre o personagem. Não diga "como IA", "como assistente" — você É o lead.
- Reaja com naturalidade às mensagens do vendedor: se ele for bom, demonstre interesse aos poucos. Se for fraco, dificulte mais.
- Se o vendedor fizer uma pergunta boa de descoberta, dê informação real do contexto.
- Se ele falar preço cedo demais ou pular descoberta, resista.
- Use tom brasileiro natural, sem formalidade exagerada.
- Não responda em listas/markdown — fale como pessoa em conversa.`;
}

function scoringSystemPrompt(): string {
  return `Você é um coach sênior de vendas B2B brasileiro. Avalie a performance do VENDEDOR em uma simulação de role-play. Seja honesto, direto e construtivo. Responda SOMENTE em JSON válido (sem markdown, sem texto extra).

Estrutura obrigatória:
{
  "score": <0-100>,
  "veredito": "<1 frase resumindo>",
  "pontos_fortes": ["<bullet>", "<bullet>", "<bullet>"],
  "pontos_fracos": ["<bullet>", "<bullet>", "<bullet>"],
  "metricas": {
    "abertura": <0-10>,
    "descoberta": <0-10>,
    "apresentacao_valor": <0-10>,
    "quebra_objecoes": <0-10>,
    "fechamento": <0-10>
  },
  "proximo_treino": "<1 frase com o que ele deve treinar a seguir>"
}

Critérios:
- Vendedor que vai direto ao preço sem descoberta = score baixo
- Vendedor que faz boas perguntas SPIN = score alto
- Vendedor que quebra objeções com empatia + dados = score alto
- Vendedor passivo, sem CTA = score médio-baixo`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY não configurada' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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

    const body = await req.json();
    const { mode, session_id, persona, scenario, transcript = [], message } = body;

    if (mode === 'reply') {
      // Generate next lead reply
      if (!persona || !scenario) {
        return new Response(JSON.stringify({ error: 'persona e scenario são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const history = (transcript || []).map((m: any) => ({
        role: m.role === 'vendedor' ? 'user' : 'assistant',
        content: m.text,
      }));
      if (message) history.push({ role: 'user', content: message });

      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.85,
          max_tokens: 400,
          messages: [
            { role: 'system', content: leadSystemPrompt(persona, scenario) },
            ...history,
          ],
        }),
      });

      if (!r.ok) {
        const t = await r.text();
        console.error('Groq error', r.status, t);
        return new Response(JSON.stringify({ error: `Groq ${r.status}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const j = await r.json();
      const reply = j.choices?.[0]?.message?.content?.trim() || '...';
      return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (mode === 'evaluate') {
      if (!session_id) {
        return new Response(JSON.stringify({ error: 'session_id obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: session } = await admin.from('sa_roleplay_sessions')
        .select('*').eq('id', session_id).maybeSingle();
      if (!session || session.user_id !== userId) {
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const tx = (session.transcript as any[]) || [];
      const formatted = tx.map(m => `${m.role === 'vendedor' ? 'VENDEDOR' : 'LEAD'}: ${m.text}`).join('\n');
      const personaLabel = PERSONAS[session.persona]?.label || session.persona;

      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: scoringSystemPrompt() },
            { role: 'user', content: `# Persona do lead\n${personaLabel}\n\n# Cenário\n${session.scenario}\n\n# Transcrição completa\n${formatted}\n\nAvalie agora.` },
          ],
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        console.error('Groq scoring error', r.status, t);
        return new Response(JSON.stringify({ error: `Groq ${r.status}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const j = await r.json();
      let feedback: any;
      try {
        feedback = JSON.parse(j.choices?.[0]?.message?.content || '{}');
      } catch {
        feedback = { score: 0, veredito: 'Erro ao parsear avaliação' };
      }

      await admin.from('sa_roleplay_sessions').update({
        status: 'completed',
        score: feedback.score ?? null,
        feedback,
      }).eq('id', session_id);

      return new Response(JSON.stringify({ feedback }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'mode inválido (reply | evaluate)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('sa-roleplay-chat error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
