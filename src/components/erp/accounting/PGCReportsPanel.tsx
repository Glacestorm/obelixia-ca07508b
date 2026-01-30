/**
 * PGCReportsPanel - Panel de Informes Oficiales PGC
 * Genera Balance, Cuenta de Resultados y otros estados financieros según normativa española
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileSpreadsheet, 
  Download, 
  FileText, 
  Building2,
  Calculator,
  TrendingUp,
  RefreshCw,
  Loader2,
  CheckCircle,
  FileCode,
  Printer
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { useERPPGCReports, PGCReportType, ExportFormat, PGCReportLine } from '@/hooks/erp/useERPPGCReports';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const reportTypes: { value: PGCReportType; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'balance_abreviado', label: 'Balance Abreviado', description: 'Empresas que cumplen límites PGC', icon: FileSpreadsheet },
  { value: 'balance_normal', label: 'Balance Normal', description: 'Grandes empresas y cotizadas', icon: FileSpreadsheet },
  { value: 'balance_pyme', label: 'Balance PYME', description: 'Pequeñas y medianas empresas', icon: FileSpreadsheet },
  { value: 'pyg_abreviado', label: 'PyG Abreviada', description: 'Cuenta de resultados simplificada', icon: Calculator },
  { value: 'pyg_normal', label: 'PyG Normal', description: 'Cuenta de resultados completa', icon: Calculator },
  { value: 'pyg_pyme', label: 'PyG PYME', description: 'Cuenta de resultados PYME', icon: Calculator },
];

const exportFormats: { value: ExportFormat; label: string; icon: React.ElementType }[] = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { value: 'xbrl', label: 'XBRL', icon: FileCode },
  { value: 'json', label: 'JSON', icon: FileCode },
];

interface PGCReportsPanelProps {
  fiscalYearId?: string;
}

export function PGCReportsPanel({ fiscalYearId }: PGCReportsPanelProps) {
  const { currentCompany } = useERPContext();
  const {
    isLoading,
    error,
    generatedReports,
    currentReport,
    generateBalanceSheet,
    generateIncomeStatement,
    exportReport,
    getReportTypeLabel,
  } = useERPPGCReports(fiscalYearId);

  const [selectedReportType, setSelectedReportType] = useState<PGCReportType>('balance_abreviado');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Simple fiscal year reference
  const currentFiscalYear = fiscalYearId ? { id: fiscalYearId, name: 'Ejercicio Actual' } : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleGenerateReport = async () => {
    if (selectedReportType.startsWith('balance')) {
      await generateBalanceSheet(selectedReportType as any);
    } else if (selectedReportType.startsWith('pyg')) {
      await generateIncomeStatement(selectedReportType as any);
    }
    setShowReportDialog(true);
  };

  const handleExport = async () => {
    if (!currentReport) return;
    const url = await exportReport(currentReport, exportFormat);
    if (url && exportFormat === 'json') {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentReport.type}_${format(new Date(), 'yyyyMMdd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const renderReportLine = (line: PGCReportLine) => (
    <TableRow key={line.code} className={cn(line.isTotal && "bg-muted/50 font-semibold")}>
      <TableCell className="font-mono text-xs">{line.code}</TableCell>
      <TableCell className={cn("pl-" + (line.level * 4), line.isBold && "font-bold")}>
        {line.label}
      </TableCell>
      <TableCell className="text-right font-mono">
        {formatCurrency(line.currentYear)}
      </TableCell>
      <TableCell className="text-right font-mono text-muted-foreground">
        {formatCurrency(line.previousYear)}
      </TableCell>
    </TableRow>
  );

  if (!currentCompany || !currentFiscalYear) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona una empresa y ejercicio fiscal</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">Informes Oficiales PGC</h3>
            <p className="text-sm text-muted-foreground">
              Balance, Cuenta de Resultados y Estados Financieros
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Building2 className="h-3 w-3" />
            {currentCompany.name}
          </Badge>
          <Badge variant="secondary">
            {currentFiscalYear.name || 'Ejercicio actual'}
          </Badge>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-3 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReportType === report.value;
          
          return (
            <Card 
              key={report.value}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected && "ring-2 ring-primary bg-primary/5"
              )}
              onClick={() => setSelectedReportType(report.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{report.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Formato de exportación:</span>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exportFormats.map((format) => {
                      const Icon = format.icon;
                      return (
                        <SelectItem key={format.value} value={format.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3 w-3" />
                            {format.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={handleGenerateReport} 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generar Informe
                  </>
                )}
              </Button>
              
              {currentReport && (
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {currentReport && getReportTypeLabel(currentReport.type)}
            </DialogTitle>
          </DialogHeader>
          
          {currentReport && (
            <div className="flex-1 overflow-auto">
              {currentReport.type.startsWith('balance') && currentReport.data && (
                <div className="space-y-6">
                  {/* Company Header */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-lg font-bold">{currentReport.data.companyName}</h2>
                    <p className="text-sm text-muted-foreground">CIF: {currentReport.data.companyCIF}</p>
                    <p className="text-sm">Ejercicio: {currentReport.data.fiscalYear}</p>
                  </div>

                  {/* Activo */}
                  <div>
                    <h3 className="font-bold text-lg mb-2 bg-blue-50 dark:bg-blue-950 p-2 rounded">ACTIVO</h3>
                    
                    <h4 className="font-semibold mb-2">A) Activo No Corriente</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Nota</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead className="text-right">Ejercicio N</TableHead>
                          <TableHead className="text-right">Ejercicio N-1</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentReport.data.activo.activoNoCorriente.map(renderReportLine)}
                      </TableBody>
                    </Table>

                    <h4 className="font-semibold mb-2 mt-4">B) Activo Corriente</h4>
                    <Table>
                      <TableBody>
                        {currentReport.data.activo.activoCorriente.map(renderReportLine)}
                      </TableBody>
                    </Table>

                    <div className="flex justify-end mt-2 p-2 bg-muted rounded">
                      <span className="font-bold">TOTAL ACTIVO: {formatCurrency(currentReport.data.activo.totalActivo)}</span>
                    </div>
                  </div>

                  {/* Pasivo y Patrimonio Neto */}
                  <div>
                    <h3 className="font-bold text-lg mb-2 bg-green-50 dark:bg-green-950 p-2 rounded">PATRIMONIO NETO Y PASIVO</h3>
                    
                    <h4 className="font-semibold mb-2">A) Patrimonio Neto</h4>
                    <Table>
                      <TableBody>
                        {currentReport.data.pasivoPatrimonio.patrimonioNeto.map(renderReportLine)}
                      </TableBody>
                    </Table>

                    <h4 className="font-semibold mb-2 mt-4">B) Pasivo No Corriente</h4>
                    <Table>
                      <TableBody>
                        {currentReport.data.pasivoPatrimonio.pasivoNoCorriente.map(renderReportLine)}
                      </TableBody>
                    </Table>

                    <h4 className="font-semibold mb-2 mt-4">C) Pasivo Corriente</h4>
                    <Table>
                      <TableBody>
                        {currentReport.data.pasivoPatrimonio.pasivoCorriente.map(renderReportLine)}
                      </TableBody>
                    </Table>

                    <div className="flex justify-end mt-2 p-2 bg-muted rounded">
                      <span className="font-bold">TOTAL PN Y PASIVO: {formatCurrency(currentReport.data.pasivoPatrimonio.totalPasivoPatrimonio)}</span>
                    </div>
                  </div>
                </div>
              )}

              {currentReport.type.startsWith('pyg') && currentReport.data && (
                <div className="space-y-6">
                  {/* Company Header */}
                  <div className="text-center border-b pb-4">
                    <h2 className="text-lg font-bold">{currentReport.data.companyName}</h2>
                    <p className="text-sm text-muted-foreground">CIF: {currentReport.data.companyCIF}</p>
                    <p className="text-sm">Ejercicio: {currentReport.data.fiscalYear}</p>
                  </div>

                  <h3 className="font-bold text-lg mb-2 bg-amber-50 dark:bg-amber-950 p-2 rounded">
                    CUENTA DE PÉRDIDAS Y GANANCIAS
                  </h3>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Nota</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead className="text-right">Ejercicio N</TableHead>
                        <TableHead className="text-right">Ejercicio N-1</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentReport.data.lines.map(renderReportLine)}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end mt-2 p-3 bg-primary/10 rounded-lg">
                    <span className="font-bold text-lg">
                      RESULTADO DEL EJERCICIO: {formatCurrency(currentReport.data.resultadoEjercicio)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cerrar
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar {exportFormat.toUpperCase()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Reports */}
      {generatedReports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informes Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {generatedReports.slice(0, 5).map((report) => (
                <div 
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setShowReportDialog(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{getReportTypeLabel(report.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(report.generatedAt), "dd MMM yyyy, HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{report.format.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PGCReportsPanel;
