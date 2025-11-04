import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get token from URL path or query params
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    console.log('Received request with token:', token)

    // Validate token
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autenticação não fornecido' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Find customer product by webhook token
    const { data: customerProduct, error: cpError } = await supabase
      .from('customer_products')
      .select('id, product_slug, is_active')
      .eq('webhook_token', token)
      .eq('product_slug', 'relatorios-financeiros')
      .eq('is_active', true)
      .single()

    if (cpError || !customerProduct) {
      console.error('Invalid token or product not found:', cpError)
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou produto não encontrado' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    const { tipo, valor, categoria, descricao, data, operacao, id } = await req.json()

    console.log('Processing financial record:', { tipo, valor, categoria, descricao, data, operacao, id })

    // Validate required fields based on operation
    const finalOperacao = operacao || 'adicionar'

    if (finalOperacao === 'apagar') {
      // Delete specific record by ID or by matching criteria
      let deleteQuery = supabase
        .from('financial_records')
        .delete()
        .eq('customer_product_id', customerProduct.id)

      if (id) {
        // Delete by ID
        deleteQuery = deleteQuery.eq('id', id)
      } else {
        // Delete by matching criteria
        if (!tipo || !categoria) {
          throw new Error('Para apagar sem ID, forneça: tipo, categoria')
        }
        
        const type = tipo === 'receita' ? 'income' : 'expense'
        deleteQuery = deleteQuery
          .eq('type', type)
          .eq('category', categoria)
        
        if (data) deleteQuery = deleteQuery.eq('date', data)
        if (descricao) deleteQuery = deleteQuery.eq('description', descricao)
        if (valor !== undefined) deleteQuery = deleteQuery.eq('amount', Math.abs(valor))
      }

      const { error: deleteError } = await deleteQuery

      if (deleteError) {
        console.error('Delete error:', deleteError)
        throw deleteError
      }

      console.log('Financial record(s) deleted successfully')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Registro(s) financeiro(s) apagado(s) com sucesso',
          operacao: 'apagar'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (!tipo || !categoria) {
      throw new Error('Campos obrigatórios: tipo, categoria')
    }

    // Validate tipo (must be 'receita' or 'despesa')
    if (tipo !== 'receita' && tipo !== 'despesa') {
      throw new Error('Tipo deve ser "receita" ou "despesa"')
    }

    const type = tipo === 'receita' ? 'income' : 'expense'
    const finalCategoria = categoria || 'Outros'
    const finalDescricao = descricao || 'Sem descrição'
    const finalData = data || new Date().toISOString().split('T')[0]

    // Handle different operations
    if (finalOperacao === 'zerar') {
      // Delete all records of this type and category for this customer
      const { error: deleteError } = await supabase
        .from('financial_records')
        .delete()
        .eq('customer_product_id', customerProduct.id)
        .eq('type', type)
        .eq('category', finalCategoria)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        throw deleteError
      }

      console.log(`All ${type} records in category ${finalCategoria} deleted successfully`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Todos os registros de ${tipo} na categoria ${finalCategoria} foram zerados`,
          operacao: 'zerar'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (finalOperacao === 'substituir') {
      // Delete existing records of this type and category
      const { error: deleteError } = await supabase
        .from('financial_records')
        .delete()
        .eq('customer_product_id', customerProduct.id)
        .eq('type', type)
        .eq('category', finalCategoria)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        throw deleteError
      }

      console.log(`Existing ${type} records in category ${finalCategoria} deleted for replacement`)
    }

    // Validate valor for adicionar and substituir operations
    if (valor === undefined || valor === null) {
      throw new Error('Campo obrigatório: valor')
    }

    // Insert financial record for this specific customer
    const { error: insertError } = await supabase
      .from('financial_records')
      .insert({
        customer_product_id: customerProduct.id,
        type,
        category: finalCategoria,
        amount: Math.abs(valor),
        description: finalDescricao,
        date: finalData
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      throw insertError
    }

    console.log('Financial record created successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Registro financeiro criado com sucesso',
        record: {
          tipo,
          valor,
          categoria,
          descricao,
          data: finalData
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
