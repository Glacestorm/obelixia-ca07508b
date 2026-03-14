/**
 * HRPayrollIncidentsPanel — V2-ES.7 Paso 1
 * Gestión de incidencias y variables de nómina por período
 * Integra clasificación fiscal, validación y readiness
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, CheckCircle, Plus, Search, ClipboardCheck, XCircle, Info } from 'lucide-react';
import { usePayrollIncidents } from '@/hooks/erp/hr/usePayrollIncidents';
import {
  type PayrollIncident,
  type IncidentType,
  INCIDENT_TYPE_CONFIG,
  INCIDENT_STATUS_CONFIG,
  validateIncident as validateIncidentFields,
  classifyFiscal,
  evaluatePeriodIncidentReadiness,
  suggestConceptCodes,
} from '@/engines/erp/hr/payrollIncidentEngine';
import type { PayrollPeriod } from '@/hooks/erp/hr/usePayrollEngine';

interface Props {
  companyId: string;
  periods: PayrollPeriod[];
  selectedPeriodId: string | null;
  onSelectPeriod: (id: string | null) => void;
}

const INCIDENT_TYPES = Object.entries(INCIDENT_TYPE_CONFIG).map(([value, cfg]) => ({
  value: value as IncidentType,
  label: `${cfg.icon} ${cfg.labelES}`,
}));

const emptyForm: Partial<PayrollIncident> = {
  concept_code: '',
  incident_type: 'variable' as IncidentType,
  description: '',
  amount: 0,
  units: undefined,
  unit_price: undefined,
  tributa_irpf: true,
  cotiza_ss: true,
  is_prorrateado: false,
  notes: '',
};

export function HRPayrollIncidentsPanel({ companyId, periods, selectedPeriodId, onSelectPeriod }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<PayrollIncident>>(emptyForm);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formWarnings, setFormWarnings] = useState<string[]>([]);

  const {
    incidents,
    isLoading,
    fetchByPeriod,
    createIncident,
    updateIncident,
    validateIncident,
    cancelIncident,
    validateAllPending,
  } = usePayrollIncidents(companyId);

  // Fetch on period change
  useEffect(() => {
    if (selectedPeriodId) fetchByPeriod(selectedPeriodId);
  }, [selectedPeriodId, fetchByPeriod]);

  // Readiness
  const readiness = useMemo(() => evaluatePeriodIncidentReadiness(incidents), [incidents]);

  // Filter
  const filtered = useMemo(() => {
    return incidents.filter(i => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!i.concept_code.toLowerCase().includes(q) && !(i.description ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [incidents, search, statusFilter]);

  // Auto-classify fiscal on concept change
  const handleConceptChange = useCallback((conceptCode: string) => {
    const fiscal = classifyFiscal(conceptCode);
    setForm(prev => ({
      ...prev,
      concept_code: conceptCode,
      tributa_irpf: fiscal.tributa_irpf,
      cotiza_ss: fiscal.cotiza_ss,
      is_prorrateado: fiscal.is_prorrateado,
    }));
  }, []);

  // Auto-suggest concepts on type change
  const handleTypeChange = useCallback((type: IncidentType) => {
    const suggestions = suggestConceptCodes(type);
    setForm(prev => ({
      ...prev,
      incident_type: type,
      concept_code: suggestions[0] || prev.concept_code || '',
    }));
    if (suggestions[0]) handleConceptChange(suggestions[0]);
  }, [handleConceptChange]);

  // Validate form live
  useEffect(() => {
    const result = validateIncidentFields(form);
    setFormErrors(result.errors);
    setFormWarnings(result.warnings);
  }, [form]);

  const handleSave = async () => {
    const result = validateIncidentFields(form);
    if (!result.valid) {
      setFormErrors(result.errors);
      return;
    }
    await createIncident({
      ...form,
      period_id: selectedPeriodId,
      employee_id: form.employee_id || '00000000-0000-0000-0000-000000000000', // placeholder — to be wired
    });
    setShowForm(false);
    setForm(emptyForm);
  };

  const handleOpenForm = () => {
    setForm(emptyForm);
    setFormErrors([]);
    setFormWarnings([]);
    setShowForm(true);
  };

  const suggestedCodes = useMemo(
    () => form.incident_type ? suggestConceptCodes(form.incident_type as IncidentType) : [],
    [form.incident_type]
  );

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            📊 Incidencias y Variables de Nómina
          </h3>
          <p className="text-sm text-muted-foreground">
            Registro de variables mensuales para el cálculo de nómina · Operativa interna
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedPeriodId && readiness.pending > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => validateAllPending(selectedPeriodId)}
              className="gap-1.5 text-xs"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Validar todas ({readiness.pending})
            </Button>
          )}
          <Button size="sm" onClick={handleOpenForm} disabled={!selectedPeriodId} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nueva incidencia
          </Button>
        </div>
      </div>

      {/* Period selector + readiness */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Label className="text-xs">Período</Label>
          <Select value={selectedPeriodId ?? ''} onValueChange={v => onSelectPeriod(v || null)}>
            <SelectTrigger><SelectValue placeholder="Selecciona período..." /></SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.period_name} — {p.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedPeriodId && (
          <Card className="px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              {readiness.readinessLevel === 'all_validated' || readiness.readinessLevel === 'all_applied' ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : readiness.readinessLevel === 'has_pending' ? (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              ) : (
                <Info className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{readiness.readinessLabel}</span>
              {readiness.totalIncidents > 0 && (
                <span className="text-muted-foreground">
                  ({readiness.validated}✓ {readiness.pending}⏳ {readiness.applied}📎)
                </span>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Filters */}
      {selectedPeriodId && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por concepto o descripción..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">⏳ Pendiente</SelectItem>
              <SelectItem value="validated">✓ Validada</SelectItem>
              <SelectItem value="applied">📎 Aplicada</SelectItem>
              <SelectItem value="cancelled">✗ Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table */}
      {selectedPeriodId ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-center">Unid.</TableHead>
                <TableHead className="text-center">IRPF</TableHead>
                <TableHead className="text-center">SS</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(i => {
                const typeConfig = INCIDENT_TYPE_CONFIG[i.incident_type as IncidentType];
                const statusConfig = INCIDENT_STATUS_CONFIG[i.status];
                return (
                  <TableRow key={i.id} className={i.status === 'cancelled' ? 'opacity-50' : ''}>
                    <TableCell>
                      <span className="text-xs" title={typeConfig?.labelES}>
                        {typeConfig?.icon} {typeConfig?.labelES ?? i.incident_type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{i.concept_code}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{i.description || '—'}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {(i.amount ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </TableCell>
                    <TableCell className="text-center text-xs">{i.units ?? '—'}</TableCell>
                    <TableCell className="text-center text-xs">{i.tributa_irpf ? '✓' : '—'}</TableCell>
                    <TableCell className="text-center text-xs">{i.cotiza_ss ? '✓' : '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusConfig?.color ?? ''}`}>
                        {statusConfig?.labelES ?? i.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {i.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => validateIncident(i.id)} title="Validar">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cancelIncident(i.id)} title="Cancelar">
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {incidents.length === 0 ? 'Sin incidencias para este período' : 'Sin resultados con los filtros actuales'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecciona un período para gestionar incidencias
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Incidencia de Nómina</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Período: {selectedPeriod?.period_name ?? '—'} · Registro interno — no constituye liquidación oficial
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type */}
            <div>
              <Label>Tipo de incidencia</Label>
              <Select
                value={form.incident_type ?? 'variable'}
                onValueChange={v => handleTypeChange(v as IncidentType)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Concept code */}
            <div>
              <Label>Código concepto</Label>
              <div className="flex gap-2">
                <Input
                  value={form.concept_code || ''}
                  onChange={e => handleConceptChange(e.target.value)}
                  placeholder="ES_HORAS_EXTRA"
                  className="font-mono"
                />
              </div>
              {suggestedCodes.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {suggestedCodes.map(code => (
                    <Badge
                      key={code}
                      variant="outline"
                      className="text-[10px] cursor-pointer hover:bg-muted"
                      onClick={() => handleConceptChange(code)}
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Amount + units */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Importe (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount ?? 0}
                  onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Unidades</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.units ?? ''}
                  onChange={e => setForm(p => ({ ...p, units: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="horas/días"
                />
              </div>
              <div>
                <Label>Precio unit.</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unit_price ?? ''}
                  onChange={e => setForm(p => ({ ...p, unit_price: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={form.applies_from ?? ''}
                  onChange={e => setForm(p => ({ ...p, applies_from: e.target.value || undefined }))}
                />
              </div>
              <div>
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={form.applies_to ?? ''}
                  onChange={e => setForm(p => ({ ...p, applies_to: e.target.value || undefined }))}
                />
              </div>
            </div>

            {/* Fiscal classification */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="text-xs font-medium">Clasificación fiscal/cotización</p>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.tributa_irpf ?? true}
                    onCheckedChange={v => setForm(p => ({ ...p, tributa_irpf: v }))}
                  />
                  <Label className="text-xs">Tributa IRPF</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.cotiza_ss ?? true}
                    onCheckedChange={v => setForm(p => ({ ...p, cotiza_ss: v }))}
                  />
                  <Label className="text-xs">Cotiza SS</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_prorrateado ?? false}
                    onCheckedChange={v => setForm(p => ({ ...p, is_prorrateado: v }))}
                  />
                  <Label className="text-xs">Prorrateado</Label>
                </div>
              </div>
              {form.concept_code && (
                <p className="text-[10px] text-muted-foreground">
                  {classifyFiscal(form.concept_code).fiscalNote}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label>Descripción / notas</Label>
              <Textarea
                value={form.description ?? ''}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Detalle de la incidencia..."
                rows={2}
              />
            </div>

            {/* Validation feedback */}
            {formErrors.length > 0 && (
              <div className="p-2 rounded bg-destructive/10 text-destructive text-xs space-y-1">
                {formErrors.map((e, i) => <p key={i}>⛔ {e}</p>)}
              </div>
            )}
            {formWarnings.length > 0 && (
              <div className="p-2 rounded bg-amber-500/10 text-amber-700 text-xs space-y-1">
                {formWarnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={formErrors.length > 0 || !form.concept_code}>
              Registrar incidencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
