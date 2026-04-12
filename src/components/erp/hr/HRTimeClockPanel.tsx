/**
 * HRTimeClockPanel - Control y seguimiento de fichaje de empleados
 * Cumplimiento Art. 34.9 ET (RD-ley 8/2019) y Ley de Control Horario 2025
 * Registro obligatorio de jornada con geolocalización, anomalías y auditoría
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Clock, LogIn, LogOut, AlertTriangle, CheckCircle, Search,
  Users, Calendar, TrendingUp, Activity, MapPin, Smartphone,
  Monitor, RefreshCw, Download, Filter, BarChart3, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const HRTimeClockInteropPanel = lazy(() => import('./HRTimeClockInteropPanel'));

interface TimeClockEntry {
  id: string;
  employee_id: string;
  clock_date: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  worked_hours: number;
  overtime_hours: number;
  clock_in_method: string;
  clock_out_method: string | null;
  status: string;
  anomaly_type: string | null;
  anomaly_notes: string | null;
  notes: string | null;
  employee_name?: string;
  department_name?: string;
}

interface HRTimeClockPanelProps {
  companyId: string;
}

const METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  web: { label: 'Web', icon: <Monitor className="h-3.5 w-3.5" /> },
  app: { label: 'App', icon: <Smartphone className="h-3.5 w-3.5" /> },
  biometric: { label: 'Biométrico', icon: <Shield className="h-3.5 w-3.5" /> },
  nfc: { label: 'NFC', icon: <Activity className="h-3.5 w-3.5" /> },
  qr: { label: 'QR', icon: <Activity className="h-3.5 w-3.5" /> },
  gps: { label: 'GPS', icon: <MapPin className="h-3.5 w-3.5" /> },
  manual: { label: 'Manual', icon: <Clock className="h-3.5 w-3.5" /> },
  auto: { label: 'Auto', icon: <Clock className="h-3.5 w-3.5" /> },
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  anomaly: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  manual_correction: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export function HRTimeClockPanel({ companyId }: HRTimeClockPanelProps) {
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchEntries = useCallback(async (dateFilter: 'today' | 'week' | 'month' | 'custom') => {
    if (!companyId) return;
    setLoading(true);
    try {
      const now = new Date();
      let startDate: string, endDate: string;

      switch (dateFilter) {
        case 'today':
          startDate = endDate = format(now, 'yyyy-MM-dd');
          break;
        case 'week':
          startDate = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          endDate = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          break;
        case 'month':
          startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
          endDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
          break;
        case 'custom':
          startDate = endDate = selectedDate;
          break;
      }

      let query = supabase
        .from('erp_hr_time_clock')
        .select(`
          *,
          erp_hr_employees!erp_hr_time_clock_employee_id_fkey(first_name, last_name, department_id, erp_hr_departments!erp_hr_employees_department_id_fkey(name))
        `)
        .eq('company_id', companyId)
        .gte('clock_date', startDate)
        .lte('clock_date', endDate)
        .order('clock_date', { ascending: false })
        .order('clock_in', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      const mapped: TimeClockEntry[] = (data || []).map((row: any) => ({
        ...row,
        employee_name: row.erp_hr_employees
          ? `${row.erp_hr_employees.first_name} ${row.erp_hr_employees.last_name}`
          : 'Sin nombre',
        department_name: row.erp_hr_employees?.erp_hr_departments?.name || 'Sin dpto.',
      }));

      setEntries(mapped);
    } catch (err) {
      console.error('Error fetching time clock:', err);
      toast.error('Error al cargar registros de fichaje');
    } finally {
      setLoading(false);
    }
  }, [companyId, statusFilter, selectedDate]);

  useEffect(() => {
    const tabToFilter = { today: 'today', week: 'week', month: 'month', anomalies: 'month' } as const;
    fetchEntries((tabToFilter as any)[activeTab] || 'today');
  }, [activeTab, fetchEntries]);

  const filteredEntries = entries.filter(e => {
    if (activeTab === 'anomalies') return e.status === 'anomaly' || e.anomaly_type;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return e.employee_name?.toLowerCase().includes(term) ||
           e.department_name?.toLowerCase().includes(term);
  });

  // Stats
  const totalToday = entries.filter(e => e.clock_date === format(new Date(), 'yyyy-MM-dd')).length;
  const activeNow = entries.filter(e => e.status === 'open').length;
  const anomalies = entries.filter(e => e.status === 'anomaly' || e.anomaly_type).length;
  const avgHours = entries.length > 0
    ? (entries.reduce((s, e) => s + (e.worked_hours || 0), 0) / entries.filter(e => e.worked_hours > 0).length).toFixed(1)
    : '0';
  const totalOvertime = entries.reduce((s, e) => s + (e.overtime_hours || 0), 0).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Legal Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-primary">Control Horario Obligatorio — Art. 34.9 ET</p>
              <p className="text-muted-foreground mt-0.5">
                Registro diario de jornada conforme a RD-ley 8/2019 y la última actualización normativa. 
                Los registros se conservan durante 4 años y están a disposición de la ITSS, sindicatos y representantes legales.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <LogIn className="h-4 w-4 text-primary" />
              <div>
                <p className="text-lg font-bold">{totalToday}</p>
                <p className="text-xs text-muted-foreground">Fichajes hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-lg font-bold">{activeNow}</p>
                <p className="text-xs text-muted-foreground">En jornada</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-lg font-bold">{anomalies}</p>
                <p className="text-xs text-muted-foreground">Anomalías</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-lg font-bold">{avgHours}h</p>
                <p className="text-xs text-muted-foreground">Media horas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-lg font-bold">{totalOvertime}h</p>
                <p className="text-xs text-muted-foreground">Horas extra</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Control de Fichaje
              </CardTitle>
              <CardDescription>
                Registro diario de jornada (Art. 34.9 ET — RD-ley 8/2019)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchEntries(activeTab as any)}>
                <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-3">
              <TabsList>
                <TabsTrigger value="today" className="text-xs">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Hoy
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Semana
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs">
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  Mes
                </TabsTrigger>
                <TabsTrigger value="anomalies" className="text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  Anomalías
                  {anomalies > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{anomalies}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="interop" className="text-xs">
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  Interoperabilidad
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 w-48 text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-36 text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="open">En jornada</SelectItem>
                    <SelectItem value="closed">Cerrados</SelectItem>
                    <SelectItem value="anomaly">Anomalía</SelectItem>
                    <SelectItem value="manual_correction">Corrección</SelectItem>
                    <SelectItem value="approved">Aprobados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Empleado</TableHead>
                    <TableHead className="w-[100px]">Departamento</TableHead>
                    <TableHead className="w-[90px]">Fecha</TableHead>
                    <TableHead className="w-[80px]">Entrada</TableHead>
                    <TableHead className="w-[80px]">Salida</TableHead>
                    <TableHead className="w-[60px]">Método</TableHead>
                    <TableHead className="w-[70px] text-right">Horas</TableHead>
                    <TableHead className="w-[60px] text-right">H.Extra</TableHead>
                    <TableHead className="w-[90px]">Estado</TableHead>
                    <TableHead className="w-[120px]">Anomalía</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p>No hay registros de fichaje para el período seleccionado</p>
                        <p className="text-xs mt-1">Genere datos demo desde Herramientas → Datos Demo</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className={cn(
                      entry.status === 'anomaly' && 'bg-destructive/5',
                      entry.status === 'open' && 'bg-blue-50/50 dark:bg-blue-950/20'
                    )}>
                      <TableCell className="font-medium text-sm">{entry.employee_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.department_name}</TableCell>
                      <TableCell className="text-sm">{format(parseISO(entry.clock_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {entry.clock_in ? format(parseISO(entry.clock_in), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {entry.clock_out ? format(parseISO(entry.clock_out), 'HH:mm') : (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">
                            En jornada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {METHOD_LABELS[entry.clock_in_method] ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {METHOD_LABELS[entry.clock_in_method].icon}
                            <span>{METHOD_LABELS[entry.clock_in_method].label}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{entry.clock_in_method}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {entry.worked_hours > 0 ? `${entry.worked_hours}h` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {entry.overtime_hours > 0 ? (
                          <span className="text-amber-600 font-semibold">+{entry.overtime_hours}h</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px]', STATUS_COLORS[entry.status] || '')}>
                          {entry.status === 'open' ? 'En jornada' :
                           entry.status === 'closed' ? 'Cerrado' :
                           entry.status === 'anomaly' ? 'Anomalía' :
                           entry.status === 'manual_correction' ? 'Corregido' :
                           entry.status === 'approved' ? 'Aprobado' :
                           entry.status === 'rejected' ? 'Rechazado' : entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.anomaly_type ? (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            <span className="text-xs text-destructive">
                              {entry.anomaly_type === 'missing_clock_out' ? 'Sin salida' :
                               entry.anomaly_type === 'excessive_hours' ? 'Exceso horas' :
                               entry.anomaly_type === 'insufficient_break' ? 'Descanso insuf.' :
                               entry.anomaly_type === 'location_mismatch' ? 'Ubicación' :
                               entry.anomaly_type === 'schedule_deviation' ? 'Desviación' :
                               entry.anomaly_type === 'manual_override' ? 'Manual' : entry.anomaly_type}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* ═══ INTEROP TAB ═══ */}
            <TabsContent value="interop">
              <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Cargando interoperabilidad…</div>}>
                <HRTimeClockInteropPanel companyId={companyId} />
              </Suspense>
            </TabsContent>
          </Tabs>

          {/* Summary footer */}
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredEntries.length} registros</span>
            <span className="text-xs">
              Conservación mínima: 4 años (Art. 34.9 ET). Acceso: ITSS, representación legal y sindicatos.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRTimeClockPanel;
