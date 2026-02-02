/**
 * LegalCompliancePanel - Panel de gestión de cumplimiento normativo
 * Visualización de checks, stats por jurisdicción y regulación
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  FileCheck,
  TrendingUp,
  ChevronRight,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLegalCompliance, type ComplianceCheck } from '@/hooks/admin/legal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const REGULATIONS = [
  { id: 'gdpr', name: 'GDPR', description: 'Reglamento General de Protección de Datos' },
  { id: 'apda', name: 'APDA', description: 'Autoridad de Protección de Datos de Andorra' },
  { id: 'mifid2', name: 'MiFID II', description: 'Directiva de Mercados Financieros' },
  { id: 'dora', name: 'DORA', description: 'Resiliencia Operativa Digital' },
  { id: 'aml', name: 'AML/KYC', description: 'Anti-Blanqueo y Conoce a tu Cliente' }
];

const JURISDICTIONS = [
  { id: 'andorra', name: 'Andorra', flag: '🇦🇩' },
  { id: 'spain', name: 'España', flag: '🇪🇸' },
  { id: 'europe', name: 'Unión Europea', flag: '🇪🇺' }
];

export function LegalCompliancePanel() {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('all');
  const [selectedRegulation, setSelectedRegulation] = useState<string>('');

  const { 
    isLoading, 
    checks, 
    stats, 
    fetchComplianceChecks, 
    runComplianceCheck 
  } = useLegalCompliance();

  const handleRunCheck = useCallback(async () => {
    if (!selectedRegulation) return;
    await runComplianceCheck(
      [selectedRegulation],
      selectedJurisdiction === 'all' ? 'europe' : selectedJurisdiction
    );
  }, [selectedRegulation, selectedJurisdiction, runComplianceCheck]);

  const getStatusIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (score >= 50) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    if (score > 0) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusBadge = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-500';
    if (score >= 50) return 'bg-yellow-500/10 text-yellow-500';
    if (score > 0) return 'bg-red-500/10 text-red-500';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score Global</p>
                <p className="text-2xl font-bold">{stats?.overall_score || 0}%</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Progress value={stats?.overall_score || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conformes</p>
                <p className="text-2xl font-bold text-green-500">{stats?.compliant || 0}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Parciales</p>
                <p className="text-2xl font-bold text-yellow-500">{stats?.partial || 0}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">No Conformes</p>
                <p className="text-2xl font-bold text-red-500">{stats?.non_compliant || 0}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Run New Check */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4" />
              Nueva Verificación
            </CardTitle>
            <CardDescription>Ejecutar análisis de cumplimiento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jurisdicción</label>
              <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar jurisdicción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌍 Todas</SelectItem>
                  {JURISDICTIONS.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.flag} {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Regulación</label>
              <Select value={selectedRegulation} onValueChange={setSelectedRegulation}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar normativa" />
                </SelectTrigger>
                <SelectContent>
                  {REGULATIONS.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex flex-col">
                        <span>{r.name}</span>
                        <span className="text-xs text-muted-foreground">{r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleRunCheck} 
              disabled={!selectedRegulation || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileCheck className="h-4 w-4 mr-2" />
              )}
              Ejecutar Verificación
            </Button>
          </CardContent>
        </Card>

        {/* By Jurisdiction */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Por Jurisdicción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.by_jurisdiction || {}).map(([key, data]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {JURISDICTIONS.find(j => j.id === key)?.flag || '🌍'}
                    </span>
                    <span className="text-sm font-medium capitalize">{key}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={data.score} className="w-16 h-2" />
                    <span className="text-sm font-medium w-10 text-right">{data.score}%</span>
                  </div>
                </div>
              ))}
              {Object.keys(stats?.by_jurisdiction || {}).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin datos de jurisdicciones
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Regulation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Por Normativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.by_regulation || {}).map(([key, data]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium uppercase">{key}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={data.score} className="w-16 h-2" />
                    <span className="text-sm font-medium w-10 text-right">{data.score}%</span>
                  </div>
                </div>
              ))}
              {Object.keys(stats?.by_regulation || {}).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin datos de regulaciones
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Checks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Verificaciones Recientes</CardTitle>
            <CardDescription>Historial de controles de cumplimiento</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchComplianceChecks()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {checks.map((check) => (
                <div 
                  key={check.id} 
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.overall_score)}
                    <div>
                      <p className="text-sm font-medium">{check.check_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {check.jurisdictions.map(j => (
                          <Badge key={j} variant="outline" className="text-xs">
                            {JURISDICTIONS.find(jur => jur.id === j)?.flag || ''} {j}
                          </Badge>
                        ))}
                        {check.regulations.map(r => (
                          <Badge key={r} variant="secondary" className="text-xs uppercase">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusBadge(check.overall_score)}>
                      {check.overall_score}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(check.created_at), { addSuffix: true, locale: es })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
              {checks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay verificaciones registradas</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default LegalCompliancePanel;
