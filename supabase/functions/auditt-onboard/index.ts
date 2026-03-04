import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    const {
      type, // 'oficina' | 'frota'
      cnpj,
      password,
      full_name,
      phone,
      // oficina-specific
      razao_social,
      nome_fantasia,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      email,
      valor_hora_tecnica,
      categorias,
      banco_nome,
      banco_agencia,
      banco_conta,
      banco_tipo_conta,
      banco_titular,
      banco_cpf_cnpj,
      pix_chave,
      // frota-specific
      tamanho_frota,
      veiculos,
      // file data (base64)
      alvara_base64,
      alvara_mime,
      fachada_base64,
      fachada_mime,
    } = body;

    if (!cnpj || !password || !type) {
      return json({ error: "CNPJ, senha e tipo são obrigatórios" }, 400);
    }

    const rawCnpj = cnpj.replace(/\D/g, "");
    const generatedEmail = `${rawCnpj}@auditt.app`;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Create user (or find existing)
    let userId: string;
    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: generatedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "", phone: phone || "" },
      });

    if (createError) {
      // If user already exists, try to find them
      if (createError.message?.includes("already been registered")) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existing = listData?.users?.find((u) => u.email === generatedEmail);
        if (existing) {
          userId = existing.id;
        } else {
          return json({ error: createError.message }, 400);
        }
      } else {
        return json({ error: createError.message }, 400);
      }
    } else {
      userId = userData.user.id;
    }

    // 2. Upload files if provided (using service_role, bypasses RLS)
    let alvaraUrl: string | null = null;
    let fachadaUrl: string | null = null;

    if (alvara_base64) {
      const ext = alvara_mime?.includes("pdf") ? "pdf" : "png";
      const path = `${userId}/alvara-${Date.now()}.${ext}`;
      const bytes = Uint8Array.from(atob(alvara_base64), (c) => c.charCodeAt(0));
      const { error: upErr } = await supabaseAdmin.storage
        .from("fleet_docs")
        .upload(path, bytes, { contentType: alvara_mime || "image/png" });
      if (!upErr) alvaraUrl = path;
    }

    if (fachada_base64) {
      const ext = fachada_mime?.includes("pdf") ? "pdf" : "png";
      const path = `${userId}/fachada-${Date.now()}.${ext}`;
      const bytes = Uint8Array.from(atob(fachada_base64), (c) => c.charCodeAt(0));
      const { error: upErr } = await supabaseAdmin.storage
        .from("fleet_docs")
        .upload(path, bytes, { contentType: fachada_mime || "image/png" });
      if (!upErr) fachadaUrl = path;
    }

    // 3. Insert data based on type
    if (type === "oficina") {
      const { error: insertErr } = await supabaseAdmin
        .from("fleet_partner_workshops")
        .insert({
          user_id: userId,
          cnpj: rawCnpj,
          razao_social: razao_social || null,
          nome_fantasia: nome_fantasia || null,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          cep: cep || null,
          telefone: telefone || null,
          email: email || null,
          valor_hora_tecnica: valor_hora_tecnica || 0,
          categorias: categorias || [],
          banco_nome: banco_nome || null,
          banco_agencia: banco_agencia || null,
          banco_conta: banco_conta || null,
          banco_tipo_conta: banco_tipo_conta || null,
          banco_titular: banco_titular || null,
          banco_cpf_cnpj: banco_cpf_cnpj || null,
          pix_chave: pix_chave || null,
          alvara_url: alvaraUrl,
          fachada_url: fachadaUrl,
          status: "pendente",
        });

      if (insertErr) {
        return json({ error: insertErr.message }, 400);
      }
    } else if (type === "frota") {
      // Create operator
      const { data: op, error: opErr } = await supabaseAdmin
        .from("fleet_operators")
        .insert({
          user_id: userId,
          cnpj: rawCnpj,
          razao_social: razao_social || null,
          nome_fantasia: nome_fantasia || null,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          telefone: telefone || null,
          email: email || null,
          tamanho_frota: tamanho_frota || 0,
        })
        .select("id")
        .single();

      if (opErr) return json({ error: opErr.message }, 400);

      // Create invite link
      const { data: invite, error: invErr } = await supabaseAdmin
        .from("fleet_driver_invites")
        .insert({ operator_id: op.id })
        .select("invite_code")
        .single();

      if (invErr) return json({ error: invErr.message }, 400);

      // Create customer_product
      await supabaseAdmin.from("customer_products").upsert(
        {
          user_id: userId,
          product_slug: "gestao-frotas-oficinas",
          product_title: "Gestão de Frotas & Oficinas",
          acquisition_type: "purchase",
          is_active: true,
          delivered_at: new Date().toISOString(),
        },
        { onConflict: "user_id,product_slug" },
      );

      // Get customer_product_id for vehicles
      const { data: cp } = await supabaseAdmin
        .from("customer_products")
        .select("id")
        .eq("user_id", userId)
        .eq("product_slug", "gestao-frotas-oficinas")
        .single();

      // Insert vehicles
      if (cp && veiculos && Array.isArray(veiculos)) {
        const validVeiculos = veiculos.filter(
          (v: { placa?: string }) => v.placa?.trim(),
        );
        if (validVeiculos.length > 0) {
          await supabaseAdmin.from("fleet_vehicles").insert(
            validVeiculos.map((v: { placa: string; modelo: string; ano: string }) => ({
              customer_product_id: cp.id,
              placa: v.placa.toUpperCase().trim(),
              modelo: v.modelo?.trim() || "",
              ano: v.ano?.trim() || "",
              status: "disponivel",
            })),
          );
        }
      }

      return json({
        ok: true,
        user_id: userId,
        email: generatedEmail,
        invite_code: invite.invite_code,
      });
    }

    return json({ ok: true, user_id: userId, email: generatedEmail });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
