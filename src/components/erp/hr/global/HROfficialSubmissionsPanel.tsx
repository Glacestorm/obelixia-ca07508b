/**
 * HROfficialSubmissionsPanel — Envíos a organismos oficiales
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Plus, FileCheck } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';

interface Props { companyId: string; }

const DEMO_SUBMISSIONS = [
  { id: '1', type: 'Milena PA', subtype: 'Alta', employee: 'Ana López', date: '2026-03-10', status: 'accepted', ref: 'MIL-2026-001' },
  { id: '2', type: 'Contrat@', subtype: 'Comunicación contrato', employee: 'Carlos Ruiz', date: '2026-03-09', status: 'sent', ref: 'CTR-2026-042' },
  { id: '3', type: 'AEAT Mod.111', subtype: 'Retenciones T1 2026', employee: '—', date: '2026-03-08', status: 'pending', ref: 'AEAT-111-T1' },
  { id: '4', type: 'Certifica2', subtype: 'Certificado empresa', employee: 'Pedro García', date: '2026-03-07', status: 'accepted', ref: 'CRT-2026-015' },
  { id: '5', type: 'SILTRA', subtype: 'Variación cotización', employee: 'Laura Díaz', date: '2026-03-05', status: 'rejected', ref: 'SIL-2026-008' },
];

export function HROfficialSubmissionsPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Send className="h-5 w-5 text-indigo-500" /> Envíos Oficiales
          </h3>
          <p className="text-sm text-muted-foreground">SILTRA, Milena PA, Contrat@, AEAT, Certifica2</p>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nuevo envío</Button>
      </div>

      <div className="grid gap-3">
        {DEMO_SUBMISSIONS.map(sub => (
          <Card key={sub.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Send className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{sub.type} — {sub.subtype}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.employee !== '—' ? `${sub.employee} · ` : ''}{sub.ref} · {sub.date}
                  </p>
                </div>
              </div>
              <HRStatusBadge entity="submission" status={sub.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
