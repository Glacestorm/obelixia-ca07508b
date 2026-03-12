/**
 * HRComplianceEvidencePanel — Evidencias documentales de cumplimiento
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Plus, FileCheck } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';

interface Props { companyId: string; }

const DEMO_EVIDENCE = [
  { id: '1', employee: 'Equipo Ventas (8)', requirement: 'Reconocimiento médico anual', expiry: '2026-06-30', status: 'valid' },
  { id: '2', employee: 'Pedro García', requirement: 'Formación PRL', expiry: '2026-04-15', status: 'expiring' },
  { id: '3', employee: 'Ana López', requirement: 'Consentimiento GDPR', expiry: '2025-12-31', status: 'expired' },
  { id: '4', employee: 'Nuevas incorporaciones (3)', requirement: 'Certificado antecedentes', expiry: null, status: 'pending' },
];

export function HRComplianceEvidencePanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" /> Evidencias de Cumplimiento
          </h3>
          <p className="text-sm text-muted-foreground">Certificados, reconocimientos médicos, consentimientos GDPR</p>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Registrar evidencia</Button>
      </div>

      <div className="grid gap-3">
        {DEMO_EVIDENCE.map(ev => (
          <Card key={ev.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <FileCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{ev.requirement}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.employee}{ev.expiry ? ` · Vence: ${ev.expiry}` : ' · Sin vencimiento'}
                  </p>
                </div>
              </div>
              <HRStatusBadge entity="evidence" status={ev.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
