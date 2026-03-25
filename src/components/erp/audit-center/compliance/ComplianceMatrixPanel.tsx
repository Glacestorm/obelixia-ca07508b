/**
 * ComplianceMatrixPanel — Matriz de compliance y verificación normativa
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const REGULATIONS = [
  { code: 'GDPR', name: 'Protección de Datos (RGPD)', score: 92, status: 'compliant', lastCheck: '2026-03-25' },
  { code: 'DORA', name: 'Digital Operational Resilience Act', score: 78, status: 'partial', lastCheck: '2026-03-24' },
  { code: 'PSD3', name: 'Payment Services Directive 3', score: 85, status: 'compliant', lastCheck: '2026-03-23' },
  { code: 'Basel III/IV', name: 'Requerimientos de Capital', score: 88, status: 'compliant', lastCheck: '2026-03-22' },
  { code: 'ISO 27001', name: 'Seguridad de la Información', score: 90, status: 'compliant', lastCheck: '2026-03-21' },
  { code: 'EU AI Act', name: 'Regulación IA Europea', score: 72, status: 'partial', lastCheck: '2026-03-25' },
  { code: 'MiFID II', name: 'Markets in Financial Instruments', score: 95, status: 'compliant', lastCheck: '2026-03-20' },
  { code: 'AML/KYC', name: 'Anti-Money Laundering', score: 87, status: 'compliant', lastCheck: '2026-03-24' },
];

export function ComplianceMatrixPanel() {
  const overallScore = Math.round(REGULATIONS.reduce((sum, r) => sum + r.score, 0) / REGULATIONS.length);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'partial': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Matriz de Compliance</h3>
          <p className="text-sm text-muted-foreground">
            Verificación continua por el agente AUDIT-AGT-003 · Motor de reglas automático
          </p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{overallScore}%</p>
          <p className="text-xs text-muted-foreground">Score global</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REGULATIONS.map(reg => (
          <Card key={reg.code} className="border hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {statusIcon(reg.status)}
                  <div>
                    <p className="text-sm font-medium">{reg.code}</p>
                    <p className="text-xs text-muted-foreground">{reg.name}</p>
                  </div>
                </div>
                <Badge variant={reg.score >= 85 ? 'secondary' : reg.score >= 70 ? 'outline' : 'destructive'} className="text-xs">
                  {reg.score}%
                </Badge>
              </div>
              <Progress value={reg.score} className="h-2" />
              <p className="text-[10px] text-muted-foreground mt-1">Última verificación: {reg.lastCheck}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
