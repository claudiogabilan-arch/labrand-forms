// LABrand Forms — camada de eventos de rastreamento.
//
// Tudo aqui é tolerante a falha de propósito: se o Pixel ou o GTM não
// carregou (bloqueador de anúncio, rede ruim, ID errado), o formulário
// continua funcionando normalmente. Rastreamento nunca pode derrubar o
// player — foi essa a lição dos dois bugs críticos de setembro.

type TrackingValue = string | number | boolean | string[] | null | undefined
type TrackingPayload = Record<string, TrackingValue>

interface FbqFn {
  (...args: unknown[]): void
  queue?: unknown[]
  loaded?: boolean
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    fbq?: FbqFn
  }
}

/** Empurra um evento para o dataLayer do GTM. */
export function pushDataLayer(event: string, payload: TrackingPayload = {}) {
  if (typeof window === 'undefined') return
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event, ...payload })
  } catch {
    // silencioso de propósito
  }
}

/** Dispara um evento padrão da Meta (PageView, Lead, ...). */
export function trackMeta(event: string, payload: TrackingPayload = {}) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  try {
    window.fbq('track', event, payload)
  } catch {
    // silencioso de propósito
  }
}

/** Dispara um evento personalizado da Meta (não padronizado). */
export function trackMetaCustom(event: string, payload: TrackingPayload = {}) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  try {
    window.fbq('trackCustom', event, payload)
  } catch {
    // silencioso de propósito
  }
}

export interface FormContext {
  formId: string
  formSlug: string
  formTitle: string
  [key: string]: TrackingValue
}

/** Visitante abriu o formulário. */
export function trackFormView(ctx: FormContext, totalQuestions: number) {
  pushDataLayer('form_view', { ...ctx, total_questions: totalQuestions })
  trackMeta('ViewContent', {
    content_name: ctx.formTitle,
    content_category: 'labrand_form',
    content_ids: [ctx.formSlug],
  })
}

/** Visitante respondeu a primeira pergunta — é aqui que ele vira engajado. */
export function trackFormStart(ctx: FormContext) {
  pushDataLayer('form_start', ctx)
  trackMetaCustom('FormStart', { content_name: ctx.formTitle })
}

/**
 * Avanço de pergunta. Só vai para o dataLayer: mandar cada passo para a Meta
 * polui a conta e não melhora a otimização. Quem quiser ver o funil pergunta
 * a pergunta monta no GTM/GA4 em cima deste evento.
 */
export function trackFormStep(
  ctx: FormContext,
  stepIndex: number,
  totalQuestions: number,
  questionTitle: string
) {
  pushDataLayer('form_step', {
    ...ctx,
    step: stepIndex + 1,
    total_questions: totalQuestions,
    question_title: questionTitle,
    progress_pct: totalQuestions > 0 ? Math.round(((stepIndex + 1) / totalQuestions) * 100) : 0,
  })
}

/** Resposta gravada com sucesso. É o evento que o tráfego otimiza. */
export function trackFormSubmit(ctx: FormContext, totalQuestions: number) {
  pushDataLayer('form_submit', { ...ctx, total_questions: totalQuestions })
  trackMeta('Lead', {
    content_name: ctx.formTitle,
    content_category: 'labrand_form',
    content_ids: [ctx.formSlug],
  })
}
