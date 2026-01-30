/**
 * ComplianceEngineTrend - Tendencia #8: Compliance Autonomous Engine
 * Implementación completa con datos de ejemplo
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  FileText,
  Clock,
  Eye,
  RefreshCw,
  Download,
  Settings,
  Activity,
  Lock,
  Unlock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Frameworks de compliance
const COMPLIANCE_FRAMEWORKS = [
  {
    id: 'niif',
    name: 'NIIF/NIC',
    fullName: 'Normas Internacionales de Información Financiera',
    status: 'compliant',
    score: 94,
    controls: { total: 156, compliant: 147, non_compliant: 5, not_applicable: 4 },
    lastAudit: '2024-01-15',
    nextAudit: '2024-04-15',
    alerts: 2,
  },
  {
    id: 'rgpd',
    name: 'RGPD',
    fullName: 'Reglamento General de Protección de Datos',
    status: 'compliant',
    score: 98,
    controls: { total: 89, compliant: 87, non_compliant: 1, not_applicable: 1 },
    lastAudit: '2024-01-20',
    nextAudit: '2024-07-20',
    alerts: 0,
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    fullName: 'Seguridad de la Información',
    status: 'partial',
    score: 82,
    controls: { total: 114, compliant: 94, non_compliant: 12, not_applicable: 8 },
    lastAudit: '2024-01-10',
    nextAudit: '2024-02-28',
    alerts: 5,
  },
  {
    id: 'soc2',
    name: 'SOC 2',
    fullName: 'Service Organization Control 2',
    status: 'in_progress',
    score: 67,
    controls: { total: 78, compliant: 52, non_compliant: 18, not_applicable: 8 },
    lastAudit: '2024-01-05',
    nextAudit: '2024-03-15',
    alerts: 8,
  },
];

const RECENT_AUDITS = [
  { id: 1, framework: 'NIIF', type: 'Automated', result: 'passed', findings: 2, date: '2024-01-28', duration: '45 min' },
  { id: 2, framework: 'RGPD', type: 'Automated', result: 'passed', findings: 0, date: '2024-01-27', duration: '32 min' },
  { id: 3, framework: 'ISO 27001', type: 'Manual', result: 'issues', findings: 5, date: '2024-01-25', duration: '3 horas' },
  { id: 4, framework: 'NIIF', type: 'Automated', result: 'passed', findings: 1, date: '2024-01-22', duration: '48 min' },
  { id: 5, framework: 'SOC 2', type: 'Automated', result: 'issues', findings: 8, date: '2024-01-20', duration: '1 hora' },
];

const CONTROL_ALERTS = [
  { id: 1, control: 'ACC-015', framework: 'NIIF', description: 'Provisiones sin documentación de soporte', severity: 'high', dueDate: '2024-02-05' },
  { id: 2, control: 'SEC-042', framework: 'ISO 27001', description: 'Acceso privilegiado sin MFA', severity: 'critical', dueDate: '2024-01-30' },
  { id: 3, control: 'DAT-008', framework: 'RGPD', description: 'Consentimiento pendiente de renovación', severity: 'medium', dueDate: '2024-02-15' },
  { id: 4, control: 'SEC-018', framework: 'ISO 27001', description: 'Logs de auditoría incompletos', severity: 'high', dueDate: '2024-02-01' },
];

const EVIDENCE_QUEUE = [
  { id: 1, control: 'ACC-003', type: 'Documento', status: 'pending', description: 'Balance de comprobación Q4' },
  { id: 2, control: 'SEC-015', type: 'Screenshot', status: 'approved', description: 'Configuración firewall' },
  { id: 3, control: 'DAT-012', type: 'Log', status: 'review', description: 'Accesos a datos personales' },
  { id: 4, control: 'ACC-028', type: 'Informe', status: 'pending', description: 'Reconciliación bancaria' },
];

export function ComplianceEngineTrend() {
  const [selectedFramework, setSelectedFramework] = useState(COMPLIANCE_FRAMEWORKS[0]);
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  const handleRunAudit = () => {
    setIsRunningAudit(true);
    setTimeout(() => {
      setIsRunningAudit(false);
      toast.success('Auditoría completada correctamente');
    }, 3000);
  };

  const overallScore = Math.round(
    COMPLIANCE_FRAMEWORKS.reduce((acc, f) => acc + f.score, 0) / COMPLIANCE_FRAMEWORKS.length
  );
  const totalAlerts = COMPLIANCE_FRAMEWORKS.reduce((acc, f) => acc + f.alerts, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant': return <Badge className="bg-green-500">Cumple</Badge>;
      case 'partial': return <Badge className="bg-amber-500">Parcial</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500">En Progreso</Badge>;
      case 'non_compliant': return <Badge variant="destructive">No Cumple</Badge>;
      default: return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Crítico</Badge>;
      case 'high': return <Badge className="bg-orange-500">Alto</Badge>;
      case 'medium': return <Badge className="bg-amber-500">Medio</Badge>;
      case 'low': return <Badge variant="secondary">Bajo</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{overallScore}%</p>
            <p className="text-xs text-muted-foreground">Score Global</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{COMPLIANCE_FRAMEWORKS.length}</p>
            <p className="text-xs text-muted-foreground">Frameworks</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{RECENT_AUDITS.length}</p>
            <p className="text-xs text-muted-foreground">Auditorías Recientes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{totalAlerts}</p>
            <p className="text-xs text-muted-foreground">Alertas Activas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Frameworks List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Frameworks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {COMPLIANCE_FRAMEWORKS.map((framework) => (
                <div 
                  key={framework.id}
                  onClick={() => setSelectedFramework(framework)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    selectedFramework.id === framework.id 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{framework.name}</span>
                    {getStatusBadge(framework.status)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Cumplimiento</span>
                      <span className="font-medium">{framework.score}%</span>
                    </div>
                    <Progress value={framework.score} className="h-1.5" />
                  </div>
                  {framework.alerts > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-amber-600 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      {framework.alerts} alertas
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Framework Detail */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedFramework.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{selectedFramework.fullName}</p>
              </div>
              {getStatusBadge(selectedFramework.status)}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="h-full">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">General</TabsTrigger>
                <TabsTrigger value="controls">Controles</TabsTrigger>
                <TabsTrigger value="evidence">Evidencias</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0 space-y-4">
                {/* Score */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Puntuación de Cumplimiento</span>
                    <span className="font-bold text-xl">{selectedFramework.score}%</span>
                  </div>
                  <Progress value={selectedFramework.score} className="h-3" />
                </div>

                {/* Controls Summary */}
                <div className="grid grid-cols-4 gap-3">
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 text-center">
                      <p className="text-xl font-bold">{selectedFramework.controls.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-500/10">
                    <CardContent className="p-3 text-center">
                      <p className="text-xl font-bold text-green-600">{selectedFramework.controls.compliant}</p>
                      <p className="text-xs text-muted-foreground">Cumple</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10">
                    <CardContent className="p-3 text-center">
                      <p className="text-xl font-bold text-red-600">{selectedFramework.controls.non_compliant}</p>
                      <p className="text-xs text-muted-foreground">No Cumple</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 text-center">
                      <p className="text-xl font-bold">{selectedFramework.controls.not_applicable}</p>
                      <p className="text-xs text-muted-foreground">N/A</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Audit Schedule */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Última Auditoría</span>
                    </div>
                    <p className="font-medium">{selectedFramework.lastAudit}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Próxima Auditoría</span>
                    </div>
                    <p className="font-medium">{selectedFramework.nextAudit}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button 
                    className="flex-1 gap-2"
                    onClick={handleRunAudit}
                    disabled={isRunningAudit}
                  >
                    {isRunningAudit ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                    Ejecutar Auditoría
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="controls" className="mt-0">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {CONTROL_ALERTS.filter(a => a.framework === selectedFramework.name || selectedFramework.id === 'niif').slice(0, 4).map((alert) => (
                      <div key={alert.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{alert.control}</Badge>
                            <span className="font-medium text-sm">{alert.description}</span>
                          </div>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Fecha límite: {alert.dueDate}</span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            Resolver
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="evidence" className="mt-0">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {EVIDENCE_QUEUE.map((evidence) => (
                      <div key={evidence.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            evidence.status === 'approved' && "bg-green-500/10",
                            evidence.status === 'pending' && "bg-amber-500/10",
                            evidence.status === 'review' && "bg-blue-500/10"
                          )}>
                            {evidence.status === 'approved' 
                              ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                              : evidence.status === 'pending'
                              ? <Clock className="h-4 w-4 text-amber-500" />
                              : <Eye className="h-4 w-4 text-blue-500" />
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{evidence.control}</Badge>
                              <span className="text-sm font-medium">{evidence.description}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{evidence.type}</p>
                          </div>
                        </div>
                        <Badge variant={
                          evidence.status === 'approved' ? 'default' :
                          evidence.status === 'pending' ? 'secondary' : 'outline'
                        }>
                          {evidence.status === 'approved' ? 'Aprobado' :
                           evidence.status === 'pending' ? 'Pendiente' : 'En Revisión'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Auditorías Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[180px]">
            <div className="space-y-2">
              {RECENT_AUDITS.map((audit) => (
                <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      audit.result === 'passed' ? "bg-green-500/10" : "bg-amber-500/10"
                    )}>
                      {audit.result === 'passed' 
                        ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                        : <AlertTriangle className="h-5 w-5 text-amber-500" />
                      }
                    </div>
                    <div>
                      <p className="font-medium">{audit.framework}</p>
                      <p className="text-xs text-muted-foreground">{audit.type} • {audit.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">{audit.findings} hallazgos</p>
                      <p className="text-xs text-muted-foreground">{audit.duration}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ComplianceEngineTrend;
