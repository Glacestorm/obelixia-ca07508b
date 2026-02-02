/**
 * ERPCompliancePanel - Panel de cumplimiento normativo
 * Verificación PGC, NIIF y regulaciones fiscales
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileCheck,
  Scale,
  Building2,
  Receipt,
  Loader2,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ERPCompliancePanelProps {
  sessionId?: string;
}

interface ComplianceCheck {
  id: string;
  category: 'pgc' | 'niif' | 'fiscal' | 'audit';
  name: string;
  description: string;
  status: 'pending' | 'passed' | 'warning' | 'failed';
  details?: string;
  recommendation?: string;
}

const MOCK_CHECKS: ComplianceCheck[] = [
  {
    id: '1',
    category: 'pgc',
    name: 'Estructura Plan General Contable 2007',
    description: 'Verificación de grupos 1-9 según normativa española',
    status: 'passed',
    details: 'Todos los grupos contables están correctamente estructurados'
  },
  {
    id: '2',
    category: 'pgc',
    name: 'Cuentas obligatorias',
    description: 'Verificación de existencia de cuentas requeridas',
    status: 'passed',
    details: 'Cuentas de Capital, Reservas, Resultado del ejercicio presentes'
  },
  {
    id: '3',
    category: 'pgc',
    name: 'Cuadre de asientos',
    description: 'Verificación Debe = Haber en todos los asientos',
    status: 'warning',
    details: '2 asientos con diferencia menor a 0.01€',
    recommendation: 'Revisar asientos #1234 y #1567 para corregir redondeos'
  },
  {
    id: '4',
    category: 'fiscal',
    name: 'IVA Repercutido',
    description: 'Coherencia de tipos impositivos',
    status: 'passed',
    details: 'Tipos 21%, 10%, 4% correctamente aplicados'
  },
  {
    id: '5',
    category: 'fiscal',
    name: 'Retenciones IRPF',
    description: 'Verificación de retenciones a profesionales',
    status: 'pending',
    details: 'Pendiente de verificación'
  },
  {
    id: '6',
    category: 'niif',
    name: 'Valoración a coste amortizado',
    description: 'Instrumentos financieros según NIIF 9',
    status: 'passed',
    details: 'Préstamos y partidas a cobrar correctamente valorados'
  },
  {
    id: '7',
    category: 'audit',
    name: 'Trazabilidad de operaciones',
    description: 'Registro completo de origen de datos',
    status: 'passed',
    details: 'Todos los registros tienen referencia al documento origen'
  },
  {
    id: '8',
    category: 'audit',
    name: 'Integridad referencial',
    description: 'Verificación de relaciones entre entidades',
    status: 'failed',
    details: '15 asientos sin tercero asociado',
    recommendation: 'Asignar tercero o usar cuenta genérica de acreedores/deudores varios'
  }
];

export function ERPCompliancePanel({ sessionId }: ERPCompliancePanelProps) {
  const [checks, setChecks] = useState<ComplianceCheck[]>(MOCK_CHECKS);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleRunChecks = useCallback(async () => {
    setIsRunning(true);
    // Simulate running checks
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRunning(false);
  }, []);

  const getStatusIcon = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <FileCheck className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (category: ComplianceCheck['category']) => {
    switch (category) {
      case 'pgc':
        return <Building2 className="h-4 w-4" />;
      case 'niif':
        return <Scale className="h-4 w-4" />;
      case 'fiscal':
        return <Receipt className="h-4 w-4" />;
      case 'audit':
        return <Shield className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: ComplianceCheck['category']) => {
    switch (category) {
      case 'pgc':
        return 'PGC 2007';
      case 'niif':
        return 'NIIF/NIIC';
      case 'fiscal':
        return 'Fiscal';
      case 'audit':
        return 'Auditoría';
    }
  };

  const filteredChecks = activeTab === 'all' 
    ? checks 
    : checks.filter(c => c.category === activeTab);

  const stats = {
    total: checks.length,
    passed: checks.filter(c => c.status === 'passed').length,
    warnings: checks.filter(c => c.status === 'warning').length,
    failed: checks.filter(c => c.status === 'failed').length,
    pending: checks.filter(c => c.status === 'pending').length
  };

  const overallScore = Math.round((stats.passed / stats.total) * 100);

  if (!sessionId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Selecciona una sesión de migración para verificar cumplimiento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Verificación de Cumplimiento
              </CardTitle>
              <CardDescription>
                Validación normativa PGC, NIIF y requisitos fiscales
              </CardDescription>
            </div>
            <Button onClick={handleRunChecks} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Ejecutar Verificación
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Score Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="relative">
                <svg className="h-32 w-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${overallScore * 3.52} 352`}
                    className={cn(
                      overallScore >= 80 ? "text-green-500" :
                      overallScore >= 60 ? "text-yellow-500" : "text-destructive"
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{overallScore}%</span>
                </div>
              </div>
            </div>
            <p className="text-center mt-4 text-muted-foreground">
              Puntuación de Cumplimiento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
            <p className="text-sm text-muted-foreground">Aprobados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{stats.warnings}</p>
            <p className="text-sm text-muted-foreground">Advertencias</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-sm text-muted-foreground">Fallidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Checks List */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-2">
            <TabsList>
              <TabsTrigger value="all">Todos ({checks.length})</TabsTrigger>
              <TabsTrigger value="pgc">PGC</TabsTrigger>
              <TabsTrigger value="niif">NIIF</TabsTrigger>
              <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
              <TabsTrigger value="audit">Auditoría</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {filteredChecks.map((check) => (
                  <div
                    key={check.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      check.status === 'passed' && "bg-green-500/5 border-green-500/20",
                      check.status === 'warning' && "bg-yellow-500/5 border-yellow-500/20",
                      check.status === 'failed' && "bg-red-500/5 border-red-500/20",
                      check.status === 'pending' && "bg-muted/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{check.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getCategoryIcon(check.category)}
                            <span className="ml-1">{getCategoryLabel(check.category)}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {check.description}
                        </p>
                        {check.details && (
                          <p className="text-sm">
                            {check.details}
                          </p>
                        )}
                        {check.recommendation && (
                          <div className="mt-2 p-2 rounded bg-primary/5 text-sm">
                            <strong>Recomendación:</strong> {check.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

export default ERPCompliancePanel;
