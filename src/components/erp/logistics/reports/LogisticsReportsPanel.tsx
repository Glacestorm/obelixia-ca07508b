/**
 * ERP Logistics Module - Reports Panel
 * Generación de informes logísticos avanzados
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Download,
  Calendar,
  Truck,
  Building2,
  Package,
  TrendingUp,
  Clock,
  FileSpreadsheet,
  FilePieChart,
  Settings,
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { toast } from 'sonner';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'shipments' | 'carriers' | 'fleet' | 'costs' | 'performance';
  fields: string[];
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'shipments_summary',
    name: 'Resumen de Envíos',
    description: 'Listado completo de envíos con estados, costes y fechas',
    icon: Package,
    category: 'shipments',
    fields: ['tracking', 'origen', 'destino', 'estado', 'coste', 'fecha'],
  },
  {
    id: 'shipments_by_status',
    name: 'Envíos por Estado',
    description: 'Análisis de envíos agrupados por estado',
    icon: TrendingUp,
    category: 'shipments',
    fields: ['estado', 'cantidad', 'porcentaje', 'coste_total'],
  },
  {
    id: 'carrier_performance',
    name: 'Rendimiento de Operadoras',
    description: 'Métricas de rendimiento por transportista',
    icon: Building2,
    category: 'carriers',
    fields: ['operadora', 'envios', 'entregados', 'incidencias', 'tiempo_medio'],
  },
  {
    id: 'carrier_costs',
    name: 'Costes por Operadora',
    description: 'Desglose de costes por transportista',
    icon: FileSpreadsheet,
    category: 'carriers',
    fields: ['operadora', 'envios', 'coste_flete', 'coste_seguro', 'total'],
  },
  {
    id: 'fleet_activity',
    name: 'Actividad de Flota',
    description: 'Resumen de actividad de vehículos propios',
    icon: Truck,
    category: 'fleet',
    fields: ['vehiculo', 'rutas', 'km_recorridos', 'entregas', 'estado'],
  },
  {
    id: 'fleet_expenses',
    name: 'Gastos de Flota',
    description: 'Registro de gastos por vehículo',
    icon: FilePieChart,
    category: 'fleet',
    fields: ['vehiculo', 'combustible', 'mantenimiento', 'peajes', 'total'],
  },
  {
    id: 'costs_summary',
    name: 'Resumen de Costes',
    description: 'Análisis completo de costes logísticos',
    icon: TrendingUp,
    category: 'costs',
    fields: ['categoria', 'mes', 'importe', 'variacion'],
  },
  {
    id: 'delivery_times',
    name: 'Tiempos de Entrega',
    description: 'Análisis de tiempos de entrega por zona',
    icon: Clock,
    category: 'performance',
    fields: ['zona', 'media_dias', 'puntualidad', 'envios'],
  },
];

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoy' },
  { value: 'last_7_days', label: 'Últimos 7 días' },
  { value: 'last_30_days', label: 'Últimos 30 días' },
  { value: 'current_month', label: 'Mes actual' },
  { value: 'last_month', label: 'Mes anterior' },
  { value: 'last_quarter', label: 'Último trimestre' },
  { value: 'custom', label: 'Personalizado' },
];

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { value: 'excel', label: 'Excel (XLSX)', icon: FileSpreadsheet },
  { value: 'pdf', label: 'PDF', icon: FileText },
];

export function LogisticsReportsPanel() {
  const { currentCompany } = useERPContext();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastGeneratedReport, setLastGeneratedReport] = useState<{
    name: string;
    date: Date;
    size: string;
  } | null>(null);

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'today':
        return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'last_7_days':
        return { start: format(subDays(now, 7), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'last_30_days':
        return { start: format(subDays(now, 30), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'current_month':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
      case 'last_quarter':
        return { start: format(subMonths(now, 3), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
    }
  }, [selectedPeriod, customStartDate, customEndDate]);

  const generateReport = async () => {
    if (!selectedTemplate || !currentCompany?.id) {
      toast.error('Seleccione un tipo de informe');
      return;
    }

    const template = REPORT_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      const dateRange = getDateRange();
      let data: any[] = [];

      // Simular progreso
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Obtener datos según el tipo de informe
      switch (template.category) {
        case 'shipments':
          const { data: shipmentsData, error: shipmentsError } = await supabase
            .from('erp_logistics_shipments')
            .select(`
              id,
              tracking_number,
              shipment_number,
              origin_address,
              origin_city,
              destination_address,
              destination_city,
              status,
              freight_cost,
              insurance_cost,
              total_cost,
              created_at,
              delivered_at,
              erp_logistics_carriers!erp_logistics_shipments_carrier_id_fkey (
                carrier_name
              )
            `)
            .eq('company_id', currentCompany.id)
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end + 'T23:59:59')
            .order('created_at', { ascending: false });

          if (shipmentsError) throw shipmentsError;
          data = shipmentsData || [];
          break;

        case 'carriers':
          const { data: carriersData, error: carriersError } = await supabase
            .from('erp_logistics_shipments')
            .select(`
              id,
              status,
              freight_cost,
              insurance_cost,
              total_cost,
              created_at,
              delivered_at,
              erp_logistics_carriers!erp_logistics_shipments_carrier_id_fkey (
                id,
                carrier_name
              )
            `)
            .eq('company_id', currentCompany.id)
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end + 'T23:59:59');

          if (carriersError) throw carriersError;
          
          // Agrupar por operadora
          const carrierStats: Record<string, any> = {};
          (carriersData || []).forEach((s: any) => {
            const carrierName = s.erp_logistics_carriers?.carrier_name || 'Sin operadora';
            if (!carrierStats[carrierName]) {
              carrierStats[carrierName] = {
                carrier_name: carrierName,
                total_shipments: 0,
                delivered: 0,
                failed: 0,
                freight_cost: 0,
                insurance_cost: 0,
                total_cost: 0,
              };
            }
            carrierStats[carrierName].total_shipments++;
            if (s.status === 'delivered') carrierStats[carrierName].delivered++;
            if (s.status === 'failed') carrierStats[carrierName].failed++;
            carrierStats[carrierName].freight_cost += s.freight_cost || 0;
            carrierStats[carrierName].insurance_cost += s.insurance_cost || 0;
            carrierStats[carrierName].total_cost += s.total_cost || 0;
          });
          data = Object.values(carrierStats);
          break;

        case 'fleet':
          const { data: fleetData, error: fleetError } = await supabase
            .from('erp_logistics_vehicles')
            .select('*')
            .eq('company_id', currentCompany.id)
            .eq('is_active', true);

          if (fleetError) throw fleetError;
          data = fleetData || [];
          break;

        case 'costs':
        case 'performance':
          // Datos agregados de costes
          const { data: costsData, error: costsError } = await supabase
            .from('erp_logistics_shipments')
            .select('freight_cost, insurance_cost, total_cost, status, created_at')
            .eq('company_id', currentCompany.id)
            .gte('created_at', dateRange.start)
            .lte('created_at', dateRange.end + 'T23:59:59');

          if (costsError) throw costsError;
          data = costsData || [];
          break;
      }

      clearInterval(progressInterval);
      setProgress(100);

      // Generar archivo
      const filename = `${template.id}_${format(new Date(), 'yyyyMMdd_HHmm')}.${selectedFormat === 'excel' ? 'csv' : selectedFormat}`;
      let content = '';
      let mimeType = 'text/csv';

      if (selectedFormat === 'csv' || selectedFormat === 'excel') {
        // Generar CSV
        if (data.length > 0) {
          const headers = Object.keys(data[0]).filter(k => k !== 'erp_logistics_carriers');
          content = headers.join(',') + '\n';
          data.forEach(row => {
            const values = headers.map(h => {
              let value = row[h];
              if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value);
              }
              if (typeof value === 'string' && value.includes(',')) {
                value = `"${value}"`;
              }
              return value ?? '';
            });
            content += values.join(',') + '\n';
          });
        } else {
          content = 'No hay datos para el período seleccionado';
        }
      } else if (selectedFormat === 'pdf') {
        // Para PDF simplemente exportamos texto (en producción usaríamos jsPDF)
        mimeType = 'text/plain';
        content = `INFORME: ${template.name}\n`;
        content += `Período: ${dateRange.start} - ${dateRange.end}\n`;
        content += `Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}\n\n`;
        content += JSON.stringify(data, null, 2);
      }

      // Descargar archivo
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      setLastGeneratedReport({
        name: template.name,
        date: new Date(),
        size: `${(content.length / 1024).toFixed(1)} KB`,
      });

      toast.success(`Informe "${template.name}" generado correctamente`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error al generar el informe');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const template = selectedTemplate ? REPORT_TEMPLATES.find(t => t.id === selectedTemplate) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Informes Logísticos</h2>
          <p className="text-muted-foreground">
            Genera informes personalizados de operaciones logísticas
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Templates */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Plantillas de Informe</CardTitle>
            <CardDescription>Seleccione el tipo de informe a generar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {REPORT_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        p-2 rounded-lg
                        ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-background'}
                      `}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{tmpl.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {tmpl.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tmpl.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Period */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Desde</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hasta</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Format */}
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-charts"
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(!!checked)}
                />
                <Label htmlFor="include-charts" className="text-sm">
                  Incluir gráficos (PDF)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-raw"
                  checked={includeRawData}
                  onCheckedChange={(checked) => setIncludeRawData(!!checked)}
                />
                <Label htmlFor="include-raw" className="text-sm">
                  Incluir datos detallados
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            {isGenerating && (
              <div className="w-full space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Generando informe... {progress}%
                </p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={generateReport}
              disabled={!selectedTemplate || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generar Informe
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Selected Template Info */}
      {template && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                  <template.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </div>
              </div>
              <Badge>{template.category}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Campos incluidos:</span>
              {template.fields.map((field) => (
                <Badge key={field} variant="outline">{field}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Generated Report */}
      {lastGeneratedReport && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Último informe generado</p>
                <p className="text-sm text-muted-foreground">
                  {lastGeneratedReport.name} • {format(lastGeneratedReport.date, 'dd/MM/yyyy HH:mm', { locale: es })} • {lastGeneratedReport.size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LogisticsReportsPanel;
