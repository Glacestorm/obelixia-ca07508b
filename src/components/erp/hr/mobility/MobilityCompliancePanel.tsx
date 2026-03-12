/**
 * MobilityCompliancePanel — Compliance checks, PE risk, 183-day rule, document alerts
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { MobilityAssignment, MobilityDocument } from '@/hooks/erp/hr/useGlobalMobility';

interface Props {
  assignment: MobilityAssignment;
  documents: MobilityDocument[];
}

interface ComplianceCheck {
  id: string;
  label: string;
  description: string;
  status: 'ok' | 'warning' | 'error' | 'pending';
  detail?: string;
}

export function MobilityCompliancePanel({ assignment, documents }: Props) {
  const a = assignment;
  const today = new Date();

  // Build compliance checks
  const checks: ComplianceCheck[] = [];

  // 1. Work permit
  const workPermit = documents.find(d => d.document_type === 'work_permit' && d.status === 'active');
  checks.push({
    id: 'work_permit',
    label: 'Permiso de trabajo',
    description: 'Permiso de trabajo válido en país de destino',
    status: workPermit ? 'ok' : documents.some(d => d.document_type === 'work_permit' && d.status === 'applied') ? 'warning' : 'error',
    detail: workPermit ? `Válido hasta ${workPermit.expiry_date}` : 'No encontrado o no activo',
  });

  // 2. Visa
  const visa = documents.find(d => d.document_type === 'visa' && ['active', 'approved'].includes(d.status));
  if (a.home_country_code !== a.host_country_code) {
    checks.push({
      id: 'visa',
      label: 'Visado',
      description: 'Visado de entrada/estancia válido',
      status: visa ? 'ok' : 'warning',
      detail: visa ? `Válido hasta ${visa.expiry_date}` : 'No registrado',
    });
  }

  // 3. A1 Certificate (EU mobility)
  const a1 = documents.find(d => d.document_type === 'a1_certificate' && ['active', 'approved'].includes(d.status));
  if (a.ss_regime_country !== a.host_country_code) {
    checks.push({
      id: 'a1_cert',
      label: 'Certificado A1 / SS bilateral',
      description: `SS en ${a.ss_regime_country} mientras trabaja en ${a.host_country_code}`,
      status: a1 ? 'ok' : 'error',
      detail: a1 ? `Certificado activo` : 'Requiere certificado para evitar doble cotización',
    });
  }

  // 4. Tax residency
  const taxCert = documents.find(d => d.document_type === 'tax_residency_cert');
  checks.push({
    id: 'tax_residency',
    label: 'Certificado residencia fiscal',
    description: `Residencia fiscal declarada: ${a.tax_residence_country}`,
    status: taxCert ? 'ok' : 'warning',
    detail: taxCert ? 'Certificado registrado' : 'Recomendable obtener certificado',
  });

  // 5. 183-day rule
  const daysInHost = (a as any).days_in_host || 0;
  checks.push({
    id: '183_day_rule',
    label: 'Regla de 183 días',
    description: 'Días en país de destino en año fiscal',
    status: daysInHost > 183 ? 'warning' : daysInHost > 150 ? 'warning' : 'ok',
    detail: `${daysInHost} días registrados${daysInHost > 183 ? ' — posible cambio de residencia fiscal' : ''}`,
  });

  // 6. PE Risk
  checks.push({
    id: 'pe_risk',
    label: 'Riesgo de Establecimiento Permanente',
    description: 'Riesgo de crear PE en país de destino',
    status: (a as any).pe_risk_flag ? 'error' : a.risk_level === 'high' || a.risk_level === 'critical' ? 'warning' : 'ok',
    detail: (a as any).pe_risk_flag ? 'Flag PE activo — requiere revisión fiscal' : 'Sin riesgo PE detectado',
  });

  // 7. Expiring documents
  const expiring = documents.filter(d => {
    if (!d.expiry_date) return false;
    const days = (new Date(d.expiry_date).getTime() - today.getTime()) / 86400000;
    return days > 0 && days <= d.alert_days_before;
  });
  if (expiring.length > 0) {
    checks.push({
      id: 'expiring_docs',
      label: 'Documentos por expirar',
      description: `${expiring.length} documento(s) próximos a vencimiento`,
      status: 'warning',
      detail: expiring.map(d => `${d.document_name} (${d.expiry_date})`).join(', '),
    });
  }

  // 8. Assignment letter
  const assignLetter = documents.find(d => d.document_type === 'assignment_letter');
  checks.push({
    id: 'assignment_letter',
    label: 'Carta de asignación',
    description: 'Documento formal de asignación firmado',
    status: assignLetter ? 'ok' : 'pending',
    detail: assignLetter ? 'Registrada' : 'Pendiente de generar/firmar',
  });

  const statusIcon = (s: string) => {
    switch (s) {
      case 'ok': return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const overallOk = checks.filter(c => c.status === 'ok').length;
  const overallTotal = checks.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Compliance & Riesgos</CardTitle>
          <Badge variant="outline" className="text-[10px]">{overallOk}/{overallTotal} OK</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {checks.map(check => (
            <div key={check.id} className="flex items-start gap-2.5 p-2.5 rounded-lg border hover:bg-muted/20 transition-colors">
              {statusIcon(check.status)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{check.label}</p>
                <p className="text-[11px] text-muted-foreground">{check.description}</p>
                {check.detail && (
                  <p className="text-[11px] mt-0.5 text-muted-foreground/80">{check.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
