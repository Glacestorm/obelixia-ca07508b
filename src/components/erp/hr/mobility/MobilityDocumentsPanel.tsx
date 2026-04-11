/**
 * MobilityDocumentsPanel — CRUD for mobility documents (visa, work permit, A1, etc.)
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, AlertTriangle } from 'lucide-react';
import type { MobilityDocument, DocumentType, DocumentStatus } from '@/hooks/erp/hr/useGlobalMobility';

interface Props {
  assignmentId: string;
  documents: MobilityDocument[];
  loading: boolean;
  onAdd: (doc: Partial<MobilityDocument>) => void;
  onUpdate: (id: string, updates: Partial<MobilityDocument>) => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  visa: 'Visado', work_permit: 'Permiso de trabajo', residence_permit: 'Permiso de residencia',
  a1_certificate: 'Certificado A1', tax_residency_cert: 'Certificado residencia fiscal',
  assignment_letter: 'Carta de asignación', cost_projection: 'Proyección de coste',
  repatriation_agreement: 'Acuerdo de repatriación', social_security_cert: 'Certificado SS',
  medical_clearance: 'Apto médico', relocation_contract: 'Contrato reubicación',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  applied: 'bg-blue-500/15 text-blue-700',
  approved: 'bg-emerald-500/15 text-emerald-700',
  active: 'bg-emerald-500/15 text-emerald-700',
  expiring_soon: 'bg-amber-500/15 text-amber-700',
  expired: 'bg-red-500/15 text-red-700',
  renewed: 'bg-blue-500/15 text-blue-700',
  rejected: 'bg-red-500/15 text-red-700',
};

export function MobilityDocumentsPanel({ assignmentId, documents, loading, onAdd, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    document_type: 'visa' as DocumentType,
    document_name: '',
    country_code: '',
    issue_date: '',
    expiry_date: '',
    reference_number: '',
    alert_days_before: 60,
  });

  const handleAdd = () => {
    onAdd({
      assignment_id: assignmentId,
      ...form,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      status: 'pending',
    } as any);
    setShowForm(false);
    setForm({ document_type: 'visa', document_name: '', country_code: '', issue_date: '', expiry_date: '', reference_number: '', alert_days_before: 60 });
  };

  const isExpiring = (doc: MobilityDocument) => {
    if (!doc.expiry_date) return false;
    const days = (new Date(doc.expiry_date).getTime() - Date.now()) / 86400000;
    return days > 0 && days <= doc.alert_days_before;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Documentos de movilidad</CardTitle>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs h-7"><Plus className="h-3 w-3 mr-1" />Añadir</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="text-sm">Nuevo documento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={form.document_type} onValueChange={v => setForm(p => ({ ...p, document_type: v as DocumentType }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Nombre</Label><Input value={form.document_name} onChange={e => setForm(p => ({ ...p, document_name: e.target.value }))} className="h-8 text-sm" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">País emisor</Label><Input value={form.country_code} onChange={e => setForm(p => ({ ...p, country_code: e.target.value }))} className="h-8 text-sm" placeholder="ES" /></div>
                  <div><Label className="text-xs">Referencia</Label><Input value={form.reference_number} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} className="h-8 text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Fecha emisión</Label><Input type="date" value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Fecha expiración</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} className="h-8 text-sm" /></div>
                </div>
                <Button size="sm" onClick={handleAdd} className="w-full">Guardar documento</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sin documentos registrados</p>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  {isExpiring(doc) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  <div>
                    <p className="text-xs font-medium">{doc.document_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {DOC_TYPE_LABELS[doc.document_type] || doc.document_type} · {doc.country_code}
                      {doc.expiry_date && ` · Expira: ${doc.expiry_date}`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[doc.status] || ''}`}>
                  {doc.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
