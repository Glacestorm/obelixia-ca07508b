

# Documentación, Evidencias y Compliance — Capa Transversal RRHH

## Estado Actual

**Ya existe en DB:**
- `erp_hr_employee_documents`: documentos básicos (type, url, version, expiry, confidential, file_hash, AI indexing)
- `erp_hr_document_templates`: plantillas por jurisdicción (contract, annex, severance, etc.)
- `erp_hr_generated_documents`: documentos generados desde plantillas (status workflow: draft → signed → archived)
- `erp_hr_document_ai_processing`: tracking de procesamiento IA (OCR, clasificación)
- `erp_hr_document_requests`: solicitudes de documentos (self-service)
- `hr_mobility_documents`: documentos de movilidad (visa, A1, permisos)
- `hr_official_submission_receipts`: acuses de integraciones oficiales

**Ya existe en UI (parcial/placeholder):**
- `ExpedientDocumentosTab`: placeholder vacío
- `HRDocumentTemplatesPanel`: funcional (CRUD plantillas por jurisdicción)
- `HRDocumentGeneratorDialog`: funcional (genera documentos desde plantillas)
- `HRComplianceEvidencePanel`: demo data estática
- `MobilityDocumentsPanel`: funcional (CRUD docs movilidad)
- `ReceiptsPanel`: funcional (acuses oficiales)

**No existe:**
- Hook unificado para expediente documental (CRUD sobre `erp_hr_employee_documents`)
- Versionado real de documentos (historial de versiones por documento)
- Logs de acceso a documentos
- Comentarios en documentos
- Retención documental (políticas de retención por tipo)
- Consentimientos (registro formal con firma/fecha)
- Vista de expediente vivo del empleado con documentos reales
- Vista consolidada de expediente de nómina y de integraciones oficiales

---

## Implementación

### 1. Migración — Tablas nuevas y extensiones

**Nueva tabla: `erp_hr_document_versions`** — Historial de versiones
- `id`, `document_id` FK, `version_number`, `file_url`, `file_hash`, `file_size`, `change_summary`, `uploaded_by`, `created_at`

**Nueva tabla: `erp_hr_document_access_log`** — Trazabilidad de accesos
- `id`, `company_id`, `document_id` FK, `document_table` TEXT (para soportar docs de employee, mobility, submissions), `user_id`, `action` (view, download, print, share, export), `ip_address`, `user_agent`, `created_at`

**Nueva tabla: `erp_hr_document_comments`** — Comentarios y anotaciones
- `id`, `company_id`, `document_id`, `document_table`, `user_id`, `comment_text`, `is_internal` BOOL, `parent_comment_id` UUID nullable (threads), `created_at`, `updated_at`

**Nueva tabla: `erp_hr_consents`** — Consentimientos formales
- `id`, `company_id`, `employee_id` FK, `consent_type` (gdpr, medical, background_check, data_processing, image_rights, etc.), `consent_text`, `granted_at`, `revoked_at` nullable, `granted_via` (digital, paper, email), `evidence_url`, `ip_address`, `valid_until` DATE nullable, `status` (active, revoked, expired), `metadata` JSONB, `created_at`

**Nueva tabla: `erp_hr_retention_policies`** — Políticas de retención documental
- `id`, `company_id`, `document_type`, `jurisdiction`, `retention_years`, `legal_basis`, `auto_archive`, `auto_delete`, `description`, `is_active`, `created_at`

**ALTER `erp_hr_employee_documents`:**
- `category` TEXT (personal, contract, payroll, compliance, medical, training, legal, mobility)
- `subcategory` TEXT nullable
- `retention_policy_id` UUID FK nullable
- `consent_id` UUID FK nullable (linked consent)
- `source` TEXT (upload, generated, integration, migration)
- `integrity_verified` BOOL DEFAULT false
- `integrity_verified_at` TIMESTAMPTZ nullable

All tables with RLS via `user_has_erp_company_access(company_id)`.

### 2. Hook: `useHRDocumentExpedient`

New hook at `src/hooks/erp/hr/useHRDocumentExpedient.ts`:

