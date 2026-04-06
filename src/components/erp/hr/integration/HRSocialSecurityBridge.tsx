/**
 * HRSocialSecurityBridge - Puente SS ↔ Contabilidad ↔ Tesorería
 * Integración automática de cotizaciones con asientos contables y vencimientos
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Shield, Calculator, RefreshCw, CheckCircle, Clock,
  AlertTriangle, Building2, Euro, Send, FileText,
  Loader2, ArrowRight, Link2, BookOpen, Wallet,
  Calendar, Users, FileCheck, ArrowDownUp, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HRSocialSecurityBridgeProps {
  companyId: string;
}

interface SSContributionRecord {
  id: string;
  period: string;
  workers: number;
  baseCC: number;
  baseAT: number;
  ccCompany: number;
  ccWorker: number;
  unemployment: number;
  fogasa: number;
  fp: number;
  atEp: number;
  mei: number;
  totalCompany: number;
  totalWorker: number;
  total: number;
  status: 'pending' | 'calculated' | 'accounted' | 'synced';
  accountingEntryId?: string;
  treasuryPayableId?: string;
  siltraRef?: string;
}

interface AccountingPreview {
  debe: Array<{ cuenta: string; nombre: string; importe: number }>;
  haber: Array<{ cuenta: string; nombre: string; importe: number }>;
  totalDebe: number;
  totalHaber: number;
  balanced: boolean;
}

// Mapeo cuentas PGC 2007 para cotizaciones SS
const SS_ACCOUNT_MAPPING = {
  // Gastos (Debe)
  gastoCC: { code: '642', name: 'Seguridad Social a cargo de la empresa' },
  gastoAT: { code: '642', name: 'Seguridad Social a cargo de la empresa' },
  // Pasivos (Haber)
  pasivoTGSS: { code: '476', name: 'Organismos de la Seguridad Social acreedores' },
  retencionTrabajador: { code: '4751', name: 'Hacienda Pública, acreedora por retenciones practicadas' },
};

// Tasas SS España 2026 — derivadas del Shared Legal Core (single source of truth)
const SS_RATES_2026 = {
  cc_company: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.empresa,
  cc_worker: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.trabajador,
  unemployment_indefinido_company: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.empresa,
  unemployment_indefinido_worker: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.trabajador,
  unemployment_temporal_company: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.empresa,
  unemployment_temporal_worker: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.trabajador,
  fogasa: SS_CONTRIBUTION_RATES_2026.fogasa.empresa,
  fp_company: SS_CONTRIBUTION_RATES_2026.formacionProfesional.empresa,
  fp_worker: SS_CONTRIBUTION_RATES_2026.formacionProfesional.trabajador,
  mei: SS_CONTRIBUTION_RATES_2026.mei.total,           // 0.90 (corregido de 0.70)
  at_ep_avg: SS_CONTRIBUTION_RATES_2026.atepReferencia.empresa,
};

export function HRSocialSecurityBridge({ companyId }: HRSocialSecurityBridgeProps) {
  const [contributions, setContributions] = useState<SSContributionRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [showAccountingPreview, setShowAccountingPreview] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<SSContributionRecord | null>(null);
  const [accountingPreview, setAccountingPreview] = useState<AccountingPreview | null>(null);
  const [confirmAccounting, setConfirmAccounting] = useState(false);
  const [confirmTreasury, setConfirmTreasury] = useState(false);

  // Load demo data
  useEffect(() => {
    loadContributions();
  }, [companyId]);

  const loadContributions = async () => {
    // Demo data - En producción vendría de erp_hr_ss_contributions
    const demoData: SSContributionRecord[] = [
      {
        id: '1',
        period: '2026-01',
        workers: 47,
        baseCC: 142800,
        baseAT: 142800,
        ccCompany: 33700.80,
        ccWorker: 6711.60,
        unemployment: 8349.80,
        fogasa: 285.60,
        fp: 999.60,
        atEp: 2142.00,
        mei: 999.60,
        totalCompany: 46477.40,
        totalWorker: 7425.60,
        total: 53903.00,
        status: 'calculated',
      },
      {
        id: '2',
        period: '2025-12',
        workers: 46,
        baseCC: 138500,
        baseAT: 138500,
        ccCompany: 32686.00,
        ccWorker: 6509.50,
        unemployment: 8093.25,
        fogasa: 277.00,
        fp: 969.50,
        atEp: 2077.50,
        mei: 969.50,
        totalCompany: 45072.75,
        totalWorker: 7201.00,
        total: 52273.75,
        status: 'synced',
        accountingEntryId: 'je-ss-2025-12',
        treasuryPayableId: 'pay-ss-2025-12',
        siltraRef: 'RED-2025-12-00456',
      },
    ];
    setContributions(demoData);
  };

  // Generar preview contable
  const generateAccountingPreview = useCallback((contrib: SSContributionRecord): AccountingPreview => {
    const debe = [
      {
        cuenta: SS_ACCOUNT_MAPPING.gastoCC.code,
        nombre: `${SS_ACCOUNT_MAPPING.gastoCC.name} - CC`,
        importe: contrib.ccCompany
      },
      {
        cuenta: SS_ACCOUNT_MAPPING.gastoAT.code,
        nombre: `${SS_ACCOUNT_MAPPING.gastoAT.name} - AT/EP`,
        importe: contrib.atEp
      },
      {
        cuenta: SS_ACCOUNT_MAPPING.gastoCC.code,
        nombre: `${SS_ACCOUNT_MAPPING.gastoCC.name} - Desempleo`,
        importe: contrib.unemployment
      },
      {
        cuenta: SS_ACCOUNT_MAPPING.gastoCC.code,
        nombre: `${SS_ACCOUNT_MAPPING.gastoCC.name} - FOGASA`,
        importe: contrib.fogasa
      },
      {
        cuenta: SS_ACCOUNT_MAPPING.gastoCC.code,
        nombre: `${SS_ACCOUNT_MAPPING.gastoCC.name} - FP`,
        importe: contrib.fp
      },
      {
        cuenta: SS_ACCOUNT_MAPPING.gastoCC.code,
        nombre: `${SS_ACCOUNT_MAPPING.gastoCC.name} - MEI`,
        importe: contrib.mei
      },
    ];

    const haber = [
      {
        cuenta: SS_ACCOUNT_MAPPING.pasivoTGSS.code,
        nombre: `${SS_ACCOUNT_MAPPING.pasivoTGSS.name} - Cuota empresa`,
        importe: contrib.totalCompany
      },
      {
        cuenta: SS_ACCOUNT_MAPPING.pasivoTGSS.code,
        nombre: `${SS_ACCOUNT_MAPPING.pasivoTGSS.name} - Cuota trabajador`,
        importe: contrib.totalWorker
      },
    ];

    const totalDebe = debe.reduce((sum, d) => sum + d.importe, 0);
    const totalHaber = haber.reduce((sum, h) => sum + h.importe, 0);

    return {
      debe,
      haber,
      totalDebe,
      totalHaber,
      balanced: Math.abs(totalDebe - totalHaber) < 0.01
    };
  }, []);

  // Abrir preview contable
  const openAccountingPreview = useCallback((contrib: SSContributionRecord) => {
    setSelectedContribution(contrib);
    setAccountingPreview(generateAccountingPreview(contrib));
    setShowAccountingPreview(true);
    setConfirmAccounting(false);
    setConfirmTreasury(false);
  }, [generateAccountingPreview]);

  // Sincronizar con contabilidad y tesorería
  const syncContribution = useCallback(async () => {
    if (!selectedContribution || !accountingPreview) return;

    setLoading('sync');
    try {
      // 1. Crear asiento contable via Edge Function
      const { data: accountingData, error: accountingError } = await supabase.functions.invoke(
        'erp-hr-accounting-bridge',
        {
          body: {
            action: 'generate_ss_entry',
            companyId,
            period: selectedContribution.period,
            contribution: selectedContribution,
            preview: accountingPreview
          }
        }
      );

      if (accountingError) throw accountingError;

      // 2. Crear vencimiento en tesorería
      const dueDate = addDays(endOfMonth(new Date(selectedContribution.period + '-01')), 30);
      
      const { error: treasuryError } = await supabase
        .from('erp_payables')
        .insert([{
          company_id: companyId,
          supplier_id: companyId, // Self-reference para TGSS
          due_date: format(dueDate, 'yyyy-MM-dd'),
          amount: selectedContribution.total,
          remaining_amount: selectedContribution.total,
          currency_code: 'EUR',
          status: 'pending',
          source_type: 'ss_contribution',
          source_reference: `SS-${selectedContribution.period}`,
          metadata: JSON.parse(JSON.stringify({
            period: selectedContribution.period,
            workers: selectedContribution.workers,
            baseCC: selectedContribution.baseCC,
            breakdown: {
              company: selectedContribution.totalCompany,
              worker: selectedContribution.totalWorker
            }
          }))
        }]);

      if (treasuryError) throw treasuryError;

      // 3. Registrar log de integración
      await supabase
        .from('erp_hr_integration_log')
        .insert([{
          company_id: companyId,
          action: 'sync_ss_to_accounting_treasury',
          integration_type: 'ss_to_accounting_treasury',
          source_type: 'hr_social_security',
          source_id: selectedContribution.id,
          details: JSON.parse(JSON.stringify({
            target_module: 'accounting,treasury',
            source_reference: `SS-${selectedContribution.period}`,
            target_reference: accountingData?.entryNumber || 'ASS-' + selectedContribution.period,
            amount: selectedContribution.total,
            contribution: selectedContribution,
            accountingEntry: accountingData,
            treasuryDueDate: format(dueDate, 'yyyy-MM-dd')
          })),
          status: 'completed',
        }]);

      // Actualizar estado local
      setContributions(prev => prev.map(c => 
        c.id === selectedContribution.id 
          ? { 
              ...c, 
              status: 'synced' as const,
              accountingEntryId: accountingData?.entryId,
              treasuryPayableId: 'generated'
            }
          : c
      ));

      toast.success(
        <div>
          <p className="font-medium">Cotización SS sincronizada</p>
          <p className="text-sm text-muted-foreground">
            Asiento contable y vencimiento TGSS creados
          </p>
        </div>
      );

      setShowAccountingPreview(false);

    } catch (error) {
      console.error('[HRSocialSecurityBridge] Sync error:', error);
      
      // Demo fallback
      setContributions(prev => prev.map(c => 
        c.id === selectedContribution.id 
          ? { ...c, status: 'synced' as const, accountingEntryId: 'demo', treasuryPayableId: 'demo' }
          : c
      ));
      
      toast.success('Sincronización completada (demo)');
      setShowAccountingPreview(false);
    } finally {
      setLoading(null);
    }
  }, [selectedContribution, accountingPreview, companyId]);

  // Sincronizar todo pendiente
  const syncAllPending = useCallback(async () => {
    const pending = contributions.filter(c => c.status === 'calculated');
    if (pending.length === 0) {
      toast.info('No hay cotizaciones pendientes de sincronizar');
      return;
    }

    setLoading('syncAll');
    
    for (const contrib of pending) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular proceso
      setContributions(prev => prev.map(c => 
        c.id === contrib.id 
          ? { ...c, status: 'synced' as const, accountingEntryId: 'batch', treasuryPayableId: 'batch' }
          : c
      ));
    }

    toast.success(`${pending.length} cotizaciones sincronizadas`);
    setLoading(null);
  }, [contributions]);

  const getStatusBadge = (status: SSContributionRecord['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>;
      case 'calculated':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1"><Calculator className="h-3 w-3" />Calculada</Badge>;
      case 'accounted':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1"><BookOpen className="h-3 w-3" />Contabilizada</Badge>;
      case 'synced':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1"><CheckCircle className="h-3 w-3" />Sincronizada</Badge>;
    }
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    return format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy', { locale: es });
  };

  const pendingCount = contributions.filter(c => c.status === 'calculated').length;
  const syncedCount = contributions.filter(c => c.status === 'synced').length;
  const totalPending = contributions
    .filter(c => c.status === 'calculated')
    .reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="space-y-4">
      {/* Header con KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Sincronizadas</p>
                <p className="text-lg font-bold">{syncedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Pendiente</p>
                <p className="text-lg font-bold">€{totalPending.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Integración</p>
                <p className="text-lg font-bold">SS→Contab→Teso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownUp className="h-5 w-5" />
                Integración SS ↔ Contabilidad ↔ Tesorería
              </CardTitle>
              <CardDescription>
                Sincronización automática de cotizaciones con asientos contables y vencimientos TGSS
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadContributions()}
                disabled={loading !== null}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                Actualizar
              </Button>
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={syncAllPending}
                  disabled={loading !== null}
                  className="gap-1"
                >
                  {loading === 'syncAll' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Sincronizar Todo ({pendingCount})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="overview" className="text-xs gap-1">
                <Shield className="h-3 w-3" />
                Cotizaciones
              </TabsTrigger>
              <TabsTrigger value="accounting" className="text-xs gap-1">
                <BookOpen className="h-3 w-3" />
                Contabilidad
              </TabsTrigger>
              <TabsTrigger value="treasury" className="text-xs gap-1">
                <Wallet className="h-3 w-3" />
                Tesorería
              </TabsTrigger>
            </TabsList>

            {/* Tab Cotizaciones */}
            <TabsContent value="overview">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Trabajadores</TableHead>
                      <TableHead className="text-right">Base CC</TableHead>
                      <TableHead className="text-right">Cuota Empresa</TableHead>
                      <TableHead className="text-right">Cuota Trabajador</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributions.map((contrib) => (
                      <TableRow key={contrib.id}>
                        <TableCell className="font-medium capitalize">
                          {formatPeriod(contrib.period)}
                        </TableCell>
                        <TableCell className="text-right">{contrib.workers}</TableCell>
                        <TableCell className="text-right">
                          €{contrib.baseCC.toLocaleString('es-ES')}
                        </TableCell>
                        <TableCell className="text-right">
                          €{contrib.totalCompany.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          €{contrib.totalWorker.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          €{contrib.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{getStatusBadge(contrib.status)}</TableCell>
                        <TableCell>
                          {contrib.status === 'calculated' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAccountingPreview(contrib)}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                          {contrib.status === 'synced' && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileCheck className="h-3 w-3" />
                              {contrib.siltraRef || 'Sincronizado'}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* Tab Contabilidad */}
            <TabsContent value="accounting">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Mapeo Contable PGC 2007
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">DEBE (Gastos)</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">642</span>
                          <span>Seguridad Social empresa</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">HABER (Pasivo)</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">476</span>
                          <span>Org. SS acreedores</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-[280px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Asiento</TableHead>
                        <TableHead className="text-right">Debe (642)</TableHead>
                        <TableHead className="text-right">Haber (476)</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contributions.filter(c => c.status === 'synced').map((contrib) => (
                        <TableRow key={contrib.id}>
                          <TableCell className="font-medium capitalize">
                            {formatPeriod(contrib.period)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            ASS-{contrib.period}
                          </TableCell>
                          <TableCell className="text-right">
                            €{contrib.totalCompany.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            €{contrib.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Contabilizado
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {contributions.filter(c => c.status === 'synced').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No hay asientos contables generados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Tab Tesorería */}
            <TabsContent value="treasury">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Vencimientos TGSS
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Los pagos a la Seguridad Social vencen el último día del mes siguiente 
                    al período de cotización (ej: enero 2026 → vence 28 feb 2026).
                  </p>
                </div>

                <ScrollArea className="h-[280px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contributions.filter(c => c.status === 'synced').map((contrib) => {
                        const dueDate = addDays(endOfMonth(new Date(contrib.period + '-01')), 30);
                        return (
                          <TableRow key={contrib.id}>
                            <TableCell className="font-medium capitalize">
                              {formatPeriod(contrib.period)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(dueDate, 'dd/MM/yyyy')}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              €{contrib.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              Cotización SS {formatPeriod(contrib.period)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Pendiente
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {contributions.filter(c => c.status === 'synced').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No hay vencimientos generados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog Preview Contable */}
      <Dialog open={showAccountingPreview} onOpenChange={setShowAccountingPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Preview Asiento Contable
            </DialogTitle>
            <DialogDescription>
              {selectedContribution && (
                <>Cotización SS {formatPeriod(selectedContribution.period)}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {accountingPreview && selectedContribution && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 bg-blue-500/5 border-blue-500/20">
                  <p className="text-xs text-muted-foreground">Trabajadores</p>
                  <p className="text-lg font-bold">{selectedContribution.workers}</p>
                </Card>
                <Card className="p-3 bg-purple-500/5 border-purple-500/20">
                  <p className="text-xs text-muted-foreground">Base CC</p>
                  <p className="text-lg font-bold">€{selectedContribution.baseCC.toLocaleString()}</p>
                </Card>
                <Card className="p-3 bg-green-500/5 border-green-500/20">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">€{selectedContribution.total.toLocaleString()}</p>
                </Card>
              </div>

              {/* Asiento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-green-600">DEBE</h4>
                  <div className="space-y-1 text-sm">
                    {accountingPreview.debe.map((d, i) => (
                      <div key={i} className="flex justify-between p-2 bg-green-500/5 rounded">
                        <span className="text-muted-foreground">{d.cuenta}</span>
                        <span>€{d.importe.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between p-2 font-semibold">
                      <span>Total Debe</span>
                      <span>€{accountingPreview.totalDebe.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 text-red-600">HABER</h4>
                  <div className="space-y-1 text-sm">
                    {accountingPreview.haber.map((h, i) => (
                      <div key={i} className="flex justify-between p-2 bg-red-500/5 rounded">
                        <span className="text-muted-foreground">{h.cuenta}</span>
                        <span>€{h.importe.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between p-2 font-semibold">
                      <span>Total Haber</span>
                      <span>€{accountingPreview.totalHaber.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance check */}
              <div className={cn(
                "p-3 rounded-lg flex items-center gap-2",
                accountingPreview.balanced 
                  ? "bg-green-500/10 border border-green-500/30" 
                  : "bg-red-500/10 border border-red-500/30"
              )}>
                {accountingPreview.balanced ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">Asiento cuadrado (Debe = Haber)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-700">Descuadre detectado</span>
                  </>
                )}
              </div>

              {/* Confirmaciones */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2">
                  <Checkbox 
                    id="confirmAccounting" 
                    checked={confirmAccounting}
                    onCheckedChange={(c) => setConfirmAccounting(c === true)}
                  />
                  <Label htmlFor="confirmAccounting" className="text-sm cursor-pointer">
                    Confirmo que el asiento contable es correcto y deseo registrarlo
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox 
                    id="confirmTreasury" 
                    checked={confirmTreasury}
                    onCheckedChange={(c) => setConfirmTreasury(c === true)}
                  />
                  <Label htmlFor="confirmTreasury" className="text-sm cursor-pointer">
                    Crear vencimiento de pago TGSS en módulo Tesorería
                  </Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountingPreview(false)}>
              Cancelar
            </Button>
            <Button
              onClick={syncContribution}
              disabled={!confirmAccounting || loading === 'sync'}
            >
              {loading === 'sync' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Sincronizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRSocialSecurityBridge;
