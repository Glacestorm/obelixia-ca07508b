/**
 * LinkedDocumentsSection — Reusable section to view/upload documents
 * linked to an admin_request or hr_task via related_entity_type/id.
 * V2-ES.3 Paso 2
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paperclip, Upload, FileText, AlertTriangle, Loader2, Link2 } from 'lucide-react';
import { useHRDocumentExpedient, type RelatedEntityType, type DocumentCategory } from '@/hooks/erp/hr/useHRDocumentExpedient';
import type { EmployeeDocument } from '@/hooks/erp/hr/useHRDocumentExpedient';

const ENTITY_LABELS: Record<RelatedEntityType, string> = {
  admin_request: 'solicitud',
  hr_task: 'tarea',
};

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  personal: 'Personal',
  contract: 'Contrato',
  payroll: 'Nómina',
  compliance: 'Compliance',
  medical: 'Médico',
  training: 'Formación',
  legal: 'Legal',
  mobility: 'Movilidad',
};

interface Props {
  companyId: string;
  entityType: RelatedEntityType;
  entityId: string;
  employeeId?: string | null;
}

export function LinkedDocumentsSection({ companyId, entityType, entityId, employeeId }: Props) {
  const { fetchDocumentsByEntity, uploadDocument } = useHRDocumentExpedient(companyId);
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('evidencia');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('compliance');

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDocumentsByEntity(entityType, entityId);
      // Deduplicate by id (safety net)
      const unique = Array.from(new Map(result.map(d => [d.id, d])).values());
      setDocs(unique);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [fetchDocumentsByEntity, entityType, entityId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleUpload = async () => {
    if (!employeeId || !docName.trim()) return;
    setUploading(true);
    try {
      await uploadDocument.mutateAsync({
        employee_id: employeeId,
        document_name: docName.trim(),
        document_type: docType,
        category: docCategory,
        source: 'upload',
        related_entity_type: entityType,
        related_entity_id: entityId,
      });
      setDocName('');
      setShowForm(false);
      await loadDocs();
    } finally {
      setUploading(false);
    }
  };

  const label = ENTITY_LABELS[entityType];

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-primary" />
            Documentos vinculados a esta {label}
          </CardTitle>
          {employeeId && !showForm && (
            <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowForm(true)}>
              <Upload className="h-3 w-3" /> Adjuntar
            </Button>
          )}
        </div>
        {!employeeId && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <AlertTriangle className="h-3 w-3" />
            Sin empleado asociado — solo lectura
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Upload form */}
        {showForm && employeeId && (
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del documento</Label>
              <Input
                value={docName}
                onChange={e => setDocName(e.target.value)}
                placeholder="Ej: Justificante, Contrato firmado..."
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evidencia">Evidencia</SelectItem>
                    <SelectItem value="justificante">Justificante</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="certificado">Certificado</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoría</Label>
                <Select value={docCategory} onValueChange={v => setDocCategory(v as DocumentCategory)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" className="h-7 text-xs gap-1" disabled={!docName.trim() || uploading} onClick={handleUpload}>
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                Vincular documento
              </Button>
            </div>
          </div>
        )}

        {/* Documents list */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Sin documentos vinculados a esta {label}
          </p>
        ) : (
          <div className="space-y-1.5">
            {docs.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-muted/50 transition-colors text-sm"
              >
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-xs">{doc.document_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {doc.document_type} · {new Date(doc.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {CATEGORY_LABELS[doc.category] || doc.category}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
