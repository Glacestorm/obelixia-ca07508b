/**
 * ERPReportsPanel - Panel de Reportes y Auditoría
 * Informes multi-formato con exportación PDF, Excel, XML, XBRL
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileJson,
  FileCode,
  Printer,
  Eye,
  BarChart3,
  PieChart,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Hash,
  Loader2,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ERPReportsPanelProps {
  sessionId?: string;
  migrationId?: string;
}

interface ReportConfig {
  includeExecutiveSummary: boolean;
  includeDetailedErrors: boolean;
  includeAccountMappings: boolean;
  includeStatistics: boolean;
  includeAuditTrail: boolean;
  includeComplianceChecks: boolean;
  format: 'pdf' | 'xlsx' | 'xml' | 'json' | 'xbrl';
}

interface MigrationStats {
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  warningRecords: number;
  processingTime: string;
  dataIntegrity: number;
}

const REPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Informe con firma digital' },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, description: 'Datos detallados en hojas' },
  { value: 'xml', label: 'XML', icon: FileCode, description: 'Formato estructurado' },
  { value: 'json', label: 'JSON', icon: FileJson, description: 'Para integración API' },
  { value: 'xbrl', label: 'XBRL', icon: FileCode, description: 'Reporting regulatorio' },
];

export function ERPReportsPanel({ sessionId, migrationId }: ERPReportsPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    includeExecutiveSummary: true,
    includeDetailedErrors: true,
    includeAccountMappings: true,
    includeStatistics: true,
    includeAuditTrail: true,
    includeComplianceChecks: true,
    format: 'pdf'
  });

  // Mock stats - en producción vendrían del backend
  const [stats] = useState<MigrationStats>({
    totalRecords: 15420,
    successfulRecords: 15180,
    failedRecords: 45,
    warningRecords: 195,
    processingTime: '4h 23m',
    dataIntegrity: 98.5
  });

  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);
    
    // Simular generación
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setIsGenerating(false);
    toast.success(`Informe ${selectedFormat.toUpperCase()} generado correctamente`);
  }, [selectedFormat]);

  const handleConfigChange = (key: keyof ReportConfig, value: boolean) => {
    setReportConfig(prev => ({ ...prev, [key]: value }));
  };

  const successRate = ((stats.successfulRecords / stats.totalRecords) * 100).toFixed(1);

  if (!sessionId && !migrationId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Selecciona una migración para generar reportes
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Exitosos</p>
                <p className="text-2xl font-bold text-green-600">{stats.successfulRecords.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
            <p className="text-xs text-green-600 mt-1">{successRate}% del total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fallidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.failedRecords}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
            <p className="text-xs text-red-600 mt-1">Requieren revisión</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Advertencias</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.warningRecords}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500/50" />
            </div>
            <p className="text-xs text-yellow-600 mt-1">Procesados con avisos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Integridad</p>
                <p className="text-2xl font-bold text-blue-600">{stats.dataIntegrity}%</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500/50" />
            </div>
            <p className="text-xs text-blue-600 mt-1">Verificación OK</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generar Informe</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="history">Informes Anteriores</TabsTrigger>
        </TabsList>

        {/* Generar Informe */}
        <TabsContent value="generate" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Formato de exportación */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Formato de Exportación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {REPORT_FORMATS.map((format) => (
                    <div
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedFormat === format.value
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <format.icon className={cn(
                        "h-5 w-5",
                        selectedFormat === format.value ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="flex-1">
                        <p className="font-medium">{format.label}</p>
                        <p className="text-xs text-muted-foreground">{format.description}</p>
                      </div>
                      {selectedFormat === format.value && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contenido del informe */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contenido del Informe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { key: 'includeExecutiveSummary', label: 'Resumen ejecutivo', desc: 'Vista general para dirección' },
                    { key: 'includeDetailedErrors', label: 'Errores detallados', desc: 'Lista completa de fallos' },
                    { key: 'includeAccountMappings', label: 'Mapeo de cuentas', desc: 'Transformaciones aplicadas' },
                    { key: 'includeStatistics', label: 'Estadísticas', desc: 'Métricas y gráficos' },
                    { key: 'includeAuditTrail', label: 'Audit trail', desc: 'Registro de acciones' },
                    { key: 'includeComplianceChecks', label: 'Verificación normativa', desc: 'Cumplimiento PGC/NIIF' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-start space-x-3">
                      <Checkbox
                        id={item.key}
                        checked={reportConfig[item.key as keyof ReportConfig] as boolean}
                        onCheckedChange={(checked) => 
                          handleConfigChange(item.key as keyof ReportConfig, checked as boolean)
                        }
                      />
                      <div className="grid gap-0.5">
                        <Label htmlFor={item.key} className="font-medium cursor-pointer">
                          {item.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleGenerateReport} 
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando informe...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generar y Descargar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Trail */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Registro de Auditoría
              </CardTitle>
              <CardDescription>
                Todas las acciones quedan registradas con trazabilidad completa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {[
                    { action: 'Migración iniciada', user: 'admin@empresa.com', time: '14:30:15', type: 'info' },
                    { action: 'Plan de cuentas mapeado', user: 'admin@empresa.com', time: '14:32:45', type: 'success' },
                    { action: 'Validación contable ejecutada', user: 'sistema', time: '14:35:22', type: 'info' },
                    { action: '45 errores detectados', user: 'sistema', time: '14:35:23', type: 'warning' },
                    { action: 'Asientos importados (15,180)', user: 'sistema', time: '18:53:41', type: 'success' },
                    { action: 'Hash de integridad generado', user: 'sistema', time: '18:53:42', type: 'info' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className={cn(
                        "p-1.5 rounded-full",
                        log.type === 'success' && "bg-green-500/20 text-green-500",
                        log.type === 'warning' && "bg-yellow-500/20 text-yellow-500",
                        log.type === 'info' && "bg-blue-500/20 text-blue-500"
                      )}>
                        {log.type === 'success' && <CheckCircle className="h-3 w-3" />}
                        {log.type === 'warning' && <AlertTriangle className="h-3 w-3" />}
                        {log.type === 'info' && <Clock className="h-3 w-3" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-muted-foreground">{log.user}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{log.time}</p>
                        <Hash className="h-3 w-3 text-muted-foreground inline-block" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Informes Anteriores */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Informes Generados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {[
                    { name: 'Informe_Migracion_2026-02-01.pdf', size: '2.4 MB', date: '01/02/2026 18:55', format: 'PDF' },
                    { name: 'Detalle_Errores_2026-02-01.xlsx', size: '856 KB', date: '01/02/2026 18:56', format: 'Excel' },
                    { name: 'Audit_Trail_2026-02-01.json', size: '1.2 MB', date: '01/02/2026 18:57', format: 'JSON' },
                  ].map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.size} · {file.date}</p>
                      </div>
                      <Badge variant="outline">{file.format}</Badge>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ERPReportsPanel;
