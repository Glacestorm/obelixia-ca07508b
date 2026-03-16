/**
 * Domain D6: Document Expedient
 * Document management, versioning, storage, generation, catalog
 * 
 * V2-RRHH-FASE-1 Sprint 2: Added document dialogs from root
 */

// ── Core ──
export { DocumentExpedientModule } from '../../document-expedient';
export { HRDocumentTemplatesPanel } from '../../HRDocumentTemplatesPanel';

// ── Dialogs ──
export { HRDocumentGeneratorDialog } from '../../HRDocumentGeneratorDialog';
export { HRDocumentUploadDialog } from '../../HRDocumentUploadDialog';

/**
 * @deprecated Use DocumentExpedientModule instead
 */
export { HREmployeeDocumentsPanel } from '../../HREmployeeDocumentsPanel';
