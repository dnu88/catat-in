import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ProcessVoiceRequest = {
  transaction_id: string
  audio_path: string
  user_id: string
}

type ExtractedFields = {
  nominal: number | null
  type: 'income' | 'expense' | null
  kategori: string | null
  merchant: string | null
  tanggal: string | null
  catatan: string | null
}

type ProcessVoiceResponse = {
  status: 'done' | 'error'
  confidence: number
  review_required: boolean
  fields: ExtractedFields
  error_message?: string
}

async function transcribeAudioWithWhisper(audioUrl: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const audioResponse = await fetch(audioUrl)
  if (!audioResponse.ok) {
    throw new Error('Failed to fetch audio file')
  }

  const audioBlob = await audioResponse.blob()

  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.m4a')
  formData.append('model', 'whisper-1')
  formData.append('language', 'id')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Whisper API failed: ${response.status}`)
  }

  const data = await response.json()
  return data.text || ''
}

async function extractFromTextWithAI(rawText: string): Promise<{ confidence: number; fields: ExtractedFields }> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const prompt = `Extract transaction details from this Indonesian voice transcription. Return only valid JSON with keys: nominal, type, kategori, merchant, tanggal, catatan, confidence.\n\nRules:\n- nominal: number only\n- type: "income" or "expense"\n- tanggal: ISO date (YYYY-MM-DD) if available\n- confidence: number from 0 to 1\n\nTranscription: "${rawText}"`

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
          content: prompt,
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

  let audioPathToDelete: string | null = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const body: ProcessVoiceRequest = await req.json()

    const { transaction_id, audio_path, user_id } = body

    if (!transaction_id || !audio_path || !user_id) {
      return new Response(
        JSON.stringify({ error: 'transaction_id, audio_path, and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    audioPathToDelete = audio_path

    const { data: signedUrlData } = await supabase.storage
      .from('voice-inputs')
      .createSignedUrl(audio_path, 300)

    if (!signedUrlData?.signedUrl) {
      throw new Error('Failed to generate signed URL for audio')
    }

    const transcription = await transcribeAudioWithWhisper(signedUrlData.signedUrl)

    if (!transcription) {
      throw new Error('Suara tidak dikenali, coba di tempat lebih tenang')
    }

    const { confidence, fields } = await extractFromTextWithAI(transcription)
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
      raw_input: transcription,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', transaction_id)
      .eq('user_id', user_id)

    if (updateError) {
      throw updateError
    }

    const response: ProcessVoiceResponse = {
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
      } satisfies ProcessVoiceResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } finally {
    if (audioPathToDelete) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

        await supabase.storage.from('voice-inputs').remove([audioPathToDelete])
      } catch {
        // Silent fail on cleanup
      }
    }
  }
})
