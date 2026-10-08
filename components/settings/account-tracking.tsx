'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { BarChart3, Save } from 'lucide-react'

interface AccountTrackingProps {
  userId: string
  initialMetaPixelId: string | null
  initialGtmId: string | null
}

export function AccountTracking({
  userId,
  initialMetaPixelId,
  initialGtmId,
}: AccountTrackingProps) {
  const supabase = createClient()
  const [metaPixelId, setMetaPixelId] = useState(initialMetaPixelId ?? '')
  const [gtmId, setGtmId] = useState(initialGtmId ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const pixel = metaPixelId.trim()
  const gtm = gtmId.trim().toUpperCase()
  const error =
    pixel && !/^[0-9]{10,20}$/.test(pixel)
      ? 'O ID do Pixel da Meta é só número (15 a 16 dígitos).'
      : gtm && !/^GTM-[A-Z0-9]{4,10}$/.test(gtm)
        ? 'O ID do GTM tem o formato GTM-XXXXXXX.'
        : null

  const handleSave = async () => {
    if (error) {
      toast.error(error)
      return
    }
    setIsSaving(true)
    const { error: saveError } = await supabase
      .from('profiles')
      .update({ meta_pixel_id: pixel || null, gtm_id: gtm || null } as never)
      .eq('id', userId)

    if (saveError) {
      toast.error('Não foi possível salvar o rastreamento')
    } else {
      toast.success('Rastreamento padrão salvo')
    }
    setIsSaving(false)
  }

  return (
    <Card className="p-6 mt-6">
      <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-slate-400" />
        Rastreamento (padrão da conta)
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Usado nos formulários que tiverem o rastreamento ligado e não informarem um ID próprio.
        Formulário com rastreamento desligado não carrega tag nenhuma — nem este padrão.
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="account_meta_pixel_id">ID do Pixel da Meta</Label>
          <Input
            id="account_meta_pixel_id"
            inputMode="numeric"
            value={metaPixelId}
            onChange={(e) => setMetaPixelId(e.target.value.replace(/[^0-9]/g, ''))}
            className="mt-2"
            placeholder="123456789012345"
          />
        </div>

        <div>
          <Label htmlFor="account_gtm_id">ID do contêiner do GTM</Label>
          <Input
            id="account_gtm_id"
            value={gtmId}
            onChange={(e) => setGtmId(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            className="mt-2"
            placeholder="GTM-XXXXXXX"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button onClick={handleSave} disabled={isSaving || Boolean(error)}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </Card>
  )
}
