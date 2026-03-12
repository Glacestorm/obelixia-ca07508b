/**
 * SubmissionForm — Crear/editar envío oficial
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import type { IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';

interface Props {
  companyId: string;
  adapters: IntegrationAdapter[];
  hub: { createSubmission: (data: any) => Promise<any> };
  onClose: () => void;
}

export function SubmissionForm({ companyId, adapters, hub, onClose }: Props) {
  const [countryCode, setCountryCode] = useState('ES');
  const [adapterId, setAdapterId] = useState('');
  const [submissionType, setSubmissionType] = useState('');
  const [submissionSubtype, setSubmissionSubtype] = useState('');
  const [referencePeriod, setReferencePeriod] = useState('');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredAdapters = adapters.filter(a => a.country_code === countryCode && a.is_active);
  const selectedAdapter = adapters.find(a => a.id === adapterId);
  const operations = (selectedAdapter?.config as any)?.operations || [];

  const handleSave = async () => {
    if (!submissionType) return;
    setSaving(true);
    const result = await hub.createSubmission({
      country_code: countryCode,
      adapter_id: adapterId || undefined,
      submission_type: submissionType,
      submission_subtype: submissionSubtype || undefined,
      reference_period: referencePeriod || undefined,
      priority,
      notes: notes || undefined,
      payload: {},
    });
    setSaving(false);
    if (result) onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
        <h3 className="text-lg font-semibold">Nuevo envío oficial</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Datos del envío</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">País</Label>
                <Select value={countryCode} onValueChange={v => { setCountryCode(v); setAdapterId(''); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ES">España</SelectItem>
                    <SelectItem value="FR">Francia</SelectItem>
                    <SelectItem value="PT">Portugal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Conector oficial</Label>
              <Select value={adapterId} onValueChange={setAdapterId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar conector" /></SelectTrigger>
                <SelectContent>
                  {filteredAdapters.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.adapter_name} ({a.adapter_type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Tipo de envío *</Label>
              {operations.length > 0 ? (
                <Select value={submissionType} onValueChange={setSubmissionType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar operación" /></SelectTrigger>
                  <SelectContent>
                    {operations.map((op: string) => (
                      <SelectItem key={op} value={op}>{op.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input className="h-8 text-xs" value={submissionType} onChange={e => setSubmissionType(e.target.value)} placeholder="Ej: alta, modelo_111, certificado_empresa" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Subtipo</Label>
                <Input className="h-8 text-xs" value={submissionSubtype} onChange={e => setSubmissionSubtype(e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <Label className="text-xs">Período de referencia</Label>
                <Input className="h-8 text-xs" value={referencePeriod} onChange={e => setReferencePeriod(e.target.value)} placeholder="Ej: 2026-T1, 2026-03" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notas y observaciones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas internas sobre este envío..."
              rows={6}
              className="text-xs"
            />
            {selectedAdapter && (
              <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                <p className="font-medium">{selectedAdapter.system_name}</p>
                <p className="text-muted-foreground">{(selectedAdapter.config as any)?.description}</p>
                {(selectedAdapter.config as any)?.file_formats && (
                  <p className="text-muted-foreground">Formatos: {(selectedAdapter.config as any).file_formats.join(', ')}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={!submissionType || saving} className="gap-1.5">
          <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Crear borrador'}
        </Button>
      </div>
    </div>
  );
}