**Documents CRUD:**
- `fetchDocuments(employeeId?, filters?)` — list with category/type/status filters
- `getDocument(id)` — full detail with versions, comments, access log
- `uploadDocument(data)` — upload + compute hash + create version 1
- `updateDocument(id, data)` — creates new version automatically
- `deleteDocument(id)` — soft delete (archive) with retention check
- `verifyIntegrity(id)` — re-compute hash and compare

**Versions:**
- `fetchVersions(documentId)` — version history
- `restoreVersion(documentId, versionId)` — restore previous version

**Access logging:**
- `logAccess(documentId, action)` — automatic on view/download
- `fetchAccessLog(documentId?)` — audit trail

**Comments:**
- `addComment(documentId, text, isInternal?)` — add comment
- `fetchComments(documentId)` — threaded comments

**Consents:**
- `fetchConsents(employeeId)` — list consents
- `registerConsent(data)` — register new consent
- `revokeConsent(id)` — revoke with timestamp

**Retention:**
- `fetchRetentionPolicies()` — list policies
- `checkRetention(documentId)` — check if document should be archived/deleted
- `getRetentionAlerts()` — documents past retention period

**Stats:**
- `getExpedientStats(employeeId?)` — counts by category, expiring, compliance gaps

### 3. Components

All under `src/components/erp/hr/document-expedient/`:

**`DocumentExpedientModule`** — Main panel (new nav entry replacing scattered document views)
- Tabs: Expediente Empleado | Nómina | Movilidad | Integraciones | Plantillas | Consentimientos | Retención | Auditoría

**`EmployeeDocumentExpedient`** — Replaces `ExpedientDocumentosTab` placeholder
- Document list by category (accordion: Personal, Contratos, Nómina, Compliance, Médicos, Formación, Legal)
- Upload with category/type selection
- Inline version indicator + history
- Access log indicator (eye icon with count)
- Expiry alerts
- Integrity badge (hash verified)

**`DocumentDetailPanel`** — Slide-over detail view for any document
- File preview/download
- Version history timeline
- Comments thread
- Access log
- Linked consent (if any)
- Retention policy info
- Integrity verification button

**`PayrollDocumentExpedient`** — Documents linked to payroll records
- Aggregates payslips, TC1/TC2 generated, IRPF certificates per period
- Links to `erp_hr_generated_documents` where `document_type` is payroll-related

**`ConsentsPanel`** — Consent management
- List of consents by employee with status (active/revoked/expired)
- Register new consent form
- Revoke action with confirmation
- Expiry alerts for time-limited consents

**`RetentionPoliciesPanel`** — Retention policy configuration
- CRUD for retention policies by document type and jurisdiction
- Alert list: documents past retention period needing action

**`DocumentAuditPanel`** — Access log and compliance audit view
- Filterable log of all document access events
- Export for audit/inspection purposes
- Summary: most accessed, who accessed what

### 4. Integration

| Point | Change |
|---|---|
| `HRModule.tsx` | Add `document-expedient` route → `DocumentExpedientModule` |
| `ExpedientDocumentosTab` | Replace placeholder with `EmployeeDocumentExpedient` (real data) |
| `HRComplianceEvidencePanel` | Replace demo data, link to consents + document expiry from real DB |
| `HRNavigationMenu` | Add "Expediente Documental" entry in global section |
| Barrel exports | `src/components/erp/hr/document-expedient/index.ts` |

### 5. Implementation Order

| Phase | Content |
|---|---|
| **DC1** | Migration: 5 new tables + ALTER employee_documents |
| **DC2** | `useHRDocumentExpedient` hook (CRUD, versions, access log, comments, consents, retention) |
| **DC3** | `DocumentExpedientModule` + `EmployeeDocumentExpedient` + `DocumentDetailPanel` |
| **DC4** | `PayrollDocumentExpedient` + `ConsentsPanel` + `RetentionPoliciesPanel` |
| **DC5** | `DocumentAuditPanel` + integration (HRModule, ExpedientDocumentosTab, nav) |

