import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FormPlayer } from '@/components/form-player/form-player'
import { TrackingScripts } from '@/components/form-player/tracking-scripts'
import { Form, FormTracking } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

interface FormPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: FormPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('forms')
    .select('title, description')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  const form = data as { title: string; description: string | null } | null

  if (!form) {
    return { title: 'Formulário não encontrado' }
  }

  return {
    title: form.title || 'Formulário',
    description: form.description || 'Preencha este formulário',
  }
}

export default async function FormPage({ params }: FormPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('forms')
    .select('id, user_id, title, description, slug, status, theme, questions, thank_you_message, created_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  const form = data as unknown as Form | null

  if (error || !form) {
    notFound()
  }

  // IDs de rastreamento efetivos (form sobrescreve o padrão da conta).
  // A função só devolve algo se o formulário estiver publicado E com
  // rastreamento ligado. Qualquer erro aqui é silencioso: o formulário
  // precisa abrir mesmo que o rastreamento falhe.
  let tracking: FormTracking = { metaPixelId: null, gtmId: null }
  const { data: trackingRows } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown }>
  )('get_form_tracking', { p_form_id: form.id })
  const row = Array.isArray(trackingRows) ? trackingRows[0] : trackingRows
  if (row) {
    tracking = {
      metaPixelId: (row as { meta_pixel_id: string | null }).meta_pixel_id ?? null,
      gtmId: (row as { gtm_id: string | null }).gtm_id ?? null,
    }
  }

  return (
    <>
      <TrackingScripts metaPixelId={tracking.metaPixelId} gtmId={tracking.gtmId} />
      <FormPlayer form={form} tracking={tracking} />
    </>
  )
}

