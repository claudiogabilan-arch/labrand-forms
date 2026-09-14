'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

export function ResponsesDashboard({ form, responses: initialResponses }: ResponsesDashboardProps) {
  const router = useRouter()
  const supabase = createClient()
  const questions = (form.questions as QuestionConfig[]) || []

  const [responses, setResponses] = useState(initialResponses)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [filePreview, setFilePreview] = useState<FileUpload | null>(null)

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
      toast.success('Resposta excluída')
    }
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setResponseToDelete(null)
  }

  const exportToCSV = () => {
    if (responses.length === 0) {
      toast.error('Nenhuma resposta para exportar')
      return
    }

    // Build CSV header
    const headers = ['Enviado em', ...questions.map(q => q.title || 'Sem título')]
    
    // Build CSV rows
    const rows = responses.map(response => {
      const answers = response.answers as Record<string, Json>
      return [
        formatDate(response.submitted_at),
        ...questions.map(q => formatAnswer(answers[q.id]))
      ]
    })

    // Create CSV content
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${form.title || 'formulario'}-respostas-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    
    toast.success('CSV exportado')
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
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px] sticky left-0 bg-white z-10 pl-6">Enviado em</TableHead>
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
                    return (
                      <TableRow key={response.id}>
                        <TableCell className="font-medium sticky left-0 bg-white z-10 pl-6">
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
                                  onClick={() => setFilePreview(file)}
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
                        <TableCell className="sticky right-0 bg-white z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
