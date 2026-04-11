/**
 * MobilityAssignmentDetail — Full view of a single assignment
 * Header + Tabs: Summary, Classification, Tax Impact, Documents, Costs, Compliance, Audit
 * P1.7B-RA: Added Classification and Tax Impact tabs
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Globe, MapPin, DollarSign, Shield, Clock, FileText, History } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';
import { MobilityDocumentsPanel } from './MobilityDocumentsPanel';
import { MobilityCostProjectionPanel } from './MobilityCostProjectionPanel';
import { MobilityCompliancePanel } from './MobilityCompliancePanel';
import { MobilityClassificationPanel } from './MobilityClassificationPanel';
import { MobilityTaxImpactPanel } from './MobilityTaxImpactPanel';
import { useExpatriateCase } from '@/hooks/erp/hr/useExpatriateCase';
import type {
  MobilityAssignment, MobilityDocument, MobilityCostProjection, MobilityAuditEntry,
  AssignmentStatus,
} from '@/hooks/erp/hr/useGlobalMobility';

interface Props {
  assignment: MobilityAssignment;
  onBack: () => void;
  onStatusChange: (id: string, status: AssignmentStatus) => void;
  onEdit?: () => void;
  onDelete?: (id: string) => void;
  fetchDocuments: (id: string) => Promise<MobilityDocument[]>;
  addDocument: (doc: Partial<MobilityDocument>) => Promise<MobilityDocument | null>;
  updateDocument: (id: string, updates: Partial<MobilityDocument>) => Promise<boolean>;
  fetchCostProjection: (id: string, year?: number) => Promise<MobilityCostProjection[]>;
  upsertCostProjection: (p: Partial<MobilityCostProjection>) => Promise<MobilityCostProjection | null>;
  fetchAuditLog: (id: string) => Promise<MobilityAuditEntry[]>;
  validTransitions: Record<AssignmentStatus, AssignmentStatus[]>;
  employeeName?: string;
}

const JURISDICTION_LABELS = [
  { key: 'home_country_code', label: '🏠 País origen', icon: MapPin },
  { key: 'host_country_code', label: '✈️ País destino', icon: Globe },
  { key: 'payroll_country_code', label: '💰 País nómina', icon: DollarSign },
  { key: 'tax_residence_country', label: '🏦 Residencia fiscal', icon: Shield },
  { key: 'ss_regime_country', label: '🛡️ Régimen SS', icon: Shield },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', planned: 'Planificada', pre_assignment: 'Pre-asignación',
  active: 'Activa', extending: 'Extensión', repatriating: 'Repatriación',
  completed: 'Completada', cancelled: 'Cancelada',
};

const SUPPORT_BADGE_COLORS: Record<string, string> = {
  supported_production: 'bg-success/12 text-success border-success/30',
  supported_with_review: 'bg-warning/12 text-warning border-warning/30',
  out_of_scope: 'bg-destructive/12 text-destructive border-destructive/30',
};

export function MobilityAssignmentDetail({
  assignment, onBack, onStatusChange,
  fetchDocuments, addDocument, updateDocument,
  fetchCostProjection, upsertCostProjection,
  fetchAuditLog, validTransitions,
}: Props) {
  const [documents, setDocuments] = useState<MobilityDocument[]>([]);
  const [costs, setCosts] = useState<MobilityCostProjection[]>([]);
  const [audit, setAudit] = useState<MobilityAuditEntry[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingDocs(true);
    const [docs, costsData, auditData] = await Promise.all([
      fetchDocuments(assignment.id),
      fetchCostProjection(assignment.id),
      fetchAuditLog(assignment.id),
    ]);
    setDocuments(docs);
    setCosts(costsData);
    setAudit(auditData);
    setLoadingDocs(false);
  }, [assignment.id, fetchDocuments, fetchCostProjection, fetchAuditLog]);

  useEffect(() => { loadData(); }, [loadData]);

  // P1.7B-RA: Expatriate case classification
  const expatCase = useExpatriateCase(assignment, documents);

  const a = assignment;
  const nextStatuses = validTransitions[a.status] || [];
  const pkg = a.allowance_package || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{a.home_country_code} → {a.host_country_code}</p>
                  <HRStatusBadge entity="mobility" status={a.status} />
                  {/* P1.7B-RA: Support level badge */}
                  {expatCase && (
                    <Badge className={`text-[9px] ${SUPPORT_BADGE_COLORS[expatCase.overallSupportLevel]}`}>
                      {expatCase.overallSupportLevel === 'supported_production' ? '✅ Producción'
                        : expatCase.overallSupportLevel === 'supported_with_review' ? '⚠️ Revisión'
                        : '🚫 Fuera alcance'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.start_date}{a.end_date ? ` → ${a.end_date}` : ' → indefinido'} · {a.assignment_type.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {nextStatuses.map(ns => (
                <Button key={ns} variant="outline" size="sm" className="text-xs" onClick={() => onStatusChange(a.id, ns)}>
                  → {STATUS_LABELS[ns]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="summary" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="classification" className="text-xs">Clasificación</TabsTrigger>
          <TabsTrigger value="tax" className="text-xs">Impacto Fiscal</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Documentos</TabsTrigger>
          <TabsTrigger value="costs" className="text-xs">Costes</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Auditoría</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary" className="space-y-3">
          {/* 5 Jurisdictions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Modelo de 5 jurisdicciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {JURISDICTION_LABELS.map(j => (
                  <div key={j.key} className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">{j.label}</p>
                    <p className="text-sm font-bold mt-0.5">{(a as any)[j.key]}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compensation */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground mb-2">Compensación</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>Enfoque</span><span className="font-medium">{a.compensation_approach.replace(/_/g, ' ')}</span></div>
                  <div className="flex justify-between"><span>Split payroll</span><span>{a.split_payroll ? '✅' : '—'}</span></div>
                  <div className="flex justify-between"><span>Shadow payroll</span><span>{a.shadow_payroll ? '✅' : '—'}</span></div>
                  <div className="flex justify-between"><span>Imp. hipotético</span><span>{a.hypothetical_tax ? `€${a.hypothetical_tax.toLocaleString()}` : '—'}</span></div>
                  <div className="flex justify-between"><span>Divisa</span><span>{a.currency_code}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground mb-2">Beneficios internacionales</p>
                <div className="space-y-1 text-xs">
                  {Object.entries(pkg).filter(([, v]) => v && v > 0).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k.replace(/_/g, ' ')}</span>
                      <span className="font-medium">€{(v as number).toLocaleString()}</span>
                    </div>
                  ))}
                  {Object.values(pkg).every(v => !v || v === 0) && (
                    <p className="text-muted-foreground">Sin beneficios configurados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk + notes */}
          {(a.notes || a.risk_level !== 'low') && (
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge variant="outline" className="text-[10px]">Riesgo: {a.risk_level}</Badge>
                </div>
                {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Classification — P1.7B-RA */}
        <TabsContent value="classification">
          {expatCase ? (
            <MobilityClassificationPanel expatCase={expatCase} documents={documents} />
          ) : (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Cargando clasificación…</CardContent></Card>
          )}
        </TabsContent>

        {/* Tax Impact — P1.7B-RA */}
        <TabsContent value="tax">
          {expatCase ? (
            <MobilityTaxImpactPanel expatCase={expatCase} />
          ) : (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Cargando impacto fiscal…</CardContent></Card>
          )}
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <MobilityDocumentsPanel
            assignmentId={assignment.id}
            documents={documents}
            loading={loadingDocs}
            onAdd={async (doc) => { const r = await addDocument(doc); if (r) setDocuments(prev => [r, ...prev]); }}
            onUpdate={async (id, updates) => { const ok = await updateDocument(id, updates); if (ok) loadData(); }}
          />
        </TabsContent>

        {/* Costs */}
        <TabsContent value="costs">
          <MobilityCostProjectionPanel
            assignmentId={assignment.id}
            projections={costs}
            currency={assignment.currency_code}
            onUpsert={async (p) => { const r = await upsertCostProjection(p); if (r) loadData(); }}
          />
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance">
          <MobilityCompliancePanel
            assignment={assignment}
            documents={documents}
          />
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-1"><History className="h-3.5 w-3.5" /> Historial de cambios</CardTitle>
            </CardHeader>
            <CardContent>
              {audit.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin registros de auditoría</p>
              ) : (
                <div className="space-y-2">
                  {audit.map(entry => (
                    <div key={entry.id} className="flex items-start gap-2 text-xs p-2 rounded border">
                      <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{entry.action.replace(/_/g, ' ')}</p>
                        <p className="text-muted-foreground">{new Date(entry.created_at).toLocaleString('es-ES')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
