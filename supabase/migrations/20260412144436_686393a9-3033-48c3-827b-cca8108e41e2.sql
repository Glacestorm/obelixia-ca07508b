
-- ============================================================
-- G2.2 — Corridor Pack Administration
-- ============================================================

-- 1. Security definer function for mobility admin access
CREATE OR REPLACE FUNCTION public.user_has_hr_mobility_admin_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'superadmin')
      OR EXISTS (
        SELECT 1
        FROM erp_hr_role_assignments ra
        JOIN erp_hr_role_permissions rp ON rp.role_id = ra.role_id
        JOIN erp_hr_enterprise_permissions ep ON ep.id = rp.permission_id
        WHERE ra.user_id = auth.uid()
          AND ra.company_id = p_company_id
          AND ra.is_active = true
          AND ep.module = 'hr'
          AND ep.action IN ('mobility_admin', 'knowledge_governance', 'full_access')
      )
    )
$$;

-- 2. Table
CREATE TABLE public.erp_hr_corridor_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  canonical_code text NOT NULL,
  slug text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  version text NOT NULL DEFAULT '1.0.0',
  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'deprecated')),
  is_active boolean NOT NULL DEFAULT true,
  confidence_score integer CHECK (confidence_score >= 0 AND confidence_score <= 100),
  maturity_level text NOT NULL DEFAULT 'initial'
    CHECK (maturity_level IN ('initial', 'reviewed', 'validated', 'production')),
  category text NOT NULL DEFAULT 'full_corridor'
    CHECK (category IN ('bilateral_ss', 'tax_treaty', 'immigration', 'full_corridor')),
  review_owner text,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  published_at timestamptz,
  published_by uuid,
  pack_data jsonb NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_notes text,
  officiality text NOT NULL DEFAULT 'internal_guidance'
    CHECK (officiality IN ('internal_guidance', 'preparatory', 'partial')),
  automation_boundary_note text,
  parent_version_id uuid REFERENCES public.erp_hr_corridor_packs(id),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Unique indexes (expression-based)
CREATE UNIQUE INDEX idx_corridor_pack_version_unique
  ON public.erp_hr_corridor_packs(
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    origin, destination, version
  );

CREATE UNIQUE INDEX idx_one_published_active_per_corridor
  ON public.erp_hr_corridor_packs(
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    origin, destination
  )
  WHERE publication_status = 'published' AND is_active = true;

CREATE INDEX idx_corridor_packs_origin_dest ON public.erp_hr_corridor_packs(origin, destination);
CREATE INDEX idx_corridor_packs_status ON public.erp_hr_corridor_packs(publication_status, is_active);
CREATE INDEX idx_corridor_packs_company ON public.erp_hr_corridor_packs(company_id);

-- 4. updated_at trigger
CREATE TRIGGER update_erp_hr_corridor_packs_updated_at
  BEFORE UPDATE ON public.erp_hr_corridor_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS
ALTER TABLE public.erp_hr_corridor_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corridor_packs_select"
  ON public.erp_hr_corridor_packs FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR public.user_has_erp_company_access(company_id)
  );

CREATE POLICY "corridor_packs_insert"
  ON public.erp_hr_corridor_packs FOR INSERT TO authenticated
  WITH CHECK (
    CASE
      WHEN company_id IS NULL THEN public.has_role(auth.uid(), 'superadmin')
      ELSE public.user_has_hr_mobility_admin_access(company_id)
    END
  );

CREATE POLICY "corridor_packs_update"
  ON public.erp_hr_corridor_packs FOR UPDATE TO authenticated
  USING (
    CASE
      WHEN company_id IS NULL THEN public.has_role(auth.uid(), 'superadmin')
      ELSE public.user_has_hr_mobility_admin_access(company_id)
    END
  )
  WITH CHECK (
    CASE
      WHEN company_id IS NULL THEN public.has_role(auth.uid(), 'superadmin')
      ELSE public.user_has_hr_mobility_admin_access(company_id)
    END
  );

