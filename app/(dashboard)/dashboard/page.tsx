import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, FileText } from 'lucide-react'
import { Form } from '@/lib/database.types'
import { FormCard } from '@/components/dashboard/form-card'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: formsData } = await supabase
    .from('forms')
    .select('*')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  const forms = (formsData || []) as Form[]

  // Get response counts for each form
  const formIds = forms.map(f => f.id)
  const { data: responseCounts } = formIds.length > 0 
    ? await supabase
        .from('responses')
        .select('form_id')
        .in('form_id', formIds)
    : { data: [] }

  const responseCountMap = new Map<string, number>()
  responseCounts?.forEach((r: { form_id: string }) => {
    const count = responseCountMap.get(r.form_id) || 0
    responseCountMap.set(r.form_id, count + 1)
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus formulários</h1>
          <p className="text-slate-600 mt-1">Crie e gerencie seus formulários</p>
        </div>
        <Link href="/forms/new">
          <Button className="bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all hover:shadow-slate-900/30 hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" />
            Novo formulário
          </Button>
        </Link>
      </div>

      {forms.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2 border-amber-200/60 bg-gradient-to-br from-white via-amber-50/30 to-stone-50/30">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-100 to-stone-100 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <FileText className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Crie seu primeiro formulário</h2>
          <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
            Diagnósticos, briefings e pesquisas com uma pergunta por vez, no padrão LABrand.
          </p>
          <Link href="/forms/new">
            <Button size="lg" className="bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/25 transition-all hover:shadow-slate-900/35 hover:-translate-y-0.5">
              <Plus className="w-5 h-5 mr-2" />
              Criar primeiro formulário
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <FormCard 
              key={form.id} 
              form={form} 
              responseCount={responseCountMap.get(form.id) || 0} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
