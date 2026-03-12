/**
 * ConsentsPanel — Gestión de consentimientos formales (GDPR, médicos, etc.)
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ShieldCheck, Plus, AlertTriangle, CheckCircle2, XCircle, Search
} from 'lucide-react';
import { useHRDocumentExpedient, type ConsentType, type HRConsent } from '@/hooks/erp/hr/useHRDocumentExpedient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
  employeeId?: string;
}

const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  gdpr: 'GDPR / Protección de datos',
  medical: 'Reconocimiento médico',
  background_check: 'Verificación antecedentes',
  data_processing: 'Tratamiento de datos',
  image_rights: 'Derechos de imagen',
  training_commitment: 'Compromiso formativo',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
  revoked: { label: 'Revocado', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expirado', color: 'bg-amber-100 text-amber-700' },
};

export function ConsentsPanel({ companyId, employeeId }: Props) {
  const { consents, isLoadingConsents, registerConsent, revokeConsent } = useHRDocumentExpedient(companyId);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: employeeId ?? '',
    consent_type: 'gdpr' as ConsentType,
    consent_text: '',
    granted_via: 'digital',
    valid_until: '',
  });

  const filtered = consents.filter(c => {
    if (employeeId && c.employee_id !== employeeId) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.consent_type.toLowerCase().includes(s) || (c.consent_text ?? '').toLowerCase().includes(s);
    }
    return true;
  });

  const handleRegister = async () => {
    if (!formData.employee_id) return;
    await registerConsent.mutateAsync({
      employee_id: formData.employee_id,
      consent_type: formData.consent_type,
      consent_text: formData.consent_text || undefined,
      granted_via: formData.granted_via,
      valid_until: formData.valid_until || undefined,
    });
    setShowForm(false);
    setFormData({ employee_id: employeeId ?? '', consent_type: 'gdpr', consent_text: '', granted_via: 'digital', valid_until: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Consentimientos
          </h3>
          <p className="text-sm text-muted-foreground">Registro formal de consentimientos con trazabilidad completa</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Registrar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar consentimiento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!employeeId && (
                <div>
                  <Label>ID Empleado</Label>
                  <Input value={formData.employee_id} onChange={e => setFormData(p => ({ ...p, employee_id: e.target.value }))} placeholder="UUID del empleado" />
                </div>
              )}
              <div>
                <Label>Tipo de consentimiento</Label>
                <Select value={formData.consent_type} onValueChange={v => setFormData(p => ({ ...p, consent_type: v as ConsentType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONSENT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Texto / Descripción</Label>
                <Textarea value={formData.consent_text} onChange={e => setFormData(p => ({ ...p, consent_text: e.target.value }))} />
              </div>
              <div>
                <Label>Vía de concesión</Label>
                <Select value={formData.granted_via} onValueChange={v => setFormData(p => ({ ...p, granted_via: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="paper">Papel</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Válido hasta (opcional)</Label>
                <Input type="date" value={formData.valid_until} onChange={e => setFormData(p => ({ ...p, valid_until: e.target.value }))} />
              </div>
              <Button onClick={handleRegister} disabled={registerConsent.isPending || !formData.employee_id} className="w-full">
                Registrar consentimiento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="revoked">Revocados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoadingConsents ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay consentimientos registrados</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => {
            const sc = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.active;
            const isExpiring = c.valid_until && new Date(c.valid_until) <= new Date(Date.now() + 30 * 86400000) && c.status === 'active';
            return (
              <Card key={c.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      {c.status === 'active' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{CONSENT_TYPE_LABELS[c.consent_type as ConsentType] ?? c.consent_type}</p>
                      <p className="text-xs text-muted-foreground">
                        Vía {c.granted_via}
                        {c.granted_at && ` · ${formatDistanceToNow(new Date(c.granted_at), { locale: es, addSuffix: true })}`}
                        {c.valid_until && ` · Válido hasta: ${c.valid_until}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpiring && <AlertTriangle className="h-4 w-4 text-amber-500" title="Próximo a vencer" />}
                    <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                    {c.status === 'active' && (
                      <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => revokeConsent.mutate(c.id)}>
                        Revocar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
