/**
 * Legal Validation Gateway Panel - Fase 10
 * Central validation authority for all ERP modules
 * Pre-action compliance checks for HR, Fiscal, and critical operations
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  Building2,
  Banknote,
  Scale,
  Eye,
  Settings,
  Zap,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalValidationGatewayPanelProps {
  companyId: string;
}

interface ValidationRule {
  id: string;
  module: 'hr' | 'fiscal' | 'treasury' | 'contracts' | 'general';
  operation: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  autoBlock: boolean;
  jurisdictions: string[];
  description: string;
  isActive: boolean;
}

interface ValidationRequest {
  id: string;
  module: string;
  operation: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  riskLevel: string;
  details: string;
  timestamp: string;
  validatedBy?: string;
  validationNotes?: string;
}

interface ModuleStatus {
  module: string;
  icon: React.ReactNode;
  validationsToday: number;
  blockedOperations: number;
  complianceScore: number;
  isConnected: boolean;
}

export function LegalValidationGatewayPanel({ companyId }: LegalValidationGatewayPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ValidationRequest[]>([]);
  const [moduleStatuses, setModuleStatuses] = useState<ModuleStatus[]>([]);
  const [gatewayEnabled, setGatewayEnabled] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Demo validation rules - incluye módulo de Compras
  const demoRules: ValidationRule[] = [
    {
      id: '1',
      module: 'hr',
      operation: 'employee_termination',
      riskLevel: 'critical',
      requiresApproval: true,
      autoBlock: true,
      jurisdictions: ['ES', 'AD'],
      description: 'Despido o terminación de contrato laboral',
      isActive: true
    },
    {
      id: '2',
      module: 'hr',
      operation: 'salary_modification',
      riskLevel: 'high',
      requiresApproval: true,
      autoBlock: false,
      jurisdictions: ['ES', 'AD', 'EU'],
      description: 'Modificación sustancial de condiciones salariales',
      isActive: true
    },
    {
      id: '3',
      module: 'fiscal',
      operation: 'tax_payment',
      riskLevel: 'high',
      requiresApproval: true,
      autoBlock: false,
      jurisdictions: ['ES', 'AD'],
      description: 'Pagos fiscales superiores a umbral',
      isActive: true
    },
    {
      id: '4',
      module: 'fiscal',
      operation: 'invoice_cancellation',
      riskLevel: 'medium',
      requiresApproval: false,
      autoBlock: false,
      jurisdictions: ['ES'],
      description: 'Anulación de facturas emitidas',
      isActive: true
    },
    {
      id: '5',
      module: 'treasury',
      operation: 'large_transfer',
      riskLevel: 'critical',
      requiresApproval: true,
      autoBlock: true,
      jurisdictions: ['ES', 'AD', 'EU'],
      description: 'Transferencias superiores a €50,000',
      isActive: true
    },
    {
      id: '6',
      module: 'contracts',
      operation: 'contract_termination',
      riskLevel: 'high',
      requiresApproval: true,
      autoBlock: false,
      jurisdictions: ['ES', 'AD', 'EU'],
      description: 'Resolución anticipada de contratos',
      isActive: true
    },
    // Reglas para módulo de Compras
    {
      id: '7',
      module: 'purchases' as any,
      operation: 'purchase_order_high_value',
      riskLevel: 'high',
      requiresApproval: true,
      autoBlock: false,
      jurisdictions: ['ES', 'AD', 'EU'],
      description: 'Orden de compra superior a €25,000',
      isActive: true
    },
    {
      id: '8',
      module: 'purchases' as any,
      operation: 'supplier_contract',
      riskLevel: 'high',
      requiresApproval: true,
      autoBlock: false,
      jurisdictions: ['ES', 'AD', 'EU'],
      description: 'Contrato con nuevo proveedor',
      isActive: true
    },
    {
      id: '9',
      module: 'purchases' as any,
      operation: 'international_import',
      riskLevel: 'critical',
      requiresApproval: true,
      autoBlock: true,
      jurisdictions: ['ES', 'AD', 'EU'],
      description: 'Importación internacional (aduanas, IVA intracomunitario)',
      isActive: true
    },
    {
      id: '10',
      module: 'purchases' as any,
      operation: 'supplier_payment_terms',
      riskLevel: 'medium',
      requiresApproval: false,
      autoBlock: false,
      jurisdictions: ['ES'],
      description: 'Modificación condiciones de pago a proveedor (Ley 15/2010)',
      isActive: true
    },
    {
      id: '11',
      module: 'purchases' as any,
      operation: 'rfq_award',
      riskLevel: 'medium',
      requiresApproval: true,
      autoBlock: false,
      jurisdictions: ['ES', 'AD', 'EU'],
      description: 'Adjudicación de solicitud de cotización (RFQ)',
      isActive: true
    }
  ];

  // Demo pending requests - incluye compras
  const demoPendingRequests: ValidationRequest[] = [
    {
      id: '1',
      module: 'HR',
      operation: 'Despido disciplinario',
      requestedBy: 'Director RRHH',
      status: 'pending',
      riskLevel: 'critical',
      details: 'Empleado ID: EMP-2024-156. Causa: Faltas reiteradas.',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '2',
      module: 'Fiscal',
      operation: 'Pago IVA Q4',
      requestedBy: 'Controller Financiero',
      status: 'pending',
      riskLevel: 'high',
      details: 'Importe: €45,230. Plazo: 30 enero 2026.',
      timestamp: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: '3',
      module: 'Treasury',
      operation: 'Transferencia internacional',
      requestedBy: 'CFO',
      status: 'blocked',
      riskLevel: 'critical',
      details: 'Destino: UAE. Importe: €125,000. Requiere verificación AML.',
      timestamp: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: '4',
      module: 'Compras',
      operation: 'Orden de compra alto valor',
      requestedBy: 'Director Compras',
      status: 'pending',
      riskLevel: 'high',
      details: 'Proveedor: Tech Solutions S.L. Importe: €32,500. Material IT.',
      timestamp: new Date(Date.now() - 900000).toISOString()
    }
  ];

  // Demo module statuses - Compras inicialmente desconectado
  const [purchasesConnected, setPurchasesConnected] = useState(false);
  
  const getModuleStatuses = useCallback((): ModuleStatus[] => [
    {
      module: 'RRHH',
      icon: <Users className="h-5 w-5" />,
      validationsToday: 12,
      blockedOperations: 1,
      complianceScore: 94,
      isConnected: true
    },
    {
      module: 'Fiscal',
      icon: <FileText className="h-5 w-5" />,
      validationsToday: 8,
      blockedOperations: 0,
      complianceScore: 98,
      isConnected: true
    },
    {
      module: 'Tesorería',
      icon: <Banknote className="h-5 w-5" />,
      validationsToday: 5,
      blockedOperations: 2,
      complianceScore: 87,
      isConnected: true
    },
    {
      module: 'Contratos',
      icon: <Scale className="h-5 w-5" />,
      validationsToday: 3,
      blockedOperations: 0,
      complianceScore: 96,
      isConnected: true
    },
    {
      module: 'Compras',
      icon: <Building2 className="h-5 w-5" />,
      validationsToday: purchasesConnected ? 7 : 0,
      blockedOperations: purchasesConnected ? 1 : 0,
      complianceScore: purchasesConnected ? 91 : 0,
      isConnected: purchasesConnected
    }
  ], [purchasesConnected]);

  const handleConnectPurchases = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simular conexión con el módulo de compras
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPurchasesConnected(true);
      toast.success('Módulo de Compras conectado al Gateway Legal');
      
      // Actualizar reglas activas para compras
      setValidationRules(prev => 
        prev.map(rule => 
          (rule.module as string) === 'purchases' 
            ? { ...rule, isActive: true } 
            : rule
        )
      );
    } catch (error) {
      console.error('Error connecting purchases module:', error);
      toast.error('Error al conectar módulo de Compras');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setValidationRules(demoRules);
    setPendingRequests(demoPendingRequests);
    setModuleStatuses(getModuleStatuses());
    setLastSync(new Date());
  }, [purchasesConnected]);

  // Actualizar módulos cuando cambia el estado de conexión
  useEffect(() => {
    setModuleStatuses(getModuleStatuses());
  }, [getModuleStatuses]);

  const handleValidationAction = useCallback(async (
    requestId: string, 
    action: 'approve' | 'reject'
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'validate_operation',
          context: { companyId },
          params: { requestId, validationAction: action }
        }
      });

      if (error) throw error;

      setPendingRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' }
            : req
        )
      );

      toast.success(`Operación ${action === 'approve' ? 'aprobada' : 'rechazada'}`);
    } catch (error) {
      console.error('Validation action error:', error);
      toast.error('Error al procesar validación');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const toggleRule = useCallback((ruleId: string) => {
    setValidationRules(prev =>
      prev.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    );
    toast.success('Regla actualizada');
  }, []);

  const getRiskBadge = (level: string) => {
    const config = {
      low: { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Bajo' },
      medium: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', label: 'Medio' },
      high: { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Alto' },
      critical: { color: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Crítico' }
    };
    const c = config[level as keyof typeof config] || config.medium;
    return <Badge variant="outline" className={c.color}>{c.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-blue-500/10 text-blue-600', icon: Clock },
      approved: { color: 'bg-green-500/10 text-green-600', icon: CheckCircle },
      rejected: { color: 'bg-red-500/10 text-red-600', icon: XCircle },
      blocked: { color: 'bg-orange-500/10 text-orange-600', icon: ShieldX }
    };
    const c = config[status as keyof typeof config] || config.pending;
    const Icon = c.icon;
    return (
      <Badge variant="outline" className={c.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const totalValidationsToday = moduleStatuses.reduce((sum, m) => sum + m.validationsToday, 0);
  const totalBlocked = moduleStatuses.reduce((sum, m) => sum + m.blockedOperations, 0);
  const avgCompliance = moduleStatuses.filter(m => m.isConnected).reduce((sum, m) => sum + m.complianceScore, 0) / 
    moduleStatuses.filter(m => m.isConnected).length || 0;

  return (
    <div className="space-y-4">
      {/* Header con estado del Gateway */}
      <Card className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  Legal Validation Gateway
                  {gatewayEnabled ? (
                    <Badge className="bg-green-500/20 text-green-600">
                      <Zap className="h-3 w-3 mr-1" />
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Desactivado
                    </Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Autoridad central de validación legal para operaciones críticas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Gateway</span>
                <Switch 
                  checked={gatewayEnabled} 
                  onCheckedChange={setGatewayEnabled}
                />
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs del Gateway */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalValidationsToday}</p>
                <p className="text-xs text-muted-foreground">Validaciones hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.filter(r => r.status === 'pending').length}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ShieldX className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBlocked}</p>
                <p className="text-xs text-muted-foreground">Bloqueadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgCompliance.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Compliance medio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pendientes
            {pendingRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {pendingRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules">Reglas</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Estado de módulos conectados */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Módulos Conectados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {moduleStatuses.map((module) => (
                    <div key={module.module} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${module.isConnected ? 'bg-green-500/10' : 'bg-muted'}`}>
                          {module.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{module.module}</p>
                          <p className="text-xs text-muted-foreground">
                            {module.isConnected ? `${module.validationsToday} validaciones hoy` : 'No conectado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {module.isConnected ? (
                          <>
                            {module.blockedOperations > 0 && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-600 text-xs">
                                {module.blockedOperations} bloq.
                              </Badge>
                            )}
                            <Badge variant="outline" className={
                              module.complianceScore >= 90 ? 'bg-green-500/10 text-green-600' :
                              module.complianceScore >= 70 ? 'bg-yellow-500/10 text-yellow-600' :
                              'bg-red-500/10 text-red-600'
                            }>
                              {module.complianceScore}%
                            </Badge>
                          </>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={module.module === 'Compras' ? handleConnectPurchases : undefined}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Conectando...' : 'Conectar'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actividad reciente */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {request.module}
                              </Badge>
                              {getRiskBadge(request.riskLevel)}
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="text-sm font-medium">{request.operation}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {request.requestedBy} · {formatDistanceToNow(new Date(request.timestamp), { locale: es, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Validaciones Pendientes</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setLastSync(new Date())}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRequests.filter(r => r.status === 'pending' || r.status === 'blocked').map((request) => (
                  <Card key={request.id} className={`border-l-4 ${
                    request.status === 'blocked' ? 'border-l-orange-500' : 'border-l-blue-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{request.module}</Badge>
                            {getRiskBadge(request.riskLevel)}
                            {getStatusBadge(request.status)}
                          </div>
                          <h4 className="font-medium">{request.operation}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{request.details}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Solicitado por {request.requestedBy} · {formatDistanceToNow(new Date(request.timestamp), { locale: es, addSuffix: true })}
                          </p>
                        </div>
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleValidationAction(request.id, 'reject')}
                              disabled={isLoading}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleValidationAction(request.id, 'approve')}
                              disabled={isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                          </div>
                        )}
                        {request.status === 'blocked' && (
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Revisar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {pendingRequests.filter(r => r.status === 'pending' || r.status === 'blocked').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No hay validaciones pendientes</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Reglas de Validación</CardTitle>
                <Button size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Nueva Regla
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {validationRules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className={`p-4 rounded-lg border transition-all ${
                      rule.isActive ? 'bg-card' : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs uppercase">
                            {rule.module}
                          </Badge>
                          {getRiskBadge(rule.riskLevel)}
                          {rule.autoBlock && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Auto-bloqueo
                            </Badge>
                          )}
                          {rule.requiresApproval && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 text-xs">
                              Requiere aprobación
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{rule.description}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Operación: {rule.operation} · Jurisdicciones: {rule.jurisdictions.join(', ')}
                        </p>
                      </div>
                      <Switch 
                        checked={rule.isActive} 
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleStatuses.map((module) => (
              <Card key={module.module} className={!module.isConnected ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${module.isConnected ? 'bg-primary/10' : 'bg-muted'}`}>
                        {module.icon}
                      </div>
                      <CardTitle className="text-base">{module.module}</CardTitle>
                    </div>
                    {module.isConnected ? (
                      <Badge className="bg-green-500/20 text-green-600">Conectado</Badge>
                    ) : (
                      <Badge variant="outline">Desconectado</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {module.isConnected ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Compliance Score</span>
                        <span className="font-medium">{module.complianceScore}%</span>
                      </div>
                      <Progress value={module.complianceScore} className="h-2" />
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-lg font-bold">{module.validationsToday}</p>
                          <p className="text-xs text-muted-foreground">Validaciones</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-lg font-bold text-red-500">{module.blockedOperations}</p>
                          <p className="text-xs text-muted-foreground">Bloqueadas</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        Módulo no integrado con el Gateway Legal
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={module.module === 'Compras' ? handleConnectPurchases : undefined}
                        disabled={isLoading}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        {isLoading ? 'Conectando...' : 'Conectar Módulo'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer con última sincronización */}
      {lastSync && (
        <div className="text-center text-xs text-muted-foreground">
          Última sincronización: {formatDistanceToNow(lastSync, { locale: es, addSuffix: true })}
        </div>
      )}
    </div>
  );
}

export default LegalValidationGatewayPanel;
