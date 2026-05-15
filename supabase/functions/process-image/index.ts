import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ProcessImageRequest = {
  transaction_id: string
  image_url: string
  is_physical_receipt?: boolean
}

type ExtractedFields = {
  nominal: number | null
  type: 'income' | 'expense' | null
  kategori: string | null
  merchant: string | null
  tanggal: string | null
  catatan: string | null
}

type ProcessImageResponse = {
  status: 'done' | 'error'
  confidence: number
  review_required: boolean
  fields: ExtractedFields
  error_message?: string
}

async function assertProcessableTransaction(
  supabase: ReturnType<typeof createClient>,
  transactionId: string,
  userId: string,
): Promise<Response | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, status')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return new Response(
      JSON.stringify({ error: 'Transaction not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (data.status !== 'processing') {
    return new Response(
      JSON.stringify({ error: 'Transaction is not processable' }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return null
}

async function extractFromImageWithAI(imageUrl: string): Promise<{ confidence: number; fields: ExtractedFields }> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const prompt = `Extract transaction details from this receipt image. Return only valid JSON with keys: nominal, type, kategori, merchant, tanggal, catatan, confidence.\n\nRules:\n- nominal: number only\n- type: "income" or "expense"\n- tanggal: ISO date (YYYY-MM-DD) if available\n- confidence: number from 0 to 1`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic API failed: ${response.status}`)
  }

  const data = await response.json()
  const text = data?.content?.[0]?.text

  if (!text) {
    throw new Error('No extraction result from AI')
  }

  const parsed = JSON.parse(text)

  return {
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    fields: {
      nominal: typeof parsed.nominal === 'number' ? parsed.nominal : null,
      type: parsed.type === 'income' || parsed.type === 'expense' ? parsed.type : null,
      kategori: typeof parsed.kategori === 'string' ? parsed.kategori : null,
      merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
      tanggal: typeof parsed.tanggal === 'string' ? parsed.tanggal : null,
      catatan: typeof parsed.catatan === 'string' ? parsed.catatan : null,
    },
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authorization = req.headers.get('Authorization') ?? ''
    const token = authorization.replace(/^Bearer\s+/i, '')

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Authorization bearer token is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: authData, error: authError } = await authClient.auth.getUser(token)

    if (authError || !authData.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userId = authData.user.id
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const body: ProcessImageRequest = await req.json()

    const { transaction_id, image_url } = body

    if (!transaction_id || !image_url) {
      return new Response(
        JSON.stringify({ error: 'transaction_id and image_url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const preflightResponse = await assertProcessableTransaction(supabase, transaction_id, userId)
    if (preflightResponse) {
      return preflightResponse
    }

    const { confidence, fields } = await extractFromImageWithAI(image_url)
    const reviewRequired = confidence < 0.85

    const updatePayload = {
      status: 'done',
      confidence,
      review_required: reviewRequired,
      nominal: fields.nominal,
      type: fields.type,
      kategori: fields.kategori,
      merchant: fields.merchant,
      tanggal: fields.tanggal,
      catatan: fields.catatan,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', transaction_id)
      .eq('user_id', userId)
      .select('id')
      .single()

    if (updateError) {
      throw updateError
    }

    const response: ProcessImageResponse = {
      status: 'done',
      confidence,
      review_required: reviewRequired,
      fields,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return new Response(
      JSON.stringify({
        status: 'error',
        confidence: 0,
        review_required: true,
        fields: {
          nominal: null,
          type: null,
          kategori: null,
          merchant: null,
          tanggal: null,
          catatan: null,
        },
        error_message: errorMessage,
      } satisfies ProcessImageResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
