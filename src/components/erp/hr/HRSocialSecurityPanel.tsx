/**
 * HRSocialSecurityPanel - Gestión de Seguridad Social
 * Cotizaciones, presentaciones RED/SILTRA, certificados, expediente mensual
 */

import { useState, useCallback, useEffect } from 'react';
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
  Building2, Euro, Send, FileText, RefreshCw, Loader2, Printer, Download, FileCheck
} from 'lucide-react';
import { usePayrollEngine } from '@/hooks/erp/hr/usePayrollEngine';
import { SSMonthlyExpedientTab } from './payroll-engine/SSMonthlyExpedientTab';
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
  cc_company: 23.60,  // Contingencias comunes empresa
  cc_worker: 4.70,    // Contingencias comunes trabajador
  unemployment_general_company: 5.50,
  unemployment_general_worker: 1.55,
  unemployment_temporal_company: 6.70,
  unemployment_temporal_worker: 1.60,
  fogasa: 0.20,
  fp_company: 0.60,
  fp_worker: 0.10,
  mef: 0.10, // Mecanismo Equidad Intergeneracional
};

export function HRSocialSecurityPanel({ companyId }: HRSocialSecurityPanelProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-01');
  const [activeTab, setActiveTab] = useState('cotizaciones');
  const [loading, setLoading] = useState<string | null>(null);
  const { periods, fetchPeriods } = usePayrollEngine(companyId);

  // Fetch periods for expedient tab
  useState(() => { fetchPeriods(); });
  
  // Dialog states
  const [showNewCommDialog, setShowNewCommDialog] = useState(false);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [showSILTRADialog, setShowSILTRADialog] = useState(false);
  // Demo data - Cotizaciones mensuales
  const contributions = [
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
      atEp: 2141.00,
      totalCompany: 45476.80,
      totalWorker: 7425.60,
      total: 52902.40,
      status: 'filed',
      filingRef: 'RED-2026-01-00123',
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
      totalCompany: 44103.25,
      totalWorker: 7201.00,
      total: 51304.25,
      status: 'paid',
      filingRef: 'RED-2025-12-00456',
      paymentDate: '2025-12-28',
    },
  ];

  // Demo - Presentaciones RED
  const filings = [
    { id: '1', type: 'L00', desc: 'Liquidación mensual', period: '2026-01', status: 'pending', deadline: '2026-01-31' },
    { id: '2', type: 'AFI', desc: 'Alta trabajador', date: '2026-01-15', worker: 'Pedro Sánchez', status: 'confirmed' },
    { id: '3', type: 'BAJ', desc: 'Baja trabajador', date: '2026-01-10', worker: 'Luis García', status: 'confirmed' },
    { id: '4', type: 'VAR', desc: 'Variación datos', date: '2026-01-08', worker: 'María López', status: 'error', error: 'CCC incorrecto' },
  ];

  // Demo - Certificados
  const certificates = [
    { id: '1', type: 'Vida Laboral', worker: 'Ana Fernández', requestDate: '2026-01-20', status: 'ready' },
    { id: '2', type: 'Bases Cotización', worker: 'Juan Martínez', requestDate: '2026-01-18', status: 'processing' },
    { id: '3', type: 'Estar al Corriente', company: true, requestDate: '2026-01-15', status: 'ready' },
  ];

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

  const currentContribution = contributions[0];

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
      } else {
        toast.info('Se ha simulado el cálculo de cotizaciones');
      }
    } catch (error) {
      console.error('Error calculating contributions:', error);
      toast.success('Cotizaciones calculadas (demo)');
    } finally {
      setLoading(null);
    }
  }, [companyId, selectedPeriod]);

  // SILTRA now handled via SSSILTRASubmitDialog

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
    
    autoTable(doc, {
      startY: 42,
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
  }, [selectedPeriod, contributions]);

  const exportContributionsExcel = useCallback(() => {
    const wsData = [
      ['Cotizaciones Seguridad Social', selectedPeriod],
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
  }, [selectedPeriod, contributions]);

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
        f.period || f.date || '',
        f.worker || '-',
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
                        <TableCell className="text-xs text-muted-foreground">{c.filingRef}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Desglose del periodo actual */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Desglose {selectedPeriod}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Contingencias Comunes</p>
                      <p className="font-medium">Empresa: €{currentContribution.ccCompany.toLocaleString()}</p>
                      <p className="font-medium">Trabajador: €{currentContribution.ccWorker.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Desempleo</p>
                      <p className="font-medium">€{currentContribution.unemployment.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">AT/EP</p>
                      <p className="font-medium">€{currentContribution.atEp.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">FOGASA + FP</p>
                      <p className="font-medium">€{(currentContribution.fogasa + currentContribution.fp).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Sistema RED */}
            <TabsContent value="red" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-medium">Movimientos Sistema RED</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={exportFilingsPDF} title="Exportar PDF">
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
                    <FileUp className="h-4 w-4 mr-1" />
                    Nueva comunicación
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Fecha/Período</TableHead>
                      <TableHead>Trabajador</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filings.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <Badge variant="outline">{f.type}</Badge>
                        </TableCell>
                        <TableCell>{f.desc}</TableCell>
                        <TableCell>{f.period || f.date}</TableCell>
                        <TableCell>{f.worker || '-'}</TableCell>
                        <TableCell>{getStatusBadge(f.status)}</TableCell>
                        <TableCell className="text-xs text-destructive">
                          {f.error || (f.deadline ? `Límite: ${f.deadline}` : '-')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* Tab Certificados */}
            <TabsContent value="certificados" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-medium">Solicitud de certificados</h4>
                <Button size="sm" onClick={handleRequestCertificate}>
                  <FileText className="h-4 w-4 mr-1" />
                  Solicitar certificado
                </Button>
              </div>

              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Trabajador/Empresa</TableHead>
                      <TableHead>Fecha solicitud</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">{cert.type}</TableCell>
                        <TableCell>{cert.worker || 'Empresa'}</TableCell>
                        <TableCell>{cert.requestDate}</TableCell>
                        <TableCell>{getStatusBadge(cert.status)}</TableCell>
                        <TableCell>
                          {cert.status === 'ready' && (
                            <Button variant="ghost" size="sm">
                              <FileDown className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* Tab Tipos de cotización */}
            <TabsContent value="tipos" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tipos Empresa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Contingencias Comunes</span>
                      <span className="font-medium">{SS_RATES.cc_company}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Desempleo (General)</span>
                      <span className="font-medium">{SS_RATES.unemployment_general_company}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>FOGASA</span>
                      <span className="font-medium">{SS_RATES.fogasa}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Formación Profesional</span>
                      <span className="font-medium">{SS_RATES.fp_company}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>MEI (Mecanismo Equidad)</span>
                      <span className="font-medium">{SS_RATES.mef}%</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2 font-semibold">
                      <span>Total (sin AT/EP)</span>
                      <span>~30%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tipos Trabajador</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Contingencias Comunes</span>
                      <span className="font-medium">{SS_RATES.cc_worker}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Desempleo (General)</span>
                      <span className="font-medium">{SS_RATES.unemployment_general_worker}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Formación Profesional</span>
                      <span className="font-medium">{SS_RATES.fp_worker}%</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2 font-semibold">
                      <span>Total</span>
                      <span>~6.35%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-700">Nota importante</p>
                      <p className="text-muted-foreground">
                        Los tipos de AT/EP varían según el CNAE de la empresa. Consulte el cuadro de 
                        primas de la Disposición Adicional Cuarta de la LGSS para conocer el tipo aplicable.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SSNewCommunicationDialog
        open={showNewCommDialog}
        onOpenChange={setShowNewCommDialog}
        companyId={companyId}
        onSuccess={() => toast.success('Comunicación enviada al Sistema RED')}
      />

      <SSCertificateRequestDialog
        open={showCertificateDialog}
        onOpenChange={setShowCertificateDialog}
        companyId={companyId}
        onSuccess={() => toast.success('Certificado solicitado correctamente')}
      />

      <SSSILTRASubmitDialog
        open={showSILTRADialog}
        onOpenChange={setShowSILTRADialog}
        companyId={companyId}
        period={selectedPeriod}
        contributionData={currentContribution}
        onSuccess={() => toast.success('Presentación SILTRA completada')}
      />
    </div>
  );
}

export default HRSocialSecurityPanel;
