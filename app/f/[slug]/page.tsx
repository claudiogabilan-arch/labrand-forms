import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FormPlayer } from '@/components/form-player/form-player'
import { Form } from '@/lib/database.types'

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

  return <FormPlayer form={form} />
}

