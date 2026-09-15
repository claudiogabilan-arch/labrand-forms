'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Form, Response, QuestionConfig, Json } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Search,
  Download,
  Trash2,
  MoreVertical,
  FileText,
  ExternalLink,
  Copy,
  Pencil,
  Image as ImageIcon,
  File,
  Eye,
  Maximize2,
  X,
} from 'lucide-react'

interface ResponsesDashboardProps {
  form: Form
  responses: Response[]
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('pt-BR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface FileUpload {
  name: string
  type: string
  size?: number
  data?: string  // base64 data URL (fallback)
  url?: string   // R2 URL (preferred)
}

function isFileUpload(answer: Json): boolean {
  if (answer === null || typeof answer !== 'object' || Array.isArray(answer)) {
    return false
  }
  const obj = answer as Record<string, unknown>
  // Check if it has name and either url or data (file upload signature)
  return (
    'name' in obj &&
    typeof obj.name === 'string' &&
    (('url' in obj && typeof obj.url === 'string') ||
     ('data' in obj && typeof obj.data === 'string'))
  )
}

function asFileUpload(answer: Json): FileUpload {
  return answer as unknown as FileUpload
}

function getFileUrl(file: FileUpload): string {
  // Prefer URL (R2) over data (base64)
  return file.url || file.data || ''
}

function formatAnswer(answer: Json): string {
  if (answer === null || answer === undefined) return '-'
  if (typeof answer === 'boolean') return answer ? 'Sim' : 'Não'
  if (Array.isArray(answer)) return answer.join(', ')
  if (typeof answer === 'object') {
    // Handle file uploads
    if (isFileUpload(answer)) {
      return asFileUpload(answer).name
    }
    return JSON.stringify(answer)
  }
  return String(answer)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function downloadCSV(filename: string, rows: string[][]) {
  const csvContent = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  // BOM para o Excel abrir acentuação corretamente
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate && !checked
      }}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900"
    />
  )
}

