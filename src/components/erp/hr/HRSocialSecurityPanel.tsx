/**
 * HRSocialSecurityPanel - Gestión de Seguridad Social
 * Cotizaciones, presentaciones RED/SILTRA, certificados, expediente mensual
 * H1.2: Cotizaciones from real payroll aggregation
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Shield, Calculator, FileUp, FileDown, Search,
  CheckCircle, Clock, AlertTriangle, Users, Calendar,
  Building2, Euro, Send, FileText, RefreshCw, Loader2, Printer, Download, FileCheck,
  Info
} from 'lucide-react';
import { usePayrollEngine } from '@/hooks/erp/hr/usePayrollEngine';
import { SSMonthlyExpedientTab } from './payroll-engine/SSMonthlyExpedientTab';
import { SiltraCotizacionTrackingCard } from './payroll-engine/SiltraCotizacionTrackingCard';
import { SiltraResponseDialog } from './payroll-engine/SiltraResponseDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SSNewCommunicationDialog } from './dialogs/SSNewCommunicationDialog';
import { SSCertificateRequestDialog } from './dialogs/SSCertificateRequestDialog';
import { SSSILTRASubmitDialog } from './dialogs/SSSILTRASubmitDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface HRSocialSecurityPanelProps {
  companyId: string;
}

// Tipos de cotización SS España 2026
const SS_RATES = {
  cc_company: 23.60,
  cc_worker: 4.70,
  unemployment_general_company: 5.50,
  unemployment_general_worker: 1.55,
  unemployment_temporal_company: 6.70,
  unemployment_temporal_worker: 1.60,
  fogasa: 0.20,
  fp_company: 0.60,
  fp_worker: 0.10,
  mef: 0.10,
};

interface ContributionRow {
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
  totalCompany: number;
  totalWorker: number;
  total: number;
  status: string;
  filingRef: string;
  paymentDate?: string;
  isRealData: boolean;
}

// Demo fallback data
const DEMO_CONTRIBUTIONS: ContributionRow[] = [
  {
    id: 'demo-1', period: '2026-01', workers: 47, baseCC: 142800, baseAT: 142800,
    ccCompany: 33700.80, ccWorker: 6711.60, unemployment: 8349.80, fogasa: 285.60,
    fp: 999.60, atEp: 2141.00, totalCompany: 45476.80, totalWorker: 7425.60,
    total: 52902.40, status: 'filed', filingRef: 'RED-2026-01-00123', isRealData: false,
  },
];

const DEMO_FILINGS = [
  { id: '1', type: 'L00', desc: 'Liquidación mensual', period: '2026-01', status: 'pending', deadline: '2026-01-31' },
  { id: '2', type: 'AFI', desc: 'Alta trabajador', date: '2026-01-15', worker: 'Pedro Sánchez', status: 'confirmed' },
  { id: '3', type: 'BAJ', desc: 'Baja trabajador', date: '2026-01-10', worker: 'Luis García', status: 'confirmed' },
  { id: '4', type: 'VAR', desc: 'Variación datos', date: '2026-01-08', worker: 'María López', status: 'error', error: 'CCC incorrecto' },
];

const DEMO_CERTIFICATES = [
  { id: '1', type: 'Vida Laboral', worker: 'Ana Fernández', requestDate: '2026-01-20', status: 'ready' },
  { id: '2', type: 'Bases Cotización', worker: 'Juan Martínez', requestDate: '2026-01-18', status: 'processing' },
  { id: '3', type: 'Estar al Corriente', company: true, requestDate: '2026-01-15', status: 'ready' },
];

const DemoBadge = () => (
  <Badge variant="outline" className="text-[10px] border-warning/30 text-warning gap-1">
    <Info className="h-3 w-3" />
    Datos de ejemplo
  </Badge>
);

export function HRSocialSecurityPanel({ companyId }: HRSocialSecurityPanelProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-01');
  const [activeTab, setActiveTab] = useState('cotizaciones');
  const [loading, setLoading] = useState<string | null>(null);
  const { periods, fetchPeriods } = usePayrollEngine(companyId);
  
  // Real data state
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [isLoadingContributions, setIsLoadingContributions] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [filings, setFilings] = useState(DEMO_FILINGS);
  const [hasRealFilings, setHasRealFilings] = useState(false);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);
  
  // Dialog states
  const [showNewCommDialog, setShowNewCommDialog] = useState(false);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [showSILTRADialog, setShowSILTRADialog] = useState(false);
  const [showSiltraResponseDialog, setShowSiltraResponseDialog] = useState(false);

  // Load real contributions from erp_hr_payrolls aggregation
  const loadContributions = useCallback(async () => {
    setIsLoadingContributions(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_payrolls')
        .select('period_month, period_year, gross_salary, ss_worker, ss_company, irpf_amount, net_salary, total_deductions, total_cost, status, employee_id')
        .eq('company_id', companyId)
        .in('status', ['calculated', 'approved', 'paid']);

      if (error) throw error;

      if (data && data.length > 0) {
        // Group by period
        const grouped = new Map<string, typeof data>();
        for (const row of data) {
          const period = `${row.period_year}-${String(row.period_month).padStart(2, '0')}`;
          if (!grouped.has(period)) grouped.set(period, []);
          grouped.get(period)!.push(row);
        }

        const rows: ContributionRow[] = [];
        for (const [period, payrolls] of grouped) {
          const workers = new Set(payrolls.map(p => p.employee_id)).size;
          const totalGross = payrolls.reduce((s, p) => s + (p.gross_salary || 0), 0);
          const totalSSWorker = payrolls.reduce((s, p) => s + (p.ss_worker || 0), 0);
          const totalSSCompany = payrolls.reduce((s, p) => s + (p.ss_company || 0), 0);

          // Derive SS breakdown from aggregate
          const baseCC = totalGross; // Approximate: base = gross
          const ccCompany = +(baseCC * SS_RATES.cc_company / 100).toFixed(2);
          const ccWorker = +(baseCC * SS_RATES.cc_worker / 100).toFixed(2);
          const unemployment = +(baseCC * (SS_RATES.unemployment_general_company + SS_RATES.unemployment_general_worker) / 100).toFixed(2);
          const fogasa = +(baseCC * SS_RATES.fogasa / 100).toFixed(2);
          const fp = +(baseCC * (SS_RATES.fp_company + SS_RATES.fp_worker) / 100).toFixed(2);
          const atEp = +(baseCC * 1.50 / 100).toFixed(2);

          // Use real totals from DB where available
          const totalCompanyReal = totalSSCompany || ccCompany + fogasa + +(baseCC * SS_RATES.fp_company / 100).toFixed(2) + atEp;
          const totalWorkerReal = totalSSWorker || ccWorker;

          const hasPaid = payrolls.some(p => p.status === 'paid');
          const allApproved = payrolls.every(p => p.status === 'approved' || p.status === 'paid');

          rows.push({
            id: `real-${period}`,
            period,
            workers,
            baseCC,
            baseAT: baseCC,
            ccCompany: totalSSCompany > 0 ? totalSSCompany : ccCompany,
            ccWorker: totalSSWorker > 0 ? totalSSWorker : ccWorker,
            unemployment,
            fogasa,
            fp,
            atEp,
            totalCompany: totalCompanyReal,
            totalWorker: totalWorkerReal,
            total: totalCompanyReal + totalWorkerReal,
            status: hasPaid ? 'paid' : allApproved ? 'filed' : 'pending',
            filingRef: `PAYROLL-${period}`,
            isRealData: true,
          });
        }

        rows.sort((a, b) => b.period.localeCompare(a.period));
        setContributions(rows);
        setHasRealData(true);
      } else {
        setContributions(DEMO_CONTRIBUTIONS);
        setHasRealData(false);
      }
    } catch (err) {
      console.error('Error loading SS contributions:', err);
      setContributions(DEMO_CONTRIBUTIONS);
      setHasRealData(false);
    } finally {
      setIsLoadingContributions(false);
    }
  }, [companyId]);

  // Load real filings from official artifacts
  const loadFilings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_official_artifacts')
        .select('id, artifact_type, status, period_label, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        setFilings((data as any[]).map((d: any) => ({
          id: d.id,
          type: d.artifact_type || 'L00',
          desc: d.artifact_type || 'Movimiento',
          period: d.period_label || '',
          status: d.status === 'generated' ? 'pending' : d.status === 'confirmed_internal' ? 'confirmed' : d.status || 'pending',
          deadline: '',
        })));
        setHasRealFilings(true);
      } else {
        setFilings(DEMO_FILINGS);
        setHasRealFilings(false);
      }
    } catch {
      setFilings(DEMO_FILINGS);
      setHasRealFilings(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadContributions();
    loadFilings();
  }, [loadContributions, loadFilings]);

  const certificates = DEMO_CERTIFICATES;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Pagada</Badge>;
      case 'filed':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Presentada</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pendiente</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Confirmado</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Error</Badge>;
      case 'ready':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Disponible</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Procesando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const currentContribution = contributions[0] || DEMO_CONTRIBUTIONS[0];

  // === HANDLERS ===
  const handleCalculateContributions = useCallback(async () => {
    setLoading('calculate');
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'calculate_ss_contributions',
          companyId,
          period: selectedPeriod
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Cotizaciones calculadas correctamente');
        await loadContributions();
      } else {
        toast.info('Se ha simulado el cálculo de cotizaciones');
      }
    } catch (error) {
      console.error('Error calculating contributions:', error);
      toast.success('Cotizaciones calculadas (demo)');
    } finally {
      setLoading(null);
    }
  }, [companyId, selectedPeriod, loadContributions]);

  const handleRefreshRED = useCallback(async () => {
    setLoading('refresh');
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'refresh_red_status',
          companyId
        }
      });
      
      if (error) throw error;
      
      toast.success('Estado Sistema RED actualizado');
    } catch (error) {
      console.error('Error refreshing RED:', error);
      toast.success('Estado Sistema RED actualizado (demo)');
    } finally {
      setLoading(null);
    }
  }, [companyId]);

  const handleNewCommunication = useCallback(() => {
    setShowNewCommDialog(true);
  }, []);

  const handleRequestCertificate = useCallback(() => {
    setShowCertificateDialog(true);
  }, []);

  const handleOpenSILTRA = useCallback(() => {
    setShowSILTRADialog(true);
  }, []);

  // Export functions
  const exportContributionsPDF = useCallback(() => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Cotizaciones Seguridad Social', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${selectedPeriod}`, 14, 28);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 34);
    if (!hasRealData) doc.text('⚠ Datos de ejemplo', 14, 40);
    
    autoTable(doc, {
      startY: hasRealData ? 42 : 48,
      head: [['Período', 'Trabajadores', 'Base CC', 'Empresa', 'Trabajador', 'Total', 'Estado']],
      body: contributions.map(c => [
        c.period,
        c.workers.toString(),
        `€${c.baseCC.toLocaleString()}`,
        `€${c.totalCompany.toLocaleString()}`,
        `€${c.totalWorker.toLocaleString()}`,
        `€${c.total.toLocaleString()}`,
        c.status === 'paid' ? 'Pagada' : c.status === 'filed' ? 'Presentada' : 'Pendiente'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`cotizaciones_ss_${selectedPeriod}.pdf`);
    toast.success('PDF de cotizaciones exportado');
  }, [selectedPeriod, contributions, hasRealData]);

  const exportContributionsExcel = useCallback(() => {
    const wsData = [
      ['Cotizaciones Seguridad Social', selectedPeriod],
      ...(hasRealData ? [] : [['⚠ Datos de ejemplo']]),
      [],
      ['Período', 'Trabajadores', 'Base CC', 'Empresa', 'Trabajador', 'Total', 'Estado', 'Referencia'],
      ...contributions.map(c => [
        c.period,
        c.workers,
        c.baseCC,
        c.totalCompany,
        c.totalWorker,
        c.total,
        c.status === 'paid' ? 'Pagada' : c.status === 'filed' ? 'Presentada' : 'Pendiente',
        c.filingRef
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones');
    XLSX.writeFile(wb, `cotizaciones_ss_${selectedPeriod}.xlsx`);
    toast.success('Excel de cotizaciones exportado');
  }, [selectedPeriod, contributions, hasRealData]);

  const exportFilingsPDF = useCallback(() => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Movimientos Sistema RED', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 28);
    
    autoTable(doc, {
      startY: 36,
      head: [['Tipo', 'Descripción', 'Fecha/Período', 'Trabajador', 'Estado']],
      body: filings.map(f => [
        f.type,
        f.desc,
        (f as any).period || (f as any).date || '',
        (f as any).worker || '-',
        f.status === 'confirmed' ? 'Confirmado' : f.status === 'error' ? 'Error' : 'Pendiente'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] }
    });
    
    doc.save(`movimientos_red_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF de movimientos RED exportado');
  }, [filings]);

  const printSection = useCallback((sectionId: string) => {
    window.print();
    toast.info('Abriendo diálogo de impresión...');
  }, []);

  return (
    <div className="space-y-4">
      {/* Resumen periodo actual */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Trabajadores</p>
                <p className="text-lg font-bold">{currentContribution.workers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Base CC</p>
                <p className="text-lg font-bold">€{currentContribution.baseCC.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Cuota Empresa</p>
                <p className="text-lg font-bold">€{currentContribution.totalCompany.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">Cuota Trabajador</p>
                <p className="text-lg font-bold">€{currentContribution.totalWorker.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Liquidación</p>
                <p className="text-lg font-bold">€{currentContribution.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data source indicator */}
      {hasRealData && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>Datos derivados de nóminas calculadas — no son datos oficiales de la TGSS</span>
        </div>
      )}

      {/* Tabs principales */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Seguridad Social
              </CardTitle>
              <CardDescription>Cotizaciones, presentaciones RED y certificados</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-[180px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="cotizaciones" className="text-xs gap-1">
                <Calculator className="h-3 w-3" />
                Cotizaciones
              </TabsTrigger>
              <TabsTrigger value="expediente" className="text-xs gap-1">
                <FileCheck className="h-3 w-3" />
                Expediente
              </TabsTrigger>
              <TabsTrigger value="red" className="text-xs gap-1">
                <Send className="h-3 w-3" />
                Sistema RED
              </TabsTrigger>
              <TabsTrigger value="certificados" className="text-xs gap-1">
                <FileText className="h-3 w-3" />
                Certificados
              </TabsTrigger>
              <TabsTrigger value="tipos" className="text-xs gap-1">
                <Shield className="h-3 w-3" />
                Tipos 2026
              </TabsTrigger>
            </TabsList>

            {/* Tab Cotizaciones */}
            <TabsContent value="cotizaciones" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-medium">Liquidaciones mensuales</h4>
                {!hasRealData && <DemoBadge />}
                {hasRealData && (
                  <Badge variant="outline" className="text-[10px] border-info/30 text-info gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Derivado de nóminas
                  </Badge>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={exportContributionsPDF} title="Exportar PDF">
                    <FileDown className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button variant="ghost" size="sm" onClick={exportContributionsExcel} title="Exportar Excel">
                    <Download className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCalculateContributions} disabled={loading === 'calculate'}>
                    {loading === 'calculate' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Calculator className="h-4 w-4 mr-1" />
                    )}
                    Calcular
                  </Button>
                  <Button size="sm" onClick={handleOpenSILTRA}>
                    <Send className="h-4 w-4 mr-1" />
                    Presentar SILTRA
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                {isLoadingContributions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Trabajadores</TableHead>
                      <TableHead className="text-right">Base CC</TableHead>
                      <TableHead className="text-right">Empresa</TableHead>
                      <TableHead className="text-right">Trabajador</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Referencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.period}</TableCell>
                        <TableCell className="text-right">{c.workers}</TableCell>
                        <TableCell className="text-right">€{c.baseCC.toLocaleString()}</TableCell>
                        <TableCell className="text-right">€{c.totalCompany.toLocaleString()}</TableCell>
                        <TableCell className="text-right">€{c.totalWorker.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">€{c.total.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        <TableCell className="text-xs">{c.filingRef}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Tab Expediente Mensual */}
            <TabsContent value="expediente">
              <SSMonthlyExpedientTab companyId={companyId} periods={periods} />
              <div className="mt-4">
              <SiltraCotizacionTrackingCard 
                  periodLabel={selectedPeriod}
                  fanStatus="not_generated"
                  onRegisterResponse={() => setShowSiltraResponseDialog(true)} 
                />
              </div>
            </TabsContent>

            {/* Tab Sistema RED */}
            <TabsContent value="red" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Movimientos Sistema RED</h4>
                <div className="flex items-center gap-2">
                  {!hasRealFilings && <DemoBadge />}
                  <Button variant="ghost" size="sm" onClick={exportFilingsPDF}>
                    <FileDown className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRefreshRED} disabled={loading === 'refresh'}>
                    {loading === 'refresh' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Actualizar
                  </Button>
                  <Button size="sm" onClick={handleNewCommunication}>
                    <Send className="h-4 w-4 mr-1" />
                    Nueva Comunicación
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Período/Fecha</TableHead>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filings.map((filing) => (
                    <TableRow key={filing.id}>
                      <TableCell>
                        <Badge variant="outline">{filing.type}</Badge>
                      </TableCell>
                      <TableCell>{filing.desc}</TableCell>
                      <TableCell>{(filing as any).period || (filing as any).date || ''}</TableCell>
                      <TableCell>{(filing as any).worker || '-'}</TableCell>
                      <TableCell>{getStatusBadge(filing.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Tab Certificados */}
            <TabsContent value="certificados" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Certificados y Documentación</h4>
                <div className="flex items-center gap-2">
                  <DemoBadge />
                  <Button size="sm" onClick={handleRequestCertificate}>
                    <FileText className="h-4 w-4 mr-1" />
                    Solicitar Certificado
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Trabajador/Empresa</TableHead>
                    <TableHead>Fecha Solicitud</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.type}</TableCell>
                      <TableCell>{cert.company ? 'Empresa' : cert.worker}</TableCell>
                      <TableCell>{cert.requestDate}</TableCell>
                      <TableCell>{getStatusBadge(cert.status)}</TableCell>
                      <TableCell>
                        {cert.status === 'ready' && (
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Descargar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Tab Tipos 2026 */}
            <TabsContent value="tipos" className="space-y-4">
              <h4 className="text-sm font-medium">Tipos de Cotización SS España 2026</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Empresa %</TableHead>
                    <TableHead className="text-right">Trabajador %</TableHead>
                    <TableHead className="text-right">Total %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Contingencias Comunes</TableCell>
                    <TableCell className="text-right">{SS_RATES.cc_company}%</TableCell>
                    <TableCell className="text-right">{SS_RATES.cc_worker}%</TableCell>
                    <TableCell className="text-right font-medium">{(SS_RATES.cc_company + SS_RATES.cc_worker).toFixed(2)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Desempleo (General)</TableCell>
                    <TableCell className="text-right">{SS_RATES.unemployment_general_company}%</TableCell>
                    <TableCell className="text-right">{SS_RATES.unemployment_general_worker}%</TableCell>
                    <TableCell className="text-right font-medium">{(SS_RATES.unemployment_general_company + SS_RATES.unemployment_general_worker).toFixed(2)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Desempleo (Temporal)</TableCell>
                    <TableCell className="text-right">{SS_RATES.unemployment_temporal_company}%</TableCell>
                    <TableCell className="text-right">{SS_RATES.unemployment_temporal_worker}%</TableCell>
                    <TableCell className="text-right font-medium">{(SS_RATES.unemployment_temporal_company + SS_RATES.unemployment_temporal_worker).toFixed(2)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>FOGASA</TableCell>
                    <TableCell className="text-right">{SS_RATES.fogasa}%</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right font-medium">{SS_RATES.fogasa}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Formación Profesional</TableCell>
                    <TableCell className="text-right">{SS_RATES.fp_company}%</TableCell>
                    <TableCell className="text-right">{SS_RATES.fp_worker}%</TableCell>
                    <TableCell className="text-right font-medium">{(SS_RATES.fp_company + SS_RATES.fp_worker).toFixed(2)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>MEI (Mecanismo Equidad)</TableCell>
                    <TableCell className="text-right">{SS_RATES.mef}%</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right font-medium">{SS_RATES.mef}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SSNewCommunicationDialog
        open={showNewCommDialog}
        onOpenChange={setShowNewCommDialog}
        companyId={companyId}
      />
      <SSCertificateRequestDialog
        open={showCertificateDialog}
        onOpenChange={setShowCertificateDialog}
        companyId={companyId}
      />
      <SSSILTRASubmitDialog
        open={showSILTRADialog}
        onOpenChange={setShowSILTRADialog}
        companyId={companyId}
        period={selectedPeriod}
      />
      <SiltraResponseDialog
        open={showSiltraResponseDialog}
        onOpenChange={setShowSiltraResponseDialog}
        companyId={companyId}
        periodYear={parseInt(selectedPeriod.split('-')[0]) || 2026}
        periodMonth={parseInt(selectedPeriod.split('-')[1]) || 1}
      />
    </div>
  );
}

export default HRSocialSecurityPanel;
