/**
 * HRAuditDashboard — Dashboard principal de Auditoría y Compliance RRHH
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield, AlertTriangle, CheckCircle, FileText,
  RefreshCw, Download, Clock, XCircle, Activity,
  Eye
} from 'lucide-react';
import { useHRAuditFindings } from '@/hooks/hr/useHRAuditFindings';
import { useHRGeneratedFiles } from '@/hooks/hr/useHRGeneratedFiles';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { HRAuditFinding, HRGeneratedFile } from '@/types/hr';

const severityConfig: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  critical: { label: 'Crítico', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
  major: { label: 'Mayor', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: AlertTriangle },
  minor: { label: 'Menor', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
  observation: { label: 'Observación', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Eye },
};

const fileStatusConfig: Record<string, { label: string; color: string }> = {
  generated: { label: 'Generado', color: 'bg-blue-500/10 text-blue-500' },
  validated: { label: 'Validado', color: 'bg-cyan-500/10 text-cyan-500' },
  sent: { label: 'Enviado', color: 'bg-purple-500/10 text-purple-500' },
  accepted: { label: 'Aceptado', color: 'bg-green-500/10 text-green-500' },
  rejected: { label: 'Rechazado', color: 'bg-red-500/10 text-red-500' },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground' },
};

export function HRAuditDashboard() {
  const { currentCompany } = useERPContext();
  const companyId = currentCompany?.id;
  const { findings, kpis, isLoading: loadingFindings, fetchFindings, fetchKPIs } = useHRAuditFindings(companyId);
  const { files, isLoading: loadingFiles, fetchFiles } = useHRGeneratedFiles(companyId);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (companyId) {
      fetchFindings();
      fetchKPIs();
      fetchFiles();
    }
  }, [companyId, fetchFindings, fetchKPIs, fetchFiles]);

  const handleRefresh = () => {
    fetchFindings();
    fetchKPIs();
    fetchFiles();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Auditoría & Compliance RRHH</h2>
            <p className="text-sm text-muted-foreground">ISO 9001 · ISO 27001 · ISO 45001</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingFindings}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loadingFindings && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Hallazgos abiertos"
            value={kpis.openFindings}
            total={kpis.totalFindings}
            icon={AlertTriangle}
            color={kpis.criticalFindings > 0 ? 'text-red-500' : 'text-yellow-500'}
          />
          <KPICard
            title="Tasa cumplimiento"
            value={`${kpis.complianceRate}%`}
            icon={CheckCircle}
            color={kpis.complianceRate >= 90 ? 'text-green-500' : 'text-orange-500'}
          />
          <KPICard
            title="Ficheros pendientes"
            value={kpis.pendingFiles}
            total={kpis.generatedFiles}
            icon={FileText}
            color="text-blue-500"
          />
          <KPICard
            title="Informes"
            value={kpis.totalReports}
            icon={Activity}
            color="text-purple-500"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Hallazgos</TabsTrigger>
          <TabsTrigger value="files">Ficheros TGSS/AEAT</TabsTrigger>
          <TabsTrigger value="compliance">Evidencias ISO</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hallazgos de Auditoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {findings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No hay hallazgos registrados</p>
                    <p className="text-xs mt-1">Los hallazgos aparecerán aquí cuando se registren</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {findings.map((finding) => (
                      <FindingRow key={finding.id} finding={finding} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ficheros Generados</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {files.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No hay ficheros generados</p>
                    <p className="text-xs mt-1">Los agentes de nómina generarán ficheros aquí</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {files.map((file) => (
                      <FileRow key={file.id} file={file} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Evidencias ISO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Gestión de evidencias ISO disponible en próximas fases</p>
                <p className="text-xs mt-1">ISO 9001 · ISO 27001 · ISO 45001</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ title, value, total, icon: Icon, color }: {
  title: string;
  value: string | number;
  total?: number;
  icon: typeof AlertTriangle;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <Icon className={cn("h-5 w-5", color)} />
          {total !== undefined && (
            <span className="text-xs text-muted-foreground">de {total}</span>
          )}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

function FindingRow({ finding }: { finding: HRAuditFinding }) {
  const config = severityConfig[finding.severity] || severityConfig.observation;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <Badge variant="outline" className={cn("text-xs", config.color)}>
        {config.label}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{finding.title}</p>
        <p className="text-xs text-muted-foreground">
          {finding.iso_standard} {finding.iso_clause && `§${finding.iso_clause}`} · {finding.finding_code}
        </p>
      </div>
      <Badge variant="outline" className="text-xs">
        {finding.status.replace('_', ' ')}
      </Badge>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(finding.created_at), { locale: es, addSuffix: true })}
      </span>
    </div>
  );
}

function FileRow({ file }: { file: HRGeneratedFile }) {
  const config = fileStatusConfig[file.status] || fileStatusConfig.generated;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {file.file_type} · {file.period_month}/{file.period_year} · {file.records_count} registros
        </p>
      </div>
      <Badge variant="outline" className={cn("text-xs", config.color)}>
        {config.label}
      </Badge>
      {file.generated_by_agent && (
        <span className="text-xs text-muted-foreground">{file.generated_by_agent}</span>
      )}
      {file.file_url && (
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Download className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export default HRAuditDashboard;
