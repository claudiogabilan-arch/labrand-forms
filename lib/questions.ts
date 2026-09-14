import { QuestionType, QuestionConfig } from './database.types'
import { 
  Type, 
  AlignLeft, 
  List, 
  CheckSquare, 
  Mail, 
  Phone, 
  Hash, 
  Calendar, 
  Star, 
  Gauge, 
  ThumbsUp, 
  Upload, 
  Link,
  LucideIcon
} from 'lucide-react'

export interface QuestionTypeInfo {
  type: QuestionType
  label: string
  description: string
  icon: LucideIcon
  defaultConfig: Partial<QuestionConfig>
}

export const questionTypes: QuestionTypeInfo[] = [
  {
    type: 'short_text',
    label: 'Texto curto',
    description: 'Campo de texto em uma linha',
    icon: Type,
    defaultConfig: {
      placeholder: 'Digite sua resposta aqui...',
    },
  },
  {
    type: 'long_text',
    label: 'Texto longo',
    description: 'Área de texto com várias linhas',
    icon: AlignLeft,
    defaultConfig: {
      placeholder: 'Digite sua resposta aqui...',
    },
  },
  {
    type: 'dropdown',
    label: 'Lista suspensa',
    description: 'Selecionar uma opção de uma lista',
    icon: List,
    defaultConfig: {
      options: ['Opção 1', 'Opção 2', 'Opção 3'],
    },
  },
  {
    type: 'checkboxes',
    label: 'Múltipla escolha',
    description: 'Selecionar várias opções de uma lista',
    icon: CheckSquare,
    defaultConfig: {
      options: ['Opção 1', 'Opção 2', 'Opção 3'],
    },
  },
  {
    type: 'email',
    label: 'E-mail',
    description: 'Campo de endereço de e-mail',
    icon: Mail,
    defaultConfig: {
      placeholder: 'nome@exemplo.com',
    },
  },
  {
    type: 'phone',
    label: 'Telefone',
    description: 'Campo de número de telefone',
    icon: Phone,
    defaultConfig: {
      placeholder: '(11) 99999-9999',
    },
  },
  {
    type: 'number',
    label: 'Número',
    description: 'Campo numérico',
    icon: Hash,
    defaultConfig: {
      placeholder: '0',
    },
  },
  {
    type: 'date',
    label: 'Data',
    description: 'Seletor de data',
    icon: Calendar,
    defaultConfig: {},
  },
  {
    type: 'rating',
    label: 'Avaliação',
    description: 'Avaliação por estrelas (1-5)',
    icon: Star,
    defaultConfig: {
      minValue: 1,
      maxValue: 5,
    },
  },
  {
    type: 'opinion_scale',
    label: 'Escala de opinião',
    description: 'Escala numérica (1-10)',
    icon: Gauge,
    defaultConfig: {
      minValue: 1,
      maxValue: 10,
    },
  },
  {
    type: 'yes_no',
    label: 'Sim / Não',
    description: 'Escolha simples entre sim ou não',
    icon: ThumbsUp,
    defaultConfig: {},
  },
  {
    type: 'file_upload',
    label: 'Upload de arquivo',
    description: 'Envio de imagens ou PDFs',
    icon: Upload,
    defaultConfig: {
      allowedFileTypes: ['image/*', 'application/pdf'],
      maxFileSize: 10, // MB
    },
  },
  {
    type: 'url',
    label: 'URL de site',
    description: 'Campo de URL',
    icon: Link,
    defaultConfig: {
      placeholder: 'https://exemplo.com.br',
    },
  },
]

export function getQuestionTypeInfo(type: QuestionType): QuestionTypeInfo | undefined {
  return questionTypes.find(qt => qt.type === type)
}

export function createDefaultQuestion(type: QuestionType): QuestionConfig {
  const typeInfo = getQuestionTypeInfo(type)
  const id = crypto.randomUUID()
  
  return {
    id,
    type,
    title: '',
    description: '',
    required: false,
    ...typeInfo?.defaultConfig,
  }
}

