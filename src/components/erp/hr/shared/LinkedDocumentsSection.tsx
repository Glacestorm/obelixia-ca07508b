/**
 * LinkedDocumentsSection — Reusable section to view/upload documents
 * linked to an admin_request or hr_task via related_entity_type/id.
 * V2-ES.3 Paso 2 + Paso 4 (completitud documental informativa)
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paperclip, Upload, FileText, AlertTriangle, Loader2, Link2, CheckCircle2, CircleDashed } from 'lucide-react';
import { useHRDocumentExpedient, type RelatedEntityType, type DocumentCategory } from '@/hooks/erp/hr/useHRDocumentExpedient';
import type { EmployeeDocument } from '@/hooks/erp/hr/useHRDocumentExpedient';
import { computeDocCompleteness, type ExpectedDocType } from './documentExpectedTypes';

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
  /** Tipo de solicitud (request_type) para checklist de completitud. Opcional. */
  managementType?: string | null;
  /** Callback when docs are loaded/updated — used to share data with sibling components */
  onDocsLoaded?: (docs: EmployeeDocument[]) => void;
}

export function LinkedDocumentsSection({ companyId, entityType, entityId, employeeId, managementType, onDocsLoaded }: Props) {
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
      onDocsLoaded?.(unique);
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

  // V2-ES.3 Paso 4: Completitud documental (informativa)
  const completeness = computeDocCompleteness(managementType, docs);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-primary" />
            Documentos vinculados a esta {label}
          </CardTitle>
          <div className="flex items-center gap-2">
            {completeness && (
              <Badge
                variant="outline"
                className={
                  completeness.percentage === 100
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px]'
                    : 'bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px]'
                }
              >
                {completeness.completed}/{completeness.total} docs
              </Badge>
            )}
            {employeeId && !showForm && (
              <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowForm(true)}>
                <Upload className="h-3 w-3" /> Adjuntar
              </Button>
            )}
          </div>
        </div>
        {!employeeId && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <AlertTriangle className="h-3 w-3" />
            Sin empleado asociado — solo lectura
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* V2-ES.3 Paso 4: Checklist de completitud */}
        {completeness && (
          <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Completitud documental</span>
              <span className={completeness.percentage === 100 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                {completeness.percentage}%
              </span>
            </div>
            <Progress value={completeness.percentage} className="h-1.5" />
            <div className="space-y-1 mt-1">
              {completeness.expected.map((exp) => {
                const isPresent = completeness.present.includes(exp.type);
                return (
                  <div key={exp.type} className="flex items-center gap-2 text-xs">
                    {isPresent ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : (
                      <CircleDashed className="h-3 w-3 text-amber-500 shrink-0" />
                    )}
                    <span className={isPresent ? 'text-muted-foreground' : 'text-foreground'}>
                      {exp.label}
                    </span>
                    {!isPresent && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-500/5 text-amber-600 border-amber-500/20">
                        Pendiente
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                    <SelectItem value="dni">DNI/NIE</SelectItem>
                    <SelectItem value="ss">Doc. Seguridad Social</SelectItem>
                    <SelectItem value="medico">Informe médico</SelectItem>
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
