/**
 * GaliaSmartAuditPanel - Panel de Auditoría Inteligente
 * Fase 7: Excelencia Operacional
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSearch,
  Wand2,
  TrendingUp,
  RefreshCw,
  Download,
  Eye,
  Zap
} from 'lucide-react';
import { useGaliaSmartAudit, AuditFinding, AnomalyPattern } from '@/hooks/galia/useGaliaSmartAudit';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaSmartAuditPanelProps {
  expedienteId?: string;
  convocatoriaId?: string;
  className?: string;
}

export function GaliaSmartAuditPanel({
  expedienteId,
  convocatoriaId,
  className
}: GaliaSmartAuditPanelProps) {
  const [activeTab, setActiveTab] = useState('findings');
  const [auditType, setAuditType] = useState<'full' | 'quick' | 'compliance' | 'financial'>('quick');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    isLoading,
    findings,
    patterns,
    stats,
    runSmartAudit,
    detectAnomalies,
    applyAutoFix,
    resolveFinding,
    getStats
  } = useGaliaSmartAudit();

  useEffect(() => {
    getStats();
  }, [getStats]);

  const handleRunAudit = useCallback(async () => {
    await runSmartAudit({
      expedienteIds: expedienteId ? [expedienteId] : undefined,
      convocatoriaId,
      auditType
    });
  }, [runSmartAudit, expedienteId, convocatoriaId, auditType]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-muted';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      info: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    };
    return colors[severity] || colors.info;
  };

  const filteredFindings = findings.filter(f =>
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Auditoría Inteligente</CardTitle>
              <CardDescription>Detección de anomalías con IA</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={auditType} onValueChange={(v: any) => setAuditType(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Rápida</SelectItem>
                <SelectItem value="full">Completa</SelectItem>
                <SelectItem value="compliance">Cumplimiento</SelectItem>
                <SelectItem value="financial">Financiera</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleRunAudit} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSearch className="h-4 w-4 mr-2" />
              )}
              Ejecutar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold">{stats.totalAudits}</p>
              <p className="text-xs text-muted-foreground">Auditorías</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-orange-500">{stats.anomaliesDetected}</p>
              <p className="text-xs text-muted-foreground">Anomalías</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-green-500">{stats.findingsResolved}</p>
              <p className="text-xs text-muted-foreground">Resueltas</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-blue-500">{stats.autoFixesApplied}</p>
              <p className="text-xs text-muted-foreground">Auto-corregidas</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="findings" className="text-xs">
              Hallazgos ({findings.length})
            </TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs">
              Patrones ({patterns.length})
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">
              Informes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="findings" className="mt-0">
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar hallazgos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="h-[350px]">
              {filteredFindings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No se encontraron hallazgos</p>
                  <p className="text-xs mt-1">Ejecuta una auditoría para detectar anomalías</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFindings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      onAutoFix={() => applyAutoFix(finding.id)}
                      onResolve={() => resolveFinding(finding.id, 'Manual resolution')}
                      getSeverityBadge={getSeverityBadge}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="patterns" className="mt-0">
            <ScrollArea className="h-[350px]">
              {patterns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No se detectaron patrones</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => detectAnomalies()}
                    disabled={isLoading}
                  >
                    Detectar Patrones
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {patterns.map((pattern) => (
                    <PatternCard key={pattern.patternId} pattern={pattern} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <div className="text-center py-8 text-muted-foreground">
              <Download className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Genera informes de auditoría</p>
              <div className="flex gap-2 justify-center mt-3">
                <Button variant="outline" size="sm" disabled={isLoading}>
                  Informe Periódico
                </Button>
                <Button variant="outline" size="sm" disabled={isLoading}>
                  Informe Cumplimiento
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Sub-component for Finding Card
function FindingCard({
  finding,
  onAutoFix,
  onResolve,
  getSeverityBadge
}: {
  finding: AuditFinding;
  onAutoFix: () => void;
  onResolve: () => void;
  getSeverityBadge: (s: string) => string;
}) {
  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={cn("text-xs", getSeverityBadge(finding.severity))}>
              {finding.severity}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {finding.findingType.replace('_', ' ')}
            </Badge>
          </div>
          <p className="font-medium text-sm truncate">{finding.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {finding.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              Confianza: {Math.round(finding.confidence * 100)}%
            </span>
            <span className="text-xs text-muted-foreground">
              · {formatDistanceToNow(new Date(finding.detectedAt), { addSuffix: true, locale: es })}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {finding.autoFixAvailable && (
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={onAutoFix}>
              <Wand2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onResolve}>
            <CheckCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Sub-component for Pattern Card
function PatternCard({ pattern }: { pattern: AnomalyPattern }) {
  const trendIcon = {
    increasing: <TrendingUp className="h-4 w-4 text-red-500" />,
    stable: <TrendingUp className="h-4 w-4 text-yellow-500 rotate-90" />,
    decreasing: <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />
  };

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {trendIcon[pattern.trend]}
            <p className="font-medium text-sm">{pattern.patternName}</p>
          </div>
          <p className="text-xs text-muted-foreground">{pattern.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{pattern.occurrences} ocurrencias</span>
            <span>{pattern.affectedExpedientes.length} expedientes</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GaliaSmartAuditPanel;