export function ResponsesDashboard({ form, responses: initialResponses }: ResponsesDashboardProps) {
  const supabase = createClient()
  const questions = (form.questions as QuestionConfig[]) || []

  const [responses, setResponses] = useState(initialResponses)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [filePreview, setFilePreview] = useState<FileUpload | null>(null)

  // Seleção de linhas
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Detalhe de uma resposta
  const [detailId, setDetailId] = useState<string | null>(null)

  // Exportação seletiva
  const [exportOpen, setExportOpen] = useState(false)
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all')
  const [exportQuestionIds, setExportQuestionIds] = useState<string[]>(questions.map(q => q.id))
  const [exportDate, setExportDate] = useState(true)

  // Filter responses based on search query
  const filteredResponses = useMemo(() => {
    if (!searchQuery.trim()) return responses

    const query = searchQuery.toLowerCase()
    return responses.filter(response => {
      const answers = response.answers as Record<string, Json>
      return Object.values(answers).some(answer =>
        formatAnswer(answer).toLowerCase().includes(query)
      )
    })
  }, [responses, searchQuery])

  const detailResponse = useMemo(
    () => responses.find(r => r.id === detailId) || null,
    [responses, detailId]
  )
  const detailIndex = useMemo(
    () => (detailId ? responses.findIndex(r => r.id === detailId) : -1),
    [responses, detailId]
  )

  const selectedCount = selectedIds.length
  const allFilteredSelected =
    filteredResponses.length > 0 &&
    filteredResponses.every(r => selectedIds.includes(r.id))

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => (checked ? [...new Set([...prev, id])] : prev.filter(x => x !== id)))
  }

  const toggleAllFiltered = (checked: boolean) => {
    const ids = filteredResponses.map(r => r.id)
    setSelectedIds(prev =>
      checked ? [...new Set([...prev, ...ids])] : prev.filter(id => !ids.includes(id))
    )
  }

  const handleDelete = async () => {
    if (!responseToDelete) return

    setIsDeleting(true)
    const { error } = await supabase
      .from('responses')
      .delete()
      .eq('id', responseToDelete)

    if (error) {
      toast.error('Não foi possível excluir a resposta')
    } else {
      setResponses(prev => prev.filter(r => r.id !== responseToDelete))
      setSelectedIds(prev => prev.filter(id => id !== responseToDelete))
      if (detailId === responseToDelete) setDetailId(null)
      toast.success('Resposta excluída')
    }
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setResponseToDelete(null)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    setIsDeleting(true)
    const ids = [...selectedIds]
    const { error } = await supabase.from('responses').delete().in('id', ids)

    if (error) {
      toast.error('Não foi possível excluir as respostas')
    } else {
      setResponses(prev => prev.filter(r => !ids.includes(r.id)))
      setSelectedIds([])
      if (detailId && ids.includes(detailId)) setDetailId(null)
      toast.success(
        ids.length === 1 ? 'Resposta excluída' : `${ids.length} respostas excluídas`
      )
    }
    setIsDeleting(false)
    setBulkDeleteOpen(false)
  }

  const openExport = () => {
    if (responses.length === 0) {
      toast.error('Nenhuma resposta para exportar')
      return
    }
    setExportScope(selectedCount > 0 ? 'selected' : 'all')
    setExportOpen(true)
  }

  const runExport = () => {
    const base = exportScope === 'selected'
      ? responses.filter(r => selectedIds.includes(r.id))
      : filteredResponses

    if (base.length === 0) {
      toast.error('Nenhuma resposta no recorte escolhido')
      return
    }

    const cols = questions.filter(q => exportQuestionIds.includes(q.id))
    if (cols.length === 0 && !exportDate) {
      toast.error('Escolha ao menos uma coluna')
      return
    }

    const headers = [
      ...(exportDate ? ['Enviado em'] : []),
      ...cols.map(q => q.title || 'Sem título'),
    ]
    const rows = base.map(response => {
      const answers = response.answers as Record<string, Json>
      return [
        ...(exportDate ? [formatDate(response.submitted_at)] : []),
        ...cols.map(q => formatAnswer(answers[q.id])),
      ]
    })

    downloadCSV(
      `${form.title || 'formulario'}-respostas-${new Date().toISOString().split('T')[0]}.csv`,
      [headers, ...rows]
    )
    setExportOpen(false)
    toast.success(`CSV exportado (${base.length} ${base.length === 1 ? 'resposta' : 'respostas'})`)
  }

  const exportSingle = (response: Response) => {
    const answers = response.answers as Record<string, Json>
    const rows: string[][] = [
      ['Pergunta', 'Resposta'],
      ['Enviado em', formatDate(response.submitted_at)],
      ...questions.map(q => [q.title || 'Sem título', formatAnswer(answers[q.id])]),
    ]
    downloadCSV(
      `${form.title || 'formulario'}-resposta-${response.id.slice(0, 8)}.csv`,
      rows
    )
    toast.success('CSV exportado')
  }

  const copySingle = (response: Response) => {
    const answers = response.answers as Record<string, Json>
    const text = [
      `${form.title} — resposta de ${formatDate(response.submitted_at)}`,
      '',
      ...questions.map(q => `${q.title || 'Sem título'}\n${formatAnswer(answers[q.id])}\n`),
    ].join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Resposta copiada')
  }

  const copyFormLink = () => {
    const link = `${window.location.origin}/f/${form.slug}`
    navigator.clipboard.writeText(link)
    toast.success('Link copiado')
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-12 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{form.title}</h1>
              {form.status === 'published' && (
                <Badge className="bg-emerald-100 text-emerald-700">Publicado</Badge>
              )}
              {form.status === 'draft' && (
                <Badge variant="secondary">Rascunho</Badge>
              )}
              {form.status === 'closed' && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">Encerrado</Badge>
              )}
            </div>
            <p className="text-slate-600 mt-1">
              {responses.length} {responses.length === 1 ? 'resposta' : 'respostas'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/forms/${form.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4 mr-2" />
                Editar formulário
              </Button>
            </Link>
            {form.status === 'published' && (
              <>
                <Button variant="outline" size="sm" onClick={copyFormLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar link
                </Button>
                <Link href={`/f/${form.slug}`} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver formulário
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Responses section */}
      {responses.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Nenhuma resposta ainda</h2>
          <p className="text-slate-600 max-w-sm mx-auto">
            {form.status === 'published'
              ? 'Compartilhe o link para começar a receber respostas'
              : 'Publique o formulário para começar a receber respostas'
            }
          </p>
          {form.status === 'published' && (
            <Button onClick={copyFormLink} className="mt-6 bg-slate-900 hover:bg-slate-800">
              <Copy className="w-4 h-4 mr-2" />
              Copiar link do formulário
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar respostas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={openExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Barra de seleção */}
          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">
                {selectedCount} {selectedCount === 1 ? 'resposta selecionada' : 'respostas selecionadas'}
              </span>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={openExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar selecionadas
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir selecionadas
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                <X className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>
          )}

          {/* Table */}
          <Card className="overflow-hidden">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px] sticky left-0 bg-white z-10 pl-6">
                      <Checkbox
                        checked={allFilteredSelected}
                        indeterminate={selectedCount > 0}
                        onChange={toggleAllFiltered}
                        label="Selecionar todas as respostas"
                      />
                    </TableHead>
                    <TableHead className="w-[180px]">Enviado em</TableHead>
                    {questions.map((question, index) => (
                      <TableHead key={question.id} className="min-w-[200px]">
                        <span className="text-slate-400 mr-2">{index + 1}.</span>
                        {question.title || 'Sem título'}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </TableHead>
                    ))}
                    <TableHead className="w-[60px] sticky right-0 bg-white z-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((response) => {
                    const answers = response.answers as Record<string, Json>
                    const isSelected = selectedIds.includes(response.id)
                    return (
                      <TableRow
                        key={response.id}
                        onClick={() => setDetailId(response.id)}
                        className={`cursor-pointer ${isSelected ? 'bg-slate-50' : ''}`}
                      >
                        <TableCell
                          className={`sticky left-0 z-10 pl-6 ${isSelected ? 'bg-slate-50' : 'bg-white'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={(checked) => toggleOne(response.id, checked)}
                            label="Selecionar resposta"
                          />
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatDate(response.submitted_at)}
                        </TableCell>
                        {questions.map((question) => {
                          const answer = answers[question.id]

                          // Special rendering for file uploads
                          if (isFileUpload(answer)) {
                            const file = asFileUpload(answer)
                            const isImage = file.type?.startsWith('image/')
                            return (
                              <TableCell key={question.id} className="max-w-[300px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setFilePreview(file)
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors text-sm group"
                                >
                                  {isImage ? (
                                    <ImageIcon className="w-4 h-4" />
                                  ) : (
                                    <File className="w-4 h-4" />
                                  )}
                                  <span className="truncate max-w-[150px]">{file.name}</span>
                                  <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              </TableCell>
                            )
                          }

                          return (
                            <TableCell key={question.id} className="max-w-[300px] truncate">
                              {formatAnswer(answer)}
                            </TableCell>
                          )
                        })}
                        <TableCell
                          className={`sticky right-0 z-10 ${isSelected ? 'bg-slate-50' : 'bg-white'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailId(response.id)}>
                                <Maximize2 className="mr-2 h-4 w-4" />
                                Ver resposta
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportSingle(response)}>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar esta resposta
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setResponseToDelete(response.id)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Card>

          {filteredResponses.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-slate-500">Nenhuma resposta corresponde à busca</p>
            </div>
          )}
        </>
      )}

      {/* Detalhe da resposta */}
      <Dialog open={!!detailResponse} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Resposta {detailIndex >= 0 ? `#${responses.length - detailIndex}` : ''}
            </DialogTitle>
            <DialogDescription>
              {detailResponse ? `Enviada em ${formatDate(detailResponse.submitted_at)}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0 mt-2 pr-1 space-y-5">
            {detailResponse && questions.map((question, index) => {
              const answers = detailResponse.answers as Record<string, Json>
              const answer = answers[question.id]
              return (
                <div key={question.id} className="border-b border-slate-100 pb-4 last:border-0">
                  <p className="text-sm text-slate-500 mb-1">
                    <span className="text-slate-400 mr-2">{index + 1}.</span>
                    {question.title || 'Sem título'}
                  </p>
                  {isFileUpload(answer) ? (
                    <button
                      onClick={() => setFilePreview(asFileUpload(answer))}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors text-sm"
                    >
                      <File className="w-4 h-4" />
                      {asFileUpload(answer).name}
                    </button>
                  ) : (
                    <p className="text-slate-900 whitespace-pre-wrap break-words">
                      {formatAnswer(answer)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <DialogFooter className="mt-4 gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => {
                if (!detailResponse) return
                setResponseToDelete(detailResponse.id)
                setDeleteDialogOpen(true)
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => detailResponse && copySingle(detailResponse)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </Button>
              <Button
                className="bg-slate-900 hover:bg-slate-800"
                onClick={() => detailResponse && exportSingle(detailResponse)}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exportação seletiva */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Exportar CSV</DialogTitle>
            <DialogDescription>
              Escolha quais respostas e quais perguntas entram no arquivo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0 space-y-5 mt-2 pr-1">
            <div>
              <p className="text-sm font-medium text-slate-900 mb-2">Respostas</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="export-scope"
                    checked={exportScope === 'all'}
                    onChange={() => setExportScope('all')}
                    className="h-4 w-4 accent-slate-900"
                  />
                  {searchQuery.trim()
                    ? `Todas as respostas da busca atual (${filteredResponses.length})`
                    : `Todas as respostas (${responses.length})`}
                </label>
                <label
                  className={`flex items-center gap-2 text-sm cursor-pointer ${selectedCount === 0 ? 'text-slate-400' : 'text-slate-700'}`}
                >
                  <input
                    type="radio"
                    name="export-scope"
                    disabled={selectedCount === 0}
                    checked={exportScope === 'selected'}
                    onChange={() => setExportScope('selected')}
                    className="h-4 w-4 accent-slate-900"
                  />
                  Apenas as selecionadas ({selectedCount})
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-900">
                  Perguntas ({exportQuestionIds.length} de {questions.length})
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExportQuestionIds(questions.map(q => q.id))}
                  >
                    Marcar todas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setExportQuestionIds([])}>
                    Desmarcar todas
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-[40vh] overflow-auto">
                <label className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                  <Checkbox
                    checked={exportDate}
                    onChange={setExportDate}
                    label="Incluir data de envio"
                  />
                  <span className="text-slate-700">Enviado em (data)</span>
                </label>
                {questions.map((question, index) => {
                  const checked = exportQuestionIds.includes(question.id)
                  return (
                    <label
                      key={question.id}
                      className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50"
                    >
                      <Checkbox
                        checked={checked}
                        onChange={(value) =>
                          setExportQuestionIds(prev =>
                            value
                              ? [...prev, question.id]
                              : prev.filter(id => id !== question.id)
                          )
                        }
                        label={question.title || 'Sem título'}
                      />
                      <span className="text-slate-700">
                        <span className="text-slate-400 mr-2">{index + 1}.</span>
                        {question.title || 'Sem título'}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={runExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir resposta</DialogTitle>
            <DialogDescription>
              Tem certeza? Esta resposta será excluída e a ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Excluir {selectedCount} {selectedCount === 1 ? 'resposta' : 'respostas'}
            </DialogTitle>
            <DialogDescription>
              Tem certeza? As respostas selecionadas serão excluídas e a ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File preview dialog */}
      <Dialog open={!!filePreview} onOpenChange={() => setFilePreview(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {filePreview?.type?.startsWith('image/') ? (
                <ImageIcon className="w-5 h-5 text-amber-700" />
              ) : (
                <File className="w-5 h-5 text-amber-700" />
              )}
              <span className="truncate">{filePreview?.name}</span>
            </DialogTitle>
            <DialogDescription>
              {filePreview?.size ? formatFileSize(filePreview.size) + ' • ' : ''}{filePreview?.type}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0 mt-4">
            {filePreview?.type?.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getFileUrl(filePreview)}
                alt={filePreview.name}
                className="max-w-full h-auto rounded-lg mx-auto"
              />
            ) : filePreview?.type === 'application/pdf' ? (
              <iframe
                src={getFileUrl(filePreview)}
                className="w-full h-[60vh] rounded-lg border"
                title={filePreview.name}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <File className="w-16 h-16 mb-4 opacity-50" />
                <p>Pré-visualização indisponível para este tipo de arquivo</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setFilePreview(null)}>
              Fechar
            </Button>
            {filePreview?.url ? (
              <a href={filePreview.url} target="_blank" rel="noopener noreferrer" download={filePreview.name}>
                <Button className="bg-slate-900 hover:bg-slate-800">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
              </a>
            ) : (
              <Button
                className="bg-slate-900 hover:bg-slate-800"
                onClick={() => {
                  if (filePreview?.data) {
                    const link = document.createElement('a')
                    link.href = filePreview.data
                    link.download = filePreview.name
                    link.click()
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
