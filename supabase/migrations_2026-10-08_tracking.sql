-- ===========================================================================
-- LABrand Forms — Rastreamento (Meta Pixel + Google Tag Manager)
-- Migração de 08/10/2026
-- ===========================================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Limpe o editor antes de colar: ele executa tudo que estiver na tela.
--
-- Modelo:
--   profiles.meta_pixel_id / profiles.gtm_id  → padrão da conta
--   forms.meta_pixel_id    / forms.gtm_id     → sobrescreve o padrão naquele form
--   forms.tracking_enabled                    → chave geral, DESLIGADA por padrão
--
-- Nenhum formulário passa a ser rastreado sozinho. Enquanto tracking_enabled
-- for FALSE, nenhuma tag é injetada — nem o padrão da conta. Isso é de
-- propósito: briefings de cliente (ex.: protrades) não devem carregar tag
-- nenhuma de terceiro.
-- ===========================================================================

-- 1. Colunas -----------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS gtm_id TEXT;

ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS gtm_id TEXT,
  ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Validação de formato ----------------------------------------------------
-- Pixel: só dígitos (15–16 no padrão atual da Meta, aceitamos 10–20).
-- GTM: GTM-XXXXXXX.

ALTER TABLE forms DROP CONSTRAINT IF EXISTS forms_meta_pixel_id_format;
ALTER TABLE forms ADD CONSTRAINT forms_meta_pixel_id_format
  CHECK (meta_pixel_id IS NULL OR meta_pixel_id ~ '^[0-9]{10,20}$');

ALTER TABLE forms DROP CONSTRAINT IF EXISTS forms_gtm_id_format;
ALTER TABLE forms ADD CONSTRAINT forms_gtm_id_format
  CHECK (gtm_id IS NULL OR gtm_id ~ '^GTM-[A-Z0-9]{4,10}$');

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_meta_pixel_id_format;
ALTER TABLE profiles ADD CONSTRAINT profiles_meta_pixel_id_format
  CHECK (meta_pixel_id IS NULL OR meta_pixel_id ~ '^[0-9]{10,20}$');

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_gtm_id_format;
ALTER TABLE profiles ADD CONSTRAINT profiles_gtm_id_format
  CHECK (gtm_id IS NULL OR gtm_id ~ '^GTM-[A-Z0-9]{4,10}$');

-- 3. Leitura pública dos IDs efetivos ----------------------------------------
-- O role anon continua SEM acesso direto Às colunas de rastreamento (e sem
-- acesso nenhum a profiles). Quem resolve o ID efetivo é esta função, que lê
-- só o que precisa e só de formulário publicado e com rastreamento ligado.

CREATE OR REPLACE FUNCTION public.get_form_tracking(p_form_id UUID)
RETURNS TABLE (meta_pixel_id TEXT, gtm_id TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NULLIF(COALESCE(NULLIF(f.meta_pixel_id, ''), NULLIF(p.meta_pixel_id, ''), ''), ''),
    NULLIF(COALESCE(NULLIF(f.gtm_id, ''),      NULLIF(p.gtm_id, ''),      ''), '')
  FROM forms f
  JOIN profiles p ON p.id = f.user_id
  WHERE f.id = p_form_id
    AND f.status = 'published'
    AND f.tracking_enabled = TRUE;
$$;

REVOKE ALL ON FUNCTION public.get_form_tracking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_form_tracking(UUID) TO anon, authenticated;

-- 4. Reafirma o grant restrito do role anon em forms --------------------------
-- (as colunas novas NÃO entram na lista — anon não lê meta_pixel_id/gtm_id)

REVOKE SELECT ON forms FROM anon;
GRANT SELECT (id, user_id, title, description, slug, status, theme, questions,
              thank_you_message, created_at, updated_at)
  ON forms TO anon;

-- 5. Conferência --------------------------------------------------------------
-- SELECT id, slug, tracking_enabled, meta_pixel_id, gtm_id FROM forms ORDER BY created_at;
-- SELECT * FROM public.get_form_tracking('b6aecaf4-437d-4eeb-a443-1a7f4662bc35');
