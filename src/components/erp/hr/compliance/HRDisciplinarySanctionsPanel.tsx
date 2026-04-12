/**
 * HRDisciplinarySanctionsPanel.tsx — Motor de Sanciones Laborales (C5)
 *
 * Panel completo de gestión disciplinaria con tipificación ET,
 * control de prescripción, generación de cartas y expediente trazable.
 *
 * DISCLAIMER: Herramienta de soporte. No sustituye asesoramiento jurídico.
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle, Shield, Clock, FileText, Plus, ChevronRight,
  Scale, Info, Download, Eye, Gavel, ClipboardList, Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  createDossier,
  transitionDossier,
  addEvidence,
  generateSanctionLetter,
  checkPrescription,
  getSanctionTypes,
  getSanctionTypeByCode,
  getSeverityLabel,
  getStatusLabel,
  getValidTransitions,
  getPrescriptionRules,
  type SanctionDossier,
  type SanctionSeverity,
  type DossierStatus,
} from '@/engines/erp/hr/disciplinarySanctionsEngine';

// ─── Status Colors ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<DossierStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  investigation: 'bg-blue-100 text-blue-800',
  hearing: 'bg-indigo-100 text-indigo-800',
  proposed: 'bg-yellow-100 text-yellow-800',
  notified: 'bg-orange-100 text-orange-800',
  appealed: 'bg-purple-100 text-purple-800',
  executed: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  withdrawn: 'bg-muted text-muted-foreground',
};

const SEVERITY_COLORS: Record<SanctionSeverity, string> = {
  leve: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  grave: 'bg-orange-100 text-orange-800 border-orange-300',
  muy_grave: 'bg-red-100 text-red-800 border-red-300',
};

const URGENCY_COLORS = {
  ok: 'text-green-600',
  warning: 'text-yellow-600',
  critical: 'text-red-600',
  expired: 'text-red-800',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function HRDisciplinarySanctionsPanel() {
  const [dossiers, setDossiers] = useState<SanctionDossier[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<SanctionDossier | null>(null);
  const [activeTab, setActiveTab] = useState('dossiers');
  const [showNewForm, setShowNewForm] = useState(false);

  // New dossier form state
  const [formSeverity, setFormSeverity] = useState<SanctionSeverity>('grave');
  const [formTypeCode, setFormTypeCode] = useState('');
  const [formEmployeeName, setFormEmployeeName] = useState('');
  const [formFactsDesc, setFormFactsDesc] = useState('');
  const [formFactsDate, setFormFactsDate] = useState('');
  const [formKnowledgeDate, setFormKnowledgeDate] = useState('');

  const sanctionTypes = useMemo(() => getSanctionTypes(), []);
  const prescriptionRules = useMemo(() => getPrescriptionRules(), []);
  const filteredTypes = useMemo(() =>
    sanctionTypes.filter(t => t.severity === formSeverity),
    [sanctionTypes, formSeverity]
  );

  const handleCreateDossier = useCallback(() => {
    if (!formEmployeeName || !formFactsDesc || !formFactsDate || !formKnowledgeDate || !formTypeCode) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    const dossier = createDossier({
      employeeId: `emp-${Date.now()}`,
      employeeName: formEmployeeName,
      severity: formSeverity,
      sanctionTypeCode: formTypeCode,
      factsDescription: formFactsDesc,
      factsDate: formFactsDate,
      knowledgeDate: formKnowledgeDate,
    });
    setDossiers(prev => [dossier, ...prev]);
    setSelectedDossier(dossier);
    setShowNewForm(false);
    setFormEmployeeName('');
    setFormFactsDesc('');
    setFormFactsDate('');
    setFormKnowledgeDate('');
    setFormTypeCode('');
    toast.success('Expediente disciplinario creado');
  }, [formSeverity, formTypeCode, formEmployeeName, formFactsDesc, formFactsDate, formKnowledgeDate]);

  const handleTransition = useCallback((dossierId: string, newStatus: DossierStatus) => {
    setDossiers(prev => prev.map(d => {
      if (d.id !== dossierId) return d;
      const result = transitionDossier(d, newStatus, 'admin');
      if (!result.success) {
        toast.error(result.error);
        return d;
      }
      setSelectedDossier(result.dossier);
      toast.success(`Estado actualizado a ${getStatusLabel(newStatus)}`);
      return result.dossier;
    }));
  }, []);

  const handleAddEvidence = useCallback((dossierId: string) => {
    setDossiers(prev => prev.map(d => {
      if (d.id !== dossierId) return d;
      const updated = addEvidence(d, {
        type: 'document',
        title: 'Evidencia adjunta',
        description: 'Documento añadido al expediente',
        attachedBy: 'admin',
      });
      setSelectedDossier(updated);
      toast.success('Evidencia añadida');
      return updated;
    }));
  }, []);

  const handleGenerateLetter = useCallback((dossier: SanctionDossier) => {
    const sanctionType = getSanctionTypeByCode(dossier.sanctionTypeCode);
    const letter = generateSanctionLetter({
      employeeName: dossier.employeeName,
      companyName: 'Empresa S.L.',
      severity: dossier.severity,
      factsDescription: dossier.factsDescription,
      factsDate: dossier.factsDate,
      legalBasis: sanctionType?.legalBasis ?? 'Art. 58 ET',
      proposedSanction: dossier.proposedSanction ?? sanctionType?.typicalSanctions[0] ?? 'Amonestación escrita',
      notificationDate: format(new Date(), 'dd/MM/yyyy'),
    });

    setDossiers(prev => prev.map(d => {
      if (d.id !== dossier.id) return d;
      const updated = { ...d, letterGenerated: true, letterContent: letter, updatedAt: new Date().toISOString() };
      setSelectedDossier(updated);
      return updated;
    }));

    // Download
    const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carta-sancion-${dossier.employeeName.replace(/\s/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Carta de sanción generada como borrador');
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-orange-600">
                <Gavel className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Motor de Sanciones Laborales</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gestión disciplinaria — ET Arts. 54, 58, 60
                </p>
              </div>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => { setShowNewForm(true); setActiveTab('new'); }}>
              <Plus className="h-3.5 w-3.5" /> Nuevo expediente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{dossiers.length}</p>
              <p className="text-xs text-muted-foreground">Total expedientes</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-yellow-600">
                {dossiers.filter(d => !['executed', 'withdrawn', 'expired'].includes(d.status)).length}
              </p>
              <p className="text-xs text-muted-foreground">En curso</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-red-600">
                {dossiers.filter(d => {
                  const p = checkPrescription(d.severity, d.factsDate, d.knowledgeDate);
                  return p.urgencyLevel === 'critical' && !['executed', 'withdrawn', 'expired'].includes(d.status);
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Prescripción crítica</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-green-600">
                {dossiers.filter(d => d.status === 'executed').length}
              </p>
              <p className="text-xs text-muted-foreground">Ejecutadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Esta herramienta es un <strong>soporte de gestión interna</strong>. Las tipificaciones son orientativas
          según ET y convenio. Las cartas generadas son <strong>borradores que requieren revisión jurídica</strong>.
          No sustituye asesoramiento legal profesional.
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dossiers" className="gap-1.5 text-xs">
                <ClipboardList className="h-3.5 w-3.5" /> Expedientes
              </TabsTrigger>
              <TabsTrigger value="prescription" className="gap-1.5 text-xs">
                <Timer className="h-3.5 w-3.5" /> Prescripción
              </TabsTrigger>
              <TabsTrigger value="catalog" className="gap-1.5 text-xs">
                <Scale className="h-3.5 w-3.5" /> Tipificación
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Nuevo
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Dossiers List */}
            <TabsContent value="dossiers" className="mt-0">
              <ScrollArea className="h-[520px] pr-2">
                {dossiers.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Gavel className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay expedientes disciplinarios</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveTab('new')}>
                      Crear primer expediente
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dossiers.map(d => {
                      const prescription = checkPrescription(d.severity, d.factsDate, d.knowledgeDate);
                      const isTerminal = ['executed', 'withdrawn', 'expired'].includes(d.status);

                      return (
                        <div
                          key={d.id}
                          className={cn(
                            'p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/30',
                            selectedDossier?.id === d.id ? 'ring-2 ring-primary/30 bg-muted/20' : '',
                            isTerminal ? 'opacity-70' : '',
                          )}
                          onClick={() => setSelectedDossier(d)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">{d.employeeName}</p>
                                <Badge variant="outline" className={cn('text-[10px]', SEVERITY_COLORS[d.severity])}>
                                  {getSeverityLabel(d.severity)}
                                </Badge>
                                <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[d.status])}>
                                  {getStatusLabel(d.status)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {d.factsDescription}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                <span>Hechos: {d.factsDate}</span>
                                <span>Evidencias: {d.evidence.length}</span>
                                {!isTerminal && (
                                  <span className={URGENCY_COLORS[prescription.urgencyLevel]}>
                                    {prescription.isExpired
                                      ? '⚠ PRESCRITA'
                                      : `${prescription.daysRemaining}d para prescripción`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Prescription Reference */}
            <TabsContent value="prescription" className="mt-0">
              <ScrollArea className="h-[520px] pr-2">
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="text-sm font-medium mb-2">Plazos de prescripción — Art. 60.2 ET</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Las faltas prescriben contando desde la fecha en que la empresa tuvo conocimiento,
                      con un límite absoluto de 6 meses desde la comisión de los hechos.
                    </p>
                    <div className="space-y-2">
                      {(Object.entries(prescriptionRules) as [SanctionSeverity, { daysFromKnowledge: number; monthsAbsolute: number }][]).map(([sev, rule]) => (
                        <div key={sev} className="flex items-center justify-between p-2 rounded border bg-card">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn('text-xs', SEVERITY_COLORS[sev])}>
                              {getSeverityLabel(sev)}
                            </Badge>
                          </div>
                          <div className="text-right text-xs">
                            <span className="font-medium">{rule.daysFromKnowledge} días</span>
                            <span className="text-muted-foreground"> desde conocimiento</span>
                            <span className="mx-1">|</span>
                            <span className="font-medium">{rule.monthsAbsolute} meses</span>
                            <span className="text-muted-foreground"> absoluto</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active dossiers with prescription tracking */}
                  <h4 className="text-sm font-medium">Expedientes activos — Control de prescripción</h4>
                  {dossiers.filter(d => !['executed', 'withdrawn', 'expired'].includes(d.status)).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Sin expedientes activos</p>
                  ) : (
                    dossiers
                      .filter(d => !['executed', 'withdrawn', 'expired'].includes(d.status))
                      .map(d => {
                        const p = checkPrescription(d.severity, d.factsDate, d.knowledgeDate);
                        const maxDays = PRESCRIPTION_RULES_INTERNAL[d.severity];
                        const elapsed = maxDays - p.daysRemaining;
                        const pct = Math.min(100, Math.max(0, (elapsed / maxDays) * 100));

                        return (
                          <div key={d.id} className="p-3 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{d.employeeName}</span>
                              <Badge variant="outline" className={cn('text-[10px]', SEVERITY_COLORS[d.severity])}>
                                {getSeverityLabel(d.severity)}
                              </Badge>
                            </div>
                            <Progress value={pct} className={cn('h-2', p.urgencyLevel === 'critical' || p.urgencyLevel === 'expired' ? '[&>div]:bg-red-500' : '')} />
                            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                              <span>Conocimiento: {d.knowledgeDate}</span>
                              <span className={URGENCY_COLORS[p.urgencyLevel]}>
                                {p.isExpired ? 'PRESCRITA' : `${p.daysRemaining} días restantes`}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Catalog */}
            <TabsContent value="catalog" className="mt-0">
              <ScrollArea className="h-[520px] pr-2">
                <div className="space-y-4">
                  {(['leve', 'grave', 'muy_grave'] as SanctionSeverity[]).map(severity => (
                    <div key={severity}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={cn('text-xs', SEVERITY_COLORS[severity])}>
                          Falta {getSeverityLabel(severity)}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {sanctionTypes.filter(t => t.severity === severity).map(t => (
                          <div key={t.code} className="p-2.5 rounded-lg border bg-card text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-[10px] text-muted-foreground">{t.code}</span>
                              <span className="font-medium">{t.description}</span>
                            </div>
                            <p className="text-muted-foreground text-[10px] font-mono">{t.legalBasis}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {t.typicalSanctions.map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* New Dossier Form */}
            <TabsContent value="new" className="mt-0">
              <ScrollArea className="h-[520px] pr-2">
                <div className="space-y-4 max-w-lg">
                  <h4 className="text-sm font-medium">Nuevo expediente disciplinario</h4>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Empleado *</label>
                    <Input
                      placeholder="Nombre completo"
                      value={formEmployeeName}
                      onChange={e => setFormEmployeeName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Gravedad *</label>
                    <Select value={formSeverity} onValueChange={v => { setFormSeverity(v as SanctionSeverity); setFormTypeCode(''); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leve">Leve</SelectItem>
                        <SelectItem value="grave">Grave</SelectItem>
                        <SelectItem value="muy_grave">Muy grave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipificación *</label>
                    <Select value={formTypeCode} onValueChange={setFormTypeCode}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar tipo de falta" /></SelectTrigger>
                      <SelectContent>
                        {filteredTypes.map(t => (
                          <SelectItem key={t.code} value={t.code}>
                            {t.code} — {t.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha hechos *</label>
                      <Input type="date" value={formFactsDate} onChange={e => setFormFactsDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha conocimiento *</label>
                      <Input type="date" value={formKnowledgeDate} onChange={e => setFormKnowledgeDate(e.target.value)} />
                    </div>
                  </div>

                  {formFactsDate && formKnowledgeDate && (
                    <div className="p-2.5 rounded-lg border bg-muted/50">
                      {(() => {
                        const p = checkPrescription(formSeverity, formFactsDate, formKnowledgeDate);
                        return (
                          <div className="text-xs">
                            <span className="font-medium">Prescripción: </span>
                            <span className={URGENCY_COLORS[p.urgencyLevel]}>
                              {p.isExpired
                                ? '⚠ YA PRESCRITA — no procede abrir expediente'
                                : `${p.daysRemaining} días restantes (límite: ${format(p.effectiveDeadline, 'dd/MM/yyyy')})`
                              }
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción de los hechos *</label>
                    <Textarea
                      placeholder="Descripción detallada de los hechos que motivan el expediente..."
                      value={formFactsDesc}
                      onChange={e => setFormFactsDesc(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button onClick={handleCreateDossier} className="w-full gap-1.5">
                    <Plus className="h-4 w-4" /> Crear expediente
                  </Button>
                </div>
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Dossier Detail */}
      {selectedDossier && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                Expediente: {selectedDossier.employeeName}
                <Badge variant="outline" className={cn('text-[10px]', SEVERITY_COLORS[selectedDossier.severity])}>
                  {getSeverityLabel(selectedDossier.severity)}
                </Badge>
                <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[selectedDossier.status])}>
                  {getStatusLabel(selectedDossier.status)}
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDossier(null)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="detail">
              <TabsList className="grid w-full grid-cols-3 mb-3">
                <TabsTrigger value="detail" className="text-xs">Detalle</TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                <TabsTrigger value="evidence" className="text-xs">Evidencias ({selectedDossier.evidence.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="detail">
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground">Hechos</p>
                    <p className="mt-0.5">{selectedDossier.factsDescription}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="font-medium text-muted-foreground">Fecha hechos</p>
                      <p>{selectedDossier.factsDate}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Fecha conocimiento</p>
                      <p>{selectedDossier.knowledgeDate}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="font-medium text-muted-foreground">Tipificación</p>
                    <p className="font-mono text-[10px]">
                      {getSanctionTypeByCode(selectedDossier.sanctionTypeCode)?.legalBasis ?? '—'}
                    </p>
                  </div>
                  {selectedDossier.hearingRequired && (
                    <>
                      <Separator />
                      <div className="p-2 rounded bg-indigo-50 border border-indigo-200 text-indigo-800">
                        <p className="font-medium">⚖ Expediente contradictorio requerido</p>
                        <p className="text-[10px] mt-0.5">
                          Art. 55.1 ET — Obligatorio para representantes legales y delegados sindicales.
                          Recomendado para faltas muy graves.
                        </p>
                      </div>
                    </>
                  )}
                  <Separator />
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {getValidTransitions(selectedDossier.status).map(nextStatus => (
                      <Button
                        key={nextStatus}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleTransition(selectedDossier.id, nextStatus)}
                      >
                        <ChevronRight className="h-3 w-3 mr-1" />
                        {getStatusLabel(nextStatus)}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleAddEvidence(selectedDossier.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Evidencia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleGenerateLetter(selectedDossier)}
                    >
                      <FileText className="h-3 w-3 mr-1" /> Generar carta
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeline">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {selectedDossier.timeline.map((entry, i) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                          {i < selectedDossier.timeline.length - 1 && (
                            <div className="w-px flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <div className="pb-3">
                          <p className="text-xs font-medium">{entry.action}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.description}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm')}
                            {entry.performedBy ? ` — ${entry.performedBy}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="evidence">
                <ScrollArea className="h-[300px]">
                  {selectedDossier.evidence.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Sin evidencias adjuntas</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDossier.evidence.map(ev => (
                        <div key={ev.id} className="p-2.5 rounded-lg border text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{ev.title}</span>
                            <Badge variant="secondary" className="text-[10px]">{ev.type}</Badge>
                          </div>
                          {ev.description && (
                            <p className="text-muted-foreground mt-0.5">{ev.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {format(new Date(ev.attachedAt), 'dd/MM/yyyy HH:mm')}
                            {ev.attachedBy ? ` — ${ev.attachedBy}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Internal helper for progress bar calculation
const PRESCRIPTION_RULES_INTERNAL: Record<SanctionSeverity, number> = {
  leve: 10,
  grave: 20,
  muy_grave: 60,
};

export default HRDisciplinarySanctionsPanel;