-- 6. RPC Functions

-- 6a. publish_corridor_pack — atomic publish with row locking
CREATE OR REPLACE FUNCTION public.publish_corridor_pack(
  p_pack_id uuid,
  p_reason text DEFAULT 'Published'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack erp_hr_corridor_packs;
  v_old_published erp_hr_corridor_packs;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT * INTO v_pack FROM erp_hr_corridor_packs WHERE id = p_pack_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pack not found');
  END IF;

  IF v_pack.company_id IS NULL THEN
    IF NOT public.has_role(v_user_id, 'superadmin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only superadmin can publish global packs');
    END IF;
  ELSE
    IF NOT public.user_has_hr_mobility_admin_access(v_pack.company_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
    END IF;
  END IF;

  IF v_pack.publication_status = 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already published');
  END IF;
  IF v_pack.publication_status = 'deprecated' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot publish deprecated pack');
  END IF;

  -- Lock and deprecate previous published versions for same corridor+tenant
  FOR v_old_published IN
    SELECT * FROM erp_hr_corridor_packs
    WHERE COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(v_pack.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND origin = v_pack.origin AND destination = v_pack.destination
      AND publication_status = 'published' AND is_active = true
      AND id != p_pack_id
    FOR UPDATE
  LOOP
    UPDATE erp_hr_corridor_packs
      SET publication_status = 'deprecated', is_active = false, updated_by = v_user_id
      WHERE id = v_old_published.id;
    INSERT INTO erp_hr_audit_log (company_id, user_id, action, table_name, record_id, old_data, new_data, category, severity, metadata)
    VALUES (v_old_published.company_id, v_user_id, 'corridor_pack_auto_deprecated', 'erp_hr_corridor_packs',
      v_old_published.id::text,
      jsonb_build_object('publication_status', v_old_published.publication_status, 'is_active', v_old_published.is_active),
      jsonb_build_object('publication_status', 'deprecated', 'is_active', false),
      'mobility', 'info', jsonb_build_object('reason', 'Superseded by ' || p_pack_id::text));
  END LOOP;

  UPDATE erp_hr_corridor_packs
    SET publication_status = 'published', published_at = now(), published_by = v_user_id, is_active = true, updated_by = v_user_id
    WHERE id = p_pack_id;

  INSERT INTO erp_hr_audit_log (company_id, user_id, action, table_name, record_id, old_data, new_data, category, severity, metadata)
  VALUES (v_pack.company_id, v_user_id, 'corridor_pack_published', 'erp_hr_corridor_packs', p_pack_id::text,
    jsonb_build_object('publication_status', v_pack.publication_status),
    jsonb_build_object('publication_status', 'published', 'published_at', now()::text),
    'mobility', 'info', jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('success', true, 'pack_id', p_pack_id);
END;
$$;

-- 6b. duplicate_corridor_pack
CREATE OR REPLACE FUNCTION public.duplicate_corridor_pack(
  p_pack_id uuid,
  p_new_version text,
  p_reason text DEFAULT 'New version'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack erp_hr_corridor_packs;
  v_new_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT * INTO v_pack FROM erp_hr_corridor_packs WHERE id = p_pack_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source pack not found');
  END IF;

  IF v_pack.company_id IS NULL THEN
    IF NOT public.has_role(v_user_id, 'superadmin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only superadmin can duplicate global packs');
    END IF;
  ELSE
    IF NOT public.user_has_hr_mobility_admin_access(v_pack.company_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
    END IF;
  END IF;

  v_new_id := gen_random_uuid();
  INSERT INTO erp_hr_corridor_packs (
    id, company_id, canonical_code, slug, origin, destination, version,
    publication_status, is_active, confidence_score, maturity_level, category,
    review_owner, last_reviewed_at, pack_data, sources, internal_notes,
    officiality, automation_boundary_note, parent_version_id, created_by, updated_by
  ) VALUES (
    v_new_id, v_pack.company_id, v_pack.canonical_code, v_pack.slug,
    v_pack.origin, v_pack.destination, p_new_version,
    'draft', true, v_pack.confidence_score, 'initial', v_pack.category,
    v_pack.review_owner, v_pack.last_reviewed_at, v_pack.pack_data,
    v_pack.sources, v_pack.internal_notes, v_pack.officiality,
    v_pack.automation_boundary_note, p_pack_id, v_user_id, v_user_id
  );

  INSERT INTO erp_hr_audit_log (company_id, user_id, action, table_name, record_id, old_data, new_data, category, severity, metadata)
  VALUES (v_pack.company_id, v_user_id, 'corridor_pack_duplicated', 'erp_hr_corridor_packs', v_new_id::text, NULL,
    jsonb_build_object('version', p_new_version, 'parent_version_id', p_pack_id),
    'mobility', 'info', jsonb_build_object('reason', p_reason, 'source_version', v_pack.version));

  RETURN jsonb_build_object('success', true, 'new_pack_id', v_new_id, 'version', p_new_version);
END;
$$;

-- 6c. deprecate_corridor_pack
CREATE OR REPLACE FUNCTION public.deprecate_corridor_pack(
  p_pack_id uuid,
  p_reason text DEFAULT 'Deprecated'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack erp_hr_corridor_packs;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT * INTO v_pack FROM erp_hr_corridor_packs WHERE id = p_pack_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pack not found');
  END IF;

  IF v_pack.company_id IS NULL THEN
    IF NOT public.has_role(v_user_id, 'superadmin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only superadmin can deprecate global packs');
    END IF;
  ELSE
    IF NOT public.user_has_hr_mobility_admin_access(v_pack.company_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
    END IF;
  END IF;

  IF v_pack.publication_status = 'deprecated' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already deprecated');
  END IF;

  INSERT INTO erp_hr_audit_log (company_id, user_id, action, table_name, record_id, old_data, new_data, category, severity, metadata)
  VALUES (v_pack.company_id, v_user_id, 'corridor_pack_deprecated', 'erp_hr_corridor_packs', p_pack_id::text,
    jsonb_build_object('publication_status', v_pack.publication_status, 'is_active', v_pack.is_active),
    jsonb_build_object('publication_status', 'deprecated', 'is_active', false),
    'mobility', 'warning', jsonb_build_object('reason', p_reason));

  UPDATE erp_hr_corridor_packs SET publication_status = 'deprecated', is_active = false, updated_by = v_user_id WHERE id = p_pack_id;
  RETURN jsonb_build_object('success', true, 'pack_id', p_pack_id);
END;
$$;

-- 6d. toggle_corridor_pack_active
CREATE OR REPLACE FUNCTION public.toggle_corridor_pack_active(
  p_pack_id uuid,
  p_active boolean,
  p_reason text DEFAULT 'Toggled'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack erp_hr_corridor_packs;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT * INTO v_pack FROM erp_hr_corridor_packs WHERE id = p_pack_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pack not found');
  END IF;

  IF v_pack.company_id IS NULL THEN
    IF NOT public.has_role(v_user_id, 'superadmin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only superadmin can toggle global packs');
    END IF;
  ELSE
    IF NOT public.user_has_hr_mobility_admin_access(v_pack.company_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
    END IF;
  END IF;

  IF p_active = true AND v_pack.publication_status = 'deprecated' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot activate a deprecated pack');
  END IF;

  INSERT INTO erp_hr_audit_log (company_id, user_id, action, table_name, record_id, old_data, new_data, category, severity, metadata)
  VALUES (v_pack.company_id, v_user_id,
    CASE WHEN p_active THEN 'corridor_pack_activated' ELSE 'corridor_pack_deactivated' END,
    'erp_hr_corridor_packs', p_pack_id::text,
    jsonb_build_object('is_active', v_pack.is_active), jsonb_build_object('is_active', p_active),
    'mobility', 'info', jsonb_build_object('reason', p_reason));

  UPDATE erp_hr_corridor_packs SET is_active = p_active, updated_by = v_user_id WHERE id = p_pack_id;
  RETURN jsonb_build_object('success', true, 'pack_id', p_pack_id, 'is_active', p_active);
END;
$$;

-- ============================================================
-- 7. Seed data — Phase 1 snapshot (9 corridor packs)
-- These 9 INSERTs are a one-time snapshot from the TypeScript constants in
-- corridorKnowledgePacks.ts (Phase 1). After this seed, the operational
-- source of truth for corridor packs is this DB table.
-- The TypeScript constants remain ONLY as a compatibility fallback.
-- ============================================================

INSERT INTO public.erp_hr_corridor_packs (company_id, canonical_code, slug, origin, destination, version, publication_status, is_active, confidence_score, maturity_level, category, review_owner, last_reviewed_at, next_review_at, published_at, pack_data, sources, officiality, automation_boundary_note, created_by) VALUES
(NULL, 'COR-ES-FR', 'es-fr', 'ES', 'FR', '1.0.0', 'published', true, 90, 'reviewed', 'full_corridor', 'HR-Legal-Mobility', '2026-04-01'::timestamptz, '2026-07-01'::timestamptz, now(),
 '{"ss":{"regime":"eu_eea_ch","framework":"Reglamento CE 883/2004","maxMonths":24,"certType":"A1","notes":"Desplazamiento temporal hasta 24 meses con certificado A1."},"cdi":{"hasCDI":true,"treatyRef":"CDI España-Francia, BOE 12/06/1997","keyArticles":["Art. 15","Art. 24"],"withholdingRates":{"dividends":"15%","interest":"10%","royalties":"5%","employment":"Según Art. 15"}},"tax":{"residenceDaysThreshold":183,"art7pApplicable":true,"beckhamEquivalent":"Régimen impatriados francés (Art. 155 B CGI)","exitTax":true,"notes":"Francia aplica exit tax."},"immigration":{"workPermitRequired":false,"visaType":"Libre circulación UE","processingDays":"N/A","notes":"Registro tras 3 meses."},"payroll":{"splitRecommended":false,"shadowRecommended":true,"taxEqRecommended":false},"requiredDocuments":["a1_certificate","assignment_letter","tax_residency_cert"],"reviewTriggers":[{"id":"FR-01","severity":"info","reason":"Exit tax francés","affectedModule":"fiscal","suggestedAction":"Verificar plusvalías","evidenceRequired":false},{"id":"FR-02","severity":"warning","reason":"A1 expira >24m","affectedModule":"hr","suggestedAction":"Extensión A1","evidenceRequired":true}]}'::jsonb,
 '[{"label":"Reglamento CE 883/2004","type":"treaty_text"},{"label":"CDI España-Francia 1995","type":"treaty_text"},{"label":"BOE — Convenio SS España-Francia","type":"official_gazette"}]'::jsonb,
 'internal_guidance', 'SS classification and Art.7.p eligibility automated. French social charges require external advisor.', NULL),

(NULL, 'COR-ES-PT', 'es-pt', 'ES', 'PT', '1.0.0', 'published', true, 92, 'reviewed', 'full_corridor', 'HR-Legal-Mobility', '2026-04-01'::timestamptz, '2026-07-01'::timestamptz, now(),
 '{"ss":{"regime":"eu_eea_ch","framework":"Reglamento CE 883/2004","maxMonths":24,"certType":"A1","notes":"A1 estándar UE."},"cdi":{"hasCDI":true,"treatyRef":"CDI España-Portugal, BOE 07/11/1995","keyArticles":["Art. 15","Art. 23"],"withholdingRates":{"dividends":"15%","interest":"15%","royalties":"5%","employment":"Según Art. 15"}},"tax":{"residenceDaysThreshold":183,"art7pApplicable":true,"beckhamEquivalent":"Régimen NHR — en revisión desde 2024","exitTax":false,"notes":"NHR en reforma."},"immigration":{"workPermitRequired":false,"visaType":"Libre circulación UE","processingDays":"N/A","notes":"NIF portugués necesario."},"payroll":{"splitRecommended":false,"shadowRecommended":false,"taxEqRecommended":false},"requiredDocuments":["a1_certificate","assignment_letter","tax_residency_cert"],"reviewTriggers":[{"id":"PT-01","severity":"warning","reason":"NHR en revisión","affectedModule":"fiscal","suggestedAction":"Consultar asesor fiscal portugués","evidenceRequired":false}]}'::jsonb,
 '[{"label":"Reglamento CE 883/2004","type":"treaty_text"},{"label":"CDI España-Portugal 1993","type":"treaty_text"}]'::jsonb,
 'internal_guidance', 'SS and CDI automated. Portugal NHR requires specialized tax advisor.', NULL),

(NULL, 'COR-ES-DE', 'es-de', 'ES', 'DE', '1.0.0', 'published', true, 91, 'reviewed', 'full_corridor', 'HR-Legal-Mobility', '2026-04-01'::timestamptz, '2026-07-01'::timestamptz, now(),
 '{"ss":{"regime":"eu_eea_ch","framework":"Reglamento CE 883/2004","maxMonths":24,"certType":"A1","notes":"A1 estándar. Krankenkasse si se pierde A1."},"cdi":{"hasCDI":true,"treatyRef":"CDI España-Alemania, BOE 30/07/2012","keyArticles":["Art. 14","Art. 22"],"withholdingRates":{"dividends":"15%","interest":"0%","royalties":"0%","employment":"Según Art. 14"}},"tax":{"residenceDaysThreshold":183,"art7pApplicable":true,"beckhamEquivalent":null,"exitTax":false,"notes":"Progresión fiscal alta. Shadow payroll si >183 días."},"immigration":{"workPermitRequired":false,"visaType":"Libre circulación UE","processingDays":"N/A","notes":"Anmeldung obligatorio."},"payroll":{"splitRecommended":false,"shadowRecommended":true,"taxEqRecommended":true},"requiredDocuments":["a1_certificate","assignment_letter","tax_residency_cert"],"reviewTriggers":[{"id":"DE-01","severity":"warning","reason":"Lohnsteuer requiere procesamiento local","affectedModule":"fiscal","suggestedAction":"Shadow payroll o procesamiento local","evidenceRequired":true}]}'::jsonb,
 '[{"label":"Reglamento CE 883/2004","type":"treaty_text"},{"label":"CDI España-Alemania 2011","type":"treaty_text"}]'::jsonb,
 'internal_guidance', 'SS and CDI automated. German Lohnsteuer requires local payroll processing.', NULL),

(NULL, 'COR-ES-IT', 'es-it', 'ES', 'IT', '1.0.0', 'published', true, 89, 'reviewed', 'full_corridor', 'HR-Legal-Mobility', '2026-04-01'::timestamptz, '2026-07-01'::timestamptz, now(),
 '{"ss":{"regime":"eu_eea_ch","framework":"Reglamento CE 883/2004","maxMonths":24,"certType":"A1","notes":"A1 estándar. INPS destino."},"cdi":{"hasCDI":true,"treatyRef":"CDI España-Italia, BOE 1980 (protocolo 2015)","keyArticles":["Art. 15","Art. 23"],"withholdingRates":{"dividends":"15%","interest":"12%","royalties":"8%","employment":"Según Art. 15"}},"tax":{"residenceDaysThreshold":183,"art7pApplicable":true,"beckhamEquivalent":"Régimen impatriados italiano (Art. 16 D.Lgs 147/2015) — 70% exención","exitTax":false,"notes":"Régimen impatriados muy favorable."},"immigration":{"workPermitRequired":false,"visaType":"Libre circulación UE","processingDays":"N/A","notes":"Codice Fiscale necesario."},"payroll":{"splitRecommended":false,"shadowRecommended":false,"taxEqRecommended":false},"requiredDocuments":["a1_certificate","assignment_letter","tax_residency_cert"],"reviewTriggers":[{"id":"IT-01","severity":"info","reason":"Verificar régimen impatriados italiano","affectedModule":"fiscal","suggestedAction":"Consultar elegibilidad","evidenceRequired":false}]}'::jsonb,
 '[{"label":"Reglamento CE 883/2004","type":"treaty_text"},{"label":"CDI España-Italia 1977/2015","type":"treaty_text"}]'::jsonb,
 'internal_guidance', 'SS and CDI automated. Italian impatriate regime requires specialist.', NULL),

(NULL, 'COR-ES-AD', 'es-ad', 'ES', 'AD', '1.0.0', 'published', true, 85, 'reviewed', 'full_corridor', 'HR-Legal-Mobility', '2026-04-01'::timestamptz, '2026-07-01'::timestamptz, now(),
 '{"ss":{"regime":"bilateral_agreement","framework":"Convenio bilateral SS España-Andorra","maxMonths":24,"certType":"Certificado bilateral","notes":"No UE/EEE. No aplica A1."},"cdi":{"hasCDI":true,"treatyRef":"CDI España-Andorra, BOE 2016","keyArticles":["Art. 14","Art. 22"],"withholdingRates":{"dividends":"15%","interest":"5%","royalties":"5%","employment":"Según Art. 14"}},"tax":{"residenceDaysThreshold":183,"art7pApplicable":true,"beckhamEquivalent":null,"exitTax":false,"notes":"IRPF max 10%. Riesgo paraíso fiscal."},"immigration":{"workPermitRequired":true,"visaType":"Autorización trabajo y residencia","processingDays":"30-60 días","notes":"Cupo limitado."},"payroll":{"splitRecommended":true,"shadowRecommended":true,"taxEqRecommended":false},"requiredDocuments":["social_security_cert","assignment_letter","work_permit","tax_residency_cert"],"reviewTriggers":[{"id":"AD-01","severity":"review_required","reason":"Limitada transparencia fiscal","affectedModule":"fiscal","suggestedAction":"Revisión anti-paraíso","evidenceRequired":true},{"id":"AD-02","severity":"warning","reason":"Permiso trabajo con cupo","affectedModule":"hr","suggestedAction":"Iniciar 60+ días antes","evidenceRequired":true}]}'::jsonb,
 '[{"label":"Convenio bilateral SS España-Andorra","type":"treaty_text"},{"label":"CDI España-Andorra 2015","type":"treaty_text"}]'::jsonb,
 'internal_guidance', 'SS bilateral automated. Andorra limited fiscal transparency — mandatory review >12m.', NULL),

(NULL, 'COR-ES-GB', 'es-gb', 'ES', 'GB', '1.0.0', 'published', true, 87, 'reviewed', 'full_corridor', 'HR-Legal-Mobility', '2026-04-01'::timestamptz, '2026-07-01'::timestamptz, now(),
 '{"ss":{"regime":"bilateral_agreement","framework":"Protocolo TCA SS post-Brexit","maxMonths":24,"certType":"Certificado UK","notes":"Post-Brexit: TCA. No A1."},"cdi":{"hasCDI":true,"treatyRef":"CDI España-UK, BOE 2014","keyArticles":["Art. 14","Art. 21"],"withholdingRates":{"dividends":"15%","interest":"0%","royalties":"0%","employment":"Según Art. 14"}},"tax":{"residenceDaysThreshold":183,"art7pApplicable":true,"beckhamEquivalent":"Remittance basis — en eliminación 2025+","exitTax":false,"notes":"PAYE. Remittance basis eliminándose."},"immigration":{"workPermitRequired":true,"visaType":"Skilled Worker / ICT Visa","processingDays":"15-60 días","notes":"Sponsorship requerido. CoS necesario."},"payroll":{"splitRecommended":true,"shadowRecommended":true,"taxEqRecommended":true},"requiredDocuments":["social_security_cert","assignment_letter","work_permit","visa","tax_residency_cert"],"reviewTriggers":[{"id":"GB-01","severity":"review_required","reason":"Post-Brexit: visado obligatorio","affectedModule":"hr","suggestedAction":"Confirmar categoría visa","evidenceRequired":true},{"id":"GB-02","severity":"warning","reason":"PAYE UK requiere registro local","affectedModule":"fiscal","suggestedAction":"Registrar en HMRC","evidenceRequired":true}]}'::jsonb,
 '[{"label":"Protocolo SS España-UK post-Brexit (TCA)","type":"treaty_text"},{"label":"CDI España-UK 2013","type":"treaty_text"}]'::jsonb,
 'internal_guidance', 'SS bilateral post-Brexit automated. UK immigration and PAYE require local specialist.', NULL),

(NULL, 'COR-ES-CH', 'es-ch', 'ES', 'CH', '1.0.0', 'published', true, 88, 'reviewed', 'full_corridor', 'HR-Legal-Mobility', '2026-04-01'::timestamptz, '2026-07-01'::timestamptz, now(),
 '{"ss":{"regime":"eu_eea_ch","framework":"ALCP — Reglamento CE 883/2004 por extensión","maxMonths":24,"certType":"A1","notes":"Suiza aplica 883/2004 vía ALCP."},"cdi":{"hasCDI":true,"treatyRef":"CDI España-Suiza, BOE 2003 (protocolo 2006)","keyArticles":["Art. 15","Art. 23"],"withholdingRates":{"dividends":"15%","interest":"0%","royalties":"5%","employment":"Según Art. 15"}},"tax":{"residenceDaysThreshold":183,"art7pApplicable":true,"beckhamEquivalent":"Forfait fiscal — restringido","exitTax":false,"notes":"Fiscalidad cantonal variable. Quellensteuer."},"immigration":{"workPermitRequired":true,"visaType":"Permiso L / B","processingDays":"15-30 días","notes":"UE simplificado pero obligatorio."},"payroll":{"splitRecommended":true,"shadowRecommended":true,"taxEqRecommended":true},"requiredDocuments":["a1_certificate","assignment_letter","work_permit","tax_residency_cert"],"reviewTriggers":[{"id":"CH-01","severity":"warning","reason":"Fiscalidad cantonal variable","affectedModule":"fiscal","suggestedAction":"Identificar cantón","evidenceRequired":false},{"id":"CH-02","severity":"info","reason":"Quellensteuer automático","affectedModule":"fiscal","suggestedAction":"Confirmar retención","evidenceRequired":false}]}'::jsonb,
 '[{"label":"ALCP Suiza-UE","type":"treaty_text"},{"label":"CDI España-Suiza 1966/2006","type":"treaty_text"}]'::jsonb,
 'internal_guidance', 'SS under ALCP. Swiss cantonal tax varies — classification only.', NULL),

(NULL, 'COR-ES-US', 'es-us', 'ES', 'US', '1.0.0', 'published', true, 82, 'reviewed', 'full_corridor', 'HR-Legal-Mobility', '2026-04-01'::timestamptz, '2026-07-01'::timestamptz, now(),
 '{"ss":{"regime":"bilateral_agreement","framework":"Convenio bilateral SS España-EEUU","maxMonths":60,"certType":"Certificate of Coverage (CoC)","notes":"Hasta 5 años. FICA exemption."},"cdi":{"hasCDI":true,"treatyRef":"CDI España-EEUU, BOE 1990","keyArticles":["Art. 15","Art. 23"],"withholdingRates":{"dividends":"15%","interest":"10%","royalties":"10%","employment":"Según Art. 15"}},"tax":{"residenceDaysThreshold":183,"art7pApplicable":true,"beckhamEquivalent":null,"exitTax":true,"notes":"Grava por ciudadanía Y residencia. State tax variable. IRS compliance."},"immigration":{"workPermitRequired":true,"visaType":"L-1 / E-2 / H-1B","processingDays":"30-180 días","notes":"Visa obligatoria. L-1 ICT. Premium processing 15 días."},"payroll":{"splitRecommended":true,"shadowRecommended":true,"taxEqRecommended":true},"requiredDocuments":["social_security_cert","assignment_letter","visa","work_permit","tax_residency_cert"],"reviewTriggers":[{"id":"US-01","severity":"critical_review_required","reason":"US tax compliance federal+state","affectedModule":"fiscal","suggestedAction":"Tax advisor US expat","evidenceRequired":true},{"id":"US-02","severity":"review_required","reason":"PE risk","affectedModule":"legal","suggestedAction":"Evaluar PE risk","evidenceRequired":true},{"id":"US-03","severity":"warning","reason":"Visa category","affectedModule":"hr","suggestedAction":"Confirmar categoría visa","evidenceRequired":true}]}'::jsonb,
 '[{"label":"Convenio bilateral SS España-EEUU","type":"treaty_text"},{"label":"CDI España-EEUU 1990","type":"treaty_text"},{"label":"IRS Publication 519","type":"secondary_source"}]'::jsonb,
 'internal_guidance', 'SS bilateral and CDI automated. US federal+state tax, visa, PE risk require specialist.', NULL),

(NULL, 'COR-ES-MX', 'es-mx', 'ES', 'MX', '1.0.0', 'published', true, 80, 'reviewed', 'full_corridor', 'HR-Legal-Mobility', '2026-04-01'::timestamptz, '2026-07-01'::timestamptz, now(),
 '{"ss":{"regime":"bilateral_agreement","framework":"Convenio bilateral SS España-México","maxMonths":24,"certType":"Certificado bilateral","notes":"Extensión posible vía IMSS."},"cdi":{"hasCDI":true,"treatyRef":"CDI España-México, BOE 2017","keyArticles":["Art. 15","Art. 23"],"withholdingRates":{"dividends":"10%","interest":"10%","royalties":"10%","employment":"Según Art. 15"}},"tax":{"residenceDaysThreshold":183,"art7pApplicable":true,"beckhamEquivalent":null,"exitTax":false,"notes":"ISR sobre nómina. PTU puede aplicar. SAT compliance."},"immigration":{"workPermitRequired":true,"visaType":"Residente temporal con permiso trabajo","processingDays":"30-90 días","notes":"Oferta empleo ante INM. Visa consular + canje."},"payroll":{"splitRecommended":true,"shadowRecommended":true,"taxEqRecommended":true},"requiredDocuments":["social_security_cert","assignment_letter","work_permit","visa","tax_residency_cert"],"reviewTriggers":[{"id":"MX-01","severity":"review_required","reason":"ISR + PTU requiere asesoría local","affectedModule":"fiscal","suggestedAction":"Asesor fiscal mexicano","evidenceRequired":true},{"id":"MX-02","severity":"warning","reason":"LFT obligaciones específicas","affectedModule":"legal","suggestedAction":"Abogado laboralista mexicano","evidenceRequired":false}]}'::jsonb,
 '[{"label":"Convenio bilateral SS España-México","type":"treaty_text"},{"label":"CDI España-México 1992/2017","type":"treaty_text"}]'::jsonb,
 'internal_guidance', 'SS bilateral and CDI automated. Mexican PTU, labor law, SAT require local specialist.', NULL);
