/**
 * LegalAuditTrailPanel - Fase 9
 * Panel de auditoría para historial de validaciones legales y acciones
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  History,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  User,
  FileText,
  Scale,
  Bot,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalAuditTrailPanelProps {
  companyId: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  actionType: 'validation' | 'consultation' | 'document' | 'compliance' | 'contract';
  agentId?: string;
  agentName?: string;
  userId?: string;
  userName?: string;
  action: string;
  description: string;
  result: 'approved' | 'rejected' | 'warning' | 'pending';
  legalBasis: string[];
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
  expanded?: boolean;
}

export function LegalAuditTrailPanel({ companyId }: LegalAuditTrailPanelProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('7d');
  const [resultFilter, setResultFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      actionType: 'validation',
      agentId: 'hr-agent',
      agentName: 'Agente RRHH',
      action: 'Solicitud de despido disciplinario',
      description: 'Validación legal previa a notificación de despido disciplinario por faltas reiteradas',
      result: 'approved',
      legalBasis: ['ET Art. 54', 'ET Art. 55', 'Convenio Colectivo Sect. Tecnológico'],
      warnings: ['Verificar documentación de faltas anteriores'],
      riskLevel: 'medium'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      actionType: 'consultation',
      userId: 'user-123',
      userName: 'María García',
      action: 'Consulta sobre retención datos GDPR',
      description: 'Consulta sobre plazos de retención de datos personales en operaciones transfronterizas',
      result: 'approved',
      legalBasis: ['GDPR Art. 17', 'LOPDGDD Art. 32'],
      warnings: [],
      riskLevel: 'low'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      actionType: 'validation',
      agentId: 'fiscal-agent',
      agentName: 'Agente Fiscal',
      action: 'Transferencia a paraíso fiscal',
      description: 'Intento de transferencia a cuenta en jurisdicción no colaborativa',
      result: 'rejected',
      legalBasis: ['LIS Art. 12', 'Directiva DAC6', 'Lista negra UE'],
      warnings: ['Operación bloqueada', 'Se requiere revisión manual', 'Notificación a compliance'],
      riskLevel: 'critical'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      actionType: 'document',
      userId: 'user-456',
      userName: 'Carlos Ruiz',
      action: 'Generación contrato laboral indefinido',
      description: 'Contrato indefinido con cláusulas de teletrabajo y confidencialidad',
      result: 'approved',
      legalBasis: ['ET Art. 8', 'RD-ley 28/2020 (Teletrabajo)', 'Ley 1/2019 Secretos Empresariales'],
      warnings: [],
      riskLevel: 'low'
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      actionType: 'compliance',
      agentId: 'supervisor',
      agentName: 'Supervisor IA',
      action: 'Verificación MiFID II trimestral',
      description: 'Auditoría automática de cumplimiento MiFID II para operaciones del Q4',
      result: 'warning',
      legalBasis: ['MiFID II Art. 24', 'RD 217/2008'],
      warnings: ['3 operaciones requieren documentación adicional de idoneidad'],
      riskLevel: 'medium'
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      actionType: 'contract',
      userId: 'user-789',
      userName: 'Ana López',
      action: 'Análisis contrato proveedor cloud',
      description: 'Revisión de cláusulas de protección de datos y SLA en contrato AWS',
      result: 'approved',
      legalBasis: ['GDPR Art. 28', 'Cláusulas Tipo UE 2021'],
      warnings: ['Recomendar inclusión de cláusula de auditoría'],
      riskLevel: 'low'
    }
  ]);

  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExportAudit = async (format: 'pdf' | 'xlsx' | 'xml') => {
    setIsExporting(true);
    try {
      toast.info(`Generando reporte de auditoría en ${format.toUpperCase()}...`);
      // Simulated export
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Reporte de auditoría exportado como ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Error al exportar reporte');
    } finally {
      setIsExporting(false);
    }
  };

  const getResultIcon = (result: AuditEntry['result']) => {
    switch (result) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getResultBadge = (result: AuditEntry['result']) => {
    const config = {
      approved: { label: 'Aprobado', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      rejected: { label: 'Rechazado', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      warning: { label: 'Advertencia', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      pending: { label: 'Pendiente', className: 'bg-muted text-muted-foreground' }
    };
    return (
      <Badge variant="outline" className={config[result].className}>
        {config[result].label}
      </Badge>
    );
  };

  const getRiskBadge = (risk: AuditEntry['riskLevel']) => {
    const config = {
      low: { label: 'Bajo', className: 'bg-green-500/10 text-green-600' },
      medium: { label: 'Medio', className: 'bg-amber-500/10 text-amber-600' },
      high: { label: 'Alto', className: 'bg-orange-500/10 text-orange-600' },
      critical: { label: 'Crítico', className: 'bg-red-500/10 text-red-600' }
    };
    return <Badge className={config[risk].className}>{config[risk].label}</Badge>;
  };

  const getActionTypeIcon = (type: AuditEntry['actionType']) => {
    switch (type) {
      case 'validation':
        return Shield;
      case 'consultation':
        return Scale;
      case 'document':
        return FileText;
      case 'compliance':
        return CheckCircle2;
      case 'contract':
        return FileText;
      default:
        return History;
    }
  };

  const filteredEntries = auditEntries.filter(entry => {
    if (resultFilter !== 'all' && entry.result !== resultFilter) return false;
    if (activeTab !== 'all' && entry.actionType !== activeTab) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        entry.action.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.legalBasis.some(b => b.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const stats = {
    total: auditEntries.length,
    approved: auditEntries.filter(e => e.result === 'approved').length,
    rejected: auditEntries.filter(e => e.result === 'rejected').length,
    warnings: auditEntries.filter(e => e.result === 'warning').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600">
            <History className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Audit Trail Legal</h2>
            <p className="text-sm text-muted-foreground">
              Historial inmutable de validaciones y acciones legales
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExportAudit('pdf')}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExportAudit('xlsx')}>
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExportAudit('xml')}>
            <Download className="h-4 w-4 mr-1" />
            XML
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <History className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Aprobados</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Rechazados</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Advertencias</p>
                <p className="text-2xl font-bold text-amber-600">{stats.warnings}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por acción, descripción o base legal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 días</SelectItem>
                  <SelectItem value="30d">Últimos 30 días</SelectItem>
                  <SelectItem value="90d">Últimos 90 días</SelectItem>
                  <SelectItem value="all">Todo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="approved">Aprobados</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                  <SelectItem value="warning">Advertencias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="validation">Validaciones</TabsTrigger>
          <TabsTrigger value="consultation">Consultas</TabsTrigger>
          <TabsTrigger value="document">Documentos</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="contract">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {filteredEntries.map((entry) => {
                    const Icon = getActionTypeIcon(entry.actionType);
                    const isExpanded = expandedEntries.has(entry.id);
                    
                    return (
                      <div key={entry.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div 
                          className="flex items-start gap-4 cursor-pointer"
                          onClick={() => toggleExpand(entry.id)}
                        >
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getResultIcon(entry.result)}
                              <span className="font-medium">{entry.action}</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {entry.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {entry.agentId ? (
                                <span className="flex items-center gap-1">
                                  <Bot className="h-3 w-3" />
                                  {entry.agentName}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {entry.userName}
                                </span>
                              )}
                              <span>•</span>
                              <span>
                                {formatDistanceToNow(new Date(entry.timestamp), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getResultBadge(entry.result)}
                            {getRiskBadge(entry.riskLevel)}
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 ml-12 p-4 rounded-lg bg-muted/50 space-y-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Base Legal
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {entry.legalBasis.map((basis, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {basis}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {entry.warnings.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Advertencias
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                  {entry.warnings.map((warning, idx) => (
                                    <li key={idx} className="text-amber-600">{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-xs text-muted-foreground">
                                ID: {entry.id} | {format(new Date(entry.timestamp), 'PPpp', { locale: es })}
                              </span>
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3 mr-1" />
                                Ver Detalle Completo
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalAuditTrailPanel;
